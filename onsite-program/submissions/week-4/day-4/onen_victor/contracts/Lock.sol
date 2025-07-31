// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Web3BridgeGarageAccess {
    enum Role {
        MediaTeam,
        Mentors,
        Managers,
        SocialMediaTeam,
        TechnicianSupervisors,
        KitchenStaff
    }

    struct Employee {
        string name;
        Role role;
        bool isEmployed;
        address wallet;
    }

    mapping(address => Employee) public employees;
    Employee[] public allEmployees;

    function addEmployee(
        address _wallet,
        string memory _name,
        Role _role,
        bool _isEmployed
    ) public {
        require(_wallet != address(0), "Invalid address");
        require(employees[_wallet].wallet == address(0), "Employee already exists");
        Employee memory newEmp = Employee(_name, _role, _isEmployed, _wallet);
        employees[_wallet] = newEmp;
        allEmployees.push(newEmp);
    }

  

    function canAccessGarage(address _wallet) public view returns (bool) {
        Employee memory emp = employees[_wallet];
        if (!emp.isEmployed) {
            return false;
        }
        if (
            emp.role == Role.MediaTeam ||
            emp.role == Role.Mentors ||
            emp.role == Role.Managers
        ) {
            return true;
        }
        return false;
    }

    function getAllEmployees() public view returns (Employee[] memory) {
        return allEmployees;
    }

    function getEmployee(address _wallet) public view returns (Employee memory) {
        return employees[_wallet];
    }
}