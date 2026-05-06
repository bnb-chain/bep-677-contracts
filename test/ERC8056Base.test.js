const { expect } = require("chai");
const { ethers } = require("hardhat");

const MULTIPLIER_DECIMALS = ethers.parseUnits("1", 18);
const MAX_UINT256 = ethers.MaxUint256;

describe("ERC8056Base (via ScaledUIToken)", function () {
  let token, mintToken, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ScaledUIToken");
    token = await Factory.deploy("Test Token", "TEST", 1_000_000n, owner.address);
    await token.waitForDeployment();

    const MintFactory = await ethers.getContractFactory("ScaledUITokenMint");
    mintToken = await MintFactory.deploy("Mint Test Token", "MTT", 1_000_000n, owner.address);
    await mintToken.waitForDeployment();
  });

  it("emits UIMultiplierUpdated(0, 1e18, timestamp) on deployment (L-01)", async function () {
    const Factory = await ethers.getContractFactory("ScaledUIToken");
    const tx = await Factory.deploy("T", "T", 1n, owner.address);
    const receipt = await tx.deploymentTransaction().wait();
    const iface = new ethers.Interface([
      "event UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp)"
    ]);
    const log = receipt.logs.map(l => { try { return iface.parseLog(l); } catch { return null; } }).find(l => l && l.name === "UIMultiplierUpdated" && l.args.oldMultiplier === 0n);
    expect(log).to.not.be.undefined;
    expect(log.args.oldMultiplier).to.equal(0n);
    expect(log.args.newMultiplier).to.equal(MULTIPLIER_DECIMALS);
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

  it("reverts with zero multiplier", async function () {
    const block = await ethers.provider.getBlock("latest");
    await expect(
      token.setUIMultiplier(0, block.timestamp + 100)
    ).to.be.revertedWith("ERC8056: multiplier must be positive");
  });

  describe("extreme multiplier resilience (L-04)", function () {
    // 1e75: tryMul(100e18, 1e75)=1e95>2^256 → sentinel; mulDiv(1M*1e18, 1e75, 1e18)=1e81>2^256 → revert
    const EXTREME_MULT = 10n ** 75n;
    let extremeToken;

    beforeEach(async function () {
      const Factory = await ethers.getContractFactory("ERC8056ExtremeMultiplierBaseMock");
      extremeToken = await Factory.deploy("T", "T", 1_000_000n, owner.address);
      await extremeToken.waitForDeployment();
      const block = await ethers.provider.getBlock("latest");
      await extremeToken.setUIMultiplier(EXTREME_MULT, block.timestamp + 100);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);
    });

    it("raw transfer succeeds — does not revert under extreme multiplier", async function () {
      await expect(extremeToken.transfer(other.address, 100n * 10n ** 18n)).to.not.be.reverted;
    });

    it("emits TransferWithUIAmount with uiAmount=0 sentinel on overflow", async function () {
      const amount = 100n * 10n ** 18n;
      await expect(extremeToken.transfer(other.address, amount))
        .to.emit(extremeToken, "TransferWithUIAmount")
        .withArgs(owner.address, other.address, amount, 0n);
    });

    it("balanceOfUI reverts under extreme multiplier (intentional)", async function () {
      await expect(extremeToken.balanceOfUI(owner.address)).to.be.reverted;
    });
  });

  describe("TransferWithUIAmount event", function () {
    it("emits on transfer with raw=ui at 1x multiplier", async function () {
      const amount = 100n * 10n ** 18n;
      await expect(token.connect(owner).transfer(other.address, amount))
        .to.emit(token, "TransferWithUIAmount")
        .withArgs(owner.address, other.address, amount, amount);
    });

    it("emits with scaled uiAmount at 2x multiplier", async function () {
      const block = await ethers.provider.getBlock("latest");
      await token.setUIMultiplier(2n * MULTIPLIER_DECIMALS, block.timestamp + 100);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      const rawAmount = 100n * 10n ** 18n;
      await expect(token.connect(owner).transfer(other.address, rawAmount))
        .to.emit(token, "TransferWithUIAmount")
        .withArgs(owner.address, other.address, rawAmount, 2n * rawAmount);
    });

    it("emits on mint (from == address(0))", async function () {
      const mintAmount = 500n * 10n ** 18n;
      await expect(mintToken.mint(other.address, mintAmount))
        .to.emit(mintToken, "TransferWithUIAmount")
        .withArgs(ethers.ZeroAddress, other.address, mintAmount, mintAmount);
    });

    it("emits on burn (to == address(0))", async function () {
      const burnAmount = 50n * 10n ** 18n;
      await expect(mintToken.burn(owner.address, burnAmount))
        .to.emit(mintToken, "TransferWithUIAmount")
        .withArgs(owner.address, ethers.ZeroAddress, burnAmount, burnAmount);
    });
  });
});
