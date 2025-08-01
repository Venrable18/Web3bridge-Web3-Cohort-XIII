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

<<<<<<< HEAD
    function updateEmployee(
        address _wallet,
        string memory _name,
        Role _role,
        bool _isEmployed
    ) public {
        require(_wallet != address(0), "Invalid address");
        
        require(employees[_wallet].wallet != address(0), "Employee does not exist");
        employees[_wallet] = Employee(_name, _role, _isEmployed, _wallet);
        for (uint i = 0; i < allEmployees.length; i++) {
            if (allEmployees[i].wallet == _wallet) {
                allEmployees[i] = Employee(_name, _role, _isEmployed, _wallet);
                break;
            }
        }
    }
=======
  
>>>>>>> origin

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