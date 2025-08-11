import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("PiggyVest (beginner-friendly tests)", function () {
  async function deployFixture() {
    const [owner, user, user2] = await hre.ethers.getSigners();
    const PiggyVest = await hre.ethers.getContractFactory("PiggyVest");
    const piggyVest = await PiggyVest.connect(owner).deploy();

    const TestToken = await hre.ethers.getContractFactory("TestToken");
    const token = await TestToken.deploy("TestToken", "TT");
    await (token as any).mint(user.address, hre.ethers.parseEther("100"));

    return { piggyVest, owner, user, user2, token };
  }

  it("creates an ETH saving", async () => {
    const { piggyVest, user } = await loadFixture(deployFixture);

    await piggyVest.connect(user).createSaving(
      "My ETH Save",
      "UserOne",
      0, // AssetType.ETH
      hre.ethers.ZeroAddress,
      0,
      0,
      { value: hre.ethers.parseEther("1") }
    );

    const savings = await piggyVest.getUserSavings(user.address);
    expect(savings.length).to.equal(1);
    expect(savings[0].amount).to.equal(hre.ethers.parseEther("1"));
  });

  it("creates an ERC20 saving", async () => {
    const { piggyVest, user, token } = await loadFixture(deployFixture);

    await (token as any).connect(user).approve(await piggyVest.getAddress(), hre.ethers.parseEther("10"));
    await piggyVest.connect(user).createSaving(
      "My Token Save",
      "UserOne",
      1, // AssetType.ERC20
      await (token as any).getAddress(),
      hre.ethers.parseEther("10"),
      0
    );

    const savings = await piggyVest.getUserSavings(user.address);
    expect(savings.length).to.equal(1);
    expect(savings[0].amount).to.equal(hre.ethers.parseEther("10"));
  });

  it("withdraws ETH with penalty if early", async () => {
    const { piggyVest, user } = await loadFixture(deployFixture);

    await piggyVest.connect(user).createSaving(
      "Early Save",
      "UserOne",
      0,
      hre.ethers.ZeroAddress,
      0,
      60 * 60 * 24 * 30,
      { value: hre.ethers.parseEther("1") }
    );

    await piggyVest.connect(user).withdrawSaving(0);

    const savings = await piggyVest.getUserSavings(user.address);
    expect(savings[0].withdrawn).to.be.true;
  });

  it("withdraws ERC20 after maturity with no penalty", async () => {
    const { piggyVest, user, token } = await loadFixture(deployFixture);
    const amount = hre.ethers.parseEther("5");
    const lock = 7 * 24 * 60 * 60;

    await (token as any).connect(user).approve(await piggyVest.getAddress(), amount);
    await piggyVest.connect(user).createSaving(
      "Mature Token Save",
      "UserOne",
      1,
      await (token as any).getAddress(),
      amount,
      lock
    );

    await time.increase(lock + 1);
    await piggyVest.connect(user).withdrawSaving(0);

    const savings = await piggyVest.getUserSavings(user.address);
    expect(savings[0].withdrawn).to.be.true;
  });

  it("reverts if trying to withdraw twice", async () => {
    const { piggyVest, user } = await loadFixture(deployFixture);

    await piggyVest.connect(user).createSaving(
      "One-time Save",
      "UserOne",
      0,
      hre.ethers.ZeroAddress,
      0,
      0,
      { value: hre.ethers.parseEther("1") }
    );

    await piggyVest.connect(user).withdrawSaving(0);

    await expect(piggyVest.connect(user).withdrawSaving(0)).to.be.revertedWithCustomError(
      piggyVest,
      "AlreadyWithdrawn"
    );
  });

  it("checks maturity after time passes", async () => {
    const { piggyVest, user } = await loadFixture(deployFixture);

    const lockPeriod = 60 * 60 * 24 * 7;

    await piggyVest.connect(user).createSaving(
      "Mature Save",
      "UserOne",
      0,
      hre.ethers.ZeroAddress,
      0,
      lockPeriod,
      { value: hre.ethers.parseEther("1") }
    );

    await time.increase(lockPeriod + 1);

    const isMature = await piggyVest.connect(user).isMature(0);
    expect(isMature).to.equal(true);
  });

  it("reverts if maturity check fails for unknown ID", async () => {
    const { piggyVest, user } = await loadFixture(deployFixture);

    await expect(piggyVest.connect(user).isMature(999)).to.be.revertedWithCustomError(
      piggyVest,
      "SavingNotFound"
    );
  });

  it("owner can change penalty percent", async () => {
    const { piggyVest, owner } = await loadFixture(deployFixture);
    await piggyVest.connect(owner).changePenaltyPercent(10);
    // Read public var
    expect(await piggyVest.penaltyPercent()).to.equal(10);
  });
});
