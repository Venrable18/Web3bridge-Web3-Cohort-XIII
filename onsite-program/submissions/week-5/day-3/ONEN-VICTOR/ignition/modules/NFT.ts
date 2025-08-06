// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";


const NFTdeploy = buildModule("NFTModule", (m) => {


  const nft = m.contract("DEERNFT");

  return { nft  };
});

export default NFTdeploy;
