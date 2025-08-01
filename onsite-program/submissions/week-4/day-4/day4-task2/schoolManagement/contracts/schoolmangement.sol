// SPDX-License-Identifier: MIT

pragma solidity ^0.8.18;

contract SchoolManagementSystem{

    enum Status {
        ACTIVE,
        DEFERRED,
        RUSTICATED
    }
    
    struct StudentDetails {
        uint id;
        string name;
        string course;
        uint age;
        Status status;
    }
    
    error STUDENT_NOT_FOUND();
    error STUDENT_ALREADY_EXISTS();
    
    uint public uid;
    mapping(uint => StudentDetails) public students;
    mapping(uint => bool) public studentExists;
    uint[] public studentIds;

    function registerStudent(string memory name, string memory course, uint age) external {
        uid = uid + 1;
        
        if (studentExists[uid]) {
            revert STUDENT_ALREADY_EXISTS();
        }

        StudentDetails memory studentDetails = StudentDetails(uid, name, course, age, Status.ACTIVE);
        students[uid] = studentDetails;
        studentExists[uid] = true;
        studentIds.push(uid);
    }

    function updateStudent(uint256 studentId, string memory newName) external {
        if (!studentExists[studentId]) {
            revert STUDENT_NOT_FOUND();
        }

        students[studentId].name = newName;
    }

    function updateStudentStatus(uint256 studentId, Status newStatus) external {
        if (!studentExists[studentId]) {
            revert STUDENT_NOT_FOUND();
        }
        
        students[studentId].status = newStatus;
    }

    function getAllStudents() external view returns (StudentDetails[] memory) {
        StudentDetails[] memory allStudents = new StudentDetails[](studentIds.length);
        
        for (uint i = 0; i < studentIds.length; i++) {
            allStudents[i] = students[studentIds[i]];
        }
        
        return allStudents;
    }

    function getStudentById(uint256 studentId) external view returns (StudentDetails memory) {
        if (!studentExists[studentId]) {
            revert STUDENT_NOT_FOUND();
        }
        
        return students[studentId];
    }

    function deleteStudent(uint256 studentId) external {
        if (!studentExists[studentId]) {
            revert STUDENT_NOT_FOUND();
        }
        
        delete students[studentId];
        studentExists[studentId] = false;
        
        for (uint i = 0; i < studentIds.length; i++) {
            if (studentIds[i] == studentId) {
                studentIds[i] = studentIds[studentIds.length - 1];
                studentIds.pop();
                break;
            }
        }
    }
    
    function getStudentCount() external view returns (uint) {
        return studentIds.length;
    }
    
    function getStudentIds() external view returns (uint[] memory) {
        return studentIds;
    }
}