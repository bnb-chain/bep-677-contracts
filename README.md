# BEP-677: Implement EIP-8056 Scaled UI Amount

Reference implementation of [BEP-677](https://github.com/bnb-chain/beps/blob/master/BEPs/BEP-677.md) — apply an updatable multiplier to UI-displayed token balances without minting or burning.

📖 [BEP-677](https://github.com/bnb-chain/beps/blob/master/BEPs/BEP-677.md) · 📖 [EIP-8056](https://eips.ethereum.org/EIPS/eip-8056) · 🧪 [Live Demo](https://bnb-chain.github.io/bep-677-contracts)

## Contract Addresses

#### BSC Testnet

- **ScaledUIToken**: `0xc28129Cd9A5ABe9eE14874BF0942150Fa24767A9`

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
npm install
npx hardhat compile
npx hardhat test
```

## Playground

```bash
cd playground
bun install
bun run dev
```

Open http://localhost:5173

## License

MIT
