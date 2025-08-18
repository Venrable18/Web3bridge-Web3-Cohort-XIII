// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

interface IERC20Minimal {
    function transfer(address to, uint256 value) external returns (bool);
    function transferFrom(address from, address to, uint256 value) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract LudoGame {

    enum Color {
        RED,
        GREEN,
        BLUE,
        YELLOW
    }

    struct Player {
        string name;
        uint256 score;
        Color color;
        bool registered;
    }

    uint8 public constant MAX_PLAYERS = 4;

    mapping(address => Player) private addressToPlayer;

    mapping(Color => address) public colorOwner;

    address[] private playerAddresses;

    uint256 private turnNonce;

    // Staking fields
    IERC20Minimal public token;
    uint256 public stakeAmount;
    bool public gameStarted;
    bool public gameEnded;
    address public winner;

    event PlayerRegistered(address indexed account, string name, Color color);
    event DiceRolled(address indexed account, uint8 value);
    event PlayerMoved(address indexed account, uint8 rolled, uint256 newScore);
    event GameStarted(uint256 players, uint256 totalStaked);
    event GameEnded(address indexed winner, uint256 prize);

    modifier onlyRegistered() {
        require(addressToPlayer[msg.sender].registered, "Not registered");
        _;
    }

    constructor(address tokenAddress, uint256 stakeAmount_) {
        require(tokenAddress != address(0), "Token required");
        token = IERC20Minimal(tokenAddress);
        stakeAmount = stakeAmount_;
    }

    function registerPlayer(string calldata name, Color color) external {

        require(bytes(name).length > 0, "Name required");
        
        require(!addressToPlayer[msg.sender].registered, "Already registered");

        require(colorOwner[color] == address(0), "Color taken");
        
        require(playerAddresses.length < MAX_PLAYERS, "Max players reached");

        addressToPlayer[msg.sender] = Player({
            name: name,
            score: 0,
            color: color,
            registered: true
        });

        colorOwner[color] = msg.sender;
        playerAddresses.push(msg.sender);

        emit PlayerRegistered(msg.sender, name, color);
    }

    function playTurn() external onlyRegistered returns (uint8 rolled, uint256 newScore) {
        rolled = _rollDice();
        Player storage player = addressToPlayer[msg.sender];
        player.score += rolled;
        newScore = player.score;
        emit PlayerMoved(msg.sender, rolled, newScore);
    }

    function startGame() external {
        require(!gameStarted, "Game already started");
        require(playerAddresses.length > 1, "Need at least 2 players");
        require(playerAddresses.length <= MAX_PLAYERS, "Too many players");

        uint256 playersLen = playerAddresses.length;
        uint256 totalStake = playersLen * stakeAmount;

        for (uint256 i = 0; i < playersLen; i++) {
            address playerAddr = playerAddresses[i];
            require(addressToPlayer[playerAddr].registered, "Unregistered in list");
            bool ok = token.transferFrom(playerAddr, address(this), stakeAmount);
            require(ok, "Stake transfer failed");
        }

        gameStarted = true;
        emit GameStarted(playersLen, totalStake);
    }

    function endGameAndPayout() external {
        require(gameStarted, "Game not started");
        require(!gameEnded, "Game already ended");
        require(playerAddresses.length > 0, "No players");

        // Determine winner by highest score; first wins on tie
        address top = playerAddresses[0];
        uint256 topScore = addressToPlayer[top].score;
        for (uint256 i = 1; i < playerAddresses.length; i++) {
            address addr = playerAddresses[i];
            uint256 sc = addressToPlayer[addr].score;
            if (sc > topScore) {
                top = addr;
                topScore = sc;
            }
        }

        uint256 prize = token.balanceOf(address(this));
        gameEnded = true;
        winner = top;

        bool ok = token.transfer(top, prize);
        require(ok, "Prize transfer failed");
        emit GameEnded(top, prize);
    }

    function playersCount() external view returns (uint256) {
        return playerAddresses.length;
    }

    function getPlayer(address account)
        external
        view
        returns (string memory name, uint256 score, Color color, bool registered)
    {
        Player memory p = addressToPlayer[account];
        return (p.name, p.score, p.color, p.registered);
    }

    function computeDice(uint256 seed) external pure returns (uint8) {
        return uint8((uint256(keccak256(abi.encodePacked(seed))) % 6) + 1);
    }

    function _rollDice() private returns (uint8) {
        unchecked {
            turnNonce++;
        }
        uint256 rand = uint256(
            keccak256(
                abi.encodePacked(block.prevrandao, block.timestamp, msg.sender, turnNonce)
            )
        );
        uint8 rolled = uint8((rand % 6) + 1);
        emit DiceRolled(msg.sender, rolled);
        return rolled;
    }
}


