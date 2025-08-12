// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import '../interfaces/ERC20.sol';

contract PiggyVest {


    error SavingNotFound();
    error AlreadyWithdrawn();
    error InvalidPenaltyPercent();
    error NotOwner();
    error InvalidTokenAddress();
    error InvalidAmount();
    error ETHNotAllowedForERC20();
    error ERC20TransferFailed();
 

    struct Saving {
        uint256 id;
        string name;
        string userName;
        address userAddress;
        AssetType assetType;
        address tokenAddress;
        uint256 amount;
        uint256 startTime;
        uint256 lockPeriod;
        bool withdrawn;
    }

    enum AssetType { ETH, ERC20 }

    address public owner;
    uint256 public nextSavingId;
    uint256 public penaltyPercent = 3;

    mapping(address => Saving[]) public userSavings;



    event SavingCreated(
        uint256 indexed id,
        address indexed user,
        string name,
        string userName,
        AssetType assetType,
        uint256 amount,
        uint256 lockPeriod
    );

    event SavingWithdrawn(
        uint256 indexed id,
        address indexed user,
        uint256 amount,
        bool earlyWithdrawal
    );

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    function createSaving(
        string memory _name,
        string memory _userName,
        AssetType _assetType,
        address _tokenAddress,
        uint256 _amount,
        uint256 _lockPeriod
    ) external payable {
        uint256 amount;

        if (_assetType == AssetType.ETH) {
            if (msg.value == 0) revert InvalidAmount();
            amount = msg.value;
        } else {
            if (_tokenAddress == address(0)) revert InvalidTokenAddress();
            if (_amount == 0) revert InvalidAmount();
            if (msg.value > 0) revert ETHNotAllowedForERC20();
             bool success = token.transferFrom(msg.sender, address(this), _amount);
            if (!success) revert ERC20TransferFailed();
            amount = _amount;
        }

        Saving memory newSaving = Saving({
                                id: nextSavingId,
                                name: _name,
                                userName: _userName,
                                userAddress: msg.sender,
                                assetType: _assetType,
                                tokenAddress: _tokenAddress,
                                amount: amount,
                                startTime: block.timestamp,
                                lockPeriod: _lockPeriod,
                                withdrawn: false
        });

        userSavings[msg.sender].push(newSaving);
        emit SavingCreated(nextSavingId, msg.sender, _name, _userName, _assetType, amount, _lockPeriod);
        nextSavingId++;
    }

    function withdrawSaving(uint256 _id) external {
        Saving[] storage savings = userSavings[msg.sender];
        for (uint256 i = 0; i < savings.length; i++) {
            if (savings[i].id == _id) {
                if (savings[i].withdrawn) revert AlreadyWithdrawn();

                Saving storage saving = savings[i];
                saving.withdrawn = true;

                bool early = block.timestamp < saving.startTime + saving.lockPeriod;
                uint256 amountToSend = saving.amount;

                if (early) {
                    uint256 penalty = (amountToSend * penaltyPercent) / 100;
                    amountToSend -= penalty;
                }

                if (saving.assetType == AssetType.ETH) {
                    payable(msg.sender).transfer(amountToSend);
                } else {
                    IERC20 token = IERC20(saving.tokenAddress);
                    token.transfer(msg.sender, amountToSend);
                }

                emit SavingWithdrawn(_id, msg.sender, amountToSend, early);
                return;
            }
        }

        revert SavingNotFound();
    }

    function getUserSavings(address _user) external view returns (Saving[] memory) {
        return userSavings[_user];
    }

    function getSavingBalance(uint256 _id) external view returns (uint256) {
        Saving[] memory savings = userSavings[msg.sender];
        for (uint256 i = 0; i < savings.length; i++) {
            if (savings[i].id == _id) {
                if (savings[i].withdrawn) revert AlreadyWithdrawn();
                return savings[i].amount;
            }
        }
        revert SavingNotFound();
    }

    function getTotalBalance() external view returns (uint256 total) {
        Saving[] memory savings = userSavings[msg.sender];
        for (uint256 i = 0; i < savings.length; i++) {
            if (!savings[i].withdrawn) {
                total += savings[i].amount;
            }
        }
    }

    function isMature(uint256 _id) external view returns (bool) {
        Saving[] memory savings = userSavings[msg.sender];
        for (uint256 i = 0; i < savings.length; i++) {
            if (savings[i].id == _id) {
                return block.timestamp >= savings[i].startTime + savings[i].lockPeriod;
            }
        }
        revert SavingNotFound();
    }

    function getMaturityDate(uint256 _id) external view returns (uint256) {
        Saving[] memory savings = userSavings[msg.sender];
        for (uint256 i = 0; i < savings.length; i++) {
            if (savings[i].id == _id) {
                return savings[i].startTime + savings[i].lockPeriod;
            }
        }
        revert SavingNotFound();
    }

    function changePenaltyPercent(uint256 _newPercent) external onlyOwner {
        if (_newPercent > 100) revert InvalidPenaltyPercent();
        penaltyPercent = _newPercent;
    }
}


