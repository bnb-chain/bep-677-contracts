// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC8056Base} from "./ERC8056Base.sol";

/**
 * @dev Example ERC20 token with EIP-8056 Scaled UI Amount extension.
 *
 * This is a minimal reference implementation using {Ownable} for access
 * control. For production deployments, consider:
 *
 * - Override {_validateMultiplier} to add min/max threshold checks
 * - Override {_beforeMultiplierUpdate} to protect against overwriting scheduled changes
 * - Use a multisig or timelock contract as the owner
 *
 * Example with threshold protection:
 * ```solidity
 * function _validateMultiplier(uint256 newMultiplier) internal pure override {
 *     require(newMultiplier >= 1e15 && newMultiplier <= 1e21, "Out of range");
 * }
 * ```
 */
contract ScaledUIToken is ERC8056Base, Ownable {
    /**
     * @dev Initializes the token with a name, symbol, and initial supply.
     *
     * The entire initial supply is minted to `initialOwner`, who also
     * becomes the contract owner with permission to update the multiplier.
     *
     * @param name Token name
     * @param symbol Token symbol
     * @param initialSupply Initial supply in whole tokens (before decimals)
     * @param initialOwner Address to receive initial supply and ownership
     */
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _mint(initialOwner, initialSupply * 10 ** decimals());
    }

    /**
     * @dev Restricts multiplier updates to the contract owner.
     */
    function _authorizeMultiplierUpdate() internal override onlyOwner {}
}
