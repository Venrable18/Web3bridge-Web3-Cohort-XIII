// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./PiggyVest.sol";

contract PiggyFactory {
    address public platform;

    mapping(address => address) public personToBox;

    event BoxMade(address indexed person, address box);

    error BoxAlreadyMade();

    constructor() {
        platform = msg.sender;
    }

    function makeBox() external {
        if (personToBox[msg.sender] != address(0)) {
            revert BoxAlreadyMade();
        }

        PiggyVest newBox = new PiggyVest(msg.sender, platform);
        personToBox[msg.sender] = address(newBox);

        emit BoxMade(msg.sender, address(newBox));
    }

    function findBox(address person) external view returns (address) {
        return personToBox[person];
    }
}
