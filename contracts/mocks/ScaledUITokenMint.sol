// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ScaledUIToken} from "../ERC8056Token.sol";

/// @dev Test-only mock that exposes mint and burn for event coverage tests.
contract ScaledUITokenMint is ScaledUIToken {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) ScaledUIToken(name, symbol, initialSupply, initialOwner) {}

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }
}
