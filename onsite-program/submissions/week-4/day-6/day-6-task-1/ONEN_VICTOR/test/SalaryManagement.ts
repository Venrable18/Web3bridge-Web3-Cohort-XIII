import {
    loadFixture
} from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";
import { SalaryManagement } from "../typechain-types";

describe("SalaryManagement", function () {
  let salaryManagement: SalaryManagement;
  let owner: any;
  let teacher1: any;
  let teacher2: any;
  let admin: any;
  let mentor: any;

  async function deploySalaryManagementFixture() {
    const [owner, teacher1, teacher2, admin, mentor] = await hre.ethers.getSigners();
    
    const SalaryManagementFactory = await hre.ethers.getContractFactory("SalaryManagement");
    const salaryManagement = await SalaryManagementFactory.deploy();
    
    return { salaryManagement, owner, teacher1, teacher2, admin, mentor };
  }

  beforeEach(async function () {
    const fixture = await loadFixture(deploySalaryManagementFixture);
    salaryManagement = fixture.salaryManagement;
    owner = fixture.owner;
    teacher1 = fixture.teacher1;
    teacher2 = fixture.teacher2;
    admin = fixture.admin;
    mentor = fixture.mentor;
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await salaryManagement.owner()).to.equal(owner.address);
    });

    it("Should start with zero staff", async function () {
      expect(await salaryManagement.getStaffCount()).to.equal(0);
    });
  });

  describe("Staff Registration", function () {
    it("Should register a new teacher", async function () {
      const teacherSalary = hre.ethers.parseEther("2.5"); // 2.5 ETH per month
      
      await expect(salaryManagement.registerStaff(
        teacher1.address,
        "John Doe",
        3, 
        teacherSalary
      ))
        .to.emit(salaryManagement, "StaffRegistered")
        .withArgs(teacher1.address, "John Doe", 3, teacherSalary);

      expect(await salaryManagement.getStaffCount()).to.equal(1);
      
      const staffDetails = await salaryManagement.getStaffDetails(teacher1.address);
      expect(staffDetails.name).to.equal("John Doe");
      expect(staffDetails.role).to.equal(3); // TEACHER
      expect(staffDetails.status).to.equal(1); // PROBATION
      expect(staffDetails.salary).to.equal(teacherSalary);
      expect(staffDetails.totalPaid).to.equal(0);
      expect(staffDetails.isRegistered).to.be.true;
    });

    it("Should register different types of staff", async function () {
      const teacherSalary = hre.ethers.parseEther("2.5");
      const adminSalary = hre.ethers.parseEther("3.0");
      const mentorSalary = hre.ethers.parseEther("4.0");

      await salaryManagement.registerStaff(teacher1.address, "Teacher John", 3, teacherSalary);
      
      await salaryManagement.registerStaff(admin.address, "Admin Jane", 1, adminSalary);
      
      await salaryManagement.registerStaff(mentor.address, "Mentor Bob", 0, mentorSalary);

      expect(await salaryManagement.getStaffCount()).to.equal(3);
    });

    it("Should not allow non-owner to register staff", async function () {
      await expect(
        salaryManagement.connect(teacher1).registerStaff(
          teacher2.address,
          "Jane Doe",
          3,
          hre.ethers.parseEther("2.0")
        )
      ).to.be.revertedWithCustomError(salaryManagement, "OnlyOwner");
    });

    it("Should not allow registering staff with zero salary", async function () {
      await expect(
        salaryManagement.registerStaff(teacher1.address, "John Doe", 3, 0)
      ).to.be.revertedWithCustomError(salaryManagement, "InvalidAmount");
    });

    it("Should not allow registering the same staff twice", async function () {
      await salaryManagement.registerStaff(teacher1.address, "John Doe", 3, hre.ethers.parseEther("2.0"));
      
      await expect(
        salaryManagement.registerStaff(teacher1.address, "John Doe", 3, hre.ethers.parseEther("2.0")
      )).to.be.revertedWithCustomError(salaryManagement, "StaffAlreadyRegistered");
    });
  });

  describe("Status Management", function () {
    beforeEach(async function () {
      await salaryManagement.registerStaff(teacher1.address, "John Doe", 3, hre.ethers.parseEther("2.0"));
    });

    it("Should update staff status from probation to active", async function () {
      await expect(salaryManagement.updateStaffStatus(teacher1.address, 0)) // ACTIVE
        .to.emit(salaryManagement, "StatusUpdated")
        .withArgs(teacher1.address, 0);

      const staffDetails = await salaryManagement.getStaffDetails(teacher1.address);
      expect(staffDetails.status).to.equal(0); // ACTIVE
    });

    it("Should update staff status to terminated", async function () {
      await salaryManagement.updateStaffStatus(teacher1.address, 2); // TERMINATED

      const staffDetails = await salaryManagement.getStaffDetails(teacher1.address);
      expect(staffDetails.status).to.equal(2); // TERMINATED
    });

    it("Should not allow non-owner to update status", async function () {
      await expect(
        salaryManagement.connect(teacher1).updateStaffStatus(teacher1.address, 0)
      ).to.be.revertedWithCustomError(salaryManagement, "OnlyOwner");
    });

    it("Should not allow updating status for non-registered staff", async function () {
      await expect(
        salaryManagement.updateStaffStatus(teacher2.address, 0)
      ).to.be.revertedWithCustomError(salaryManagement, "StaffNotRegistered");
    });
  });

  describe("Salary Payment", function () {
    beforeEach(async function () {
      await salaryManagement.registerStaff(teacher1.address, "John Doe", 3, hre.ethers.parseEther("2.0"));
      await salaryManagement.updateStaffStatus(teacher1.address, 0); // Set to ACTIVE
    });

    it("Should pay salary to active staff", async function () {
      const initialBalance = await hre.ethers.provider.getBalance(teacher1.address);
      const salary = hre.ethers.parseEther("2.0");

      await expect(salaryManagement.paySalary(teacher1.address, { value: salary }))
        .to.emit(salaryManagement, "SalaryPaid")
        .withArgs(teacher1.address, salary, await hre.ethers.provider.getBlock("latest").then(block => block!.timestamp));

      const finalBalance = await hre.ethers.provider.getBalance(teacher1.address);
      expect(finalBalance).to.equal(initialBalance + salary);

      const staffDetails = await salaryManagement.getStaffDetails(teacher1.address);
      expect(staffDetails.totalPaid).to.equal(salary);
    });

    it("Should not pay salary to inactive staff", async function () {
      await salaryManagement.updateStaffStatus(teacher1.address, 1); // Set to INACTIVE

      await expect(
        salaryManagement.paySalary(teacher1.address, { value: hre.ethers.parseEther("2.0") })
      ).to.be.revertedWithCustomError(salaryManagement, "StaffNotActive");
    });

    it("Should not pay salary to terminated staff", async function () {
      await salaryManagement.updateStaffStatus(teacher1.address, 2); // Set to TERMINATED

      await expect(
        salaryManagement.paySalary(teacher1.address, { value: hre.ethers.parseEther("2.0") })
      ).to.be.revertedWithCustomError(salaryManagement, "StaffNotActive");
    });

    it("Should not pay salary to staff on probation", async function () {
      await salaryManagement.updateStaffStatus(teacher1.address, 3); // Set to PROBATION

      await expect(
        salaryManagement.paySalary(teacher1.address, { value: hre.ethers.parseEther("2.0") })
      ).to.be.revertedWithCustomError(salaryManagement, "StaffNotActive");
    });

    it("Should not pay salary with wrong amount", async function () {
      await expect(
        salaryManagement.paySalary(teacher1.address, { value: hre.ethers.parseEther("1.5") })
      ).to.be.revertedWithCustomError(salaryManagement, "InvalidAmount");
    });

    it("Should not allow non-owner to pay salary", async function () {
      await expect(
        salaryManagement.connect(teacher1).paySalary(teacher1.address, { value: hre.ethers.parseEther("2.0") })
      ).to.be.revertedWithCustomError(salaryManagement, "OnlyOwner");
    });

    it("Should track total paid amount correctly", async function () {
      const salary = hre.ethers.parseEther("2.0");

      await salaryManagement.paySalary(teacher1.address, { value: salary });
      await salaryManagement.paySalary(teacher1.address, { value: salary });

      const totalPaid = await salaryManagement.getTotalPaid(teacher1.address);
      expect(totalPaid).to.equal(salary * 2n);
    });
  });

  describe("Utility Functions", function () {
    beforeEach(async function () {
      await salaryManagement.registerStaff(teacher1.address, "John Doe", 3, hre.ethers.parseEther("2.0"));
      await salaryManagement.registerStaff(teacher2.address, "Jane Doe", 3, hre.ethers.parseEther("2.5"));
    });

    it("Should return all registered staff", async function () {
      const registeredStaff = await salaryManagement.getAllRegisteredStaff();
      expect(registeredStaff).to.include(teacher1.address);
      expect(registeredStaff).to.include(teacher2.address);
      expect(registeredStaff.length).to.equal(2);
    });

    it("Should check if staff is active", async function () {
      expect(await salaryManagement.isStaffActive(teacher1.address)).to.be.false; // On probation

      await salaryManagement.updateStaffStatus(teacher1.address, 0); // Set to ACTIVE
      expect(await salaryManagement.isStaffActive(teacher1.address)).to.be.true;

      await salaryManagement.updateStaffStatus(teacher1.address, 2); // Set to TERMINATED
      expect(await salaryManagement.isStaffActive(teacher1.address)).to.be.false;
    });

    it("Should get contract balance", async function () {
      await owner.sendTransaction({
        to: await salaryManagement.getAddress(),
        value: hre.ethers.parseEther("10.0")
      });

      const balance = await salaryManagement.getContractBalance();
      expect(balance).to.equal(hre.ethers.parseEther("10.0"));
    });

    it("Should allow owner to withdraw funds", async function () {
      const initialBalance = await hre.ethers.provider.getBalance(owner.address);
      
      await owner.sendTransaction({
        to: await salaryManagement.getAddress(),
        value: hre.ethers.parseEther("5.0")
      });

      await salaryManagement.withdrawFunds();

      const finalBalance = await hre.ethers.provider.getBalance(owner.address);
      expect(finalBalance).to.be.gt(initialBalance);
    });

    it("Should not allow non-owner to withdraw funds", async function () {
      await expect(
        salaryManagement.connect(teacher1).withdrawFunds()
      ).to.be.revertedWithCustomError(salaryManagement, "OnlyOwner");
    });
  });

  describe("Error Handling", function () {
    it("Should handle getting details of non-registered staff", async function () {
      await expect(
        salaryManagement.getStaffDetails(teacher1.address)
      ).to.be.revertedWithCustomError(salaryManagement, "StaffNotRegistered");
    });

    it("Should handle getting total paid for non-registered staff", async function () {
      await expect(
        salaryManagement.getTotalPaid(teacher1.address)
      ).to.be.revertedWithCustomError(salaryManagement, "StaffNotRegistered");
    });
  });

  describe("Complete Workflow", function () {
    it("Should handle complete staff lifecycle", async function () {
      await salaryManagement.registerStaff(teacher1.address, "John Doe", 3, hre.ethers.parseEther("2.0"));
      
      let staffDetails = await salaryManagement.getStaffDetails(teacher1.address);
      expect(staffDetails.status).to.equal(1); // PROBATION
      expect(await salaryManagement.isStaffActive(teacher1.address)).to.be.false;

      await salaryManagement.updateStaffStatus(teacher1.address, 0);
      expect(await salaryManagement.isStaffActive(teacher1.address)).to.be.true;

      const salary = hre.ethers.parseEther("2.0");
      await salaryManagement.paySalary(teacher1.address, { value: salary });
      
      staffDetails = await salaryManagement.getStaffDetails(teacher1.address);
      expect(staffDetails.totalPaid).to.equal(salary);

      await salaryManagement.updateStaffStatus(teacher1.address, 2);
      expect(await salaryManagement.isStaffActive(teacher1.address)).to.be.false;

      await expect(
        salaryManagement.paySalary(teacher1.address, { value: salary })
      ).to.be.revertedWithCustomError(salaryManagement, "StaffNotActive");
    });
  });
}); 