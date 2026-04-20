const hre = require("hardhat");

/**
 * Deploy ERC8056BaseUpgradeable via a Beacon proxy.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-upgradeable.js --network <network>
 *
 * Environment variables (optional):
 *   TOKEN_NAME     - Token name (default: "Scaled UI Token")
 *   TOKEN_SYMBOL   - Token symbol (default: "SUIT")
 *   INITIAL_SUPPLY - Initial supply in whole tokens (default: 1000000)
 *   INITIAL_OWNER  - Initial owner address (default: deployer address)
 *
 * Outputs three addresses:
 *   Beacon          — upgrade controller; save this to upgrade later
 *   Implementation  — current logic contract (auto-managed by OZ)
 *   BeaconProxy     — the token address users interact with
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await hre.ethers.provider.getBalance(deployer.address)).toString()
  );

  const tokenName = process.env.TOKEN_NAME || "Scaled UI Token";
  const tokenSymbol = process.env.TOKEN_SYMBOL || "SUIT";
  const initialSupply = process.env.INITIAL_SUPPLY
    ? BigInt(process.env.INITIAL_SUPPLY)
    : BigInt(1_000_000);
  const initialOwner = process.env.INITIAL_OWNER || deployer.address;

  console.log("\nDeployment parameters:");
  console.log("  Token Name:", tokenName);
  console.log("  Token Symbol:", tokenSymbol);
  console.log("  Initial Supply:", initialSupply.toString());
  console.log("  Initial Owner:", initialOwner);
  console.log("  Proxy type: Beacon");

  const Factory = await hre.ethers.getContractFactory("ERC8056BaseUpgradeable");

  // Deploy the beacon (holds the implementation address)
  const beacon = await hre.upgrades.deployBeacon(Factory);
  await beacon.waitForDeployment();
  const beaconAddress = await beacon.getAddress();
  const implAddress = await hre.upgrades.beacon.getImplementationAddress(beaconAddress);

  // Deploy a BeaconProxy pointing at the beacon
  const proxy = await hre.upgrades.deployBeaconProxy(
    beacon,
    Factory,
    [tokenName, tokenSymbol, initialSupply, initialOwner]
  );
  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();

  console.log("\n✅ ERC8056BaseUpgradeable beacon deployed to:", beaconAddress);
  console.log("   Implementation address:", implAddress);
  console.log("✅ BeaconProxy (token address) deployed to:", proxyAddress);

  // Wait for confirmations before verification on live networks
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await proxy.deploymentTransaction().wait(5);

    if (process.env.BSCSCAN_API_KEY) {
      try {
        console.log("\nVerifying implementation on BscScan...");
        await hre.run("verify:verify", {
          address: implAddress,
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
    } else {
      console.log("\n⚠️  BSCSCAN_API_KEY not set, skipping verification");
    }
  }

  console.log("\n📋 Deployment Summary:");
  console.log("  Beacon Address:        ", beaconAddress);
  console.log("  Implementation Address:", implAddress);
  console.log("  BeaconProxy Address:   ", proxyAddress);
  console.log("  Token Name:", tokenName);
  console.log("  Token Symbol:", tokenSymbol);
  console.log("  Initial Supply:", initialSupply.toString());
  console.log("  Initial Owner:", initialOwner);
  console.log("  Network:", hre.network.name);
  console.log("\n⚠️  Save the Beacon address — you will need it to upgrade later.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
