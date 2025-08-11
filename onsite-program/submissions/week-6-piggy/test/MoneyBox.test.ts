import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("PiggyVest Basic Flow", function () {

  async function deployFixture() {

    const [maker, user] = await hre.ethers.getSigners();

    const Factory = await hre.ethers.getContractFactory("PiggyFactory");
    
    const factory = await Factory.connect(maker).deploy();

    await factory.connect(user).makeBox();
    const boxAddress = await factory.findBox(user.address);
    const vest = await hre.ethers.getContractAt("PiggyVest", boxAddress);

    return { user, vest };
  }

  it("creates a PiggyVest for the user", async () => {
    const { user } = await loadFixture(deployFixture);
    const factory = await hre.ethers.getContractAt("PiggyFactory");
    const boxAddress = await factory.findBox(user.address);
    expect(boxAddress).to.not.equal(hre.ethers.ZeroAddress);
  });

  it("adds a saving with ETH", async () => {
    const { user, vest } = await loadFixture(deployFixture);
    const amount = hre.ethers.parseEther("1");

    await vest.connect(user).addSaving(hre.ethers.ZeroAddress, 60, {
      value: amount,
    });

    const saving = await vest.seeSaving(0);
    expect(saving[1]).to.equal(amount); // howMuch
  });

  it("withdraws after lock time", async () => {
    const { user, vest } = await loadFixture(deployFixture);
    const amount = hre.ethers.parseEther("1");

    await vest.connect(user).addSaving(hre.ethers.ZeroAddress, 1, {
      value: amount,
    });

    await time.increase(2);
    await vest.connect(user).takeSaving(0);

    const saving = await vest.seeSaving(0);
    expect(saving[5]).to.equal(true); // taken
  });

  it("withdraws early with fee", async () => {
    const { user, vest } = await loadFixture(deployFixture);
    const amount = hre.ethers.parseEther("1");

    await vest.connect(user).addSaving(hre.ethers.ZeroAddress, 1000, {
      value: amount,
    });

    await vest.connect(user).takeSaving(0);

    const saving = await vest.seeSaving(0);
    expect(saving[5]).to.equal(true); // taken
  });
});
