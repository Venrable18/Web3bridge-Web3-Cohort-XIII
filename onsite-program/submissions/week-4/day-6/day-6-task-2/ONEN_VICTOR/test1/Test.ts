import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("ERC20 Contract", function () {
  async function deployERC20Fixture() {
    const [owner, addr1, addr2] = await hre.ethers.getSigners();
    const ERC20 = await hre.ethers.getContractFactory("ERC20");
    const token = await ERC20.deploy("DegenToken", "DGN", 18);
    return { token, owner, addr1, addr2 };
  }

  describe("Deployment", function () {
    it("Should set the correct name, symbol, and decimals", async function () {
      const { token } = await loadFixture(deployERC20Fixture);
      expect(await token.name()).to.equal("DegenToken");
      expect(await token.symbol()).to.equal("DGN");
      expect(await token.decimals()).to.equal(18);
    });

    it("Should set the correct owner", async function () {
      const { token, owner } = await loadFixture(deployERC20Fixture);
      expect(await token.owner()).to.equal(owner.address);
    });

    it("Should initialize totalSupply to zero", async function () {
      const { token } = await loadFixture(deployERC20Fixture);
      expect(await token.totalSupply()).to.equal(0);
    });
  });

  describe("Minting", function () {
    it("Should mint tokens and update balance and totalSupply", async function () {
      const { token, owner, addr1 } = await loadFixture(deployERC20Fixture);
      const amount = 1000n;
      await expect(token.connect(owner).mint(addr1.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(hre.ethers.ZeroAddress, addr1.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(amount);
      expect(await token.totalSupply()).to.equal(amount);
    });

    it("Should revert if minting to zero address", async function () {
      const { token, owner } = await loadFixture(deployERC20Fixture);
      await expect(token.connect(owner).mint(hre.ethers.ZeroAddress, 1000n))
        .to.be.revertedWith("Mint to zero address");
    });

    it("Should revert if minting by non-owner", async function () {
      const { token, addr1 } = await loadFixture(deployERC20Fixture);
      await expect(token.connect(addr1).mint(addr1.address, 1000n))
        .to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Burning", function () {
    it("Should burn tokens and update balance and totalSupply", async function () {
      const { token, owner, addr1 } = await loadFixture(deployERC20Fixture);
      const mintAmount = 1000n;
      const burnAmount = 400n;
      await token.connect(owner).mint(addr1.address, mintAmount);
      await expect(token.connect(owner).burn(addr1.address, burnAmount))
        .to.emit(token, "Transfer")
        .withArgs(addr1.address, hre.ethers.ZeroAddress, burnAmount);
      expect(await token.balanceOf(addr1.address)).to.equal(mintAmount - burnAmount);
      expect(await token.totalSupply()).to.equal(mintAmount - burnAmount);
    });

    it("Should revert if burning from zero address", async function () {
      const { token, owner } = await loadFixture(deployERC20Fixture);
      await expect(token.connect(owner).burn(hre.ethers.ZeroAddress, 100n))
        .to.be.revertedWith("Burn from zero address");
    });

    it("Should revert if burn amount exceeds balance", async function () {
      const { token, owner, addr1 } = await loadFixture(deployERC20Fixture);
      await token.connect(owner).mint(addr1.address, 100n);
      await expect(token.connect(owner).burn(addr1.address, 200n))
        .to.be.revertedWith("Insufficient balance");
    });

    it("Should revert if burning by non-owner", async function () {
      const { token, addr1 } = await loadFixture(deployERC20Fixture);
      await expect(token.connect(addr1).burn(addr1.address, 100n))
        .to.be.revertedWith("Only owner can call this function");
    });
  });

  describe("Transfers", function () {
    it("Should transfer tokens between accounts", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployERC20Fixture);
      const amount = 500n;
      await token.connect(owner).mint(addr1.address, 1000n);
      await expect(token.connect(addr1).transfer(addr2.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(addr1.address, addr2.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(1000n - amount);
      expect(await token.balanceOf(addr2.address)).to.equal(amount);
    });

    it("Should revert if transferring to zero address", async function () {
      const { token, owner, addr1 } = await loadFixture(deployERC20Fixture);
      await token.connect(owner).mint(addr1.address, 1000n);
      await expect(token.connect(addr1).transfer(hre.ethers.ZeroAddress, 100n))
        .to.be.revertedWith("Transfer to zero address");
    });

    it("Should revert if transfer amount exceeds balance", async function () {
      const { token, addr1, addr2 } = await loadFixture(deployERC20Fixture);
      await expect(token.connect(addr1).transfer(addr2.address, 100n))
        .to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Approvals and TransferFrom", function () {
    it("Should approve and allow transferFrom", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployERC20Fixture);
      const amount = 300n;
      await token.connect(owner).mint(addr1.address, 1000n);
      await expect(token.connect(addr1).approve(addr2.address, amount))
        .to.emit(token, "Approval")
        .withArgs(addr1.address, addr2.address, amount);
      expect(await token.allowance(addr1.address, addr2.address)).to.equal(amount);
      await expect(token.connect(addr2).transferFrom(addr1.address, addr2.address, amount))
        .to.emit(token, "Transfer")
        .withArgs(addr1.address, addr2.address, amount);
      expect(await token.balanceOf(addr1.address)).to.equal(1000n - amount);
      expect(await token.balanceOf(addr2.address)).to.equal(amount);
      expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);
    });

    it("Should revert if approving to zero address", async function () {
      const { token, addr1 } = await loadFixture(deployERC20Fixture);
      await expect(token.connect(addr1).approve(hre.ethers.ZeroAddress, 100n))
        .to.be.revertedWith("Approve to zero address");
    });

    it("Should revert if transferFrom sender is zero address", async function () {
      const { token, addr1, addr2 } = await loadFixture(deployERC20Fixture);
      await expect(token.connect(addr2).transferFrom(hre.ethers.ZeroAddress, addr2.address, 100n))
        .to.be.revertedWith("Sender is zero address");
    });

    it("Should revert if transferFrom recipient is zero address", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployERC20Fixture);
      await token.connect(owner).mint(addr1.address, 1000n);
      await token.connect(addr1).approve(addr2.address, 100n);
      await expect(token.connect(addr2).transferFrom(addr1.address, hre.ethers.ZeroAddress, 100n))
        .to.be.revertedWith("Recipient is zero address");
    });

    it("Should revert if transferFrom exceeds allowance", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployERC20Fixture);
      await token.connect(owner).mint(addr1.address, 1000n);
      await token.connect(addr1).approve(addr2.address, 200n);
      await expect(token.connect(addr2).transferFrom(addr1.address, addr2.address, 300n))
        .to.be.revertedWith("Insufficient allowance");
    });

    it("Should revert if transferFrom exceeds balance", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployERC20Fixture);
      await token.connect(owner).mint(addr1.address, 100n);
      await token.connect(addr1).approve(addr2.address, 200n);
      await expect(token.connect(addr2).transferFrom(addr1.address, addr2.address, 200n))
        .to.be.revertedWith("Insufficient balance");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle zero amount transfers", async function () {
      const { token, owner, addr1, addr2 } = await loadFixture(deployERC20Fixture);
      await token.connect(owner).mint(addr1.address, 1000n);
      await expect(token.connect(addr1).transfer(addr2.address, 0))
        .to.emit(token, "Transfer")
        .withArgs(addr1.address, addr2.address, 0);
      expect(await token.balanceOf(addr1.address)).to.equal(1000n);
      expect(await token.balanceOf(addr2.address)).to.equal(0);
    });

    it("Should handle zero amount approvals", async function () {
      const { token, addr1, addr2 } = await loadFixture(deployERC20Fixture);
      await expect(token.connect(addr1).approve(addr2.address, 0))
        .to.emit(token, "Approval")
        .withArgs(addr1.address, addr2.address, 0);
      expect(await token.allowance(addr1.address, addr2.address)).to.equal(0);
    });
  });
});