# BEP-677 Playground

Interactive demo for [BEP-677 / EIP-8056 Scaled UI Amount](https://eips.ethereum.org/EIPS/eip-8056).

Connect a wallet and explore multiplier scheduling, balance scaling, and transfers against BSC Testnet, BSC Mainnet, or a local Hardhat node.

## Run locally

```bash
bun install
bun run dev
```

Open [http://localhost:5173/bep-677-contracts/](http://localhost:5173/bep-677-contracts/)

## Load a custom token

The playground defaults to the deployed `ScaledUITokenUpgradeable` on BSC Testnet. To load any other EIP-8056 token, append `?token=0x<address>` to the URL, or enter the address directly in the "Option 2" input on the home page.

Works with any network (BSC Testnet, BSC Mainnet, or localhost).

## Deploy your own token

See the root [README](../README.md) for full deploy instructions:

```bash
# from repo root
npm run deploy:upgradeable:testnet
```

Then load the proxy address via the URL or the address input.
