// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ScaledUIToken} from "../ERC8056Token.sol";

/// @dev Test-only mock that removes the multiplier bound check,
///      allowing extreme values to test overflow resilience in ERC8056Base.
contract ERC8056ExtremeMultiplierBaseMock is ScaledUIToken {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) ScaledUIToken(name, symbol, initialSupply, initialOwner) {}

    function _validateMultiplier(uint256) internal pure override {}
}
