# BEP-677: Implement EIP-8056 Scaled UI Amount

Reference implementation of [BEP-677](https://github.com/bnb-chain/beps/blob/master/BEPs/BEP-677.md) — apply an updatable multiplier to UI-displayed token balances without minting or burning.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.24-blue.svg)](https://soliditylang.org)
[![Hardhat](https://img.shields.io/badge/Built%20with-Hardhat-yellow.svg)](https://hardhat.org)

📖 [BEP-677 Specification](https://github.com/bnb-chain/beps/blob/master/BEPs/BEP-677.md) · 📖 [EIP-8056 Specification](https://eips.ethereum.org/EIPS/eip-8056) · 🧪 [Live Demo](https://bnb-chain.github.io/bep-677-contracts)

## Deployments

`ERC8056TokenUpgradeable` is deployed via the Beacon proxy pattern. **Interact with the BeaconProxy address.**

| Network | BeaconProxy (token) | UpgradeableBeacon |
|---|---|---|
| BSC Testnet | [`0x101ba6E119035C3a037BE594F3454032fDbfa65e`](https://testnet.bscscan.com/address/0x101ba6E119035C3a037BE594F3454032fDbfa65e) | [`0x2020Ed7E81ba2Df07d4eC7C54DaB46C9b822d4cA`](https://testnet.bscscan.com/address/0x2020Ed7E81ba2Df07d4eC7C54DaB46C9b822d4cA) |

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

## Architecture

[`ERC8056TokenUpgradeable`](./contracts/ERC8056TokenUpgradeable.sol) is deployed via the **Beacon proxy pattern**:

```
UpgradeableBeacon ─── implementation address ───▶ ERC8056TokenUpgradeable (logic)
       ▲
BeaconProxy (token address) ─── asks beacon for impl on every call
```

- All BeaconProxy instances pointing at the same Beacon upgrade atomically when the Beacon's implementation pointer is updated
- The implementation contract calls `_disableInitializers()` in its constructor, so it can never be initialized directly — only proxies can call `initialize`
- A 47-slot storage gap (`uint256[47] __gap`) in [`ERC8056BaseUpgradeable`](./contracts/ERC8056BaseUpgradeable.sol) reserves room for future base-contract state additions without colliding with downstream inheritors

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

The playground defaults to the testnet `ERC8056TokenUpgradeable` BeaconProxy address. To load any other EIP-8056 token:

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

## Audits

| Auditor | Date | Scope | Report |
|---|---|---|---|
| Pashov Audit Group | 2026-04-30 | BEP-677 v1 ([`13a604b`](https://github.com/bnb-chain/bep-677-contracts/commit/13a604b)) | [`2026-04-30_Pashov_BEP-677.pdf`](./audits/2026-04-30_Pashov_BEP-677.pdf) |

## License

Released under the [MIT License](./LICENSE).
