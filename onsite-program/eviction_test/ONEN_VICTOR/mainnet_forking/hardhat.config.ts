import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
       initialBaseFeePerGas: 0, 
      forking: {
        url: "https://eth-mainnet.g.alchemy.com/v2/UHSE4QvnJ3ri6fndvLCr9",
      },
    },
  },
   solidity: "0.8.28",
};

export default config;

