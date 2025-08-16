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

    expect(jsonMetadata).to.have.property("name").that.equals("Dynamic Time NFT #1");
    expect(jsonMetadata).to.have.property("description").that.equals(
      "An NFT that displays the current blockchain time (updates when viewed)."
    );
    expect(jsonMetadata).to.have.property("image").that.includes("data:image/svg+xml;base64,");

    // Decode the SVG
    const base64Svg = jsonMetadata.image
      .split(",")[1]
      .split("?")[0]; // remove cache-busting param
    const svgContent = Buffer.from(base64Svg, "base64").toString();

    expect(svgContent).to.include("Dynamic Time NFT");
    expect(svgContent).to.include("Updates when viewed");
    expect(svgContent).to.match(/\d{2}:\d{2}:\d{2}/); // Check for time format HH:MM:SS
  });
});


