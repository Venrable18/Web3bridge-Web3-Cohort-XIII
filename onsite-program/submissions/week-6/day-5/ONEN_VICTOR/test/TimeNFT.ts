// test/TimeNFT.js
import { expect } from "chai";
import { ethers } from "hardhat";

describe("TimeNFT", function () {
  it("Should mint a new NFT and emit a Transfer event", async function () {
    const [owner] = await ethers.getSigners();
    const timeNFT = await ethers.deployContract("TimeNFT");

    await expect(timeNFT.mint())
      .to.emit(timeNFT, "Transfer")
      .withArgs(ethers.ZeroAddress, owner.address, 1n); // tokenId starts from 1
  });

  it("tokenURI should contain a valid Base64 SVG and current time", async function () {
    const timeNFT = await ethers.deployContract("TimeNFT");
    await timeNFT.mint();

    const tokenUri = await timeNFT.tokenURI(1);
    expect(tokenUri).to.include("data:application/json;base64,");

    // Decode the JSON metadata
    const base64Json = tokenUri.split(",")[1];
    const jsonMetadata = JSON.parse(
      Buffer.from(base64Json, "base64").toString()
    );

    expect(jsonMetadata).to.have.property("name");
    expect(jsonMetadata).to.have.property("image");
    expect(jsonMetadata.image).to.include("data:image/svg+xml;base64,");

    // Decode the SVG
    const base64Svg = jsonMetadata.image
      .split(",")[1]
      .split("?")[0]; // remove cache-busting param
    const svgContent = Buffer.from(base64Svg, "base64").toString();

    expect(svgContent).to.include("BLOCKCHAIN CLOCK");
    expect(svgContent).to.include(":"); // should contain time like "12:34:56"
  });
});
