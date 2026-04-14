// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @dev Required extension interface for EIP-8056: Pending Multiplier.
 * @notice See https://eips.ethereum.org/EIPS/eip-8056 for the full specification.
 *
 * Compliant contracts MUST implement this extension to expose a pending UI
 * multiplier that has been scheduled but has not yet taken effect.
 *
 * Interface ID: 0x4bd27648
 */
interface IScaledUIAmountNewUIMultiplier {
    /**
     * @dev Returns the pending UI multiplier scheduled to take effect at {effectiveAt}.
     * Multiplier is represented with 18 decimals (1e18 = 1.0).
     *
     * Note: This always returns the stored next multiplier value, even after it has
     * become active. Use {IERC8056Scheduled-hasPendingMultiplier} (BSC extension)
     * to check whether a change is still pending.
     */
    function newUIMultiplier() external view returns (uint256);

    /**
     * @dev Returns the timestamp at which the pending multiplier becomes effective.
     */
    function effectiveAt() external view returns (uint256);
}
