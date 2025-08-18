import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");


const main = async () => {
    const UniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const liquidityProvider_Address = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";

    await helpers.impersonateAccount(liquidityProvider_Address);
    await helpers.setBalance(liquidityProvider_Address, ethers.parseEther("10"));
    const liquidityProvider = await ethers.getSigner(liquidityProvider_Address);
  
    // Token Addresses
    const tokenA_Address_USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    const tokenB_Address_CONVEX_TOKEN = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";


     // Fetch contract instances
    const tokenA = await ethers.getContractAt("IERC20", tokenA_Address_USDT, liquidityProvider);
    const tokenB = await ethers.getContractAt("IERC20", tokenB_Address_CONVEX_TOKEN, liquidityProvider);
    const UniSwapRouterContract = await ethers.getContractAt("IUniswapV2Router02", UniswapRouter, liquidityProvider);

  console.log("Getting Pair Address for Uniswap Router...");
  
    // Pre-removal balances
    const balanceBeforeA = await tokenA.balanceOf(liquidityProvider_Address);
    const balanceBeforeB = await tokenB.balanceOf(liquidityProvider_Address);
    console.log("USDT (before):", ethers.formatUnits(balanceBeforeA, 6));
    console.log("CONVEX (before):", ethers.formatUnits(balanceBeforeB, 18));

    console.log("\n\n---------------getting Pair Address 🥃-------------------");
  const getContractFactoryAddress = await UniSwapRouterContract.factory();
  const factoryContract = await ethers.getContractAt("IUniswapV2Factory", getContractFactoryAddress);
  const pairAddress = await factoryContract.getPair(tokenA_Address_USDT, tokenB_Address_CONVEX_TOKEN);
  if (pairAddress === ethers.ZeroAddress) {
    console.log("Pair does not exist. Run addLiquidity first in the same persistent node (localhost), or pick a token pair with an existing Uniswap V2 pool.");
    return;
  }
  console.log("Pair Address:", pairAddress);

  const lpToken = await ethers.getContractAt("IERC20", pairAddress, liquidityProvider);
  const lpBalance = await lpToken.balanceOf(liquidityProvider_Address);
  console.log("LP Balance:", lpBalance.toString());

  if (lpBalance === 0n) {
    console.log("No LP tokens to remove.");
    return;
  }

  const approveTx = await lpToken.approve(UniswapRouter, lpBalance);
  await approveTx.wait();
  console.log("Approved router to spend LP tokens.");

  const deadline = Math.floor(Date.now() / 1000) + 600;
  const removeTx = await UniSwapRouterContract.removeLiquidity(
    tokenA_Address_USDT,
    tokenB_Address_CONVEX_TOKEN,
    lpBalance,
    0,
    0,
    liquidityProvider.address,
    deadline
  );
  await removeTx.wait();
  console.log("Liquidity removed. Tx hash:", removeTx.hash);

  const balanceAfterA = await tokenA.balanceOf(liquidityProvider_Address);
  const balanceAfterB = await tokenB.balanceOf(liquidityProvider_Address);
  console.log("USDT (after):", ethers.formatUnits(balanceAfterA, 6));
  console.log("CONVEX (after):", ethers.formatUnits(balanceAfterB, 18));

}
main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});

