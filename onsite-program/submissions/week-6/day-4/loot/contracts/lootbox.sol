// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC721} from "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ERC721Holder} from "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";
import {ERC1155Holder} from "@openzeppelin/contracts/token/ERC1155/utils/ERC1155Holder.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VRFCoordinatorV2Interface} from "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import {VRFConsumerBaseV2} from "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import {Error} from "./library/Error.sol";

contract Lootbox is VRFConsumerBaseV2, ERC721Holder, ERC1155Holder, Ownable {
    using SafeERC20 for IERC20;

    // The tokens that are part of the lootbox
    mapping(uint256 => Token) private s_tokens;

    // The amount of each token that is distributed per reward unit
    uint256[] private s_perUnitAmounts;

    // The fee that is charged per open
    uint128 private s_feePerOpen;

    // The number of tokens in the lootbox
    uint64 private s_tokensCount;

    // The total supply of reward units
    uint64 private s_supply;

    // The amount of reward units that are distributed per open
    uint64 private s_amountDistributedPerOpen;

    // The timestamp when the lootbox opens
    uint64 private s_openStartTimestamp;

    // The merkle root of the whitelist for the private open
    bytes32 private s_whitelistRoot;

    // Whether the lootbox opens for everyone or only for whitelisted users
    bool private s_privateOpen;

    // Lootbox token struct
    struct Token {
        address assetContract;
        TokenType tokenType;
        uint256 tokenId;
        uint256 totalAmount;
    }

    // All the possible token types
    enum TokenType {
        ERC20,
        ERC721,
        ERC1155
    }

    // VRF RELATED

    // The gas limit for the random number callback
    uint32 private constant CALLBACK_GASLIMIT = 200_000;

    // The number of blocks confirmed before the request is considered fulfilled
    uint16 private constant REQUEST_CONFIRMATIONS = 3;

    // The number of random words to request
    uint32 private constant NUMWORDS = 1;

    // The key hash for the VRF request
    bytes32 private immutable i_vrfKeyHash;

    // The address of the VRF coordinator
    address private immutable i_vrfCoordinatorV2;

    // The subscription ID for the VRF request
    uint64 private immutable i_vrfSubscriptionId;

    // The VRF request IDs and their corresponding parameters as well as the randomness when fulfilled
    mapping(uint256 => Request) private s_requests;

    // The VRF request IDs and their corresponding openers
    mapping(address => uint256) private s_openerRequests;

    // The VRF request struct
    struct Request {
        address opener;
        uint64 amountToOpen;
        uint256 randomness;
    }

    event OpenRequested(address opener, uint256 amountToOpen, uint256 requestId);

    // Emitted when a randomness request is fulfilled and the lootbox rewards can be claimed

    event OpenRequestFulfilled(uint256 requestId, uint256 randomness);

    // Emitted when the lootbox rewards are claimed
    event RewardsClaimed(address opener, uint256 amountToOpen, Token[] rewardUnits);

    //  CONSTRUCTOR
    constructor(
        Token[] memory tokens,
        uint256[] memory perUnitAmounts,
        uint128 feePerOpen,
        uint64 amountDistributedPerOpen,
        uint64 openStartTimestamp,
        bytes32 whitelistRoot,
        bytes32 vrfKeyHash,
        address vrfCoordinatorV2,
        uint64 vrfSubscriptionId
    ) VRFConsumerBaseV2(vrfCoordinatorV2) {
        uint64 tokenCount = uint64(tokens.length);

        if (tokenCount == 0) revert Error.NoTokens();
        if (tokenCount != perUnitAmounts.length) revert Error.InvalidLength();

        s_supply = _calculateLootboxSupply(tokens, perUnitAmounts, amountDistributedPerOpen);

        _transferTokenBatch(tokens, _msgSender(), address(this));

        for (uint256 i = 0; i < tokenCount; i += 1) {
            s_tokens[i] = tokens[i];
        }
        s_tokensCount = tokenCount;

        s_perUnitAmounts = perUnitAmounts;
        s_feePerOpen = feePerOpen;
        s_amountDistributedPerOpen = amountDistributedPerOpen;
        s_openStartTimestamp = openStartTimestamp;

        i_vrfKeyHash = vrfKeyHash;
        i_vrfCoordinatorV2 = vrfCoordinatorV2;
        i_vrfSubscriptionId = vrfSubscriptionId;

        if (whitelistRoot != bytes32(0)) {
            s_privateOpen = true;
            s_whitelistRoot = whitelistRoot;
        }
    }

    // OPEN FUNCTIONS

    // Requests a lootbox openning when the lootbox is in public open mode
    // amountToOpen The amount of lootbox units to open
    function publicOpen(uint64 amountToOpen) external payable {
        if (s_privateOpen) revert Error.NotAllowed();
        _requestOpen(amountToOpen);
    }

    // Requests a lootbox openning when the lootbox is in private open mode
    function privateOpen(uint64 amountToOpen, bytes32[] calldata merkleProof) external payable {
        if (!_verify(merkleProof)) revert Error.NotEligible();
        _requestOpen(amountToOpen);
    }

    // Claims the rewards for the lootbox openning
    function claimRewards(address opener) external {
        uint256 requestId = s_openerRequests[opener];
        if (requestId == 0) revert Error.NoPendingRequest();

        _claimRewards(requestId, opener);
    }

    // GETTER FUNCTIONS

    // Returns the tokens and amounts per unit of the lootbox
    function getLootboxTokens() public view returns (Token[] memory tokens, uint256[] memory perUnitAmounts) {
        uint256 count = s_tokensCount;
        tokens = new Token[](count);
        for (uint256 i = 0; i < count; i += 1) {
            tokens[i] = s_tokens[i];
        }
        perUnitAmounts = s_perUnitAmounts;
    }

    // Returns whether the rewards for the given opener can be claimed
    function canClaimRewards(address opener) public view returns (bool) {
        uint256 requestId = s_openerRequests[opener];
        return requestId != 0 && s_requests[requestId].randomness != 0;
    }

    // OWNER FUNCTIONS

    // Transfer the contract balance to the owner
    function withdraw() external onlyOwner {
        // solhint-disable-next-line avoid-low-level-calls
        (bool sent,) = payable(owner()).call{value: address(this).balance}("");

        if (!sent) revert Error.FailedToWithdrawFunds();
    }

    // Enable or disable the private openning mode
    function setPrivateOpen(bool privateOpenEnabled) external onlyOwner {
        s_privateOpen = privateOpenEnabled;
    }

    // Set the whitelist merkle tree root for the private openning
    function setWhitelistRoot(bytes32 whiteListRoot) external onlyOwner {
        s_whitelistRoot = whiteListRoot;
    }

    // Requests randomness from Chainlink VRF
    function _requestRandomness() internal returns (uint256 requestId) {
        requestId = VRFCoordinatorV2Interface(i_vrfCoordinatorV2).requestRandomWords(
            i_vrfKeyHash, i_vrfSubscriptionId, REQUEST_CONFIRMATIONS, CALLBACK_GASLIMIT, NUMWORDS
        );
    }

    // VRFConsumerBaseV2
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        s_requests[requestId].randomness = randomWords[0];
        emit OpenRequestFulfilled(requestId, randomWords[0]);
    }

    //     INTERNAL FUNCTIONS

    // Verifies that the user is in the whitelist merkle tree
    function _verify(bytes32[] memory proof) internal view returns (bool) {
        bytes32 leaf = keccak256(abi.encodePacked(_msgSender()));
        return MerkleProof.verify(proof, s_whitelistRoot, leaf);
    }

    // Calculates the lootbox supply of reward units for the given tokens and per unit amounts
    function _calculateLootboxSupply(
        Token[] memory tokens,
        uint256[] memory perUnitAmounts,
        uint128 amountDistributedPerOpen
    ) internal pure returns (uint64 totalSupply) {
        uint256 sumOfRewardUnits;
        for (uint256 i = 0; i < tokens.length; i += 1) {
            Token memory token = tokens[i];

            if (token.totalAmount == 0) revert Error.ZeroAmount();
            if (token.totalAmount % perUnitAmounts[i] != 0) revert Error.InvalidTokenAmount();
            if (token.tokenType == TokenType.ERC721 && token.totalAmount != 1) revert Error.InvalidTokenAmount();

            sumOfRewardUnits += token.totalAmount / perUnitAmounts[i];
        }
        if (sumOfRewardUnits % amountDistributedPerOpen != 0) {
            revert Error.InvalidLootboxSupply(sumOfRewardUnits, amountDistributedPerOpen);
        }
        totalSupply = uint64(sumOfRewardUnits / amountDistributedPerOpen);
    }

    // Creates a lootbox open request for the given amount
    function _requestOpen(uint64 amountToOpen) internal {
        address opener = _msgSender();

        // solhint-disable-next-line not-rely-on-time
        if (s_openStartTimestamp > block.timestamp) revert Error.OpeningNotStarted();
        if (amountToOpen == 0) revert Error.ZeroAmount();
        if (s_supply < amountToOpen) revert Error.SupplyExceeded(s_supply, amountToOpen);
        if (msg.value < s_feePerOpen * amountToOpen) revert Error.InsufficientValue();
        if (s_openerRequests[opener] != 0) revert Error.PendingOpenRequest();

        uint256 requestId = _requestRandomness();

        s_requests[requestId] = Request({opener: opener, amountToOpen: amountToOpen, randomness: 0});

        s_openerRequests[opener] = requestId;

        emit OpenRequested(opener, amountToOpen, requestId);
    }

    // Claims the rewards for the given lootbox open request
    function _claimRewards(uint256 requestId, address opener) internal returns (Token[] memory rewardUnits) {
        Request memory request = s_requests[requestId];

        if (request.randomness == 0) revert Error.RandomnessNotFulfilled();

        delete s_requests[requestId];
        delete s_openerRequests[opener];

        Token[] memory updatedTokens;
        (rewardUnits, updatedTokens) = _getRewardUnits(request.amountToOpen, request.randomness);

        for (uint256 i = 0; i < updatedTokens.length; i += 1) {
            s_tokens[i].totalAmount = updatedTokens[i].totalAmount;
        }
        s_supply -= request.amountToOpen;

        _transferTokenBatch(rewardUnits, address(this), opener);

        emit RewardsClaimed(opener, request.amountToOpen, rewardUnits);
    }

    // Picks the rewards using the given randomness as a seed
    function _getRewardUnits(uint256 amountToOpen, uint256 randomness)
        internal
        view
        returns (Token[] memory rewardUnits, Token[] memory updatedTokens)
    {
        uint256 totalRewardUnits = s_supply * s_amountDistributedPerOpen;
        uint256 totalRewardKinds = s_perUnitAmounts.length;

        uint256 numOfRewardUnitsToDistribute = amountToOpen * s_amountDistributedPerOpen;
        rewardUnits = new Token[](numOfRewardUnitsToDistribute);

        (Token[] memory tokens,) = getLootboxTokens();
        for (uint256 i = 0; i < numOfRewardUnitsToDistribute; i += 1) {
            uint256 randomNumber = uint256(keccak256(abi.encode(randomness, i)));
            uint256 target = randomNumber % totalRewardUnits;
            uint256 step;

            for (uint256 j = 0; j < totalRewardKinds; j += 1) {
                uint256 totalRewardUnitsOfKind = tokens[j].totalAmount / s_perUnitAmounts[j];

                if (step + totalRewardUnitsOfKind > target) {
                    tokens[j].totalAmount -= s_perUnitAmounts[j];

                    rewardUnits[i].assetContract = tokens[j].assetContract;
                    rewardUnits[i].tokenType = tokens[j].tokenType;
                    rewardUnits[i].tokenId = tokens[j].tokenId;
                    rewardUnits[i].totalAmount = s_perUnitAmounts[j];

                    totalRewardUnits -= 1;

                    break;
                } else {
                    step += totalRewardUnitsOfKind;
                }
            }
        }

        updatedTokens = tokens;
    }

    // Transfers the given tokens from one address to another
    function _transferTokenBatch(Token[] memory tokens, address from, address to) internal {
        for (uint256 i = 0; i < tokens.length; i += 1) {
            _transferToken(tokens[i], from, to);
        }
    }

    // Transfers the given token from one address to another
    function _transferToken(Token memory token, address from, address to) internal {
        if (token.tokenType == TokenType.ERC20) {
            if (from == address(this)) {
                IERC20(token.assetContract).safeTransfer(to, token.totalAmount);
            } else {
                IERC20(token.assetContract).safeTransferFrom(from, to, token.totalAmount);
            }
        } else if (token.tokenType == TokenType.ERC721) {
            IERC721(token.assetContract).safeTransferFrom(from, to, token.tokenId);
        } else if (token.tokenType == TokenType.ERC1155) {
            IERC1155(token.assetContract).safeTransferFrom(from, to, token.tokenId, token.totalAmount, "");
        }
    }
}


LinkTokenInterface.sol