const hre = require("hardhat");

/**
 * Upgrade an existing ERC8056BaseUpgradeable Beacon to a new implementation.
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-upgradeable.js --network <network>
 *
 * Environment variables (required):
 *   BEACON_ADDRESS - Address of the UpgradeableBeacon to upgrade
 *
 * The script validates storage layout compatibility before submitting the
 * upgrade transaction, so it will fail fast if the new implementation would
 * corrupt storage. All BeaconProxy instances pointing at this beacon are
 * upgraded atomically.
 */
async function main() {
  const beaconAddress = process.env.BEACON_ADDRESS;
  if (!beaconAddress) {
    throw new Error("BEACON_ADDRESS environment variable is required");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);
  console.log("Beacon address:", beaconAddress);

  const Factory = await hre.ethers.getContractFactory("ERC8056TokenUpgradeable");

  // Validate storage layout before sending any transaction
  console.log("\nValidating storage layout compatibility...");
  await hre.upgrades.validateUpgrade(beaconAddress, Factory, { kind: "beacon" });
  console.log("✅ Storage layout compatible");

  const oldImpl = await hre.upgrades.beacon.getImplementationAddress(beaconAddress);
  console.log("Old implementation:", oldImpl);

  console.log("\nSubmitting upgrade transaction...");
  const beacon = await hre.upgrades.upgradeBeacon(beaconAddress, Factory);
  // OZ hardhat-upgrades attaches the upgradeTo() tx to `deployTransaction`.
  // `deploymentTransaction()` (ethers method) is always null for upgradeBeacon.
  const upgradeTx = beacon.deployTransaction ?? null;
  if (upgradeTx) {
    console.log("Upgrade tx:", upgradeTx.hash);
    await upgradeTx.wait(1);
  } else {
    console.log("⚠️  Could not capture upgrade tx; confirmation wait skipped.");
  }

  const newImpl = await hre.upgrades.beacon.getImplementationAddress(beaconAddress);
  console.log("New implementation:", newImpl);

  if (newImpl === oldImpl) {
    console.log("\n⚠️  Implementation address unchanged — bytecode may be identical to the current version.");
  } else {
    console.log("\n✅ Upgrade complete");
  }

  // Verify new implementation on BscScan
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    if (process.env.BSCSCAN_API_KEY && newImpl !== oldImpl) {
      console.log("\nWaiting for block confirmations before verification...");
      if (upgradeTx) await upgradeTx.wait(5);
      try {
        console.log("Verifying new implementation on BscScan...");
        await hre.run("verify:verify", {
          address: newImpl,
          constructorArguments: [],
        });
        console.log("✅ Implementation verified!");
      } catch (error) {
        if (error.message.includes("Already Verified")) {
          console.log("✅ Implementation already verified!");
        } else {
          console.log("⚠️  Verification failed:", error.message);
        }
      }
    } else if (!process.env.BSCSCAN_API_KEY) {
      console.log("\n⚠️  BSCSCAN_API_KEY not set, skipping verification");
    }
  }

  console.log("\n📋 Upgrade Summary:");
  console.log("  Beacon Address:       ", beaconAddress);
  console.log("  Old Implementation:   ", oldImpl);
  console.log("  New Implementation:   ", newImpl);
  console.log("  Network:              ", hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
