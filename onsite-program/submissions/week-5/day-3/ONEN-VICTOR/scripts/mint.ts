const { ethers } = require("hardhat");

async function main() {
  // Your deployed contract address
  const CONTRACT_ADDRESS = "0x5342856aE2091Fcf00B3e319F8f2a5Cb6B3C9a98";
  
  // Your wallet address (recipient)
  const RECIPIENT_ADDRESS = "0x4CB216783b328cB403B6F03e53CfB04D61565990";
  
  // Your metadata hash from Pinata
  const METADATA_URI = "ipfs://bafkreiejb6tl4fnmbnypg37wg6k55nul3gqcxgioay5qdifct6q7cs62cy";
  
  // Get contract instance
  const DEERNFT = await ethers.getContractFactory("DEERNFT");
  const contract = DEERNFT.attach(CONTRACT_ADDRESS);
  
  console.log("Minting NFT...");
  
  // Call mint function
  const tx = await contract.mint(RECIPIENT_ADDRESS, METADATA_URI);
  
  console.log("Transaction submitted:", tx.hash);
  
  // Wait for transaction to be mined
  await tx.wait();
  
  console.log("NFT minted successfully!");
  console.log("Check OpenSea in a few minutes for your NFT");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});



