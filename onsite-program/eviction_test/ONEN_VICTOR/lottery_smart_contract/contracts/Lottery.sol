// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract Lottery {

    uint256 public constant entryFee = 0.01 ether;

    uint256 public constant playersPerRound = 10;

    address[] public players;

    mapping(address => bool) public hasEnteredCurrentRound;

    address public lastWinner;

    uint256 public currentRound;

    event PlayerJoined(address indexed player, uint256 indexed round, uint256 count);
    event WinnerChosen(address indexed winner, uint256 indexed round, uint256 prize);



    constructor() {
        currentRound = 1;
    }

    function enter() external payable {

        require(msg.value == entryFee, "Invalid entry fee");

        require(!hasEnteredCurrentRound[msg.sender], "Already entered");

        players.push(msg.sender);

        hasEnteredCurrentRound[msg.sender] = true;

        emit PlayerJoined(msg.sender, currentRound, players.length);

        if (players.length == playersPerRound) {

            _pickWinner();
        }
    }


    function getPlayers() external view returns (address[] memory) {
        return players;
    }



    function _random() private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, players.length)));
    }




    function _pickWinner() private {

        require(players.length == playersPerRound, "Not enough players");
        
        uint256 prize = address(this).balance;

        uint256 index = _random() % players.length;

        address winner = players[index];

        lastWinner = winner;

        emit WinnerChosen(winner, currentRound, prize);

        (bool sent, ) = payable(winner).call{value: prize}("");

        require(sent, "Transfer failed");

        for (uint256 i = 0; i < players.length; i++) {
            hasEnteredCurrentRound[players[i]] = false;
        }


        delete players;
        currentRound += 1;
    }
}


