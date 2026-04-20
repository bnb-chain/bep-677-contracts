# BEP-677: Implement EIP-8056 Scaled UI Amount

Reference implementation of [BEP-677](https://github.com/bnb-chain/beps/blob/master/BEPs/BEP-677.md) — apply an updatable multiplier to UI-displayed token balances without minting or burning.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue.svg)](https://soliditylang.org)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org)

📖 [BEP-677 Specification](https://github.com/bnb-chain/beps/blob/master/BEPs/BEP-677.md) · 📖 [EIP-8056 Specification](https://eips.ethereum.org/EIPS/eip-8056) · 🧪 [Live Demo](https://bnb-chain.github.io/bep-677-contracts)

## Contract Addresses

| Token | Variant | Network | Address |
|---|---|---|---|
| `ERC8056TokenUpgradeable` | Upgradeable Beacon (BeaconProxy) | BSC Testnet | [`0x101ba6E119035C3a037BE594F3454032fDbfa65e`](https://testnet.bscscan.com/address/0x101ba6E119035C3a037BE594F3454032fDbfa65e) |
| `ERC8056TokenUpgradeable` | Upgradeable Beacon (UpgradeableBeacon) | BSC Testnet | [`0x2020Ed7E81ba2Df07d4eC7C54DaB46C9b822d4cA`](https://testnet.bscscan.com/address/0x2020Ed7E81ba2Df07d4eC7C54DaB46C9b822d4cA) |
| ~~`ScaledUIToken`~~ | ~~Non-upgradeable~~ (**deprecated**) | BSC Testnet | [`0xc28129Cd9A5ABe9eE14874BF0942150Fa24767A9`](https://testnet.bscscan.com/address/0xc28129Cd9A5ABe9eE14874BF0942150Fa24767A9) |

## About

EIP-8056 introduces a `uiAmountMultiplier` to BEP-20 tokens — a scaling factor that wallets use to display balances without changing on-chain raw amounts. This enables stock-split-style redenominations, RWA adjustments, and reverse splits purely at the display layer.

## Quickstart

[`ERC8056TokenUpgradeable`](./contracts/ERC8056TokenUpgradeable.sol) is a ready-to-deploy Beacon-upgradeable EIP-8056 token. Deploy it directly — no subclassing required:

```bash
npm run deploy:upgradeable:testnet   # Beacon + BeaconProxy → BSC Testnet
npm run deploy:upgradeable:mainnet   # BSC Mainnet — PRODUCTION, requires human approval
```

To extend with additional logic, inherit from [`ERC8056BaseUpgradeable`](./contracts/ERC8056BaseUpgradeable.sol) instead:

```solidity
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ERC8056BaseUpgradeable} from "./ERC8056BaseUpgradeable.sol";

contract MyToken is ERC8056BaseUpgradeable, OwnableUpgradeable {
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
        // your additional init logic here
    }

    function _authorizeMultiplierUpdate() internal override onlyOwner {}
}
```

> **Deprecated:** [`ERC8056Base`](./contracts/ERC8056Base.sol) / [`ScaledUIToken`](./contracts/ERC8056Token.sol) (non-upgradeable) are kept as historical reference only. Use [`ERC8056TokenUpgradeable`](./contracts/ERC8056TokenUpgradeable.sol) for all new deployments.

## Upgradeable Variant

[`ERC8056TokenUpgradeable`](./contracts/ERC8056TokenUpgradeable.sol) is the recommended contract for new tokens. It uses the **Beacon proxy pattern**:

```
UpgradeableBeacon ─── implementation address ───▶ ERC8056TokenUpgradeable (logic)
       ▲
BeaconProxy (token address) ─── asks beacon for impl on every call
```

Key differences from the deprecated `ERC8056Base`:
- Deployed as a BeaconProxy; upgrades update the Beacon's implementation pointer
- All proxies sharing the same Beacon upgrade in one transaction
- 50-slot storage gap (`__gap`) in `ERC8056BaseUpgradeable` guards future base-contract additions
- `constructor` calls `_disableInitializers()` to lock the implementation

**First deployment** (Beacon + implementation + BeaconProxy):

```bash
npm run deploy:upgradeable:testnet
npm run deploy:upgradeable:mainnet   # PRODUCTION, requires human approval
```

The script prints three addresses: **Beacon**, **Implementation**, and **BeaconProxy**. Save the Beacon address — you need it to upgrade later. **Use the BeaconProxy address** when interacting with the token.

**Subsequent upgrades** (all proxies upgrade atomically):

```bash
BEACON_ADDRESS=0x... npm run upgrade:upgradeable:testnet
BEACON_ADDRESS=0x... npm run upgrade:upgradeable:mainnet
```

The upgrade script validates storage layout compatibility before submitting any transaction.

## Multi-token / Custom Tokens

The playground defaults to the testnet `ERC8056BaseUpgradeable` BeaconProxy address. To load any other EIP-8056 token:

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
