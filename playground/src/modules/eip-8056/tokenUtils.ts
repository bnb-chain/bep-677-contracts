import {
  formatUnits,
  type Address,
  type PublicClient,
  getContract,
} from "viem";
import { SCALED_UI_AMOUNT_INTERFACE_ID } from "./interfaceId";
import { ERC8056_ABI } from "./abi";

/**
 * Get token balance information with Scaled UI support
 * Returns both display (UI) and raw balances, plus multiplier if supported
 */
export async function displayBalance(
  tokenAddress: Address,
  userAddress: Address,
  publicClient: PublicClient
): Promise<{
  display: string;
  raw: string;
  multiplier: string;
  isEIP8056: boolean;
}> {
  try {
    // Create contract instance
    const token = getContract({
      address: tokenAddress,
      abi: ERC8056_ABI,
      client: publicClient,
    });

    // Check if scaled UI is supported
    const supportsScaledUI = await token.read.supportsInterface([
      SCALED_UI_AMOUNT_INTERFACE_ID,
    ]);

    // Get decimals first (needed for formatting)
    const decimals = await token.read.decimals();

    if (supportsScaledUI) {
      // Get UI balance, raw balance, and multiplier
      const [uiBalance, rawBalance, multiplier] = await Promise.all([
        token.read.balanceOfUI([userAddress]),
        token.read.balanceOf([userAddress]),
        token.read.uiMultiplier(),
      ]);

      return {
        display: formatUnits(uiBalance as bigint, Number(decimals)),
        raw: formatUnits(rawBalance as bigint, Number(decimals)),
        multiplier: formatUnits(multiplier as bigint, 18),
        isEIP8056: true,
      };
    } else {
      // Fall back to standard ERC-20
      const balance = await token.read.balanceOf([userAddress]);

      return {
        display: formatUnits(balance as bigint, Number(decimals)),
        raw: formatUnits(balance as bigint, Number(decimals)),
        multiplier: "1.0",
        isEIP8056: false,
      };
    }
  } catch (error) {
    throw new Error(
      `Failed to get balance: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
