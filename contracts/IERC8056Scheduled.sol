// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev Extension interface for EIP-8056 with scheduled multiplier changes.
 * @notice Extension: Not part of EIP-8056. May not exist in other implementations.
 *
 * This interface provides functions to query pending multiplier changes
 * that have been scheduled but not yet taken effect.
 */
interface IERC8056Scheduled {
    /**
     * @dev Emitted when a pending multiplier change is overwritten before taking effect.
     * @param overwrittenMultiplier The multiplier value that was scheduled but overwritten
     * @param overwrittenEffectiveAt The timestamp when the overwritten multiplier was supposed to take effect
     * @param newMultiplier The new multiplier value that replaced it
     * @param newEffectiveAt The timestamp when the new multiplier will take effect
     */
    event UIMultiplierChangeOverwritten(
        uint256 overwrittenMultiplier,
        uint256 overwrittenEffectiveAt,
        uint256 newMultiplier,
        uint256 newEffectiveAt
    );

    /**
     * @dev Returns the pending multiplier and its effective timestamp.
     *
     * Use {hasPendingMultiplier} to check if a change is actually pending.
     *
     * @return multiplier The scheduled next multiplier value
     * @return effectiveAt The timestamp when the multiplier becomes active
     */
    function pendingMultiplier() external view returns (uint256 multiplier, uint256 effectiveAt);

    /**
     * @dev Returns true if there is a pending multiplier change that hasn't taken effect yet.
     */
    function hasPendingMultiplier() external view returns (bool);
}

