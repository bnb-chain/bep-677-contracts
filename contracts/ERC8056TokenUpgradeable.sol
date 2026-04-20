// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {ERC8056BaseUpgradeable} from "./ERC8056BaseUpgradeable.sol";

/**
 * @title ScaledUITokenUpgradeable
 * @author BNB Chain
 * @notice Upgradeable ERC20 token with EIP-8056 Scaled UI Amount extension.
 * @dev See https://eips.ethereum.org/EIPS/eip-8056 for the full specification.
 *
 * This is the upgradeable variant of {ScaledUIToken}, designed for UUPS proxy
 * deployments. Use {ERC8056BaseUpgradeable} as the base for custom upgradeable
 * EIP-8056 tokens.
 *
 * Deploy via the OpenZeppelin Hardhat Upgrades plugin:
 * ```js
 * const proxy = await upgrades.deployProxy(
 *   Factory, [name, symbol, supply, owner], { kind: "uups" }
 * );
 * ```
 *
 * SECURITY CONSIDERATIONS:
 *
 * 1. CENTRALIZED TOKEN DISTRIBUTION:
 *    Upon initialization, the entire initial supply is minted to `initialOwner` with
 *    no vesting, lock-up, or transfer restrictions. The `initialOwner` also becomes
 *    the contract owner with full control over multiplier and upgrade authorization.
 *
 *    For production:
 *    - Use a multisig wallet as the `initialOwner`
 *    - Consider implementing a timelock for multiplier changes
 *    - Clearly document centralization assumptions for users and stakeholders
 *
 * 2. MULTIPLIER THRESHOLDS:
 *    This implementation does not enforce min/max bounds on multiplier values.
 *    See {ERC8056BaseUpgradeable-_validateMultiplier} for risks and recommendations.
 *
 * 3. PENDING CHANGE OVERWRITES:
 *    This implementation allows overwriting scheduled multiplier changes.
 *    When overwrites occur, {UIMultiplierChangeOverwritten} is emitted.
 */
contract ScaledUITokenUpgradeable is ERC8056BaseUpgradeable, OwnableUpgradeable, UUPSUpgradeable {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    /**
     * @notice Initializes the token. Replaces the constructor for upgradeable contracts.
     *
     * @param name Token name (e.g., "Scaled UI Token")
     * @param symbol Token symbol (e.g., "SUIT")
     * @param initialSupply Initial supply in whole tokens (before decimals).
     *        For example, 1000000 creates 1,000,000 tokens.
     * @param initialOwner Address to receive initial supply and ownership.
     *        IMPORTANT: Use a multisig or governance contract for production.
     */
    function initialize(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) public initializer {
        __erc8056Base_init(name, symbol);
        __Ownable_init(initialOwner);
        _mint(initialOwner, initialSupply * 10 ** decimals());
    }

    /**
     * @dev Restricts multiplier updates to the contract owner.
     */
    function _authorizeMultiplierUpdate() internal override onlyOwner {}

    /**
     * @dev Restricts contract upgrades to the contract owner.
     */
    function _authorizeUpgrade(address) internal override onlyOwner {}
}
