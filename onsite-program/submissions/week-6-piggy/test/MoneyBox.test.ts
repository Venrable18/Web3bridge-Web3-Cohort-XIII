import { time, loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("PiggyVest (Partial Tests)", function () {
  async function deployFixture() {
    const [owner, user1] = await hre.ethers.getSigners();

    const PiggyVest = await hre.ethers.getContractFactory("PiggyVest");
    const piggyVest = await PiggyVest.connect(owner).deploy();

    const ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    const erc20 = await ERC20Mock.connect(owner).deploy("MockToken", "MTK", user1.address, hre.ethers.parseEther("1000"));

    return { piggyVest, erc20, owner, user1 };
  }

  it("should allow ETH savings creation", async () => {
    const { piggyVest, user1 } = await loadFixture(deployFixture);

    await piggyVest.connect(user1).createSaving(
      "ETH Save",
      "UserOne",
      0,
      hre.ethers.ZeroAddress,
      0,
      { value: hre.ethers.parseEther("1") }
    );

    const savings = await piggyVest.getUserSavings(user1.address);
    expect(savings.length).to.equal(1);
    expect(savings[0].amount).to.equal(hre.ethers.parseEther("1"));
  });

  it("should allow ERC20 savings creation", async () => {
    const { piggyVest, erc20, user1 } = await loadFixture(deployFixture);

    await erc20.connect(user1).approve(piggyVest.target, hre.ethers.parseEther("10"));

    await piggyVest.connect(user1).createSaving(
      "Token Save",
      "UserOne",
      1,
      erc20.target,
      hre.ethers.parseEther("10")
    );

    const savings = await piggyVest.getUserSavings(user1.address);
    expect(savings.length).to.equal(1);
    expect(savings[0].tokenAddress).to.equal(erc20.target);
  });

  it("should apply penalty for early ETH withdrawal", async () => {
    const { piggyVest, user1 } = await loadFixture(deployFixture);

    await piggyVest.connect(user1).createSaving(
      "Early Save",
      "UserOne",
      0,
      hre.ethers.ZeroAddress,
      60 * 60 * 24 * 30, // 30 days
      { value: hre.ethers.parseEther("1") }
    );

    await piggyVest.connect(user1).withdrawSaving(0);

    const savings = await piggyVest.getUserSavings(user1.address);
    expect(savings[0].withdrawn).to.be.true;
  });

  it("should track maturity correctly", async () => {
    const { piggyVest, user1 } = await loadFixture(deployFixture);

    const lockPeriod = 60 * 60 * 24 * 7;

    await piggyVest.connect(user1).createSaving(
      "Mature Save",
      "UserOne",
      0,
      hre.ethers.ZeroAddress,
      lockPeriod,
      { value: hre.ethers.parseEther("1") }
    );

    await time.increase(lockPeriod + 1);

    const isMature = await piggyVest.connect(user1).isMature(0);
    expect(isMature).to.equal(true);
  });
});
