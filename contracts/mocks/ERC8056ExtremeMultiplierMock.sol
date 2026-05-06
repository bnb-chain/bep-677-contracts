// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC8056TokenUpgradeable} from "../ERC8056TokenUpgradeable.sol";

/// @dev Test-only mock that removes the multiplier lower bound,
///      allowing extreme values (e.g. 1e50) to test overflow resilience.
contract ERC8056ExtremeMultiplierMock is ERC8056TokenUpgradeable {
    function _validateMultiplier(uint256) internal pure override {}
}
