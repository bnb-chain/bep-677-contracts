import { useState, useEffect, useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { formatUnits, parseUnits, isAddress, type Address } from "viem";
import { ERC8056_ABI } from "./abi";
import { displayBalance } from "./tokenUtils";
import {
  SCALED_UI_AMOUNT_INTERFACE_ID,
  ERC8056_SCHEDULED_INTERFACE_ID,
} from "./interfaceId";

interface PendingMultiplier {
  value: string;
  effectiveAt: number;
  remainingSeconds: number;
}

interface TokenData {
  contractAddress: string;
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: string;
  totalSupplyUI: string;
  owner: string | null;
  rawBalance: string;
  uiBalance: string;
  multiplier: string;
  pendingMultiplier: PendingMultiplier | null;
  isEIP8056: boolean;
  supportsScheduled: boolean;
}

interface UseScaledTokenReturn {
  address: Address | undefined;
  isConnected: boolean;
  tokenData: TokenData | null;
  isLoading: boolean;
  error: string | null;
  refreshData: () => Promise<void>;
  updateMultiplier: (
    newMultiplier: string,
    effectiveAt?: number
  ) => Promise<string>;
  transfer: (to: string, uiAmount: string) => Promise<string>;
}

// Localhost chain ID
const LOCALHOST_CHAIN_ID = 1337;

// Helper to wait for network to be ready with retries
async function waitForNetwork(
  publicClient: NonNullable<ReturnType<typeof usePublicClient>>,
  maxRetries = 3,
  delayMs = 500
): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await publicClient.getChainId();
      return true;
    } catch {
      if (i < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }
  return false;
}

