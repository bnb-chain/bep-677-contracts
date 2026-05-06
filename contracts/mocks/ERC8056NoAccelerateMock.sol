// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC8056TokenUpgradeable} from "../ERC8056TokenUpgradeable.sol";

/// @dev Test-only mock that rejects acceleration of a pending multiplier change.
///      Demonstrates the _beforeMultiplierUpdate override pattern from L-03 docs.
contract ERC8056NoAccelerateMock is ERC8056TokenUpgradeable {
    function _beforeMultiplierUpdate(uint256, uint256 effectiveAtTimestamp) internal view override {
        if (hasPendingMultiplier()) {
            require(
                effectiveAtTimestamp >= effectiveAt(),
                "Cannot accelerate pending multiplier"
            );
        }
    }
}
