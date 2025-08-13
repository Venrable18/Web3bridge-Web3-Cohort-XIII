// test/DAO7432.ts
import { expect } from "chai";
import { ethers } from "hardhat";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("TokenGatedDAO with ERC-7432 Roles", function () {
  
	it("gates propose/vote by NFT roles", async () => {
		const [deployer, alice, bob, charlie] = await ethers.getSigners();

		const ERC721WithRoles = await ethers.getContractFactory("ERC721WithRoles");
		const erc721 = await ERC721WithRoles.deploy("GovNFT", "GOV");
		await erc721.waitForDeployment();

		// mint tokens to alice and bob
		await (await erc721.mint(alice.address, 1n)).wait();
		await (await erc721.mint(bob.address, 2n)).wait();

		const proposerRole = ethers.id("PROPOSER_ROLE");
		const voterRole = ethers.id("VOTER_ROLE");

		const DAO = await ethers.getContractFactory("TokenGatedDAO");
		const dao = await DAO.deploy(await erc721.getAddress(), proposerRole, voterRole);
		await dao.waitForDeployment();

		// Without roles, proposing should fail
		await expect(dao.connect(alice).propose(1n, "P1", 60)).to.be.revertedWith("missing PROPOSER_ROLE");

		// Alice grants herself PROPOSER on token 1
		await (await erc721.connect(alice).grantRole(1n, alice.address, proposerRole, 0, "0x")).wait();

		// Now propose succeeds
		await (await dao.connect(alice).propose(1n, "P1", 60)).wait();

		// Bob doesn't have voter role yet -> voting fails
		await expect(dao.connect(bob).vote(1, 2n, true)).to.be.revertedWith("missing VOTER_ROLE");

		// Bob grants himself VOTER on token 2
		await (await erc721.connect(bob).grantRole(2n, bob.address, voterRole, 0, "0x")).wait();

		// Bob votes for
		await (await dao.connect(bob).vote(1, 2n, true)).wait();

		// Charlie has no role, voting reverts
		await expect(dao.connect(charlie).vote(1, 2n, false)).to.be.revertedWith("missing VOTER_ROLE");

		// Fast-forward past deadline
		await time.increase(61);

		const before = await dao.getProposal(1);
		expect(before.forVotes).to.eq(1n);
		expect(before.againstVotes).to.eq(0n);

		// Execute
		await (await dao.execute(1)).wait();

		const after = await dao.getProposal(1);
		expect(after.executed).to.eq(true);
	});

	it("respects expiration on roles", async () => {
		const [deployer, alice] = await ethers.getSigners();

		const ERC721WithRoles = await ethers.getContractFactory("ERC721WithRoles");
		const erc721 = await ERC721WithRoles.deploy("GovNFT", "GOV");
		await erc721.waitForDeployment();

		await (await erc721.mint(alice.address, 1n)).wait();
		const proposerRole = ethers.id("PROPOSER_ROLE");
		const DAO = await ethers.getContractFactory("TokenGatedDAO");
		const dao = await DAO.deploy(await erc721.getAddress(), proposerRole, proposerRole);
		await dao.waitForDeployment();

		// grant proposer with short expiry (2 seconds)
		const now = BigInt(await time.latest());
		await (await erc721.connect(alice).grantRole(1n, alice.address, proposerRole, Number(now + 2n), "0x")).wait();

		// Works before expiry
		await (await dao.connect(alice).propose(1n, "short-lived", 10)).wait();

		// After expiry, should fail
		await time.increase(3);
		await expect(dao.connect(alice).propose(1n, "expired", 10)).to.be.revertedWith("missing PROPOSER_ROLE");
	});
});