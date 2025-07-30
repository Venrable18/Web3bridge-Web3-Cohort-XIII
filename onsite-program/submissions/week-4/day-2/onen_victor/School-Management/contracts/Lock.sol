// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract SchoolManagement {
    enum Status { ACTIVE, DEFERRED, RUSTICATED }

    struct Student {
        uint id;
        string name;
        uint age;
        Status status;
    }

    Student[] public students;
    uint private studentNextId = 1;

    function registerStudent(string memory _name, uint _age) external {
        students.push(Student({ id: studentNextId, name: _name, age: _age, status: Status.ACTIVE }));
        studentNextId++;
    }

   function updateStudent(uint _id, string memory _name, uint _age) external {
        (bool found, uint index) = findStudentIndex(_id);
        require(found, "Student not found");
        students[index].name = _name;
        students[index].age = _age;
    }




    function deleteStudent(uint _id) external { 
        (bool found, uint index) = findStudentIndex(_id);
        require(found, "Student not found");
        // Please this is my suggestion;
        // I think the student status should just be changed to RUSTICATED..
        // Since it's not appropriate to just delete a student data like that for record purposes.
        students[index].status = Status.RUSTICATED;
    }

    function getStudent(uint _id) external view returns (Student memory) {
        (bool found, uint index) = findStudentIndex(_id);
        require(found, "Student not found");
        return students[index];
    }

    function getAllStudents() external view returns (Student[] memory) {
        return students;
    }

     function findStudentIndex(uint _id) internal view returns (bool, uint) {
        for (uint i = 0; i < students.length; i++) {
            if (students[i].id == _id) {
                return (true, i);
            }
        }
        return (false, 0);
    }
}