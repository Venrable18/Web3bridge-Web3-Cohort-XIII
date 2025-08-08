import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";

describe("Multisig", function () {
  // Fixture for deploying the Multisig contract
  async function deployMultisigFixture() {
    // Get signers
    const [owner1, owner2, owner3, owner4, nonOwner] = await hre.ethers.getSigners();
    const owners = [owner1.address, owner2.address, owner3.address];
    const requiredSignatures = 2;

    // Deploy Multisig contract
    const Multisig = await hre.ethers.getContractFactory("Multisig");
    const multisig = await Multisig.deploy(owners, requiredSignatures);

    return {
      multisig,
      owners,
      requiredSignatures,
      owner1,
      owner2,
      owner3,
      owner4,
      nonOwner
    };
  }

  describe("Deployment", function () {
    it("Should deploy with correct owners and required signatures", async function () {
      const { multisig, owners, requiredSignatures } = await loadFixture(deployMultisigFixture);

      const contractOwners = await multisig.getOwners();
      const contractRequiredSignatures = await multisig.getRequiredSignatures();

      expect(contractOwners).to.deep.equal(owners);
      expect(contractRequiredSignatures).to.equal(requiredSignatures);
    });

    it("Should correctly identify owners", async function () {
      const { multisig, owner1, owner2, owner3, nonOwner } = await loadFixture(deployMultisigFixture);

      expect(await multisig.isOwner(owner1.address)).to.be.true;
      expect(await multisig.isOwner(owner2.address)).to.be.true;
      expect(await multisig.isOwner(owner3.address)).to.be.true;
      expect(await multisig.isOwner(nonOwner.address)).to.be.false;
    });

    it("Should revert if no owners provided", async function () {
      const Multisig = await hre.ethers.getContractFactory("Multisig");
      
      await expect(Multisig.deploy([], 1))
        .to.be.revertedWith("At least one owner required");
    });

    it("Should revert if required signatures is 0", async function () {
      const [owner1] = await hre.ethers.getSigners();
      const Multisig = await hre.ethers.getContractFactory("Multisig");
      
      await expect(Multisig.deploy([owner1.address], 0))
        .to.be.revertedWith("Invalid number of required signatures");
    });

    it("Should revert if required signatures exceeds number of owners", async function () {
      const [owner1, owner2] = await hre.ethers.getSigners();
      const Multisig = await hre.ethers.getContractFactory("Multisig");
      
      await expect(Multisig.deploy([owner1.address, owner2.address], 3))
        .to.be.revertedWith("Invalid number of required signatures");
    });
  });

  describe("Transaction Submission", function () {
    it("Should allow owners to submit transactions", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      const value = hre.ethers.parseEther("1");
      const data = "0x";

      await expect(multisig.connect(owner1).submitTransaction(owner2.address, value, data))
        .to.emit(multisig, "TransactionCreated")
        .withArgs(0, owner2.address, value, data);
    });

    it("Should revert if non-owner tries to submit transaction", async function () {
      const { multisig, nonOwner, owner2 } = await loadFixture(deployMultisigFixture);
      const value = hre.ethers.parseEther("1");
      const data = "0x";

      await expect(multisig.connect(nonOwner).submitTransaction(owner2.address, value, data))
        .to.be.revertedWith("Not an owner!");
    });

    it("Should revert if destination address is zero", async function () {
      const { multisig, owner1 } = await loadFixture(deployMultisigFixture);
      const value = hre.ethers.parseEther("1");
      const data = "0x";

      await expect(multisig.connect(owner1).submitTransaction(hre.ethers.ZeroAddress, value, data))
        .to.be.revertedWith("Invalid destination address");
    });

    it("Should create transaction with correct details", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      const value = hre.ethers.parseEther("1");
      const data = "0x1234";

      await multisig.connect(owner1).submitTransaction(owner2.address, value, data);

      const [to, txValue, txData, executed, signatureCount] = await multisig.getTransaction(0);
      expect(to).to.equal(owner2.address);
      expect(txValue).to.equal(value);
      expect(txData).to.equal(data);
      expect(executed).to.be.false;
      expect(signatureCount).to.equal(0);
    });
  });

  describe("Transaction Signing", function () {
    it("Should allow owners to sign transactions", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      const value = hre.ethers.parseEther("1");
      const data = "0x";

      await multisig.connect(owner1).submitTransaction(owner2.address, value, data);

      await expect(multisig.connect(owner1).signTransaction(0))
        .to.emit(multisig, "TransactionSigned")
        .withArgs(0, owner1.address);
    });

    it("Should revert if non-owner tries to sign", async function () {
      const { multisig, owner1, owner2, nonOwner } = await loadFixture(deployMultisigFixture);
      const value = hre.ethers.parseEther("1");
      const data = "0x";

      await multisig.connect(owner1).submitTransaction(owner2.address, value, data);

      await expect(multisig.connect(nonOwner).signTransaction(0))
        .to.be.revertedWith("Only owners can sign transactions");
    });

    it("Should revert if transaction doesn't exist", async function () {
      const { multisig, owner1 } = await loadFixture(deployMultisigFixture);

      await expect(multisig.connect(owner1).signTransaction(0))
        .to.be.revertedWith("Invalid transaction ID");
    });

    it("Should revert if owner tries to sign twice", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      const value = hre.ethers.parseEther("1");
      const data = "0x";

      await multisig.connect(owner1).submitTransaction(owner2.address, value, data);
      await multisig.connect(owner1).signTransaction(0);

      await expect(multisig.connect(owner1).signTransaction(0))
        .to.be.revertedWith("Transaction already signed by this owner");
    });

    it("Should update signature count correctly", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);
      const value = hre.ethers.parseEther("1");
      const data = "0x";

      // Fund the multisig to prevent execution failure
      await owner1.sendTransaction({
        to: await multisig.getAddress(),
        value: hre.ethers.parseEther("2")
      });

      await multisig.connect(owner1).submitTransaction(owner2.address, value, data);

      // Sign with first owner
      await multisig.connect(owner1).signTransaction(0);
      let [, , , , signatureCount] = await multisig.getTransaction(0);
      expect(signatureCount).to.equal(1);

      // Sign with third owner (not the recipient to avoid gas calculation issues)
      await multisig.connect(owner3).signTransaction(0);
      [, , , , signatureCount] = await multisig.getTransaction(0);
      expect(signatureCount).to.equal(2);
    });
  });

  describe("Transaction Execution", function () {
    it("Should automatically execute when required signatures reached", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      
      // Fund the multisig
      await owner1.sendTransaction({
        to: await multisig.getAddress(),
        value: hre.ethers.parseEther("2")
      });

      const value = hre.ethers.parseEther("1");
      const data = "0x";

      await multisig.connect(owner1).submitTransaction(owner2.address, value, data);
      await multisig.connect(owner1).signTransaction(0);

      // This should trigger execution
      await expect(multisig.connect(owner2).signTransaction(0))
        .to.emit(multisig, "TransactionExecuted")
        .withArgs(0, owner2.address);

      const [, , , executed] = await multisig.getTransaction(0);
      expect(executed).to.be.true;
    });

    it("Should transfer ETH correctly", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      
      const value = hre.ethers.parseEther("1");
      const initialBalance = await hre.ethers.provider.getBalance(owner2.address);

      // Fund the multisig
      await owner1.sendTransaction({
        to: await multisig.getAddress(),
        value: hre.ethers.parseEther("2")
      });

      await multisig.connect(owner1).submitTransaction(owner2.address, value, "0x");
      await multisig.connect(owner1).signTransaction(0);
      await multisig.connect(owner2).signTransaction(0);

      const finalBalance = await hre.ethers.provider.getBalance(owner2.address);
      expect(finalBalance - initialBalance).to.be.closeTo(value, hre.ethers.parseEther("0.01")); // Account for gas costs
    });

    it("Should execute transactions with data", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      
      // Fund the multisig
      await owner1.sendTransaction({
        to: await multisig.getAddress(),
        value: hre.ethers.parseEther("2")
      });

      // Test with some arbitrary data
      const data = "0x1234567890abcdef";

      await multisig.connect(owner1).submitTransaction(owner2.address, hre.ethers.parseEther("1"), data);
      await multisig.connect(owner1).signTransaction(0);
      
      await expect(multisig.connect(owner2).signTransaction(0))
        .to.emit(multisig, "TransactionExecuted")
        .withArgs(0, owner2.address);

      const [, , , executed] = await multisig.getTransaction(0);
      expect(executed).to.be.true;
    });

    it("Should revert if transaction execution fails", async function () {
      const { multisig, owner1, owner2 } = await loadFixture(deployMultisigFixture);
      
      // Try to send more ETH than available
      const value = hre.ethers.parseEther("10");

      await multisig.connect(owner1).submitTransaction(owner2.address, value, "0x");
      await multisig.connect(owner1).signTransaction(0);

      await expect(multisig.connect(owner2).signTransaction(0))
        .to.be.revertedWith("Transaction execution failed");
    });

    it("Should revert if trying to sign already executed transaction", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);
      
      // Fund the multisig
      await owner1.sendTransaction({
        to: await multisig.getAddress(),
        value: hre.ethers.parseEther("2")
      });

      await multisig.connect(owner1).submitTransaction(owner2.address, hre.ethers.parseEther("1"), "0x");
      await multisig.connect(owner1).signTransaction(0);
      await multisig.connect(owner2).signTransaction(0); // This executes the transaction

      await expect(multisig.connect(owner3).signTransaction(0))
        .to.be.revertedWith("Transaction already executed");
    });
  });

  describe("Receive Function", function () {
    it("Should accept ETH transfers", async function () {
      const { multisig, owner1 } = await loadFixture(deployMultisigFixture);
      const value = hre.ethers.parseEther("1");

      await expect(owner1.sendTransaction({
        to: await multisig.getAddress(),
        value: value
      })).not.to.be.reverted;

      expect(await hre.ethers.provider.getBalance(await multisig.getAddress())).to.equal(value);
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple pending transactions", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);

      // Submit multiple transactions
      await multisig.connect(owner1).submitTransaction(owner2.address, 100, "0x");
      await multisig.connect(owner1).submitTransaction(owner3.address, 200, "0x");

      const [to1] = await multisig.getTransaction(0);
      const [to2] = await multisig.getTransaction(1);

      expect(to1).to.equal(owner2.address);
      expect(to2).to.equal(owner3.address);
    });

    it("Should handle all owners signing the same transaction", async function () {
      const { multisig, owner1, owner2, owner3 } = await loadFixture(deployMultisigFixture);
      
      // Fund the multisig
      await owner1.sendTransaction({
        to: await multisig.getAddress(),
        value: hre.ethers.parseEther("2")
      });

      await multisig.connect(owner1).submitTransaction(owner2.address, hre.ethers.parseEther("1"), "0x");
      await multisig.connect(owner1).signTransaction(0);
      await multisig.connect(owner2).signTransaction(0); // This should execute

      // Transaction should already be executed, so this should revert
      await expect(multisig.connect(owner3).signTransaction(0))
        .to.be.revertedWith("Transaction already executed");
    });
  });
});


