import { expect } from "chai";
import { ethers } from "hardhat";
const helpers = require("@nomicfoundation/hardhat-network-helpers");

describe("Lottery", function () {
  async function deployFixture() {
    const [deployer, ...others] = await ethers.getSigners();
    const Lottery = await ethers.getContractFactory("Lottery");
    const lottery = await Lottery.deploy();
    return { lottery, deployer, others };
  }

  it("Users can enter only with the exact fee", async function () {
    const { lottery, others } = await deployFixture();
    await expect(
      lottery.connect(others[0]).enter({ value: ethers.parseEther("0.009") })
    ).to.be.revertedWith("Invalid entry fee");
    await expect(
      lottery.connect(others[0]).enter({ value: ethers.parseEther("0.02") })
    ).to.be.revertedWith("Invalid entry fee");
    await expect(
      lottery.connect(others[0]).enter({ value: ethers.parseEther("0.01") })
    ).to.emit(lottery, "PlayerJoined");
  });

  it("Tracks players and prevents double entry in a round", async function () {
    const { lottery, others } = await deployFixture();
    for (let i = 0; i < 3; i++) {
      await lottery.connect(others[i]).enter({ value: ethers.parseEther("0.01") });
    }
    const players = await lottery.getPlayers();
    expect(players.length).to.equal(3);
    await expect(
      lottery.connect(others[0]).enter({ value: ethers.parseEther("0.01") })
    ).to.be.revertedWith("Already entered");
  });

  it("Only after 10 players, a winner is chosen and prize paid", async function () {
    const { lottery } = await deployFixture();
    const signers = await ethers.getSigners();
    const participants = signers.slice(0, 10);
    const balanceBefore: bigint[] = [];
    for (let i = 0; i < participants.length; i++) {
      balanceBefore.push(await ethers.provider.getBalance(participants[i].address));
      await lottery.connect(participants[i]).enter({ value: ethers.parseEther("0.01") });
      const players = await lottery.getPlayers();
      if (i < 9) {
        expect(players.length).to.equal(i + 1);
      }
    }
    const playersAfter = await lottery.getPlayers();
    expect(playersAfter.length).to.equal(0);
    const lastWinner = await lottery.lastWinner();
    const prize = ethers.parseEther("0.1");
    const winnerIndex = participants.findIndex((s) => s.address === lastWinner);
    expect(winnerIndex).to.be.greaterThanOrEqual(0);
    const balanceAfter = await ethers.provider.getBalance(lastWinner);
    expect(balanceAfter).to.be.greaterThan(balanceBefore[winnerIndex]);
  });

  it("Resets for the next round and allows same address again", async function () {
    const { lottery } = await deployFixture();
    const signers = await ethers.getSigners();
    for (let i = 0; i < 10; i++) {
      await lottery.connect(signers[i]).enter({ value: ethers.parseEther("0.01") });
    }
    for (let i = 0; i < 10; i++) {
      await lottery.connect(signers[i]).enter({ value: ethers.parseEther("0.01") });
    }
    const round = await lottery.currentRound();
    expect(round).to.equal(3n);
  });
});


