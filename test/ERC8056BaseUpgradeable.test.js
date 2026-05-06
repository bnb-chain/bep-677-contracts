const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

const MULTIPLIER_DECIMALS = ethers.parseUnits("1", 18);
const MAX_UINT256 = ethers.MaxUint256;

describe("ERC8056BaseUpgradeable", function () {
  let beacon, proxy, owner, other;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ERC8056TokenUpgradeable");
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
      expect(await proxy.effectiveAt()).to.equal(0n);
      expect(await proxy.owner()).to.equal(owner.address);
      expect(await proxy.totalSupply()).to.equal(1_000_000n * 10n ** 18n);
    });

    it("emits UIMultiplierUpdated(0, 1e18, timestamp) on initialization (L-01)", async function () {
      const Factory = await ethers.getContractFactory("ERC8056TokenUpgradeable");
      const newBeacon = await upgrades.deployBeacon(Factory);
      await newBeacon.waitForDeployment();
      const tx = await upgrades.deployBeaconProxy(
        newBeacon,
        Factory,
        ["T", "T", 1n, owner.address],
        { dontCache: true }
      );
      const receipt = await tx.deploymentTransaction().wait();
      const iface = new ethers.Interface([
        "event UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp)"
      ]);
      const log = receipt.logs.map(l => { try { return iface.parseLog(l); } catch { return null; } }).find(l => l && l.name === "UIMultiplierUpdated" && l.args.oldMultiplier === 0n);
      expect(log).to.not.be.undefined;
      expect(log.args.oldMultiplier).to.equal(0n);
      expect(log.args.newMultiplier).to.equal(MULTIPLIER_DECIMALS);
    });

    it("pendingMultiplier returns (0,0) when no pending change", async function () {
      const [mult, ts] = await proxy.pendingMultiplier();
      expect(mult).to.equal(0n);
      expect(ts).to.equal(0n);
    });

    it("reverts on second call (InvalidInitialization)", async function () {
      await expect(
        proxy.initialize("X", "X", 1n, owner.address)
      ).to.be.revertedWithCustomError(proxy, "InvalidInitialization");
    });

    it("implementation contract reverts initialize (_disableInitializers)", async function () {
      const Factory = await ethers.getContractFactory("ERC8056TokenUpgradeable");
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

    it("newUIMultiplier and effectiveAt return pending values while change is pending", async function () {
      const block = await ethers.provider.getBlock("latest");
      const futureTs = block.timestamp + 100;
      const newMult = 2n * MULTIPLIER_DECIMALS;

      await proxy.setUIMultiplier(newMult, futureTs);

      expect(await proxy.hasPendingMultiplier()).to.equal(true);
      expect(await proxy.uiMultiplier()).to.equal(MULTIPLIER_DECIMALS);
      expect(await proxy.newUIMultiplier()).to.equal(newMult);
      expect(await proxy.effectiveAt()).to.equal(BigInt(futureTs));
    });

    it("returns no-pending values after scheduled change takes effect", async function () {
      const block = await ethers.provider.getBlock("latest");
      const futureTs = block.timestamp + 100;
      const newMult = 2n * MULTIPLIER_DECIMALS;

      await proxy.setUIMultiplier(newMult, futureTs);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      expect(await proxy.hasPendingMultiplier()).to.equal(false);
      expect(await proxy.effectiveAt()).to.equal(0n);
      expect(await proxy.newUIMultiplier()).to.equal(newMult);
      const [pm, pmTs] = await proxy.pendingMultiplier();
      expect(pm).to.equal(0n);
      expect(pmTs).to.equal(0n);
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

  describe("acceleration semantics (L-03)", function () {
    it("default: allows overwrite with earlier effectiveAt (acceleration), emits UIMultiplierChangeOverwritten", async function () {
      const block = await ethers.provider.getBlock("latest");
      const farTs = block.timestamp + 30 * 24 * 3600; // 30 days out
      const nearTs = block.timestamp + 100;            // 100 s out — near relative to farTs

      await proxy.setUIMultiplier(2n * MULTIPLIER_DECIMALS, farTs);
      await expect(proxy.setUIMultiplier(3n * MULTIPLIER_DECIMALS, nearTs))
        .to.emit(proxy, "UIMultiplierChangeOverwritten")
        .withArgs(2n * MULTIPLIER_DECIMALS, BigInt(farTs), 3n * MULTIPLIER_DECIMALS, BigInt(nearTs));
    });

    it("override: no-accelerate mock rejects acceleration of pending change", async function () {
      const Factory = await ethers.getContractFactory("ERC8056NoAccelerateMock");
      const noAccBeacon = await upgrades.deployBeacon(Factory);
      await noAccBeacon.waitForDeployment();
      const noAccProxy = await upgrades.deployBeaconProxy(
        noAccBeacon, Factory, ["T", "T", 1n, owner.address]
      );
      await noAccProxy.waitForDeployment();

      const block = await ethers.provider.getBlock("latest");
      const farTs = block.timestamp + 30 * 24 * 3600;
      const nearTs = block.timestamp + 100; // 100 s out — near relative to farTs

      await noAccProxy.setUIMultiplier(2n * MULTIPLIER_DECIMALS, farTs);
      await expect(
        noAccProxy.setUIMultiplier(3n * MULTIPLIER_DECIMALS, nearTs)
      ).to.be.revertedWith("Cannot accelerate pending multiplier");
    });

    it("override: no-accelerate mock still allows overwrite at same or later effectiveAt", async function () {
      const Factory = await ethers.getContractFactory("ERC8056NoAccelerateMock");
      const noAccBeacon = await upgrades.deployBeacon(Factory);
      await noAccBeacon.waitForDeployment();
      const noAccProxy = await upgrades.deployBeaconProxy(
        noAccBeacon, Factory, ["T", "T", 1n, owner.address]
      );
      await noAccProxy.waitForDeployment();

      const block = await ethers.provider.getBlock("latest");
      const farTs = block.timestamp + 30 * 24 * 3600;
      const laterTs = block.timestamp + 60 * 24 * 3600; // 60 days out

      await noAccProxy.setUIMultiplier(2n * MULTIPLIER_DECIMALS, farTs);
      await expect(noAccProxy.setUIMultiplier(3n * MULTIPLIER_DECIMALS, laterTs))
        .to.emit(noAccProxy, "UIMultiplierChangeOverwritten");
    });
  });

  describe("rounding behavior (L-02)", function () {
    // multiplier = 1.5e18 → toUIAmount(x) = floor(x * 1.5)
    // These tests pin the floor-rounding guarantee; deleting them requires a deliberate rounding-mode change.
    it("toUIAmount rounds toward zero (11 raw at 1.5x → 16 ui)", async function () {
      const block = await ethers.provider.getBlock("latest");
      const mult15 = 3n * MULTIPLIER_DECIMALS / 2n; // 1.5e18
      await proxy.setUIMultiplier(mult15, block.timestamp + 100);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      // 11 * 1.5 = 16.5 → floor = 16
      expect(await proxy.toUIAmount(11n)).to.equal(16n);
    });

    it("fromUIAmount rounds toward zero (16 ui at 1.5x → 10 raw)", async function () {
      const block = await ethers.provider.getBlock("latest");
      const mult15 = 3n * MULTIPLIER_DECIMALS / 2n;
      await proxy.setUIMultiplier(mult15, block.timestamp + 100);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      // 16 / 1.5 = 10.666... → floor = 10
      expect(await proxy.fromUIAmount(16n)).to.equal(10n);
    });

    it("round-trip fromUIAmount(toUIAmount(x)) <= x (dust = 1)", async function () {
      const block = await ethers.provider.getBlock("latest");
      const mult15 = 3n * MULTIPLIER_DECIMALS / 2n;
      await proxy.setUIMultiplier(mult15, block.timestamp + 100);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      const ui = await proxy.toUIAmount(11n);   // 16
      const raw = await proxy.fromUIAmount(ui); // 10
      expect(raw).to.be.lte(11n);
      expect(11n - raw).to.equal(1n); // dust = 1
    });
  });

  describe("upgrade safety / storage layout (L-05)", function () {
    it("V1 → V2Mock (appended field) is layout-compatible per validateUpgrade", async function () {
      const V2Factory = await ethers.getContractFactory("ERC8056BaseUpgradeableV2Mock");
      await upgrades.validateUpgrade(await beacon.getAddress(), V2Factory, { kind: "beacon" });
    });
  });

  describe("supportsInterface", function () {
    const INTERFACE_IDS = {
      IERC165: "0x01ffc9a7",
      IERC20: "0x36372b07",
      IScaledUIAmount: "0xa60bf13d",
      IScaledUIAmountNewUIMultiplier: "0x4bd27648",
      IScaledUIAmountConversion: "0x57854fc3",
      IScaledUIAmountBalances: "0xd890fd71",
      IERC8056Scheduled: "0xeb0093dd",
    };

    for (const [name, id] of Object.entries(INTERFACE_IDS)) {
      it(`returns true for ${name} (${id})`, async function () {
        expect(await proxy.supportsInterface(id)).to.equal(true);
      });
    }

    it("returns false for a random interface id", async function () {
      expect(await proxy.supportsInterface("0xdeadbeef")).to.equal(false);
    });
  });

  describe("extreme multiplier resilience (L-04)", function () {
    let extremeProxy;
    // 1e75: tryMul(100e18, 1e75)=1e95>2^256 → sentinel; mulDiv(1M*1e18, 1e75, 1e18)=1e81>2^256 → revert
    const EXTREME_MULT = 10n ** 75n;

    beforeEach(async function () {
      const Factory = await ethers.getContractFactory("ERC8056ExtremeMultiplierMock");
      const extBeacon = await upgrades.deployBeacon(Factory);
      await extBeacon.waitForDeployment();
      extremeProxy = await upgrades.deployBeaconProxy(
        extBeacon, Factory, ["T", "T", 1_000_000n, owner.address]
      );
      await extremeProxy.waitForDeployment();

      const block = await ethers.provider.getBlock("latest");
      await extremeProxy.setUIMultiplier(EXTREME_MULT, block.timestamp + 100);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);
    });

    it("raw transfer succeeds — does not revert under extreme multiplier", async function () {
      const amount = 100n * 10n ** 18n;
      await expect(extremeProxy.transfer(other.address, amount)).to.not.be.reverted;
    });

    it("emits TransferWithUIAmount with uiAmount=0 sentinel on overflow", async function () {
      const amount = 100n * 10n ** 18n;
      await expect(extremeProxy.transfer(other.address, amount))
        .to.emit(extremeProxy, "TransferWithUIAmount")
        .withArgs(owner.address, other.address, amount, 0n);
    });

    it("balanceOf returns correct raw value under extreme multiplier", async function () {
      const rawTotal = 1_000_000n * 10n ** 18n;
      expect(await extremeProxy.balanceOf(owner.address)).to.equal(rawTotal);
    });

    it("balanceOfUI reverts under extreme multiplier (intentional — avoids misleading 0)", async function () {
      await expect(extremeProxy.balanceOfUI(owner.address)).to.be.reverted;
    });
  });

  describe("TransferWithUIAmount event", function () {
    it("emits on transfer with raw=ui at 1x multiplier", async function () {
      const amount = 100n * 10n ** 18n;
      await expect(proxy.connect(owner).transfer(other.address, amount))
        .to.emit(proxy, "TransferWithUIAmount")
        .withArgs(owner.address, other.address, amount, amount);
    });

    it("emits with scaled uiAmount at 2x multiplier", async function () {
      const block = await ethers.provider.getBlock("latest");
      const newMult = 2n * MULTIPLIER_DECIMALS;
      await proxy.setUIMultiplier(newMult, block.timestamp + 100);
      await ethers.provider.send("evm_increaseTime", [101]);
      await ethers.provider.send("evm_mine", []);

      const rawAmount = 100n * 10n ** 18n;
      await expect(proxy.connect(owner).transfer(other.address, rawAmount))
        .to.emit(proxy, "TransferWithUIAmount")
        .withArgs(owner.address, other.address, rawAmount, 2n * rawAmount);
    });
  });
});
