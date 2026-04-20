const { expect } = require("chai");
const { ethers } = require("hardhat");

const MULTIPLIER_DECIMALS = ethers.parseUnits("1", 18);
const MAX_UINT256 = ethers.MaxUint256;

describe("ERC8056Base (via ScaledUIToken)", function () {
  let token, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScaledUIToken");
    token = await Factory.deploy("Test Token", "TEST", 1_000_000n, owner.address);
    await token.waitForDeployment();
  });

  it("reverts with type(uint256).max effectiveAt (ghost-pending fix)", async function () {
    await expect(
      token.setUIMultiplier(2n * MULTIPLIER_DECIMALS, MAX_UINT256)
    ).to.be.revertedWith("ERC8056: effectiveAt overflow");
  });

  it("pending → active after effective time", async function () {
    const block = await ethers.provider.getBlock("latest");
    const futureTs = block.timestamp + 100;
    const newMult = 2n * MULTIPLIER_DECIMALS;

    await token.setUIMultiplier(newMult, futureTs);
    expect(await token.hasPendingMultiplier()).to.equal(true);
    expect(await token.uiMultiplier()).to.equal(MULTIPLIER_DECIMALS);

    await ethers.provider.send("evm_increaseTime", [101]);
    await ethers.provider.send("evm_mine", []);

    expect(await token.uiMultiplier()).to.equal(newMult);
    expect(await token.hasPendingMultiplier()).to.equal(false);
  });

  it("reverts for non-owner", async function () {
    const block = await ethers.provider.getBlock("latest");
    await expect(
      token.connect(other).setUIMultiplier(2n * MULTIPLIER_DECIMALS, block.timestamp + 100)
    ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
  });
});
