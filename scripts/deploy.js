const hre = require("hardhat");

/**
 * Deploy ScaledUIToken contract
 *
 * Usage:
 *   npx hardhat run scripts/deploy.js --network <network>
 *
 * Environment variables (optional):
 *   TOKEN_NAME - Token name (default: "Scaled UI Token")
 *   TOKEN_SYMBOL - Token symbol (default: "SUIT")
 *   INITIAL_SUPPLY - Initial supply (default: 1000000)
 *   INITIAL_OWNER - Initial owner address (default: deployer address)
 */
async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);
  console.log(
    "Account balance:",
    (await hre.ethers.provider.getBalance(deployer.address)).toString()
  );

  // Get deployment parameters from environment or use defaults
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

  // Deploy the contract
  const ScaledUIToken = await hre.ethers.getContractFactory("ScaledUIToken");
  const token = await ScaledUIToken.deploy(
    tokenName,
    tokenSymbol,
    initialSupply,
    initialOwner
  );

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();

  console.log("\n✅ ScaledUIToken deployed to:", tokenAddress);

  // Wait for a few block confirmations before verification
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("\nWaiting for block confirmations...");
    await token.deploymentTransaction().wait(5);

    // Verify contract on Etherscan
    if (process.env.BSCSCAN_API_KEY) {
      try {
        console.log("\nVerifying contract on Etherscan...");
        await hre.run("verify:verify", {
          address: tokenAddress,
          constructorArguments: [
            tokenName,
            tokenSymbol,
            initialSupply,
            initialOwner,
          ],
        });
        console.log("✅ Contract verified!");
      } catch (error) {
        if (error.message.includes("Already Verified")) {
          console.log("✅ Contract already verified!");
        } else {
          console.log("⚠️  Verification failed:", error.message);
        }
      }
    } else {
      console.log("\n⚠️  BSCSCAN_API_KEY not set, skipping verification");
    }
  }

  console.log("\n📋 Deployment Summary:");
  console.log("  Contract Address:", tokenAddress);
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
