// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "./IERC8056.sol";

/**
 * @title ScaledUIToken
 * @dev ERC20 token with EIP-8056 Scaled UI Amount extension.
 * Supports scheduled multiplier updates for stock splits and RWA adjustments.
 */
contract ScaledUIToken is ERC20, Ownable, IERC8056 {
    using Math for uint256;

    uint256 private constant MULTIPLIER_DECIMALS = 1e18;

    uint256 private _uiMultiplier = MULTIPLIER_DECIMALS;
    uint256 public _nextUiMultiplier = MULTIPLIER_DECIMALS;
    uint256 public _nextUiMultiplierEffectiveAt = 0;

    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        _mint(initialOwner, initialSupply * 10**decimals());
        _nextUiMultiplierEffectiveAt = type(uint256).max;
    }

    function uiMultiplier() public view override returns (uint256) {
        if (block.timestamp >= _nextUiMultiplierEffectiveAt) {
            return _nextUiMultiplier;
        }
        return _uiMultiplier;
    }

    /// @dev Converts raw token amount to UI display amount using mulDiv for overflow safety.
    function toUIAmount(uint256 rawAmount) public view override returns (uint256) {
        return rawAmount.mulDiv(uiMultiplier(), MULTIPLIER_DECIMALS);
    }

    /// @dev Converts UI display amount back to raw token amount.
    function fromUIAmount(uint256 uiAmount) public view override returns (uint256) {
        return uiAmount.mulDiv(MULTIPLIER_DECIMALS, uiMultiplier());
    }

    function balanceOfUI(address account) public view override returns (uint256) {
        return toUIAmount(balanceOf(account));
    }

    /// @dev Schedules a new multiplier.
    function setUIMultiplier(uint256 newMultiplier, uint256 effectiveAtTimestamp) public override onlyOwner {
        require(newMultiplier > 0, "Multiplier must be positive");
        uint256 currentTime = block.timestamp;
        require(effectiveAtTimestamp >= currentTime, "Effective time must be in the future");

        uint256 currentMult = uiMultiplier();

        // Seal any pending change that has already become active
        if (currentTime >= _nextUiMultiplierEffectiveAt) {
            _uiMultiplier = _nextUiMultiplier;
        }

        _nextUiMultiplier = newMultiplier;
        _nextUiMultiplierEffectiveAt = effectiveAtTimestamp;

        emit UIMultiplierUpdated(currentMult, newMultiplier, currentTime, effectiveAtTimestamp);
    }
}
