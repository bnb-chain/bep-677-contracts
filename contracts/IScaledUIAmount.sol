// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @dev Core interface for EIP-8056 Scaled UI Amount Extension.
 * @notice See https://eips.ethereum.org/EIPS/eip-8056 for the full specification.
 *
 * Interface ID: 0xa60bf13d
 */
interface IScaledUIAmount {
    /**
     * @dev Emitted when the UI multiplier is updated or initialized.
     * @param oldMultiplier The previous multiplier value. A value of 0 indicates
     *        initialization (no prior multiplier exists); the runtime invariant
     *        `uiMultiplier > 0` guarantees 0 cannot appear in any post-init emission.
     * @param newMultiplier The new multiplier value scheduled to take effect
     * @param effectiveAtTimestamp The timestamp when the new multiplier becomes active
     */
    event UIMultiplierUpdated(
        uint256 oldMultiplier,
        uint256 newMultiplier,
        uint256 effectiveAtTimestamp
    );

    /**
     * @dev REQUIRED. MUST be emitted on every token transfer, mint, and burn
     * alongside the standard ERC-20 {Transfer} event so that frontends and
     * indexers can resolve UI amounts without off-chain multiplier lookups.
     *
     * If `uiAmount == 0` while `amount != 0`, the UI representation is not
     * currently expressible (extreme multiplier caused overflow). Consumers
     * SHOULD recompute via `toUIAmount(amount)` against the current multiplier.
     * This sentinel guarantees `_update` cannot revert and break ERC-20
     * backwards compatibility per EIP-8056.
     *
     * @param from Sender address (zero address for mints)
     * @param to Recipient address (zero address for burns)
     * @param amount Raw token amount transferred
     * @param uiAmount UI-adjusted amount at the time of transfer, or 0 as a
     *        sentinel when the value is unrepresentable (see above)
     */
    event TransferWithUIAmount(
        address indexed from,
        address indexed to,
        uint256 amount,
        uint256 uiAmount
    );

    /**
     * @dev Returns the current UI multiplier.
     * Multiplier is represented with 18 decimals (1e18 = 1.0).
     */
    function uiMultiplier() external view returns (uint256);
}
