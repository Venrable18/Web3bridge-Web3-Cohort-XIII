// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "v2-periphery/interfaces/IUniswapV2Router02.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "permit2/src/interfaces/ISignatureTransfer.sol";



/// @title PermitSwap
/// @notice Executes Uniswap V2 swaps using Permit2 off-chain signatures
contract PermitSwap {
    /// @notice Interface for Permit2 signature-based token transfers
    ISignatureTransfer public permit2;

    /// @notice Uniswap V2 router for token swaps
    IUniswapV2Router02 public uniswapRouter;

    constructor(address _permit2, address _uniswapRouter) {
        permit2 = ISignatureTransfer(_permit2);
        uniswapRouter = IUniswapV2Router02(_uniswapRouter);
    }

    /// @notice Executes a Uniswap V2 token swap using a signed Permit2 transfer
    /// @param permit The signed permit data
    /// @param signature The EIP-712 signature from the token owner
    /// @param path The Uniswap swap path (e.g., [tokenIn, tokenOut])
    /// @param amountOutMin Minimum amount of output tokens expected
    /// @param to Recipient of the output tokens
    /// @param deadline Swap deadline timestamp
    function permitAndSwap(
        ISignatureTransfer.PermitTransferFrom calldata permit,
        bytes calldata signature,
        address[] calldata path,
        uint amountOutMin,
        address to,
        uint deadline
    ) external {
        // Step 1: Transfer tokens from user to this contract using Permit2
        permit2.permitTransferFrom(
            permit,
            ISignatureTransfer.SignatureTransferDetails({
                to: address(this),
                requestedAmount: permit.permitted.amount
            }),
            msg.sender,
            signature
        );

        // Step 2: Approve Uniswap router to spend the tokens
        IERC20(path[0]).approve(address(uniswapRouter), permit.permitted.amount);

        // Step 3: Execute the Uniswap swap
        uniswapRouter.swapExactTokensForTokens(
            permit.permitted.amount,
            amountOutMin,
            path,
            to,
            deadline
        );
    }
}