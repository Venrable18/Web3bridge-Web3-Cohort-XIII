import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

const main = async () => {
    const UniswapRouter = "0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D";
    const liquidityProvider_Address = "0xf584f8728b874a6a5c7a8d4d387c9aae9172d621";

    // Token Addresses
    const tokenA_Address_USDT = "0xdAC17F958D2ee523a2206206994597C13D831ec7";
    const tokenB_Address_CONVEX_TOKEN = "0x4e3FBD56CD56c3e72c1403e103b45Db9da5B9D2B";

    // Impersonate the liquidity provider
    await helpers.impersonateAccount(liquidityProvider_Address);
    const liquidityProvider = await ethers.getSigner(liquidityProvider_Address);

    // Fetch contract instances
    const tokenA = await ethers.getContractAt("IERC20", tokenA_Address_USDT, liquidityProvider);
    const tokenB = await ethers.getContractAt("IERC20", tokenB_Address_CONVEX_TOKEN, liquidityProvider);

    // Check balances
    const balanceOfTokenA = await tokenA.balanceOf(liquidityProvider_Address);
    const balanceOfTokenB = await tokenB.balanceOf(liquidityProvider_Address);

    // ========= INITAL BALANCES =========
    console.log("\n\n---------------INITAL BALANCES 🥃-------------------")
    console.log("USDT Balance:", ethers.formatUnits(balanceOfTokenA, 6));
    console.log("CONVEX Balance:", ethers.formatUnits(balanceOfTokenB, 18));

    // Check pair existence
    const factoryAddress = "0x5C69bEe701ef814a2B6a3EDD4B1652CB9cc5aA6f";
    const factory = await ethers.getContractAt("IUniswapV2Factory", factoryAddress);
    const pairAddress = await factory.getPair(tokenA_Address_USDT, tokenB_Address_CONVEX_TOKEN);

    if (pairAddress === ethers.ZeroAddress) {
        console.log("Pair does not exist. Creating...");
        const tx = await factory.createPair(tokenA_Address_USDT, tokenB_Address_CONVEX_TOKEN);
        await tx.wait();
        console.log("Pair created.");
    } else {
        console.log("Pair already exists at:", pairAddress);
    }

    // Add liquidity
    const router = await ethers.getContractAt("IUniswapV2Router02", UniswapRouter, liquidityProvider);
    const amountA = ethers.parseUnits("8000", 6);
    const amountB = ethers.parseUnits("8000", 18);

    await tokenA.approve(UniswapRouter, amountA);
    await tokenB.approve(UniswapRouter, amountB);
    console.log("Approvals done. Adding liquidity...");

    const deadline = Math.floor(Date.now() / 1000) + 600;

    const tx = await router.addLiquidity(
        tokenA_Address_USDT,
        tokenB_Address_CONVEX_TOKEN,
        amountA,
        amountB,
        0,
        0,
        liquidityProvider.address,
        deadline
    );
    await tx.wait();
    console.log("Liquidity added. Tx hash:", tx.hash);

    // Post-liquidity balances
    const newBalanceA = await tokenA.balanceOf(liquidityProvider_Address);
    const newBalanceB = await tokenB.balanceOf(liquidityProvider_Address);

    // ========= POST-LIQUIDITY BALANCES =========
    console.log("\n\n---------------POST-LIQUIDITY BALANCES 🥃-------------------")
    console.log("New USDT Balance:", ethers.formatUnits(newBalanceA, 6));
    console.log("New CONVEX Balance:", ethers.formatUnits(newBalanceB, 18));

    // LP token balance
    const pairToken = await ethers.getContractAt("IERC20", await factory.getPair(tokenA_Address_USDT, tokenB_Address_CONVEX_TOKEN), liquidityProvider);
    const lpBalance = await pairToken.balanceOf(liquidityProvider_Address);
    console.log("LP Tokens received:", lpBalance);
};

main().catch((error) => {
    console.error("Error:", error);
    process.exit(1);
});
