//SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract TodoList {
   struct Todo{
       string title;
       string description;
       bool status;
   }

   // Mapping from user address to their todos
   mapping(address => Todo[]) public userTodos;

   function create_todo(string memory _title, string memory _description) external {
       Todo memory new_todo_ = Todo({
           title: _title, 
           status: false, 
           description: _description
       });
       userTodos[msg.sender].push(new_todo_);
   }
   
   function update_todo(uint256 _index, string memory _new_title, string memory _new_description) external {
       require(_index < userTodos[msg.sender].length, "Invalid index");
       userTodos[msg.sender][_index].title = _new_title;
       userTodos[msg.sender][_index].description = _new_description;
   }

   function toggle_todo_status(uint256 _index) external {
       require(_index < userTodos[msg.sender].length, "Invalid index");
       userTodos[msg.sender][_index].status = !userTodos[msg.sender][_index].status;
   }

   function get_todos() external view returns (Todo[] memory) {
       return userTodos[msg.sender];
   }

   function delete_todo(uint256 _index) external {
       require(_index < userTodos[msg.sender].length, "Invalid index");
       delete userTodos[msg.sender][_index];
   }
}