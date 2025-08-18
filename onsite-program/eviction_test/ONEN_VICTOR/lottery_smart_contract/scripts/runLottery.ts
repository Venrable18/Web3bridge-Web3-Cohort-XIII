import hre from "hardhat";

async function main() {
  const [deployer, ...others] = await hre.ethers.getSigners();
  const Lottery = await hre.ethers.getContractFactory("Lottery");
  const lottery = await Lottery.deploy();
  console.log(`Lottery deployed at: ${lottery.target}`);

  for (let i = 0; i < 10; i++) {
    const signer = others[i] ?? deployer;
    const tx = await lottery.connect(signer).enter({ value: hre.ethers.parseEther("0.01") });
    await tx.wait();
  }

  const winner = await lottery.lastWinner();
  console.log(`Winner for round 1: ${winner}`);

  for (let i = 0; i < 10; i++) {
    const signer = others[i] ?? deployer;
    const tx = await lottery.connect(signer).enter({ value: hre.ethers.parseEther("0.01") });
    await tx.wait();
  }

  const winner2 = await lottery.lastWinner();
  console.log(`Winner for round 2: ${winner2}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});


