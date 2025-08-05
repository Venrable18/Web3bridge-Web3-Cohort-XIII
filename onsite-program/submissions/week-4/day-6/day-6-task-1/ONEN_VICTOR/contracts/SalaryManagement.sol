// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

import "./IsalaryManagement.sol";

contract SalaryManagement is ISalaryManagement {
    address public owner;
    mapping(address => Staff) public staffMembers;
    address[] public registeredStaff;
    
    modifier onlyOwner() {
        if (msg.sender != owner) revert OnlyOwner();
        _;
    }
    
    modifier staffExists(address _staffAddress) {
        if (!staffMembers[_staffAddress].isRegistered) revert StaffNotRegistered();
        _;
    }
    
    modifier staffActive(address _staffAddress) {
        if (staffMembers[_staffAddress].status != Status.ACTIVE) revert StaffNotActive();
        _;
    }
    
    constructor() {
        owner = msg.sender;
    }
    
  
    function registerStaff(
        address _staffAddress, 
        string memory _name, 
        Role _role, 
        uint256 _salary
    ) external onlyOwner {
        if (staffMembers[_staffAddress].isRegistered) revert StaffAlreadyRegistered();
        if (_salary == 0) revert InvalidAmount();
        
        Staff memory newStaff = Staff({
            name: _name,
            role: _role,
            status: Status.PROBATION, // New staff start on probation
            salary: _salary,
            totalPaid: 0,
            registrationDate: block.timestamp,
            isRegistered: true
        });
        
        staffMembers[_staffAddress] = newStaff;

        registeredStaff.push(_staffAddress);
        
        emit StaffRegistered(_staffAddress, _name, _role, _salary);
    }
    
  
    function paySalary(address _staffAddress) external payable onlyOwner staffExists(_staffAddress) staffActive(_staffAddress) {
       
        Staff storage staff = staffMembers[_staffAddress];
        
        if (msg.value != staff.salary) revert InvalidAmount();

        if (address(this).balance < staff.salary) revert InsufficientBalance();
        
        staff.totalPaid += staff.salary;
        
        // Transfer salary to staff member
        (bool success, ) = _staffAddress.call{value: staff.salary}("");

        require(success, "Transfer failed");
        
        emit SalaryPaid(_staffAddress, staff.salary, block.timestamp);
    }
    
    function updateStaffStatus(address _staffAddress, Status _newStatus) external onlyOwner staffExists(_staffAddress) {
       
        staffMembers[_staffAddress].status = _newStatus;

        emit StatusUpdated(_staffAddress, _newStatus);
    }
    
  
    function getStaffDetails(address _staffAddress) external view returns (Staff memory) {

        if (!staffMembers[_staffAddress].isRegistered) revert StaffNotRegistered();

        return staffMembers[_staffAddress];
    }
    
  
    function getContractBalance() external view returns (uint256) {

        return address(this).balance;
    }
    
  
    function withdrawFunds() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "No funds to withdraw");
        
        (bool success, ) = owner.call{value: balance}("");
        require(success, "Transfer failed");
    }
    
  
    function getAllRegisteredStaff() external view returns (address[] memory) {

        return registeredStaff;
    }
    
  
    function getStaffCount() external view returns (uint256) {

        return registeredStaff.length;
    }
    

    function isStaffActive(address _staffAddress) external view returns (bool) {

        if (!staffMembers[_staffAddress].isRegistered) return false;

        return staffMembers[_staffAddress].status == Status.ACTIVE;
    }
    
 
    function getTotalPaid(address _staffAddress) external view staffExists(_staffAddress) returns (uint256) {

        return staffMembers[_staffAddress].totalPaid;
    }
    
   
    function transferOwnership(address _newOwner) external onlyOwner {

        require(_newOwner != address(0), "Invalid new owner");

        owner = _newOwner;
    }
    
    // Fallback function to receive ETH
    receive() external payable {}
}



