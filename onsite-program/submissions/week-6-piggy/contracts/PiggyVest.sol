// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../interfaces/ERC20.sol";

contract PiggyVest {

   error NotYourBox();

    error TimeMustBeMoreThanZero();

    error NothingToTake();

    error NoETHSent();

    error TransferFailed();

    struct Saving {
        address kindOfMoney;
        uint256 howMuch;
        uint256 whenStarted;
        uint256 waitTime;
    }

    address public saver;

    address public platform;

    uint256 public totalSavings;

    mapping(uint256 => Saving) public allSavings;

    event SavingAdded(uint256 indexed number, address kindOfMoney, uint256 howMuch, uint256 waitTime);
    event SavingTaken(uint256 indexed number, uint256 gotBack, uint256 feeTaken, bool wasTooSoon);

 

    modifier onlySaver() {
        if (msg.sender != saver) {
            revert NotYourBox();
        }
        _;
    }

    constructor(address person, address platformAddress) {
        saver = person;
        platform = platformAddress;
    }

    function addSaving(address kindOfMoney, uint256 waitTime) external payable onlySaver {
        if (waitTime == 0) revert TimeMustBeMoreThanZero();

        uint256 moneyIn;

        if (kindOfMoney == address(0)) {
            if (msg.value == 0) revert NoETHSent();
            moneyIn = msg.value;
        } else {
            if (msg.value == 0) revert NoETHSent(); // optional: remove if ETH isn't needed
            moneyIn = msg.value;
            bool success = IERC20(kindOfMoney).transferFrom(msg.sender, address(this), moneyIn);
            if (!success) revert TransferFailed();
        }

        allSavings[totalSavings] = Saving(kindOfMoney, moneyIn, block.timestamp, waitTime);
        emit SavingAdded(totalSavings, kindOfMoney, moneyIn, waitTime);
        totalSavings++;
    }

    function takeSaving(uint256 number) external onlySaver {

        Saving storage saving = allSavings[number];

        if (saving.howMuch == 0) revert NothingToTake();

        bool tooSoon = block.timestamp < saving.whenStarted + saving.waitTime;

        uint256 fee = tooSoon ? (saving.howMuch * 3) / 100 : 0;
        
        uint256 moneyOut = saving.howMuch - fee;

        saving.howMuch = 0;

        if (saving.kindOfMoney == address(0)) {

            payable(platform).transfer(fee);
            payable(saver).transfer(moneyOut);

        } else {
            IERC20(saving.kindOfMoney).transfer(platform, fee);
            IERC20(saving.kindOfMoney).transfer(saver, moneyOut);
        }

        emit SavingTaken(number, moneyOut, fee, tooSoon);
    }

    function seeSaving(uint256 number) external view returns (
        address kindOfMoney,
        uint256 howMuch,
        uint256 whenStarted,
        uint256 waitTime,
        uint256 whenCanTake,
        bool taken
    ) {

        Saving memory s = allSavings[number];

        return (s.kindOfMoney, s.howMuch, s.whenStarted, s.waitTime, s.whenStarted + s.waitTime, s.howMuch == 0);
    }



    function seeAllETH() external view returns (uint256 totalETH) {
        for (uint256 i = 0; i < totalSavings; i++) {
            if (allSavings[i].kindOfMoney == address(0)) {
                totalETH += allSavings[i].howMuch;
            }
        }
    }



    function seeAllTokens(address kindOfMoney) external view returns (uint256 totalTokens) {
        for (uint256 i = 0; i < totalSavings; i++) {
            if (allSavings[i].kindOfMoney == kindOfMoney) {
                totalTokens += allSavings[i].howMuch;
            }
        }
    }



    function howManySavings() external view returns (uint256) {
        return totalSavings;
    }



    receive() external payable {
        revert("Use addSaving to put ETH");
    }

    fallback() external payable {
        revert("Wrong call");
    }
}
