// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

// Uncomment this line to use console.log
// import "hardhat/console.sol";

interface ISalaryManagement {
    enum Role {MENTOR, ADMIN, SECURITY, TEACHER}
    enum Status {ACTIVE, INACTIVE, TERMINATED, PROBATION}
    
    struct Staff {
        string name;
        Role role;
        Status status;
        uint256 salary;
        uint256 totalPaid;
        uint256 registrationDate;
        bool isRegistered;
    }
    
    // Events
    event StaffRegistered(address indexed staffAddress, string name, Role role, uint256 salary);
    event SalaryPaid(address indexed staffAddress, uint256 amount, uint256 timestamp);
    event StatusUpdated(address indexed staffAddress, Status newStatus);
    
    // Errors
    error StaffNotRegistered();
    error StaffNotActive();
    error InsufficientBalance();
    error InvalidAmount();
    error OnlyOwner();
    error StaffAlreadyRegistered();
    
    // Functions
    function registerStaff(address _staffAddress, string memory _name, Role _role, uint256 _salary) external;
    
    function paySalary(address _staffAddress) external payable;
    function updateStaffStatus(address _staffAddress, Status _newStatus) external;
    function getStaffDetails(address _staffAddress) external view returns (Staff memory);
    function getContractBalance() external view returns (uint256);
    function withdrawFunds() external;
}