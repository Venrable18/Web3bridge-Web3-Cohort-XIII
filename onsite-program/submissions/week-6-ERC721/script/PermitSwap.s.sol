// SPDX-License-Identifier: MIT
pragma solidity ^0.8.30;

import "forge-std/Script.sol";
import "../src/PermitSwap.sol";

contract PermitSwapScript is Script {
    // Deploy PermitSwap on any chain where:
    //   - Permit2  = 0x000000000022D473030F116dDEE9F6B43aC78BA3
    //   - UniswapV2 Router = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
    function run() external {
        vm.startBroadcast();

        PermitSwap permitSwap = new PermitSwap(
            0x000000000022D473030F116dDEE9F6B43aC78BA3,
            0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D
        );

        console2.log("PermitSwap deployed at:", address(permitSwap));

        vm.stopBroadcast();
    }
}