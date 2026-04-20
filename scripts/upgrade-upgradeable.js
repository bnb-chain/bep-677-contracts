const hre = require("hardhat");

/**
 * Upgrade an existing ScaledUITokenUpgradeable UUPS proxy to a new implementation.
 *
 * Usage:
 *   npx hardhat run scripts/upgrade-upgradeable.js --network <network>
 *
 * Environment variables (required):
 *   PROXY_ADDRESS - Address of the existing UUPS proxy to upgrade
 *
 * The script validates storage layout compatibility before submitting the upgrade
 * transaction, so it will fail fast if the new implementation would corrupt storage.
 */
async function main() {
  const proxyAddress = process.env.PROXY_ADDRESS;
  if (!proxyAddress) {
    throw new Error("PROXY_ADDRESS environment variable is required");
  }

  const [deployer] = await hre.ethers.getSigners();
  console.log("Upgrading with account:", deployer.address);
  console.log("Proxy address:", proxyAddress);

  const Factory = await hre.ethers.getContractFactory("ScaledUITokenUpgradeable");

  // Validate storage layout before sending any transaction
  console.log("\nValidating storage layout compatibility...");
  await hre.upgrades.validateUpgrade(proxyAddress, Factory, { kind: "uups" });
  console.log("✅ Storage layout compatible");

  const oldImpl = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("Old implementation:", oldImpl);

  console.log("\nSubmitting upgrade transaction...");
  const upgraded = await hre.upgrades.upgradeProxy(proxyAddress, Factory);
  const upgradeTx = upgraded.deploymentTransaction();
  if (upgradeTx) {
    await upgradeTx.wait(1);
  }

  const newImpl = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);
  console.log("New implementation:", newImpl);

  if (newImpl === oldImpl) {
    console.log("\n⚠️  Implementation address unchanged — bytecode may be identical to the current version.");
  } else {
    console.log("\n✅ Upgrade complete");
  }

  // Verify new implementation on Etherscan
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    if (process.env.BSCSCAN_API_KEY && newImpl !== oldImpl) {
      console.log("\nWaiting for block confirmations before verification...");
      if (upgradeTx) await upgradeTx.wait(5);
      try {
        console.log("Verifying new implementation on Etherscan...");
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
  console.log("  Proxy Address:       ", proxyAddress);
  console.log("  Old Implementation:  ", oldImpl);
  console.log("  New Implementation:  ", newImpl);
  console.log("  Network:             ", hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
