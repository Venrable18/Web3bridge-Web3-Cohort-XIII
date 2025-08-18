// ignition/modules/LudoModule.ts

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const LudoDeploy = buildModule("LudoModule", (m) => {
  // Parameters with default values
  const tokenAddress = m.getParameter("tokenAddress", "0x4CB216783b328cB403B6F03e53CfB04D61565990");
  const stakeAmount = m.getParameter("stakeAmount", 1000n); 

  // Deploy the LudoGame with those params
  const ludoGame = m.contract("LudoGame", [tokenAddress, stakeAmount]);

  return { ludoGame };
});

export default LudoDeploy;
