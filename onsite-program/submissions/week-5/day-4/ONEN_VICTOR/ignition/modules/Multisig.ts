// This setup uses Hardhat Ignition to manage smart contract deployments.
// Learn more about it at https://hardhat.org/ignition

import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const multiSigDeploy = buildModule("MultiSigModule", (m) => {
  // Define the owners and required signatures for the multisig
  // const owners = [
  //   "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266", // Default Hardhat account 0
  //   "0x70997970C51812dc3A010C7d01b50e0d17dc79C8", // Default Hardhat account 1
  //   "0x3C44CdDdB6a900fa2b585dd299e07d12171FCc43"  // Default Hardhat account 2
  // ];
  const requiredSignatures = 2;

  const multiSig = m.contract("Multisig", [owners, requiredSignatures]);

  return { multiSig };
});

export default multiSigDeploy;

