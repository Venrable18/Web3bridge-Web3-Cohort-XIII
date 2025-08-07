// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./ERC20.sol";

contract ERC20Factory {

    ERC20[] public ERC20Array;

    function createERC20Factory(string memory _name, string memory _symbol) external {
        ERC20 newERC20_ = new ERC20(_name, _symbol);
        ERC20Array.push(newERC20_);
    }

    function getERC20(uint _index) public view returns (ERC20) {
        return ERC20Array[_index];
    }
}
