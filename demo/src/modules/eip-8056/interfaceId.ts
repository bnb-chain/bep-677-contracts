import { toFunctionSelector } from "viem";

function xorSelectors(sigs: string[]): `0x${string}` {
  let id = BigInt(0);
  for (const sig of sigs) {
    id = id ^ BigInt(toFunctionSelector(sig as `function ${string}`));
  }
  return `0x${id.toString(16).padStart(8, "0")}` as `0x${string}`;
}

/**
 * EIP-8056 Core Interface
 * Functions: uiMultiplier()
 * ID: 0xa60bf13d
 */
export const SCALED_UI_AMOUNT_INTERFACE_ID: `0x${string}` = xorSelectors([
  "function uiMultiplier() view returns (uint256)",
]);

/**
 * EIP-8056 Required Extension: Pending Multiplier
 * Functions: newUIMultiplier(), effectiveAt()
 * ID: 0x4bd27648
 */
export const SCALED_UI_AMOUNT_NEW_MULTIPLIER_INTERFACE_ID: `0x${string}` =
  xorSelectors([
    "function newUIMultiplier() view returns (uint256)",
    "function effectiveAt() view returns (uint256)",
  ]);

/**
 * EIP-8056 Optional Extension: Conversion
 * Functions: toUIAmount(uint256), fromUIAmount(uint256)
 * ID: 0x57854fc3
 */
export const SCALED_UI_AMOUNT_CONVERSION_INTERFACE_ID: `0x${string}` =
  xorSelectors([
    "function toUIAmount(uint256 rawAmount) view returns (uint256)",
    "function fromUIAmount(uint256 uiAmount) view returns (uint256)",
  ]);

/**
 * EIP-8056 Optional Extension: Balances
 * Functions: balanceOfUI(address), totalSupplyUI()
 * ID: 0xd890fd71
 */
export const SCALED_UI_AMOUNT_BALANCES_INTERFACE_ID: `0x${string}` =
  xorSelectors([
    "function balanceOfUI(address account) view returns (uint256)",
    "function totalSupplyUI() view returns (uint256)",
  ]);

/**
 * BSC Extension: Scheduled Multiplier (NOT part of EIP-8056)
 * Functions: pendingMultiplier(), hasPendingMultiplier()
 * ID: 0xeb0093dd
 */
export const ERC8056_SCHEDULED_INTERFACE_ID: `0x${string}` = xorSelectors([
  "function pendingMultiplier() view returns (uint256 multiplier, uint256 effectiveAt)",
  "function hasPendingMultiplier() view returns (bool)",
]);

/**
 * @deprecated Use SCALED_UI_AMOUNT_INTERFACE_ID instead.
 * Kept for backward compatibility.
 */
export const ERC8056_INTERFACE_ID = SCALED_UI_AMOUNT_INTERFACE_ID;

/**
 * All EIP-8056 interface IDs with metadata for display
 */
export const EIP8056_INTERFACES = [
  {
    name: "IScaledUIAmount",
    id: SCALED_UI_AMOUNT_INTERFACE_ID,
    type: "MUST" as const,
    label: "Core Interface",
    description: "EIP-8056 core — uiMultiplier()",
  },
  {
    name: "IScaledUIAmountNewUIMultiplier",
    id: SCALED_UI_AMOUNT_NEW_MULTIPLIER_INTERFACE_ID,
    type: "REQUIRED" as const,
    label: "Required Extension",
    description: "EIP-8056 required — newUIMultiplier(), effectiveAt()",
  },
  {
    name: "IScaledUIAmountConversion",
    id: SCALED_UI_AMOUNT_CONVERSION_INTERFACE_ID,
    type: "OPTIONAL" as const,
    label: "Optional Extension",
    description: "EIP-8056 optional — toUIAmount(), fromUIAmount()",
  },
  {
    name: "IScaledUIAmountBalances",
    id: SCALED_UI_AMOUNT_BALANCES_INTERFACE_ID,
    type: "OPTIONAL" as const,
    label: "Optional Extension",
    description: "EIP-8056 optional — balanceOfUI(), totalSupplyUI()",
  },
  {
    name: "IERC8056Scheduled",
    id: ERC8056_SCHEDULED_INTERFACE_ID,
    type: "EXTENSION" as const,
    label: "BSC Extension",
    description: "BSC extension (not part of EIP-8056) — pendingMultiplier(), hasPendingMultiplier()",
  },
] as const;
