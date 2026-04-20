const hre = require("hardhat");

/**
 * Deploy ScaledUITokenUpgradeable via a UUPS proxy.
 *
 * Usage:
 *   npx hardhat run scripts/deploy-upgradeable.js --network <network>
 *
 * Environment variables (optional):
 *   TOKEN_NAME     - Token name (default: "Scaled UI Token")
 *   TOKEN_SYMBOL   - Token symbol (default: "SUIT")
 *   INITIAL_SUPPLY - Initial supply in whole tokens (default: 1000000)
 *   INITIAL_OWNER  - Initial owner address (default: deployer address)
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
  console.log("  Proxy type: UUPS");

  const Factory = await hre.ethers.getContractFactory("ScaledUITokenUpgradeable");
  const proxy = await hre.upgrades.deployProxy(
    Factory,
    [tokenName, tokenSymbol, initialSupply, initialOwner],
    { kind: "uups" }
  );

  await proxy.waitForDeployment();
  const proxyAddress = await proxy.getAddress();
  const implAddress = await hre.upgrades.erc1967.getImplementationAddress(proxyAddress);

  console.log("\n✅ ScaledUITokenUpgradeable proxy deployed to:", proxyAddress);
  console.log("   Implementation address:", implAddress);

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
  console.log("  Proxy Address:", proxyAddress);
  console.log("  Implementation Address:", implAddress);
  console.log("  Token Name:", tokenName);
  console.log("  Token Symbol:", tokenSymbol);
  console.log("  Initial Supply:", initialSupply.toString());
  console.log("  Initial Owner:", initialOwner);
  console.log("  Network:", hre.network.name);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
