// ignition/modules/DAO7432.ts
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const DAO7432Module = buildModule("DAO7432Module", (m) => {
	const nft = m.contract("ERC721WithRoles", ["GovNFT", "GOV"]);
	const proposerRole = m.getParameter("proposerRole", "0xa98f07a7d2fbb25f6ffbce733b2ab7fb5f5c6c9fbbad4d6b1e5c0b24e7e2d2ad"); // keccak256("PROPOSER_ROLE")
	const voterRole = m.getParameter("voterRole", "0x55b60b07b6779c64b92c2febdbe2e51010d1cff4bd250fa57232ece2b2046a6f"); // keccak256("VOTER_ROLE")
	const dao = m.contract("TokenGatedDAO", [nft, proposerRole, voterRole]);
	return { nft, dao };
});

export default DAO7432Module;
