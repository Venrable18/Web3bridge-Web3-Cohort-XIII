import { loadFixture } from "@nomicfoundation/hardhat-toolbox/network-helpers";
import { expect } from "chai";
import hre from "hardhat";


describe("ERC20", async function () {
    async function erc20TokenDeploy() {
        const ERC20 = await hre.ethers.getContractFactory("ERC20");
        const erc20 = await  ERC20.deploy("Vic", "V", 18); 

        const [owner, addr1, addr2] = await hre.ethers.getSigners(); 

        return { erc20, owner, addr1, addr2 }; 

    }
    describe("Transfer", function () {
        it("Should transfer a token to an account", async function () {
            const { erc20, owner, addr1, addr2 } = await loadFixture(erc20TokenDeploy);

            // AAA - Arrange Act Assert 
            const amount = await hre.ethers.parseEther("100"); 
            const amountSent = await hre.ethers.parseEther("50");

            await erc20.connect(owner).mint(addr1.address, amount);  
             await erc20.connect(addr1).transfer(addr2.address, amountSent);
            const balance1 = await erc20.balanceOf(addr1); 
            const balance2 = await erc20.balanceOf(addr2); 

            expect(balance1).to.equal(amount - amountSent); 
            expect(balance2).to.equal(amountSent); 

            expect(
                erc20.connect(addr1).transfer(addr2.address, amountSent)
            ).to.emit(erc20, "Transfer").withArgs(addr1.address, addr2.address, amount);
        })
        it("Should fail if have the amount is greater than balance", async function () {
            const { erc20, owner, addr1, addr2 } = await loadFixture(erc20TokenDeploy); 

            const amount = await hre.ethers.parseEther("100"); 
            const amountGreaterThan  = await hre.ethers.parseEther("1000"); 
            
            await erc20.connect(owner).mint(addr1.address, amount); 
            
            expect(
                erc20.connect(addr1).transfer(addr2.address, amountGreaterThan)
            ).to.revertedWith("Insufficient balance")
        })
    })
})