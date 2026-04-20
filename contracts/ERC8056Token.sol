// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ERC8056Base} from "./ERC8056Base.sol";

/**
 * @title ScaledUIToken
 * @author BNB Chain
 * @notice Example ERC20 token with EIP-8056 Scaled UI Amount extension.
 * @dev See https://eips.ethereum.org/EIPS/eip-8056 for the full specification.
 *
 * This is a minimal reference implementation using {Ownable} for access
 * control. It is intended as a starting point for developers and demonstrates
 * the basic EIP-8056 functionality.
 *
 * SECURITY CONSIDERATIONS:
 *
 * 1. CENTRALIZED TOKEN DISTRIBUTION:
 *    Upon deployment, the entire initial supply is minted to `initialOwner` with
 *    no vesting, lock-up, or transfer restrictions. The `initialOwner` also becomes
 *    the contract owner with full control over multiplier updates.
 *
 *    This design assumes the `initialOwner` is a trusted party. For production:
 *    - Use a multisig wallet as the `initialOwner`
 *    - Consider implementing a timelock for multiplier changes
 *    - Add vesting or linear release mechanisms for initial distribution
 *    - Clearly document centralization assumptions for users and stakeholders
 *
 * 2. MULTIPLIER THRESHOLDS:
 *    This implementation does not enforce min/max bounds on multiplier values.
 *    See {ERC8056Base-_validateMultiplier} for risks and recommendations.
 *
 *    For production, override {_validateMultiplier}:
 *    ```solidity
 *    function _validateMultiplier(uint256 newMultiplier) internal pure override {
 *        require(newMultiplier >= 1e15 && newMultiplier <= 1e21, "Out of range");
 *    }
 *    ```
 *
 * 3. PENDING CHANGE OVERWRITES:
 *    This implementation allows overwriting scheduled multiplier changes.
 *    When overwrites occur, {UIMultiplierChangeOverwritten} is emitted.
 *    See {ERC8056Base-_beforeMultiplierUpdate} for risks and recommendations.
 *
 *    For strict scheduling, override {_beforeMultiplierUpdate}:
 *    ```solidity
 *    function _beforeMultiplierUpdate(uint256, uint256) internal view override {
 *        require(!hasPendingMultiplier(), "Cannot overwrite pending change");
 *    }
 *    ```
 *
 * @custom:deprecated Prefer {ERC8056TokenUpgradeable} for new deployments. This non-upgradeable
 * variant is retained as a reference implementation. Existing deployed contracts are unaffected.
 */
contract ScaledUIToken is ERC8056Base, Ownable {
    /**
     * @dev Initializes the token with a name, symbol, and initial supply.
     *
     * @notice CENTRALIZATION WARNING: The entire initial supply is minted to
     * `initialOwner`, who also becomes the contract owner. No vesting or lock-up
     * mechanisms are implemented. For production use, consider:
     * - Using a multisig or timelock contract as the owner
     * - Implementing token vesting for initial distribution
     * - Documenting trust assumptions for users
     *
     * @param name Token name (e.g., "Scaled UI Token")
     * @param symbol Token symbol (e.g., "SUIT")
     * @param initialSupply Initial supply in whole tokens (before decimals).
     *        For example, 1000000 creates 1,000,000 tokens.
     * @param initialOwner Address to receive initial supply and ownership.
     *        IMPORTANT: Use a multisig or governance contract for production.
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
     *
     * @notice For production deployments, consider using:
     * - Role-based access control (e.g., separate ADMIN_ROLE)
     * - A timelock contract for delayed execution
     * - Multi-signature requirements
     */
    function _authorizeMultiplierUpdate() internal override onlyOwner {}
}
