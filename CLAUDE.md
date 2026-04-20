# BEP-677 Contracts

Solidity smart contract project implementing BEP-677 (EIP-8056 Scaled UI Amount) on BNB Chain.

## Tech Stack

- **Hardhat** — Solidity 0.8.24, optimizer enabled (200 runs)
- **npm** — root project package manager
- **Bun** — playground/ subproject package manager

## Key Commands

```bash
npx hardhat compile      # compile contracts
npx hardhat test         # run tests
npx hardhat node         # start local node
```

## Project Structure

- `contracts/` — Solidity sources
  - `ERC8056Base.sol` — non-upgradeable abstract base (deprecated, reference only)
  - `ERC8056Token.sol` — concrete non-upgradeable token (`ScaledUIToken`, deprecated)
  - `ERC8056BaseUpgradeable.sol` — concrete Beacon-upgradeable token (`ERC8056BaseUpgradeable`, recommended)
  - `contracts/mocks/` — test mock contracts (not for production)
  - interfaces: `IScaledUIAmount*.sol`, `IERC8056Scheduled.sol`
- `abis/` — pre-built ABI JSON files
- `scripts/` — deploy scripts (`deploy.js`, `deploy-upgradeable.js`)
- `test/` — Hardhat test suite
- `playground/` — Vite + React frontend demo (separate Bun project)

## Deployment (DO NOT run in CI)

Deployment to live networks requires a funded wallet and should only be triggered manually:

```bash
# Non-upgradeable (ScaledUIToken — deprecated)
npm run deploy:local      # local Hardhat node
npm run deploy:testnet    # BSC testnet (chainId 97)
npm run deploy:mainnet    # BSC mainnet (chainId 56) — PRODUCTION

# Upgradeable Beacon proxy (ERC8056BaseUpgradeable — recommended)
npm run deploy:upgradeable:local
npm run deploy:upgradeable:testnet
npm run deploy:upgradeable:mainnet      # PRODUCTION

# Upgrade existing Beacon (set BEACON_ADDRESS in .env first)
npm run upgrade:upgradeable:local
npm run upgrade:upgradeable:testnet
npm run upgrade:upgradeable:mainnet     # PRODUCTION
```

## Conventions

- Do NOT deploy contracts or modify deployment scripts without explicit human approval
- Contract interfaces live in `contracts/` alongside implementations
- ABI files in `abis/` should be regenerated after any ABI-breaking change
