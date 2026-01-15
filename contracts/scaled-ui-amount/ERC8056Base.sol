// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {IERC8056} from "./IERC8056.sol";

/**
 * @dev Abstract base contract for EIP-8056 Scaled UI Amount extension.
 *
 * This implementation provides a UI multiplier mechanism that allows token
 * amounts to be displayed differently from their actual on-chain values.
 * Common use cases include stock splits, rebasing tokens, and RWA adjustments.
 *
 * The multiplier uses 18 decimals precision, where 1e18 represents 1.0x.
 * For example, a 2:1 stock split would use a multiplier of 2e18.
 *
 * Multiplier changes can be scheduled for a future timestamp, allowing
 * users and integrators to prepare for upcoming changes.
 *
 * To use this contract, inherit from it and implement {_authorizeMultiplierUpdate}
 * to define who can update the multiplier. Optionally override
 * {_validateMultiplier} and {_beforeMultiplierUpdate} for additional checks.
 *
 * Example:
 * ```solidity
 * contract MyToken is ERC8056Base, Ownable {
 *     function _authorizeMultiplierUpdate() internal override onlyOwner {}
 * }
 * ```
 */
abstract contract ERC8056Base is ERC20, IERC8056, IERC165 {
    using Math for uint256;

    /**
     * @dev Multiplier precision: 1e18 = 1.0x multiplier.
     */
    uint256 internal constant MULTIPLIER_DECIMALS = 1e18;

    uint256 private _uiMultiplier = MULTIPLIER_DECIMALS;
    uint256 private _nextUiMultiplier = MULTIPLIER_DECIMALS;
    uint256 private _nextUiMultiplierEffectiveAt = type(uint256).max;

    /**
     * @dev See {IERC8056-uiMultiplier}.
     *
     * Returns the currently active multiplier. If a scheduled change has
     * passed its effective timestamp, returns the new multiplier.
     */
    function uiMultiplier() public view virtual override returns (uint256) {
        if (block.timestamp >= _nextUiMultiplierEffectiveAt) {
            return _nextUiMultiplier;
        }
        return _uiMultiplier;
    }

    /**
     * @dev See {IERC8056-toUIAmount}.
     *
     * Converts a raw token amount to its UI representation using the
     * current multiplier. Uses {Math-mulDiv} for overflow-safe calculation.
     */
    function toUIAmount(uint256 rawAmount) public view virtual override returns (uint256) {
        return rawAmount.mulDiv(uiMultiplier(), MULTIPLIER_DECIMALS);
    }

    /**
     * @dev See {IERC8056-fromUIAmount}.
     *
     * Converts a UI amount back to raw token amount. This is the inverse
     * of {toUIAmount}.
     */
    function fromUIAmount(uint256 uiAmount) public view virtual override returns (uint256) {
        return uiAmount.mulDiv(MULTIPLIER_DECIMALS, uiMultiplier());
    }

    /**
     * @dev See {IERC8056-balanceOfUI}.
     *
     * Returns the UI-adjusted balance of `account`.
     */
    function balanceOfUI(address account) public view virtual override returns (uint256) {
        return toUIAmount(balanceOf(account));
    }

    /**
     * @dev Returns the pending multiplier and its effective timestamp.
     *
     * If no change is scheduled, `effectiveAt` will be `type(uint256).max`.
     *
     * @return multiplier The scheduled next multiplier value
     * @return effectiveAt The timestamp when the multiplier becomes active
     */
    function pendingMultiplier() public view virtual returns (uint256 multiplier, uint256 effectiveAt) {
        return (_nextUiMultiplier, _nextUiMultiplierEffectiveAt);
    }

    /**
     * @dev Returns true if there is a pending multiplier change that
     * hasn't taken effect yet.
     */
    function hasPendingMultiplier() public view virtual returns (bool) {
        return block.timestamp < _nextUiMultiplierEffectiveAt;
    }

    /**
     * @dev Hook for access control. Must be overridden in derived contracts.
     *
     * This function should revert if `msg.sender` is not authorized to
     * update the multiplier.
     *
     * Example using Ownable:
     * ```solidity
     * function _authorizeMultiplierUpdate() internal override onlyOwner {}
     * ```
     *
     * Example using AccessControl:
     * ```solidity
     * function _authorizeMultiplierUpdate() internal override onlyRole(ADMIN_ROLE) {}
     * ```
     */
    function _authorizeMultiplierUpdate() internal virtual;

    /**
     * @dev Hook for validating multiplier values.
     *
     * Override this function to add min/max threshold checks. The default
     * implementation only requires the multiplier to be positive.
     *
     * @param newMultiplier The new multiplier value to validate
     *
     * Example:
     * ```solidity
     * function _validateMultiplier(uint256 newMultiplier) internal pure override {
     *     require(newMultiplier >= 1e15, "Multiplier too low");   // min 0.001x
     *     require(newMultiplier <= 1e21, "Multiplier too high");  // max 1000x
     * }
     * ```
     */
    function _validateMultiplier(uint256 newMultiplier) internal virtual {
        require(newMultiplier > 0, "ERC8056: multiplier must be positive");
    }

    /**
     * @dev Hook called before a multiplier update is applied.
     *
     * Override this function to add custom logic, such as preventing
     * overwrites of pending changes.
     *
     * @param newMultiplier The new multiplier value
     * @param effectiveAtTimestamp When the new multiplier should take effect
     *
     * Example (prevent overwriting pending changes):
     * ```solidity
     * function _beforeMultiplierUpdate(uint256, uint256) internal view override {
     *     require(!hasPendingMultiplier(), "Cannot overwrite pending change");
     * }
     * ```
     */
    function _beforeMultiplierUpdate(uint256 newMultiplier, uint256 effectiveAtTimestamp) internal virtual {}

    /**
     * @dev Internal function to set the UI multiplier.
     *
     * This function validates the multiplier, calls the before-update hook,
     * and schedules the new multiplier.
     *
     * Requirements:
     *
     * - `effectiveAtTimestamp` must be in the future (>= current block timestamp)
     * - `newMultiplier` must pass {_validateMultiplier} checks
     *
     * @param newMultiplier The new multiplier value (1e18 = 1.0x)
     * @param effectiveAtTimestamp When the new multiplier should take effect
     */
    function _setUIMultiplier(uint256 newMultiplier, uint256 effectiveAtTimestamp) internal virtual {
        require(effectiveAtTimestamp >= block.timestamp, "ERC8056: effective time must be in future");

        _validateMultiplier(newMultiplier);
        _beforeMultiplierUpdate(newMultiplier, effectiveAtTimestamp);

        uint256 currentMult = uiMultiplier();

        // Seal any pending change that has already become active
        if (block.timestamp >= _nextUiMultiplierEffectiveAt) {
            _uiMultiplier = _nextUiMultiplier;
        }

        _nextUiMultiplier = newMultiplier;
        _nextUiMultiplierEffectiveAt = effectiveAtTimestamp;

        emit UIMultiplierUpdated(currentMult, newMultiplier, block.timestamp, effectiveAtTimestamp);
    }

    /**
     * @dev See {IERC8056-setUIMultiplier}.
     *
     * Requirements:
     *
     * - Caller must be authorized (see {_authorizeMultiplierUpdate})
     * - `newMultiplier` must be valid (see {_validateMultiplier})
     * - `effectiveAtTimestamp` must be >= current block timestamp
     */
    function setUIMultiplier(uint256 newMultiplier, uint256 effectiveAtTimestamp) public virtual override {
        _authorizeMultiplierUpdate();
        _setUIMultiplier(newMultiplier, effectiveAtTimestamp);
    }

    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC165).interfaceId ||
            interfaceId == type(IERC20).interfaceId ||
            interfaceId == type(IERC8056).interfaceId;
    }
}