export function useScaledToken(contractAddress: string): UseScaledTokenReturn {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [tokenData, setTokenData] = useState<TokenData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshData = useCallback(async () => {
    if (!contractAddress || !isAddress(contractAddress)) {
      setTokenData(null);
      if (contractAddress && !isAddress(contractAddress)) {
        setError("Invalid token address format");
      }
      return;
    }

    if (!publicClient) {
      setError("Network not connected. Please connect to a supported network.");
      setTokenData(null);
      return;
    }

    // Get the actual chain ID from the publicClient (not from useChainId which may be out of sync)
    const clientChainId = publicClient.chain?.id;

    setIsLoading(true);
    setError(null);

    try {
      const tokenAddress = contractAddress as Address;

      // Wait for network to be ready with retries (silent during initialization)
      const networkReady = await waitForNetwork(publicClient);
      if (!networkReady) {
        console.warn("Network not ready after retries, clientChainId:", clientChainId);
        // Check if it's localhost network - provide more specific error message
        if (clientChainId === LOCALHOST_CHAIN_ID) {
          setError(
            "Localhost network is not available. Please start local node (npx hardhat node) or switch to BSC Testnet."
          );
        } else {
          setError(
            "Network connection not ready. Please check your network connection and try again."
          );
        }
        setTokenData(null);
        setIsLoading(false);
        return;
      }

      // Check if contract exists
      let code: `0x${string}` | undefined;
      try {
        code = await publicClient.getBytecode({ address: tokenAddress });
      } catch (err) {
        console.error("Error fetching bytecode:", err);
        setError(
          `Failed to fetch contract: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
        setTokenData(null);
        setIsLoading(false);
        return;
      }

      if (!code || code === "0x") {
        setError(
          `No contract found at address ${contractAddress}. Please check the address and network.`
        );
        setTokenData(null);
        setIsLoading(false);
        return;
      }

      // Get balance information using displayBalance utility (if wallet connected)
      let balanceInfo: {
        display: string;
        raw: string;
        multiplier: string;
        isEIP8056: boolean;
      } | null = null;
      let isEIP8056 = false;
      let supportsScheduled = false;
      let multiplier = "1.0";
      let uiBalance = "0";
      let pendingMultiplier: PendingMultiplier | null = null;

      // Use displayBalance if wallet is connected
      if (address && isConnected) {
        try {
          balanceInfo = await displayBalance(tokenAddress, address, publicClient);
          isEIP8056 = balanceInfo.isEIP8056;
          multiplier = balanceInfo.multiplier;
          uiBalance = balanceInfo.display;
        } catch {
          // Fallback to manual detection if displayBalance fails
        }
      }

      // If displayBalance wasn't used, detect EIP-8056 support via supportsInterface
      if (!balanceInfo) {
        try {
          const supported = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC8056_ABI,
            functionName: "supportsInterface",
            args: [SCALED_UI_AMOUNT_INTERFACE_ID],
          });
          if (supported) {
            isEIP8056 = true;
            const mult = await publicClient.readContract({
              address: tokenAddress,
              abi: ERC8056_ABI,
              functionName: "uiMultiplier",
            });
            multiplier = formatUnits(mult as bigint, 18);
          }
        } catch {
          // Not EIP-8056, will use standard ERC20
        }
      }

      // Check for IERC8056Scheduled extension support
      if (isEIP8056) {
        try {
          const scheduledSupport = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC8056_ABI,
            functionName: "supportsInterface",
            args: [ERC8056_SCHEDULED_INTERFACE_ID],
          });
          supportsScheduled = scheduledSupport as boolean;
        } catch {
          // supportsInterface not available or failed
          supportsScheduled = false;
        }
      }

      // Get standard ERC20 data and owner
      let totalSupplyUIValue = "0";
      const [name, symbol, decimals, totalSupply, owner, rawBalance] =
        await Promise.all([
          publicClient
            .readContract({
              address: tokenAddress,
              abi: ERC8056_ABI,
              functionName: "name",
            })
            .catch(() => "Unknown"),
          publicClient
            .readContract({
              address: tokenAddress,
              abi: ERC8056_ABI,
              functionName: "symbol",
            })
            .catch(() => "UNKNOWN"),
          publicClient
            .readContract({
              address: tokenAddress,
              abi: ERC8056_ABI,
              functionName: "decimals",
            })
            .catch(() => 18n),
          publicClient
            .readContract({
              address: tokenAddress,
              abi: ERC8056_ABI,
              functionName: "totalSupply",
            })
            .catch(() => 0n),
          publicClient
            .readContract({
              address: tokenAddress,
              abi: ERC8056_ABI,
              functionName: "owner",
            })
            .catch(() => null),
          address && isConnected
            ? publicClient
                .readContract({
                  address: tokenAddress,
                  abi: ERC8056_ABI,
                  functionName: "balanceOf",
                  args: [address],
                })
                .catch(() => 0n)
            : Promise.resolve(0n),
        ]);

      // Get totalSupplyUI if EIP-8056 supported
      if (isEIP8056) {
        try {
          const tsUI = await publicClient.readContract({
            address: tokenAddress,
            abi: ERC8056_ABI,
            functionName: "totalSupplyUI",
          });
          totalSupplyUIValue = formatUnits(tsUI as bigint, Number(decimals));
        } catch {
          totalSupplyUIValue = formatUnits(totalSupply as bigint, Number(decimals));
        }
      }

      // Get EIP-8056 specific data if supported
      if (isEIP8056) {
        // Check for pending multiplier via EIP-standard getters
        try {
          const [nextMult, nextMultEffectiveAt] = await Promise.all([
            publicClient.readContract({
              address: tokenAddress,
              abi: ERC8056_ABI,
              functionName: "newUIMultiplier",
            }),
            publicClient.readContract({
              address: tokenAddress,
              abi: ERC8056_ABI,
              functionName: "effectiveAt",
            }),
          ]);

          const currentTimestamp = BigInt(Math.floor(Date.now() / 1000));
          const effectiveAtBigInt = nextMultEffectiveAt as bigint;

          // Per updated BEP-677 spec: effectiveAt() returns 0 when no
          // pending change exists, and a future timestamp when pending.
          if (effectiveAtBigInt > 0n && effectiveAtBigInt > currentTimestamp) {
            const remainingSeconds = Number(
              effectiveAtBigInt - currentTimestamp
            );
            pendingMultiplier = {
              value: formatUnits(nextMult as bigint, 18),
              effectiveAt: Number(effectiveAtBigInt),
              remainingSeconds,
            };
          }
        } catch {
          // Pending multiplier not available
        }

        // UI balance already fetched via displayBalance if connected
        // If not connected or displayBalance wasn't used, use raw balance
        if (!balanceInfo && address && isConnected) {
          try {
            const uiBal = await publicClient.readContract({
              address: tokenAddress,
              abi: ERC8056_ABI,
              functionName: "balanceOfUI",
              args: [address],
            });
            uiBalance = formatUnits(uiBal as bigint, Number(decimals));
          } catch {
            uiBalance = formatUnits(rawBalance as bigint, Number(decimals));
          }
        } else if (!balanceInfo) {
          uiBalance = formatUnits(rawBalance as bigint, Number(decimals));
        }
      } else {
        // Not EIP-8056, use raw balance as UI balance
        if (!balanceInfo) {
          uiBalance = formatUnits(rawBalance as bigint, Number(decimals));
        }
      }

      setTokenData({
        contractAddress: contractAddress,
        name: name as string,
        symbol: symbol as string,
        decimals: Number(decimals),
        totalSupply: formatUnits(totalSupply as bigint, Number(decimals)),
        totalSupplyUI: totalSupplyUIValue,
        owner: owner ? (owner as Address) : null,
        rawBalance: balanceInfo
          ? balanceInfo.raw
          : formatUnits(rawBalance as bigint, Number(decimals)),
        uiBalance,
        multiplier,
        pendingMultiplier,
        isEIP8056,
        supportsScheduled,
      });
      setError(null);
    } catch (err: unknown) {
      console.error("Error fetching data:", err);
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(`Failed to fetch contract data: ${message.slice(0, 100)}`);
      setTokenData(null);
    } finally {
      setIsLoading(false);
    }
  }, [contractAddress, publicClient, address, isConnected]);

  const updateMultiplier = async (
    newMultiplier: string,
    effectiveAt?: number
  ) => {
    if (!walletClient || !contractAddress || !isAddress(contractAddress)) {
      throw new Error("Wallet not connected or invalid contract address");
    }

    try {
      const address = contractAddress as Address;
      const multiplierValue = parseUnits(newMultiplier, 18);
      const effectiveTimestamp =
        effectiveAt || Math.floor(Date.now() / 1000) + 30;

      const hash = await walletClient.writeContract({
        address,
        abi: ERC8056_ABI,
        functionName: "setUIMultiplier",
        args: [multiplierValue, BigInt(effectiveTimestamp)],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      await refreshData();
      return hash;
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new Error(`Failed to update multiplier: ${message}`);
    }
  };

  const transfer = async (to: string, uiAmount: string) => {
    if (
      !walletClient ||
      !contractAddress ||
      !isAddress(contractAddress) ||
      !tokenData
    ) {
      throw new Error("Wallet not connected or invalid contract address");
    }

    if (!isAddress(to)) {
      throw new Error("Invalid recipient address");
    }

    try {
      const address = contractAddress as Address;
      const toAddress = to as Address;

      // Convert UI amount to raw amount
      let rawAmount: bigint;
      if (tokenData.isEIP8056) {
        const uiAmountWei = parseUnits(uiAmount, tokenData.decimals);
        rawAmount = (await publicClient!.readContract({
          address,
          abi: ERC8056_ABI,
          functionName: "fromUIAmount",
          args: [uiAmountWei],
        })) as bigint;
      } else {
        rawAmount = parseUnits(uiAmount, tokenData.decimals);
      }

      const hash = await walletClient.writeContract({
        address,
        abi: ERC8056_ABI,
        functionName: "transfer",
        args: [toAddress, rawAmount],
      });

      await publicClient?.waitForTransactionReceipt({ hash });
      await refreshData();
      return hash;
    } catch (err: unknown) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Unknown error";
      throw new Error(`Transfer failed: ${message}`);
    }
  };

  // Clear error when publicClient changes (network switch)
  // This ensures stale errors from previous network don't persist
  useEffect(() => {
    setError(null);
    setTokenData(null);
  }, [publicClient]);

  useEffect(() => {
    // Only fetch data when publicClient is ready and contractAddress is valid
    // This prevents errors during wagmi initialization on page refresh
    if (contractAddress && isAddress(contractAddress) && publicClient) {
      refreshData();
    }
  }, [contractAddress, refreshData, publicClient]);

  return {
    address,
    isConnected,
    tokenData,
    isLoading,
    error,
    refreshData,
    updateMultiplier,
    transfer,
  };
}
