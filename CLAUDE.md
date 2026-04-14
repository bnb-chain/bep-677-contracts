# BEP-677 Contracts

Solidity smart contract project implementing BEP-677 (EIP-8056 Scaled UI Amount) on BNB Chain.

## Tech Stack

- **Hardhat** — Solidity 0.8.20, optimizer enabled (200 runs)
- **npm** — root project package manager
- **Bun** — playground/ subproject package manager

## Key Commands

```bash
npx hardhat compile      # compile contracts
npx hardhat test         # run tests
npx hardhat node         # start local node
```

## Project Structure

- `contracts/` — Solidity sources (ERC8056Base, ERC8056Token, interfaces)
- `abis/` — pre-built ABI JSON files
- `scripts/` — deploy scripts (deploy.js)
- `playground/` — Vite + React frontend demo (separate Bun project)

## Deployment (DO NOT run in CI)

Deployment to live networks requires a funded wallet and should only be triggered manually:

```bash
npm run deploy:local      # local Hardhat node
npm run deploy:testnet    # BSC testnet (chainId 97)
npm run deploy:mainnet    # BSC mainnet (chainId 56) — PRODUCTION
```

## Conventions

- Do NOT deploy contracts or modify deployment scripts without explicit human approval
- Contract interfaces live in `contracts/` alongside implementations
- ABI files in `abis/` should be regenerated after any ABI-breaking change
