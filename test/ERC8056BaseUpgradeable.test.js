const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

const MULTIPLIER_DECIMALS = ethers.parseUnits("1", 18);
const MAX_UINT256 = ethers.MaxUint256;

describe("ERC8056BaseUpgradeable", function () {
  let beacon, proxy, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERC8056BaseUpgradeable");
    beacon = await upgrades.deployBeacon(Factory);
    await beacon.waitForDeployment();
    proxy = await upgrades.deployBeaconProxy(
      beacon,
      Factory,
      ["Test Token", "TEST", 1_000_000n, owner.address]
    );
    await proxy.waitForDeployment();
  });

  describe("initialize", function () {
    it("sets correct initial state", async function () {
      expect(await proxy.uiMultiplier()).to.equal(MULTIPLIER_DECIMALS);
      expect(await proxy.hasPendingMultiplier()).to.equal(false);
      expect(await proxy.newUIMultiplier()).to.equal(MULTIPLIER_DECIMALS);
      expect(await proxy.effectiveAt()).to.equal(MAX_UINT256);
      expect(await proxy.owner()).to.equal(owner.address);
      expect(await proxy.totalSupply()).to.equal(1_000_000n * 10n ** 18n);
    });

    it("reverts on second call (InvalidInitialization)", async function () {
      await expect(
        proxy.initialize("X", "X", 1n, owner.address)
      ).to.be.revertedWithCustomError(proxy, "InvalidInitialization");
    });

    it("implementation contract reverts initialize (_disableInitializers)", async function () {
      const Factory = await ethers.getContractFactory("ERC8056BaseUpgradeable");
      const impl = await Factory.deploy();
      await impl.waitForDeployment();
      await expect(
        impl.initialize("X", "X", 1n, owner.address)
      ).to.be.revertedWithCustomError(impl, "InvalidInitialization");
    });
  });

  describe("setUIMultiplier: state machine", function () {
    it("pending → active after effective time", async function () {
      const block = await ethers.provider.getBlock("latest");
      const futureTs = block.timestamp + 100;
      const newMult = 2n * MULTIPLIER_DECIMALS;

      await proxy.setUIMultiplier(newMult, futureTs);

      expect(await proxy.hasPendingMultiplier()).to.equal(true);
      expect(await proxy.uiMultiplier()).to.equal(MULTIPLIER_DECIMALS);
      const [pm, pmTs] = await proxy.pendingMultiplier();
      expect(pm).to.equal(newMult);
      expect(pmTs).to.equal(BigInt(futureTs));

      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      expect(await proxy.uiMultiplier()).to.equal(newMult);
      expect(await proxy.hasPendingMultiplier()).to.equal(false);
    });

    it("emits UIMultiplierChangeOverwritten when overwriting a pending change", async function () {
      const block = await ethers.provider.getBlock("latest");
      const tsA = block.timestamp + 100;
      const tsB = block.timestamp + 200;
      const multA = 2n * MULTIPLIER_DECIMALS;
      const multB = 3n * MULTIPLIER_DECIMALS;

      await proxy.setUIMultiplier(multA, tsA);
      await expect(proxy.setUIMultiplier(multB, tsB))
        .to.emit(proxy, "UIMultiplierChangeOverwritten")
        .withArgs(multA, BigInt(tsA), multB, BigInt(tsB));
    });

    it("seals a lapsed pending before scheduling a new one", async function () {
      const block = await ethers.provider.getBlock("latest");
      const tsA = block.timestamp + 100;
      const multA = 2n * MULTIPLIER_DECIMALS;

      await proxy.setUIMultiplier(multA, tsA);

      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      expect(await proxy.uiMultiplier()).to.equal(multA);

      const newBlock = await ethers.provider.getBlock("latest");
      const tsB = newBlock.timestamp + 100;
      const multB = 3n * MULTIPLIER_DECIMALS;
      await proxy.setUIMultiplier(multB, tsB);

      // A is now sealed as the effective multiplier; B is pending
      expect(await proxy.uiMultiplier()).to.equal(multA);
      expect(await proxy.hasPendingMultiplier()).to.equal(true);
      const [pm] = await proxy.pendingMultiplier();
      expect(pm).to.equal(multB);
    });
  });

  describe("setUIMultiplier: guards", function () {
    it("reverts with type(uint256).max effectiveAt (ghost-pending fix)", async function () {
      await expect(
        proxy.setUIMultiplier(2n * MULTIPLIER_DECIMALS, MAX_UINT256)
      ).to.be.revertedWith("ERC8056: effectiveAt overflow");
    });

    it("reverts for non-owner", async function () {
      const block = await ethers.provider.getBlock("latest");
      await expect(
        proxy.connect(other).setUIMultiplier(2n * MULTIPLIER_DECIMALS, block.timestamp + 100)
      ).to.be.revertedWithCustomError(proxy, "OwnableUnauthorizedAccount");
    });
  });

  describe("conversion math", function () {
    const ONE_TOKEN = 10n ** 18n;

    it("toUIAmount: 1x multiplier is identity", async function () {
      expect(await proxy.toUIAmount(ONE_TOKEN)).to.equal(ONE_TOKEN);
    });

    it("fromUIAmount: 1x multiplier is identity", async function () {
      expect(await proxy.fromUIAmount(ONE_TOKEN)).to.equal(ONE_TOKEN);
    });

    it("toUIAmount / fromUIAmount: round-trip at 2x multiplier", async function () {
      const block = await ethers.provider.getBlock("latest");
      const newMult = 2n * MULTIPLIER_DECIMALS;
      await proxy.setUIMultiplier(newMult, block.timestamp + 100);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      expect(await proxy.toUIAmount(ONE_TOKEN)).to.equal(2n * ONE_TOKEN);
      expect(await proxy.fromUIAmount(2n * ONE_TOKEN)).to.equal(ONE_TOKEN);
    });

    it("balanceOfUI / totalSupplyUI scale with multiplier", async function () {
      const rawTotal = 1_000_000n * ONE_TOKEN;
      expect(await proxy.totalSupply()).to.equal(rawTotal);
      expect(await proxy.totalSupplyUI()).to.equal(rawTotal);

      const block = await ethers.provider.getBlock("latest");
      await proxy.setUIMultiplier(2n * MULTIPLIER_DECIMALS, block.timestamp + 100);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      expect(await proxy.totalSupply()).to.equal(rawTotal);
      expect(await proxy.totalSupplyUI()).to.equal(2n * rawTotal);
      expect(await proxy.balanceOfUI(owner.address)).to.equal(2n * rawTotal);
    });

    it("UIMultiplierUpdated event emits correct oldMultiplier after lapsed seal", async function () {
      const block = await ethers.provider.getBlock("latest");
      const tsA = block.timestamp + 100;
      const multA = 2n * MULTIPLIER_DECIMALS;
      await proxy.setUIMultiplier(multA, tsA);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      const newBlock = await ethers.provider.getBlock("latest");
      const multB = 3n * MULTIPLIER_DECIMALS;
      await expect(proxy.setUIMultiplier(multB, newBlock.timestamp + 100))
        .to.emit(proxy, "UIMultiplierUpdated")
        .withArgs(multA, multB, BigInt(newBlock.timestamp + 100));
    });
  });

  describe("upgrade safety", function () {
    it("validates safe V2 upgrade (appended field)", async function () {
      const V2Factory = await ethers.getContractFactory("ERC8056BaseUpgradeableV2Mock");
      await upgrades.validateUpgrade(await beacon.getAddress(), V2Factory, { kind: "beacon" });
    });
  });
});
