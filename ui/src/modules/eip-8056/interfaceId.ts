import { toFunctionSelector } from "viem";

/**
 * Calculate the interface ID for IERC8056 (Scaled UI Amount Extension)
 *
 * According to EIP-165, the interface ID is the XOR of all function selectors
 * in the interface. This includes:
 * - uiMultiplier()
 * - toUIAmount(uint256)
 * - fromUIAmount(uint256)
 * - balanceOfUI(address)
 * - setUIMultiplier(uint256,uint256)
 *
 * @returns The interface ID as a hex string (0x + 8 hex characters)
 */
export function calculateERC8056InterfaceId(): `0x${string}` {
  // Get function selectors (first 4 bytes of keccak256 hash)
  const selectors = [
    toFunctionSelector("function uiMultiplier() view returns (uint256)"),
    toFunctionSelector(
      "function toUIAmount(uint256 rawAmount) view returns (uint256)"
    ),
    toFunctionSelector(
      "function fromUIAmount(uint256 uiAmount) view returns (uint256)"
    ),
    toFunctionSelector(
      "function balanceOfUI(address account) view returns (uint256)"
    ),
    toFunctionSelector(
      "function setUIMultiplier(uint256 newMultiplier, uint256 effectiveAtTimestamp)"
    ),
  ];

  // XOR all selectors
  let interfaceId = BigInt(0);
  for (const selector of selectors) {
    interfaceId = interfaceId ^ BigInt(selector);
  }

  // Format as bytes4 (8 hex chars with 0x prefix)
  const hexString = interfaceId.toString(16).padStart(8, "0");
  return `0x${hexString}` as `0x${string}`;
}

/**
 * Pre-calculated interface ID for IERC8056
 * This value is constant and will never change once the interface is finalized.
 *
 * You can verify this by running: calculateERC8056InterfaceId()
 */
export const ERC8056_INTERFACE_ID: `0x${string}` =
  calculateERC8056InterfaceId();
