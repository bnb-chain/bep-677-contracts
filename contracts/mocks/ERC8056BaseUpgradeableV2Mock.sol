// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC8056TokenUpgradeable} from "../ERC8056TokenUpgradeable.sol";

/// @dev Test-only mock that appends a single storage slot inside the __gap.
///      Used by validateUpgrade to prove append-only storage layout is safe.
contract ERC8056BaseUpgradeableV2Mock is ERC8056TokenUpgradeable {
    uint256 public version;
}
