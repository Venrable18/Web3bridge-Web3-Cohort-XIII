// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "./PiggyVest.sol";

contract PiggyVestFactory {
    address public owner;
    PiggyVest public piggyVest;

    constructor() {
        owner = msg.sender;
        piggyVest = new PiggyVest();
    }

    function getPiggyVestAddress() external view returns (address) {
        return address(piggyVest);
    }
}
