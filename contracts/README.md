# Contracts Deployment Guide

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create a `.env` file in the `contracts` directory with the following variables:

```env
PRIVATE_KEY=your_private_key_here
TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545
MAINNET_RPC_URL=https://bsc-dataseed.binance.org/
BSCSCAN_API_KEY=your_bscscan_api_key_here

# Optional deployment parameters (defaults will be used if not set)
TOKEN_NAME=Scaled UI Token
TOKEN_SYMBOL=SUIT
INITIAL_SUPPLY=1000000
INITIAL_OWNER=0x0000000000000000000000000000000000000000
```

## Compile

```bash
npm run compile
```

## Deploy

### Local Network

```bash
npm run deploy:local
```

### Testnet

```bash
npm run deploy:testnet
```

### Mainnet

```bash
npm run deploy:mainnet
```

### Custom Network

```bash
npx hardhat run scripts/deploy.js --network <network_name>
```

## Custom Parameters

You can override deployment parameters using environment variables:

```bash
TOKEN_NAME="My Token" TOKEN_SYMBOL="MTK" INITIAL_SUPPLY=2000000 INITIAL_OWNER=0x... npx hardhat run scripts/deploy.js --network testnet
```

## Verify Contract

After deployment, the script will automatically attempt to verify the contract on BSCScan if `BSCSCAN_API_KEY` is set.

You can also manually verify:

```bash
npx hardhat verify --network testnet <CONTRACT_ADDRESS> "Token Name" "SYMBOL" 1000000 <OWNER_ADDRESS>
```
