const { loadFixture } = require("@nomicfoundation/hardhat-toolbox");
const { expect } = require("chai");
const hre = require("hardhat");

describe("TodoList Contract", function () {
  // Fixture to deploy the contract and set up initial state
  async function deployTodoListFixture() {
    const [owner, addr1] = await hre.ethers.getSigners();
    const TodoList = await hre.ethers.getContractFactory("TodoList");
    const todoList = await TodoList.deploy();
    await todoList.waitForDeployment();

    return { todoList, owner, addr1 };
  }

  describe("create_todo", function () {
    it("Should create a new todo", async function () {
      const { todoList } = await loadFixture(deployTodoListFixture);
      await todoList.create_todo("Test Todo", "Test Description");
      const todos = await todoList.get_todos();

      expect(todos.length).to.equal(1);
      expect(todos[0].title).to.equal("Test Todo");
      expect(todos[0].description).to.equal("Test Description");
      expect(todos[0].status).to.equal(false);
    });
  });

  describe("update_todo", function () {
    it("Should update an existing todo", async function () {
      const { todoList } = await loadFixture(deployTodoListFixture);
      await todoList.create_todo("Test Todo", "Test Description");
      await todoList.update_todo(0, "Updated Todo", "Updated Description");
      const todos = await todoList.get_todos();

      expect(todos[0].title).to.equal("Updated Todo");
      expect(todos[0].description).to.equal("Updated Description");
    });

    it("Should revert if index is invalid", async function () {
      const { todoList } = await loadFixture(deployTodoListFixture);
      await expect(
        todoList.update_todo(0, "Updated Todo", "Updated Description")
      ).to.be.revertedWith("Invalid index");
    });
  });

  describe("toggle_todo_status", function () {
    it("Should toggle todo status", async function () {
      const { todoList } = await loadFixture(deployTodoListFixture);
      await todoList.create_todo("Test Todo", "Test Description");
      await todoList.toggle_todo_status(0);
      let todos = await todoList.get_todos();
      expect(todos[0].status).to.equal(true);

      await todoList.toggle_todo_status(0);
      todos = await todoList.get_todos();
      expect(todos[0].status).to.equal(false);
    });

    it("Should revert if index is invalid", async function () {
      const { todoList } = await loadFixture(deployTodoListFixture);
      await expect(todoList.toggle_todo_status(0)).to.be.revertedWith("Invalid index");
    });
  });

  describe("get_todos", function () {
    it("Should return user's todos", async function () {
      const { todoList } = await loadFixture(deployTodoListFixture);
      await todoList.create_todo("Todo 1", "Description 1");
      await todoList.create_todo("Todo 2", "Description 2");
      const todos = await todoList.get_todos();

      expect(todos.length).to.equal(2);
      expect(todos[0].title).to.equal("Todo 1");
      expect(todos[1].title).to.equal("Todo 2");
    });

    it("Should return empty array for new user", async function () {
      const { todoList, addr1 } = await loadFixture(deployTodoListFixture);
      const todos = await todoList.connect(addr1).get_todos();
      expect(todos.length).to.equal(0);
    });
  });

  describe("delete_todo", function () {
    it("Should delete a todo", async function () {
      const { todoList } = await loadFixture(deployTodoListFixture);
      await todoList.create_todo("Test Todo", "Test Description");
      await todoList.delete_todo(0);
      const todos = await todoList.get_todos();

      expect(todos[0].title).to.equal("");
      expect(todos[0].description).to.equal("");
      expect(todos[0].status).to.equal(false);
    });

    it("Should revert if index is invalid", async function () {
      const { todoList } = await loadFixture(deployTodoListFixture);
      await expect(todoList.delete_todo(0)).to.be.revertedWith("Invalid index");
    });
  });

  describe("User isolation", function () {
    it("Should keep todos separate between users", async function () {
      const { todoList, owner, addr1 } = await loadFixture(deployTodoListFixture);
      await todoList.create_todo("Owner Todo", "Owner Description");
      await todoList.connect(addr1).create_todo("Addr1 Todo", "Addr1 Description");

      const ownerTodos = await todoList.get_todos();
      const addr1Todos = await todoList.connect(addr1).get_todos();

      expect(ownerTodos.length).to.equal(1);
      expect(addr1Todos.length).to.equal(1);
      expect(ownerTodos[0].title).to.equal("Owner Todo");
      expect(addr1Todos[0].title).to.equal("Addr1 Todo");
    });
  });
});