# EIP-8056: Scaled UI Amount

Reference implementation of EIP-8056 — apply an updatable multiplier to UI-displayed token balances without minting or burning.

📖 [EIP Specification](https://eips.ethereum.org/EIPS/eip-8056) · 🧪 [Live Demo](https://bnb-chain.github.io/eip-8056-contracts)

## Contract Addresses

#### BSC Testnet
- **ScaledUIToken**: `0xB9d96f9579c9E38E24f4a4f9b5AD807f19b3a62e`

## About

EIP-8056 introduces a `uiAmountMultiplier` to ERC-20 tokens — a scaling factor that wallets use to display balances without changing on-chain raw amounts. This enables stock-split-style redenominations, RWA adjustments, and reverse splits purely at the display layer.

## Quickstart

```solidity
import "./ERC8056Token.sol";

contract MyToken is ScaledUIToken {
    constructor() ScaledUIToken("My Token", "MTK", 1000000, msg.sender) {}
}
```

## Development

```bash
cd contracts
npm install
npx hardhat compile
npx hardhat test
```

## Demo

```bash
cd demo
bun install
bun run dev
```

Open http://localhost:5173

## License

MIT
