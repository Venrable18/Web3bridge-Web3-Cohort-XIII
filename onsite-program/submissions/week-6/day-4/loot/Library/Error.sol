/ SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

contract Error {
    // ERRORS

    // There are no tokens to put in the lootbox
    error NoTokens();

    // The tokens array length does not match the perUnitAmounts array length
    error InvalidLength();

    // The perUnitAmounts array contains an invalid amount
    error InvalidTokenAmount();

    // The amount to open is zero
    error ZeroAmount();

    // The sum of reward units is not a multiple of the amount distributed per open
    error InvalidLootboxSupply(uint256 sumOfRewardUnits, uint256 amountDistributedPerOpen);

    // Not in public open mode
    error NotAllowed();

    // The user is not whitelisted or the proof is invalid
    error NotEligible();

    // The amount to open exceeds the supply
    error SupplyExceeded(uint256 supply, uint256 amountToOpen);

    // The value sent is not enough to cover the fee
    error InsufficientValue();

    // The lootbox openning has not started yet
    error OpeningNotStarted();

    // Rewards can only be claimed after the randomness is fulfilled
    error RandomnessNotFulfilled();

    // Cannot open more than one lootbox at a time
    error PendingOpenRequest();

    // The user has no pending open request to claim rewards for
    error NoPendingRequest();

    // The contract balance transfer to the owner failed
    error FailedToWithdrawFunds();
}
