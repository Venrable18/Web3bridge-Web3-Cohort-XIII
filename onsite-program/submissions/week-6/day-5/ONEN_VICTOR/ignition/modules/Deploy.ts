// ignition/modules/TimeNFTModule.js
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("TimeNFTModule", (m) => {
  // Deploy the TimeNFT contract
  const timeNFT = m.contract("TimeNFT");

  // (Optional) Mint one NFT to the deployer
  m.call(timeNFT, "mint", []);

  return { timeNFT };
});
