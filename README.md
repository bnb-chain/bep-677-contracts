# BNB Chain POC Labs

Reference implementations for Ethereum Improvement Proposals.

---

## 📦 Structure

```
poc-labs/
├── contracts/
│   └── scaled-ui-amount/     # EIP-8056 implementation
│       ├── IERC8056.sol
│       └── ERC8056Token.sol
└── ui/                       # Interactive demo (React + Vite)
```

---

## 🔬 EIP-8056: Scaled UI Amount Extension

Apply an updatable multiplier to UI-displayed balances without minting/burning tokens.

**Use Cases:** Stock splits, reverse splits, RWA adjustments

📖 [EIP-8056 Specification](https://eips.ethereum.org/EIPS/eip-8056)

---

## 🚀 Quick Start

```bash
# Run the demo
cd ui
npm install
npm run dev
```

Open http://localhost:5173

---

## 📋 Usage

```solidity
import "./ERC8056Token.sol";

contract MyToken is ScaledUIToken {
    constructor() ScaledUIToken("My Token", "MTK", 1000000, msg.sender) {}
}
```

---

## ⚠️ Disclaimer

These implementations are for **proof-of-concept purposes**. Conduct your own security audit before production use.

---

## 📄 License

MIT
