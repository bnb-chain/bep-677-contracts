# BEP-677: Implement EIP-8056 Scaled UI Amount

Reference implementation of [BEP-677](https://github.com/bnb-chain/beps/blob/master/BEPs/BEP-677.md) — apply an updatable multiplier to UI-displayed token balances without minting or burning.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue.svg)](https://soliditylang.org)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org)

📖 [BEP-677 Specification](https://github.com/bnb-chain/beps/blob/master/BEPs/BEP-677.md) · 📖 [EIP-8056 Specification](https://eips.ethereum.org/EIPS/eip-8056) · 🧪 [Live Demo](https://bnb-chain.github.io/bep-677-contracts)

## Contract Addresses

| Token | Variant | Network | Address |
|---|---|---|---|
| `ScaledUITokenUpgradeable` | Upgradeable UUPS | BSC Testnet | [`0xF097139Aaf93AF2603A2b711228E2ec9D3F84c16`](https://testnet.bscscan.com/address/0xF097139Aaf93AF2603A2b711228E2ec9D3F84c16) |
| ~~`ScaledUIToken`~~ | ~~Non-upgradeable~~ (**deprecated**) | BSC Testnet | [`0xc28129Cd9A5ABe9eE14874BF0942150Fa24767A9`](https://testnet.bscscan.com/address/0xc28129Cd9A5ABe9eE14874BF0942150Fa24767A9) |

## About

EIP-8056 introduces a `uiAmountMultiplier` to BEP-20 tokens — a scaling factor that wallets use to display balances without changing on-chain raw amounts. This enables stock-split-style redenominations, RWA adjustments, and reverse splits purely at the display layer.

## Quickstart

```solidity
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ERC8056BaseUpgradeable} from "./ERC8056BaseUpgradeable.sol";

contract MyToken is ERC8056BaseUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() { _disableInitializers(); }

    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) public initializer {
        __erc8056Base_init(name, symbol);
        __Ownable_init(initialOwner);
        _mint(initialOwner, initialSupply * 10 ** decimals());
    }

    function _authorizeMultiplierUpdate() internal override onlyOwner {}
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
```

> **Deprecated:** [`ERC8056Base`](./contracts/ERC8056Base.sol) / [`ScaledUIToken`](./contracts/ERC8056Token.sol) (non-upgradeable) are kept as historical reference only. Use [`ERC8056BaseUpgradeable`](./contracts/ERC8056BaseUpgradeable.sol) for all new deployments.

## Upgradeable Variant

[`ERC8056BaseUpgradeable`](./contracts/ERC8056BaseUpgradeable.sol) is the recommended base for new tokens. It uses the **UUPS proxy pattern** so the implementation can be upgraded while preserving the token's address and state.

Key differences from the deprecated `ERC8056Base`:
- Replace `constructor` with `initialize()` + `__erc8056Base_init`
- Add `_disableInitializers()` in the constructor to lock the implementation
- Implement `_authorizeUpgrade(address)` for upgrade access control
- 50-slot storage gap (`__gap`) guards future base-contract additions

Deploy via the [OpenZeppelin Hardhat Upgrades](https://docs.openzeppelin.com/upgrades-plugins/hardhat-upgrades) plugin:

**First deployment** (proxy + implementation):

```bash
npm run deploy:upgradeable:testnet   # UUPS proxy + implementation → BSC Testnet
npm run deploy:upgradeable:mainnet   # BSC Mainnet — PRODUCTION, requires human approval
```

**Subsequent upgrades** (proxy address stays the same, only implementation changes):

```bash
PROXY_ADDRESS=0x... npm run upgrade:upgradeable:testnet
PROXY_ADDRESS=0x... npm run upgrade:upgradeable:mainnet
```

The upgrade script validates storage layout compatibility before submitting any transaction. The deploy script logs both the proxy address and the implementation address. **Use the proxy address** when interacting with the token.

## Multi-token / Custom Tokens

The playground defaults to the testnet `ScaledUITokenUpgradeable` address. To load any other EIP-8056 token:

- Append `?token=0x<address>` to the URL, or
- Enter the address directly in the "Option 2" input on the home page

Works with any network (BSC Testnet, BSC Mainnet, or localhost).

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

Open [http://localhost:5173/bep-677-contracts/](http://localhost:5173/bep-677-contracts/)

## License

Released under the [MIT License](./LICENSE).
