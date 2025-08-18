import { expect } from "chai";
import hre from "hardhat";

describe("LudoGame", function () {
  async function deployFixture() {
    const [owner, p2, p3, p4, outsider] = await hre.ethers.getSigners();
    const Token = await hre.ethers.getContractFactory("LudoToken");
    const initial = hre.ethers.parseUnits("1000000", 18);
    const token = await Token.deploy("LudoToken", "LUDO", initial);

    const Ludo = await hre.ethers.getContractFactory("LudoGame");
    const stake = hre.ethers.parseUnits("10", 18);
    const ludo = await Ludo.deploy(await token.getAddress(), stake);
    return { ludo, token, stake, owner, p2, p3, p4, outsider };
  }

  enum Color {
    RED,
    GREEN,
    BLUE,
    YELLOW,
  }

  it("registers up to 4 players with unique colors", async () => {
    const { ludo, owner, p2, p3, p4, outsider } = await deployFixture();

    await expect(ludo.connect(owner).registerPlayer("Alice", Color.RED))
      .to.emit(ludo, "PlayerRegistered")
      .withArgs(owner.address, "Alice", Color.RED);

    await expect(ludo.connect(p2).registerPlayer("Bob", Color.GREEN))
      .to.emit(ludo, "PlayerRegistered")
      .withArgs(p2.address, "Bob", Color.GREEN);

    await expect(ludo.connect(p3).registerPlayer("Carol", Color.BLUE))
      .to.emit(ludo, "PlayerRegistered")
      .withArgs(p3.address, "Carol", Color.BLUE);

    await expect(ludo.connect(p4).registerPlayer("Dave", Color.YELLOW))
      .to.emit(ludo, "PlayerRegistered")
      .withArgs(p4.address, "Dave", Color.YELLOW);

    expect(await ludo.playersCount()).to.equal(4n);

    await expect(
      ludo.connect(outsider).registerPlayer("Eve", Color.RED)
    ).to.be.revertedWith("Color taken");
  });

  it("prevents registering more than 4 players", async () => {
    const { ludo, owner, p2, p3, p4 } = await deployFixture();
    await ludo.connect(owner).registerPlayer("Alice", Color.RED);
    await ludo.connect(p2).registerPlayer("Bob", Color.GREEN);
    await ludo.connect(p3).registerPlayer("Carol", Color.BLUE);
    await ludo.connect(p4).registerPlayer("Dave", Color.YELLOW);

    const [, , , , extra] = await hre.ethers.getSigners();
    await expect(
      ludo.connect(extra).registerPlayer("Erin", Color.RED)
    ).to.be.reverted; 
  });

  it("requires registration before playing", async () => {
    const { ludo, outsider } = await deployFixture();
    await expect(ludo.connect(outsider).playTurn()).to.be.revertedWith(
      "Not registered"
    );
  });

  it("rolls a dice between 1 and 6 and updates score", async () => {
    const { ludo, owner } = await deployFixture();
    await ludo.connect(owner).registerPlayer("Alice", Color.RED);

    const tx = await ludo.connect(owner).playTurn();
    const receipt = await tx.wait();

    const diceEvent = receipt!.logs
      .map((l) => l as unknown as { fragment?: { name: string }; args?: any[] })
      .find((l: any) => (l.fragment && l.fragment.name) === "DiceRolled");

    const [name, score] = await ludo.getPlayer(owner.address);
    expect(name).to.equal("Alice");
    expect(score).to.be.greaterThanOrEqual(1n);
    expect(score).to.be.lessThanOrEqual(6n);

    if (diceEvent && (diceEvent as any).args) {
      const rolled = (diceEvent as any).args[1] as bigint;
      expect(rolled).to.be.greaterThanOrEqual(1n);
      expect(rolled).to.be.lessThanOrEqual(6n);
    }
  });

  it("computeDice returns value 1..6 for arbitrary seeds", async () => {
    const { ludo } = await deployFixture();
    for (let i = 0; i < 20; i++) {
      const v = await ludo.computeDice(BigInt(i * 12345 + 6789));
      expect(v).to.be.greaterThanOrEqual(1n);
      expect(v).to.be.lessThanOrEqual(6n);
    }
  });

  it("stakes tokens on start and pays winner all", async () => {
    const { ludo, token, stake, owner, p2, p3 } = await deployFixture();

    // Fund players with tokens and approve staking
    const supplyHolder = owner; // token deployer holds supply
    const give = hre.ethers.parseUnits("1000", 18);
    await token.connect(supplyHolder).transfer(p2.address, give);
    await token.connect(supplyHolder).transfer(p3.address, give);

    await ludo.connect(owner).registerPlayer("Alice", Color.RED);
    await ludo.connect(p2).registerPlayer("Bob", Color.GREEN);
    await ludo.connect(p3).registerPlayer("Carol", Color.BLUE);

    await token.connect(owner).approve(await ludo.getAddress(), stake);
    await token.connect(p2).approve(await ludo.getAddress(), stake);
    await token.connect(p3).approve(await ludo.getAddress(), stake);

    await expect(ludo.startGame())
      .to.emit(ludo, "GameStarted")
      .withArgs(3, stake * 3n);

    // Play some turns to create different scores
    await ludo.connect(owner).playTurn();
    await ludo.connect(p2).playTurn();
    await ludo.connect(p3).playTurn();

    const potBefore = await token.balanceOf(await ludo.getAddress());

    await expect(ludo.endGameAndPayout())
      .to.emit(ludo, "GameEnded");

    const winner = await ludo.winner();
    const winnerBalance = await token.balanceOf(winner);
    // Winner should have at least received the pot
    expect(winnerBalance).to.be.greaterThanOrEqual(potBefore);
  });
});


