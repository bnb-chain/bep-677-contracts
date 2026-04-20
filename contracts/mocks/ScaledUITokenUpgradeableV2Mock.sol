// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ScaledUITokenUpgradeable} from "../ERC8056TokenUpgradeable.sol";

/**
 * @dev Mock V2 contract for upgrade-safety testing only. Adds one field
 * after the inherited storage layout — a safe upgrade.
 */
contract ScaledUITokenUpgradeableV2Mock is ScaledUITokenUpgradeable {
    uint256 public version;
}
