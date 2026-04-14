import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useChainId, usePublicClient } from "wagmi";
import { type Address } from "viem";
import { useScaledToken } from "./useScaledToken";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Wallet,
  RefreshCw,
  Terminal,
  Send,
  Copy,
  Check,
  Zap,
  AlertTriangle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Rocket,
  Search,
  Clock,
} from "lucide-react";
import { isAddress, parseEventLogs, formatUnits } from "viem";
import {
  EIP8056_INTERFACES,
  ERC8056_SCHEDULED_INTERFACE_ID,
} from "./interfaceId";
import { ERC8056_ABI } from "./abi";

const DEFAULT_TOKEN_ADDRESS = "0xB9d96f9579c9E38E24f4a4f9b5AD807f19b3a62e";

// ============================================================================
// Reusable Components
// ============================================================================

// Generate token icon with first letter
const TokenIcon = ({ name }: { name: string }) => {
  const firstLetter = name.charAt(0).toUpperCase() || "T";
  const bgColor = `bg-gradient-to-br from-yellow-400 to-yellow-600`;

  return (
    <div
      className={`w-10 h-10 ${bgColor} rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-sm`}
    >
      {firstLetter}
    </div>
  );
};

const CodeBlock = ({
  code,
  label,
  copyable = false,
  language = "typescript",
}: {
  code: string;
  label?: string;
  copyable?: boolean;
  language?: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border bg-slate-950 overflow-hidden font-mono text-sm">
      {label && (
        <div className="bg-slate-900 px-4 py-2 text-xs text-slate-400 font-medium border-b border-slate-800 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Terminal className="w-3 h-3" /> {label}
          </span>
          {copyable && (
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {copied ? (
                <Check className="w-3 h-3 text-emerald-400" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          )}
        </div>
      )}
      <SyntaxHighlighter
        language={language}
        style={vscDarkPlus}
        customStyle={{
          margin: 0,
          padding: "1rem",
          background: "rgb(2, 6, 23)", // slate-950 equivalent
          fontSize: "0.875rem",
          lineHeight: "1.5",
        }}
        codeTagProps={{
          style: {
            fontFamily:
              "ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, 'Liberation Mono', monospace",
          },
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
};

const ExpandableSection = ({
  title,
  children,
  defaultExpanded = false,
}: {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 bg-slate-50 hover:bg-slate-100 flex items-center justify-between transition-colors"
      >
        <span className="font-medium text-slate-700">{title}</span>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        ) : (
          <ChevronDown className="w-4 h-4 text-slate-500" />
        )}
      </button>
      {expanded && <div className="p-4 bg-white">{children}</div>}
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

export function Eip8056Portal() {
  const [searchParams, setSearchParams] = useSearchParams();
  const chainId = useChainId();
  const contractAddress = searchParams.get("token") || "";
  const [newMultiplier, setNewMultiplier] = useState("");
  const [effectiveAt, setEffectiveAt] = useState("");
  const [transferRecipient, setTransferRecipient] = useState("");
  const [transferUiAmount, setTransferUiAmount] = useState("");

  // Scheduled extension query states (BSC extension)
  const [hasPendingResult, setHasPendingResult] = useState<boolean | null>(null);
  const [pendingResult, setPendingResult] = useState<{multiplier: string, effectiveAt: number} | null>(null);
  const [queryLoading, setQueryLoading] = useState<'hasPending' | 'pending' | null>(null);

  // EIP-8056 standard pending multiplier state
  const [eip8056PendingResult, setEip8056PendingResult] = useState<{ newMultiplier: string; effectiveAt: number } | null>(null);
  const [eip8056QueryLoading, setEip8056QueryLoading] = useState(false);

  // Interface detection state
  const [interfaceDetectionResults, setInterfaceDetectionResults] = useState<Record<string, boolean | null>>({});
  const [interfaceDetecting, setInterfaceDetecting] = useState(false);

  // Transfer result state
  const [transferResult, setTransferResult] = useState<{ hash: string; rawAmount: string; uiAmount: string } | null>(null);

  const publicClient = usePublicClient();

  const {
    address,
    isConnected,
    tokenData,
    isLoading,
    error,
    refreshData,
    updateMultiplier,
    transfer,
  } = useScaledToken(contractAddress);

  const handleUpdateMultiplier = async () => {
    if (!newMultiplier) return;
    try {
      const effectiveTimestamp = effectiveAt
        ? Math.floor(new Date(effectiveAt).getTime() / 1000)
        : Math.floor(Date.now() / 1000) + 30;

      await updateMultiplier(newMultiplier, effectiveTimestamp);
      alert(`✅ Multiplier updated successfully!`);
      setNewMultiplier("");
      setEffectiveAt("");
    } catch (err: any) {
      alert(`❌ Error: ${err.message}`);
    }
  };

  const handleTransfer = async () => {
    if (!transferRecipient || !transferUiAmount) return;
    setTransferResult(null);
    try {
      const hash = await transfer(transferRecipient, transferUiAmount);
      // Parse TransferWithUIAmount event from receipt
      if (publicClient) {
        try {
          const receipt = await publicClient.getTransactionReceipt({ hash: hash as `0x${string}` });
          const logs = parseEventLogs({
            abi: ERC8056_ABI,
            eventName: 'TransferWithUIAmount',
            logs: receipt.logs,
          });
          if (logs.length > 0 && tokenData) {
            const { amount, uiAmount } = logs[0].args as { amount: bigint; uiAmount: bigint };
            setTransferResult({
              hash,
              rawAmount: formatUnits(amount, tokenData.decimals),
              uiAmount: formatUnits(uiAmount, tokenData.decimals),
            });
          }
        } catch {
          // Event parsing failed — just show success
        }
      }
      setTransferRecipient("");
      setTransferUiAmount("");
    } catch (err: any) {
      alert(`❌ Transfer failed: ${err.message}`);
    }
  };

  // Query hasPendingMultiplier
  const queryHasPending = async () => {
    if (!publicClient || !contractAddress) return;
    setQueryLoading('hasPending');
    try {
      const result = await publicClient.readContract({
        address: contractAddress as Address,
        abi: [{
          name: 'hasPendingMultiplier',
          type: 'function',
          inputs: [],
          outputs: [{ type: 'bool' }],
          stateMutability: 'view'
        }],
        functionName: 'hasPendingMultiplier',
      });
      setHasPendingResult(result as boolean);
    } catch (err) {
      console.error('Failed to query hasPendingMultiplier:', err);
      setHasPendingResult(null);
    } finally {
      setQueryLoading(null);
    }
  };

  // Query pendingMultiplier (first checks hasPendingMultiplier)
  const queryPendingMultiplier = async () => {
    if (!publicClient || !contractAddress) return;
    setQueryLoading('pending');
    try {
      // First check if there's a pending multiplier
      const hasPending = await publicClient.readContract({
        address: contractAddress as Address,
        abi: [{
          name: 'hasPendingMultiplier',
          type: 'function',
          inputs: [],
          outputs: [{ type: 'bool' }],
          stateMutability: 'view'
        }],
        functionName: 'hasPendingMultiplier',
      }) as boolean;

      if (!hasPending) {
        // No pending multiplier, set result to indicate this
        setPendingResult({ multiplier: '0', effectiveAt: 0 });
        return;
      }

      // Has pending, get the details
      const result = await publicClient.readContract({
        address: contractAddress as Address,
        abi: [{
          name: 'pendingMultiplier',
          type: 'function',
          inputs: [],
          outputs: [
            { name: 'multiplier', type: 'uint256' },
            { name: 'effectiveAt', type: 'uint256' }
          ],
          stateMutability: 'view'
        }],
        functionName: 'pendingMultiplier',
      }) as [bigint, bigint];
      const multiplierValue = Number(result[0]) / 1e18;
      setPendingResult({
        multiplier: multiplierValue.toString(),
        effectiveAt: Number(result[1])
      });
    } catch (err) {
      console.error('Failed to query pendingMultiplier:', err);
      setPendingResult(null);
    } finally {
      setQueryLoading(null);
    }
  };

  // Query EIP-8056 standard newUIMultiplier + effectiveAt
  const queryEip8056Pending = async () => {
    if (!publicClient || !contractAddress) return;
    setEip8056QueryLoading(true);
    try {
      const [newMult, effectiveAt] = await Promise.all([
        publicClient.readContract({
          address: contractAddress as Address,
          abi: ERC8056_ABI,
          functionName: 'newUIMultiplier',
        }),
        publicClient.readContract({
          address: contractAddress as Address,
          abi: ERC8056_ABI,
          functionName: 'effectiveAt',
        }),
      ]);
      setEip8056PendingResult({
        newMultiplier: formatUnits(newMult as bigint, 18),
        effectiveAt: Number(effectiveAt as bigint),
      });
    } catch {
      setEip8056PendingResult(null);
    } finally {
      setEip8056QueryLoading(false);
    }
  };

  // Query all 5 supportsInterface
  const queryAllInterfaces = async () => {
    if (!publicClient || !contractAddress) return;
    setInterfaceDetecting(true);
    const results: Record<string, boolean | null> = {};
    for (const iface of EIP8056_INTERFACES) {
      try {
        const result = await publicClient.readContract({
          address: contractAddress as Address,
          abi: ERC8056_ABI,
          functionName: 'supportsInterface',
          args: [iface.id],
        });
        results[iface.id] = result as boolean;
      } catch {
        results[iface.id] = null;
      }
    }
    setInterfaceDetectionResults(results);
    setInterfaceDetecting(false);
  };

  // Get BscScan URL based on current chain
  const getBscScanUrl = (
    address: string,
    type: "address" | "writeContract" = "address"
  ) => {
    const isMainnet = chainId === 56;
    const base = isMainnet
      ? "https://bscscan.com"
      : "https://testnet.bscscan.com";
    const suffix = type === "writeContract" ? "#writeContract" : "";
    return `${base}/address/${address}${suffix}`;
  };

  const [tokenInput, setTokenInput] = useState(DEFAULT_TOKEN_ADDRESS);

  const handleTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tokenInput && isAddress(tokenInput)) {
      setSearchParams({ token: tokenInput });
    }
  };

  // Show home page if no token address
  if (!contractAddress || !isAddress(contractAddress)) {
    return (
      <div className="space-y-8 pb-20">
        {/* EIP-8056 Introduction */}
        <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-yellow-50">
          <CardHeader>
            <CardTitle className="text-2xl flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span>EIP-8056: Scaled UI Amount Extension</span>
            </CardTitle>
            <CardDescription className="text-base mt-2">
              Apply an updatable multiplier to UI-displayed balances without
              minting/burning tokens
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-white rounded-lg border border-indigo-100">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-yellow-600" />
                  Key Features
                </h3>
                <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>
                    Display scaled balances in UI without changing on-chain
                    amounts
                  </li>
                  <li>Support for stock splits and reverse splits</li>
                  <li>RWA (Real World Assets) adjustments</li>
                  <li>Owner-controlled multiplier updates</li>
                  <li>Backward compatible with standard ERC20</li>
                </ul>
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <p className="text-xs font-medium text-slate-700 mb-1.5 flex items-center gap-1">
                    🛡️ Audit-Driven Extensions:
                  </p>
                  <ul className="text-xs text-slate-500 space-y-1 list-disc list-inside">
                    <li>Query pending multiplier changes before they take effect</li>
                    <li>Track overwritten changes via events for audit trail</li>
                    <li>Customizable multiplier bounds to prevent extreme values</li>
                    <li>Optional protection against overwriting scheduled updates</li>
                </ul>
                </div>
              </div>
              <div className="p-4 bg-white rounded-lg border border-purple-100">
                <h3 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <Info className="w-5 h-5 text-yellow-600" />
                  Use Cases
                </h3>
                <ul className="text-sm text-slate-600 space-y-1.5 list-disc list-inside">
                  <li>Stock splits: 1:2 split shows 2x balance in UI</li>
                  <li>Reverse splits: 2:1 reverse split shows 0.5x balance</li>
                  <li>RWA tokenization with price adjustments</li>
                  <li>Token rebasing without actual mint/burn</li>
                </ul>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-sm text-yellow-800">
                <p className="font-medium">
                  📖 Learn more:{" "}
                  <a
                    href="https://eips.ethereum.org/EIPS/eip-8056"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-600 hover:text-yellow-800 underline inline-flex items-center gap-1"
                  >
                    EIP-8056 Specification
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* How to View an EIP-8056 Token */}
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <Search className="w-6 h-6 text-slate-700" />
              How to View an EIP-8056 Token
            </CardTitle>
            <CardDescription>
              Choose one of the following options to explore an EIP-8056 token
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Option 1: Deploy Contract */}
            <div className="p-5 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex-shrink-0">
                  <Rocket className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Option 1: Deploy Your Own Token
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    Inherit from{" "}
                    <a
                      href="https://github.com/bnb-chain/poc-labs/blob/main/contracts/scaled-ui-amount/ERC8056Base.sol"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:text-emerald-700 underline inline-flex items-center gap-0.5"
                    >
                      ERC8056Base.sol
                      <ExternalLink className="w-3 h-3" />
                    </a>{" "}
                    to create your own EIP-8056 compliant token with customizable hooks.
                  </p>
                  <div className="space-y-4">
                    {/* Inherit ERC8056Base */}
                    <div className="p-3 bg-white rounded border border-emerald-100">
                      <h4 className="font-medium text-sm text-slate-900 mb-2">
                        Hooks to Implement:
                      </h4>
                      <div className="text-xs text-slate-600 space-y-2 mb-3">
                        <div>
                          <code className="bg-emerald-50 px-1 rounded font-semibold">
                            _authorizeMultiplierUpdate()
                          </code>
                          <span className="text-red-500 ml-1">(Required)</span>
                          <p className="text-slate-500 mt-0.5">
                            Access control for multiplier updates. Recommend using multisig or timelock.
                        </p>
                    </div>
                        <div>
                          <code className="bg-emerald-50 px-1 rounded">
                            _validateMultiplier()
                          </code>
                          <span className="text-slate-400 ml-1">(Optional)</span>
                          <p className="text-slate-500 mt-0.5">
                            Set min/max thresholds to prevent overflow or precision loss.
                        </p>
                        </div>
                        <div>
                          <code className="bg-emerald-50 px-1 rounded">
                            _beforeMultiplierUpdate()
                          </code>
                          <span className="text-slate-400 ml-1">(Optional)</span>
                          <p className="text-slate-500 mt-0.5">
                            Prevent overwriting pending changes.
                        </p>
                      </div>
                    </div>

                      {/* Deployment Options */}
                      <div className="space-y-3">
                        <ExpandableSection
                          title="View Integration Code"
                          defaultExpanded={false}
                        >
                          <CodeBlock
                            label="Inherit ERC8056Base"
                            copyable
                            language="solidity"
                            code={`// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
// Import from GitHub (for Remix) or use npm package
import {ERC8056Base} from "https://github.com/bnb-chain/poc-labs/blob/main/contracts/scaled-ui-amount/ERC8056Base.sol";

contract MyToken is ERC8056Base, Ownable {
    constructor(
        string memory name,
        string memory symbol,
        uint256 initialSupply,
        address owner
    ) ERC20(name, symbol) Ownable(owner) {
        _mint(owner, initialSupply * 10 ** decimals());
    }

    // Required: Access control (recommend multisig/timelock for production)
    function _authorizeMultiplierUpdate() internal override onlyOwner {}

    // Optional: Set multiplier bounds to prevent overflow/precision loss
    // function _validateMultiplier(uint256 newMultiplier) internal pure override {
    //     require(newMultiplier >= 1e15 && newMultiplier <= 1e21, "Out of range");
    // }

    // Optional: Prevent overwriting pending changes
    // function _beforeMultiplierUpdate(uint256, uint256) internal view override {
    //     require(!hasPendingMultiplier(), "Cannot overwrite pending");
    // }
}`}
                          />
                        </ExpandableSection>

                        <ExpandableSection
                          title="Deploy via Local Environment (Hardhat)"
                          defaultExpanded={false}
                        >
                          <div className="space-y-3">
                            <div className="text-xs text-slate-600">
                              <p className="font-medium text-slate-700 mb-2">Deployment Steps:</p>
                              <ol className="list-decimal list-inside space-y-1.5 text-slate-500">
                                <li>Navigate to the <code className="bg-slate-100 px-1 rounded">contracts</code> directory</li>
                                <li>Install dependencies: <code className="bg-slate-100 px-1 rounded">npm install</code></li>
                                <li>Configure your <code className="bg-slate-100 px-1 rounded">.env</code> file with your private key and RPC URLs</li>
                                <li>Deploy to testnet: <code className="bg-slate-100 px-1 rounded">npm run deploy:testnet</code></li>
                                <li>Copy the deployed contract address and use it below</li>
                              </ol>
                  </div>
                            <div className="p-3 bg-slate-50 rounded border border-slate-200">
                              <p className="text-xs font-medium text-slate-700 mb-1">Contract Details:</p>
                              <div className="text-xs text-slate-500 space-y-0.5">
                                <p>Contract: <code className="bg-slate-100 px-1 rounded">ERC8056Token</code></p>
                                <p>Location: <code className="bg-slate-100 px-1 rounded">contracts/scaled-ui-amount/ERC8056Token.sol</code></p>
                                <p>Constructor Parameters: <code className="bg-slate-100 px-1 rounded">name, symbol, initialSupply, initialOwner</code></p>
                              </div>
                            </div>
                          </div>
                        </ExpandableSection>

                        <ExpandableSection
                          title="Deploy via Remix IDE"
                          defaultExpanded={false}
                        >
                          <div className="space-y-3">
                            <div className="text-xs text-slate-600">
                              <p className="font-medium text-slate-700 mb-2">Steps to deploy via Remix:</p>
                              <ol className="list-decimal list-inside space-y-1.5 text-slate-500">
                                <li>Open <a href="https://remix.ethereum.org" target="_blank" rel="noopener noreferrer" className="text-emerald-600 underline">Remix IDE</a></li>
                                <li>Create a new file and paste the integration code above</li>
                                <li>Compile with Solidity 0.8.20+</li>
                                <li>Connect MetaMask to BSC Testnet</li>
                                <li>Deploy with constructor params:
                                  <ul className="list-disc list-inside ml-4 mt-1">
                                    <li><code className="bg-slate-100 px-1 rounded">name</code>: "My Token"</li>
                                    <li><code className="bg-slate-100 px-1 rounded">symbol</code>: "MTK"</li>
                                    <li><code className="bg-slate-100 px-1 rounded">initialSupply</code>: 1000000</li>
                                    <li><code className="bg-slate-100 px-1 rounded">owner</code>: your wallet address</li>
                                  </ul>
                                </li>
                                <li>Confirm transaction in MetaMask</li>
                                <li>Copy the deployed contract address and use it below</li>
                              </ol>
                            </div>
                          </div>
                        </ExpandableSection>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Option 2: Enter Token Address */}
            <div className="p-5 bg-gradient-to-br from-yellow-50 to-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-lg flex-shrink-0">
                  <Search className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">
                    Option 2: Enter Token Address
                  </h3>
                  <p className="text-sm text-slate-600 mb-4">
                    If you already have an EIP-8056 token contract address,
                    enter it below to view its details and interact with it.
                  </p>
                  <form onSubmit={handleTokenSubmit} className="space-y-3">
                    <div>
                      <Input
                        type="text"
                        placeholder="0x..."
                        value={tokenInput}
                        onChange={(e) => setTokenInput(e.target.value)}
                        className="font-mono"
                      />
                      {tokenInput && !isAddress(tokenInput) && (
                        <p className="text-xs text-red-600 mt-1">
                          Invalid address format
                        </p>
                      )}
                    </div>
                    <Button
                      type="submit"
                      disabled={!tokenInput || !isAddress(tokenInput)}
                      className="w-full bg-yellow-600 hover:bg-yellow-700 cursor-pointer"
                    >
                      <Search className="w-4 h-4 mr-2" />
                      View Token
                    </Button>
                  </form>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Error Message */}
      {error ? (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-red-700">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <div className="font-medium mb-1">Error Loading Token</div>
                <div className="text-sm">{error}</div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={refreshData}
                  className="mt-3"
                >
                  <RefreshCw className="h-4 w-4 mr-2" /> Retry
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Loading State */}
      {contractAddress && isAddress(contractAddress) && isLoading && (
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <RefreshCw className="w-5 h-5 text-slate-400 animate-spin" />
                <span className="text-slate-600">
                  Loading token information...
                </span>
              </div>
              <div className="grid md:grid-cols-2 gap-6 mt-6">
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-full" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Token Information Display */}
      {contractAddress &&
        isAddress(contractAddress) &&
        !isLoading &&
        tokenData && (
          <div className="space-y-8">
            {/* Token Info Card */}
            <Card className="border-slate-200">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-3">
                    <TokenIcon name={tokenData.name} />
                    <span>
                      {tokenData.name}{" "}
                      <span className="text-slate-500 font-normal">
                        ({tokenData.symbol})
                      </span>
                    </span>
                  </CardTitle>
                  {tokenData.isEIP8056 ? (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-yellow-500 to-yellow-600 text-white rounded-lg text-sm font-semibold shadow-sm flex items-center gap-1.5">
                      <Zap className="w-4 h-4" />
                      EIP-8056
                    </span>
                  ) : (
                    <span className="px-3 py-1.5 bg-gradient-to-r from-slate-500 to-slate-600 text-white rounded-lg text-sm font-semibold shadow-sm">
                      BEP20
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-2">
                <div className="space-y-4">
                  {/* Basic Info Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Name</div>
                      <div className="font-medium text-slate-900 text-sm">
                        {tokenData.name}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Symbol</div>
                      <div className="font-medium text-slate-900 text-sm font-mono">
                        {tokenData.symbol}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        Decimals
                      </div>
                      <div className="font-medium text-slate-900 text-sm">
                        {tokenData.decimals}
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-slate-500 mb-1">
                        Total Supply (Raw)
                      </div>
                      {(() => {
                        const formatted = Number(tokenData.totalSupply).toLocaleString();
                        const isLong = formatted.length > 20;
                        if (isLong) {
                          return (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="font-medium text-slate-900 text-sm truncate cursor-help max-w-[150px]">
                                  {formatted}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="bottom" className="max-w-[300px] break-all">
                                {formatted}
                              </TooltipContent>
                            </Tooltip>
                          );
                        }
                        return (
                          <div className="font-medium text-slate-900 text-sm">
                            {formatted}
                          </div>
                        );
                      })()}
                    </div>
                    {tokenData.isEIP8056 && (
                      <div className="min-w-0">
                        <div className="text-xs text-emerald-600 mb-1">
                          Total Supply UI
                        </div>
                        <div className="font-medium text-emerald-700 text-sm">
                          {Number(tokenData.totalSupplyUI).toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Addresses Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        Token Address
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={getBscScanUrl(contractAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-yellow-600 hover:text-yellow-700 break-all hover:underline flex items-center gap-1"
                        >
                          {contractAddress}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        Contract Address
                      </div>
                      <div className="flex items-center gap-2">
                        <a
                          href={getBscScanUrl(tokenData.contractAddress)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-mono text-xs text-yellow-600 hover:text-yellow-700 break-all hover:underline flex items-center gap-1"
                        >
                          {tokenData.contractAddress}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </a>
                      </div>
                    </div>
                    {tokenData.owner && (
                      <div>
                        <div className="text-xs text-slate-500 mb-1">
                          Owner Address
                        </div>
                        <div className="flex items-center gap-2">
                          <a
                            href={getBscScanUrl(tokenData.owner)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs text-yellow-600 hover:text-yellow-700 break-all hover:underline flex items-center gap-1"
                          >
                            {tokenData.owner}
                            <ExternalLink className="w-3 h-3 flex-shrink-0" />
                          </a>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* EIP-8056 Specific Info */}
                  {tokenData.isEIP8056 && (
                    <div className="pt-4 border-t border-slate-200">
                      <div className="flex items-center gap-2 mb-4">
                        <Zap className="w-4 h-4 text-yellow-600" />
                        <h3 className="text-sm font-semibold text-slate-700">
                          EIP-8056 Extended Fields
                        </h3>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500 mb-1.5">
                            UI Multiplier
                          </div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-lg font-semibold text-yellow-700">
                              {tokenData.multiplier}
                            </span>
                            <span className="text-xs text-slate-500">×</span>
                          </div>
                        </div>
                        <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500 mb-1.5">
                            Your UI Balance
                          </div>
                          <div className="space-y-1">
                            <div className="font-mono text-base font-semibold text-slate-900">
                              {Number(tokenData.uiBalance).toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 4,
                                }
                              )}{" "}
                              <span className="text-xs font-normal text-slate-500">
                                (UI)
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-mono">
                              {Number(tokenData.rawBalance).toLocaleString(
                                undefined,
                                {
                                  maximumFractionDigits: 4,
                                }
                              )}{" "}
                              (Raw)
                            </div>
                          </div>
                        </div>
                      </div>

                    </div>
                  )}

                  {!tokenData.isEIP8056 && (
                    <div className="pt-4 border-t border-slate-200">
                      <div className="text-sm text-slate-500 text-center py-2">
                        This token does not support EIP-8056
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Integration Cases */}
            {tokenData.isEIP8056 && (
              <div className="space-y-6">
                {/* Case 1: Wallet Integration */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Wallet className="w-5 h-5 text-yellow-600" />
                      Case 1: Wallet Integration
                    </CardTitle>
                    <CardDescription>
                      How to display EIP-8056 token balances in your wallet
                      application
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="text-sm font-medium text-yellow-700">
                          Live Interface Detection via ERC-165 <code className="bg-yellow-100 px-1 rounded text-xs">supportsInterface(bytes4)</code>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={queryAllInterfaces}
                          disabled={interfaceDetecting}
                          className="h-7 text-xs"
                        >
                          {interfaceDetecting ? (
                            <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <Search className="w-3 h-3 mr-1" />
                          )}
                          Detect
                        </Button>
                      </div>
                      <div className="space-y-2">
                        {EIP8056_INTERFACES.map((iface) => {
                          const result = interfaceDetectionResults[iface.id];
                          const typeBadge = iface.type === "MUST" ? "bg-red-100 text-red-700" :
                            iface.type === "REQUIRED" ? "bg-orange-100 text-orange-700" :
                            iface.type === "OPTIONAL" ? "bg-green-100 text-green-700" :
                            "bg-purple-100 text-purple-700";
                          return (
                            <div key={iface.id} className="flex items-center justify-between bg-white rounded px-3 py-2 border border-yellow-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className={`text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${typeBadge}`}>{iface.type}</span>
                                <span className="font-mono text-xs text-slate-700 truncate">{iface.name}</span>
                                <span className="font-mono text-xs text-slate-400 shrink-0">{iface.id}</span>
                              </div>
                              <div className="ml-2 shrink-0">
                                {result === true ? <span className="text-emerald-600 text-sm font-medium">✅ Supported</span> :
                                 result === false ? <span className="text-red-500 text-sm font-medium">❌ No</span> :
                                 <span className="text-slate-300 text-xs">—</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="text-sm font-medium text-slate-700 mb-2">
                        Your Current Balances:
                      </div>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div>
                          <div className="text-xs text-slate-500 mb-1">
                            Raw Balance (on-chain)
                          </div>
                          <div className="font-mono text-lg font-semibold text-slate-700">
                            {isConnected && address
                              ? Number(tokenData.rawBalance).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 4 }
                                )
                              : "0"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-emerald-600 mb-1">
                            UI Balance (display to user)
                          </div>
                          <div className="font-mono text-lg font-semibold text-emerald-700">
                            {isConnected && address
                              ? Number(tokenData.uiBalance).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 4 }
                                )
                              : "0"}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-yellow-600 mb-1">
                            UI Multiplier
                          </div>
                          <div className="font-mono text-lg font-semibold text-yellow-700">
                            {tokenData.isEIP8056
                              ? Number(tokenData.multiplier).toLocaleString(
                                  undefined,
                                  { maximumFractionDigits: 4 }
                                )
                              : "1.0"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <ExpandableSection
                      title="View Integration Code"
                      defaultExpanded={false}
                    >
                      <CodeBlock
                        label="Wallet Integration Example"
                        copyable
                        language="typescript"
                        code={`import { formatUnits, type Address, type PublicClient, getContract } from 'viem'

// EIP-8056 Interface IDs (ERC-165)
const SCALED_UI_AMOUNT_ID = '0xa60bf13d'           // IScaledUIAmount (core, MUST)
const NEW_UI_MULTIPLIER_ID = '0x4bd27648'          // IScaledUIAmountNewUIMultiplier (required)
const CONVERSION_ID = '0x57854fc3'                 // IScaledUIAmountConversion (optional)
const BALANCES_ID = '0xd890fd71'                   // IScaledUIAmountBalances (optional)
const ERC8056_SCHEDULED_INTERFACE_ID = '${ERC8056_SCHEDULED_INTERFACE_ID}' // IERC8056Scheduled (BSC ext)

/**
 * Get token balance information with Scaled UI support
 */
async function displayBalance(
  tokenAddress: Address,
  userAddress: Address,
  publicClient: PublicClient
) {
  const token = getContract({
    address: tokenAddress,
    abi: ERC8056_ABI,
    client: publicClient,
  })

  // Check EIP-8056 core support
  const isEIP8056 = await token.read.supportsInterface([SCALED_UI_AMOUNT_ID])
  const supportsNewMultiplier = await token.read.supportsInterface([NEW_UI_MULTIPLIER_ID])
  const supportsConversion = await token.read.supportsInterface([CONVERSION_ID])
  const supportsBalances = await token.read.supportsInterface([BALANCES_ID])

  // Check BSC scheduled extension support
  const supportsScheduled = await token.read.supportsInterface([
    ERC8056_SCHEDULED_INTERFACE_ID,
  ])

  const decimals = await token.read.decimals()

  if (isEIP8056) {
    const [uiBalance, rawBalance, multiplier] = await Promise.all([
      token.read.balanceOfUI([userAddress]),
      token.read.balanceOf([userAddress]),
      token.read.uiMultiplier(),
    ])

    return {
      display: formatUnits(uiBalance as bigint, Number(decimals)),
      raw: formatUnits(rawBalance as bigint, Number(decimals)),
      multiplier: formatUnits(multiplier as bigint, 18),
      isEIP8056: true,
      supportsScheduled,
    }
  } else {
    const balance = await token.read.balanceOf([userAddress])
    return {
      display: formatUnits(balance as bigint, Number(decimals)),
      raw: formatUnits(balance as bigint, Number(decimals)),
      multiplier: '1.0',
      isEIP8056: false,
      supportsScheduled: false,
    }
  }
}

// Usage
const balance = await displayBalance(tokenAddress, userAddress, publicClient)
console.log(\`Display: \${balance.display} tokens\`)
console.log(\`Raw: \${balance.raw} tokens\`)
console.log(\`Multiplier: \${balance.multiplier}x\`)
console.log(\`Supports Scheduled: \${balance.supportsScheduled}\`)`}
                      />
                    </ExpandableSection>
                  </CardContent>
                </Card>

                {/* Case 2: Transfer Integration */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Send className="w-5 h-5 text-amber-600" />
                      Case 2: Transfer Integration
                    </CardTitle>
                    <CardDescription>
                      How to handle transfers with EIP-8056 tokens - always
                      convert UI amounts to raw amounts
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                        <div className="text-sm text-amber-700">
                          <strong>Important:</strong> Users input UI amounts,
                          but transfers must use raw amounts. Always convert
                          using{" "}
                          <code className="bg-amber-100 px-1 rounded">
                            fromUIAmount()
                          </code>{" "}
                          before calling{" "}
                          <code className="bg-amber-100 px-1 rounded">
                            transfer()
                          </code>
                          .
                        </div>
                      </div>
                    </div>

                    {isConnected && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-4">
                        <div className="text-sm font-medium text-slate-700">
                          Try Transfer:
                        </div>
                        <div className="grid gap-3">
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">
                              Recipient Address
                            </label>
                            <Input
                              placeholder="0x..."
                              value={transferRecipient}
                              onChange={(e) =>
                                setTransferRecipient(e.target.value)
                              }
                              className="font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-500 mb-1 block">
                              UI Amount (what user sees)
                            </label>
                            <Input
                              type="number"
                              placeholder="e.g. 100"
                              value={transferUiAmount}
                              onChange={(e) =>
                                setTransferUiAmount(e.target.value)
                              }
                            />
                          </div>
                          <Button
                            onClick={handleTransfer}
                            disabled={
                              !transferRecipient ||
                              !transferUiAmount ||
                              !isAddress(transferRecipient)
                            }
                            className="w-full bg-amber-600 hover:bg-amber-700"
                          >
                            <Send className="w-4 h-4 mr-2" />
                            Execute Transfer
                          </Button>
                        </div>
                        {/* TransferWithUIAmount event result */}
                        {transferResult && (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                            <p className="text-xs font-semibold text-emerald-700 mb-2">
                              TransferWithUIAmount Event
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div>
                                <span className="text-slate-500">Raw amount:</span>
                                <span className="ml-1 font-mono text-slate-700">{Number(transferResult.rawAmount).toLocaleString()}</span>
                              </div>
                              <div>
                                <span className="text-emerald-600">UI amount:</span>
                                <span className="ml-1 font-mono font-semibold text-emerald-700">{Number(transferResult.uiAmount).toLocaleString()}</span>
                              </div>
                            </div>
                            <a
                              href={`${chainId === 56 ? 'https://bscscan.com' : 'https://testnet.bscscan.com'}/tx/${transferResult.hash}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 flex items-center gap-1 text-xs text-amber-600 hover:underline"
                            >
                              <ExternalLink className="w-3 h-3" />
                              {transferResult.hash.slice(0, 20)}...
                            </a>
                          </div>
                        )}
                      </div>
                    )}

                    <ExpandableSection
                      title="View Integration Code"
                      defaultExpanded={false}
                    >
                      <CodeBlock
                        label="Transfer Integration Example"
                        copyable
                        language="typescript"
                        code={`import { parseUnits, formatUnits } from 'viem'
import { ethers } from 'ethers'

// Transfer tokens (user inputs UI amount)
async function transferTokens(
  tokenAddress: string,
  signer: ethers.Signer,
  toAddress: string,
  uiAmount: string  // User input in UI units
) {
  const token = new ethers.Contract(
    tokenAddress,
    [
      'function fromUIAmount(uint256) view returns (uint256)',
      'function transfer(address, uint256) returns (bool)',
      'function decimals() view returns (uint8)'
    ],
    signer
  )

  // Step 1: Get token decimals
  const decimals = await token.decimals()

  // Step 2: Convert UI amount to raw amount
  const uiAmountWei = parseUnits(uiAmount, decimals)
  const rawAmount = await token.fromUIAmount(uiAmountWei)

  // Step 3: Execute transfer with raw amount
  // Always use raw amounts for ERC-20 operations
  const tx = await token.transfer(toAddress, rawAmount)
  await tx.wait()

  return tx.hash
}

// Usage
const txHash = await transferTokens(
  tokenAddress,
  signer,
  '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
  '100'  // User wants to send 100 tokens (UI amount)
)
console.log(\`Transfer completed: \${txHash}\`)`}
                      />
                    </ExpandableSection>
                  </CardContent>
                </Card>

                {/* Case 3: Update Multiplier */}
                <Card className="border-slate-200">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      Case 3: Update UI Multiplier
                    </CardTitle>
                    <CardDescription>
                      How to update the UI multiplier - via BSCScan or directly
                      in this app
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* EIP-8056 Standard: newUIMultiplier() + effectiveAt() */}
                    <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-yellow-500" />
                          <h4 className="text-sm font-medium text-slate-700">
                            EIP-8056 Standard — Pending Multiplier
                          </h4>
                        </div>
                        <span className="text-xs text-slate-400 font-mono">IScaledUIAmountNewUIMultiplier</span>
                      </div>
                      <p className="text-xs text-slate-500 mb-3">
                        EIP-8056 required extension: individual getters for the scheduled multiplier value and its effective timestamp.
                      </p>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="p-3 bg-white rounded border border-slate-200">
                          <p className="text-xs text-slate-500 mb-2">Scheduled next multiplier value</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={queryEip8056Pending}
                            disabled={eip8056QueryLoading}
                            className="w-full h-8 text-xs font-mono"
                          >
                            {eip8056QueryLoading ? <RefreshCw className="w-3 h-3 mr-1 animate-spin" /> : <Search className="w-3 h-3 mr-1" />}
                            newUIMultiplier() + effectiveAt()
                          </Button>
                          {eip8056PendingResult !== null && (
                            <div className="mt-3 space-y-1.5 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-500">newUIMultiplier:</span>
                                <span className="font-mono font-semibold text-yellow-700">{Number(eip8056PendingResult.newMultiplier).toFixed(4)}×</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">effectiveAt:</span>
                                <span className="text-slate-600 font-mono">
                                  {eip8056PendingResult.effectiveAt === 0 || eip8056PendingResult.effectiveAt >= 2**53
                                    ? "—"
                                    : new Date(eip8056PendingResult.effectiveAt * 1000).toLocaleString()}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="p-3 bg-yellow-50 rounded border border-yellow-200 text-xs text-yellow-800 space-y-1">
                          <p className="font-medium">Note</p>
                          <p>These getters always return the <em>last scheduled</em> value even after it has already taken effect.</p>
                          <p>The BSC extension below provides <code className="bg-yellow-100 px-0.5 rounded">hasPendingMultiplier()</code> to distinguish active vs pending states.</p>
                        </div>
                      </div>
                    </div>

                    {/* Multiplier Status - IERC8056Scheduled extension */}
                    {tokenData.supportsScheduled && (
                      <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-slate-500" />
                            <h4 className="text-sm font-medium text-slate-700">
                              Multiplier Status
                            </h4>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">
                            IERC8056Scheduled
                          </span>
                        </div>
                        {/* Current Multiplier */}
                        <div className="flex items-center justify-between p-3 bg-white rounded border border-slate-200 mb-3">
                          <span className="text-sm text-slate-600">
                            Current Multiplier
                          </span>
                          <span className="font-mono text-lg font-semibold text-slate-700">
                            {tokenData.multiplier}×
                          </span>
                        </div>
                        {/* Query Buttons */}
                        <div className="grid md:grid-cols-2 gap-3">
                          {/* hasPendingMultiplier */}
                          <div className="p-3 bg-white rounded border border-slate-200">
                            <p className="text-xs text-slate-500 mb-2">
                              Check if a scheduled change exists
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={queryHasPending}
                              disabled={queryLoading === 'hasPending'}
                              className="w-full h-8 text-xs font-mono"
                            >
                              {queryLoading === 'hasPending' ? (
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Search className="w-3 h-3 mr-1" />
                              )}
                              hasPendingMultiplier()
                            </Button>
                            {hasPendingResult !== null && (
                              <div className="mt-3 flex items-center justify-center gap-2">
                                {hasPendingResult ? (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                                    <span className="text-sm font-medium text-yellow-700">
                                      Yes, pending change exists
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-2 h-2 rounded-full bg-slate-300"></span>
                                    <span className="text-sm text-slate-500">
                                      No pending change
                                    </span>
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                          {/* pendingMultiplier */}
                          <div className="p-3 bg-white rounded border border-slate-200">
                            <p className="text-xs text-slate-500 mb-2">
                              Get scheduled multiplier details
                            </p>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={queryPendingMultiplier}
                              disabled={queryLoading === 'pending'}
                              className="w-full h-8 text-xs font-mono"
                            >
                              {queryLoading === 'pending' ? (
                                <RefreshCw className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Search className="w-3 h-3 mr-1" />
                              )}
                              pendingMultiplier()
                            </Button>
                            {pendingResult !== null && (
                              <div className="mt-3">
                                {pendingResult.effectiveAt > 0 ? (
                                  <div className="space-y-1.5">
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-500">New Value:</span>
                                      <span className="font-semibold text-yellow-600">
                                        {pendingResult.multiplier}×
                                      </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                      <span className="text-slate-500">Effective:</span>
                                      <span className="text-slate-600">
                                        {new Date(pendingResult.effectiveAt * 1000).toLocaleString()}
                                      </span>
                                    </div>
                                  </div>
                                ) : (
                                  <p className="text-center text-sm text-slate-400">
                                    No pending change
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {/* Integration Code */}
                        <div className="mt-3">
                          <ExpandableSection
                            title="View Integration Code"
                            defaultExpanded={false}
                          >
                            <CodeBlock
                              label="Check Pending Multiplier (TypeScript + Viem)"
                              copyable
                              language="typescript"
                              code={`import { createPublicClient, http, getContract } from 'viem'
import { bscTestnet } from 'viem/chains'

const ERC8056_SCHEDULED_ABI = [
  {
    name: 'hasPendingMultiplier',
    type: 'function',
    inputs: [],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view'
  },
  {
    name: 'pendingMultiplier',
    type: 'function',
    inputs: [],
    outputs: [
      { name: 'multiplier', type: 'uint256' },
      { name: 'effectiveAt', type: 'uint256' }
    ],
    stateMutability: 'view'
  }
] as const

const client = createPublicClient({
  chain: bscTestnet,
  transport: http()
})

const token = getContract({
  address: '${contractAddress || "0x..."}',
  abi: ERC8056_SCHEDULED_ABI,
  client
})

// Check if there's a pending multiplier change
const hasPending = await token.read.hasPendingMultiplier()
console.log('Has pending change:', hasPending)

if (hasPending) {
  // Get the pending multiplier details
  const [multiplier, effectiveAt] = await token.read.pendingMultiplier()
  console.log('Pending multiplier:', multiplier.toString())
  console.log('Effective at:', new Date(Number(effectiveAt) * 1000).toLocaleString())
}`}
                            />
                          </ExpandableSection>
                        </div>
                      </div>
                    )}

                    {/* Only show warning if contract uses owner-based access control */}
                    {tokenData.owner && (
                      <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-start gap-2">
                          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                          <div className="text-sm text-amber-800">
                          <p className="font-medium mb-1">
                              Access Control Recommendation
                            </p>
                            <p className="text-xs text-amber-700 mb-2">
                              This contract uses{" "}
                              <code className="bg-amber-100 px-1 rounded">
                                onlyOwner
                              </code>{" "}
                              for access control. Centralized control creates risk -
                              a single compromised key can manipulate all UI balances.
                              For production:
                            </p>
                            <ul className="text-xs text-amber-700 space-y-1 list-disc list-inside">
                              <li>
                                Use a <strong>multisig wallet</strong> (e.g., Gnosis
                                Safe) instead of single EOA
                              </li>
                              <li>
                                Implement <strong>timelock contract</strong> for
                                delayed execution
                              </li>
                              <li>
                                Use <strong>role-based access control</strong>{" "}
                                (AccessControl) for separation of duties
                              </li>
                            </ul>
                        </div>
                      </div>
                    </div>
                    )}
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Option 1: BSCScan */}
                      <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <ExternalLink className="w-4 h-4" />
                            Option 1: Via BSCScan
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="text-sm text-slate-600">
                            Use BSCScan's Write Contract interface to call{" "}
                            <code className="bg-yellow-100 px-1 rounded">
                              setUIMultiplier
                            </code>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() =>
                              window.open(
                                getBscScanUrl(contractAddress, "writeContract"),
                                "_blank"
                              )
                            }
                          >
                            <ExternalLink className="w-4 h-4 mr-2" />
                            Open BSCScan Write Contract
                          </Button>
                          <div className="text-xs text-slate-500">
                            Function:{" "}
                            <code className="bg-white px-1 rounded">
                              setUIMultiplier(uint256 newMultiplier, uint256
                              effectiveAtTimestamp)
                            </code>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Option 2: Direct */}
                      <Card className="border-yellow-200 bg-yellow-50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Option 2: Direct (This App)
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {/* Warning when pending change exists */}
                          {hasPendingResult === true && (
                            <div className="p-3 bg-amber-100 rounded-lg border border-amber-300">
                              <div className="flex items-start gap-2 text-xs text-amber-800">
                                <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <div>
                                  <p className="font-medium">
                                    ⚠️ Warning: A pending change exists
                                  </p>
                                  <p className="mt-1 text-amber-700">
                                    New updates will overwrite the pending change
                                    (emits{" "}
                                    <code className="bg-amber-200 px-1 rounded">
                                      UIMultiplierChangeOverwritten
                                    </code>{" "}
                                    event for tracking)
                                  </p>
                                </div>
                              </div>
                            </div>
                          )}
                          <div>
                            <label className="text-xs text-slate-600 mb-1 block">
                              New Multiplier
                            </label>
                            <Input
                              type="number"
                              placeholder="e.g. 2.0"
                              value={newMultiplier}
                              onChange={(e) => setNewMultiplier(e.target.value)}
                              className="font-mono"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-slate-600 mb-1 block">
                              Effective At (optional, defaults to 30s from now)
                            </label>
                            <Input
                              type="datetime-local"
                              value={effectiveAt}
                              onChange={(e) => setEffectiveAt(e.target.value)}
                            />
                          </div>
                          <Button
                            onClick={handleUpdateMultiplier}
                            disabled={!newMultiplier || !isConnected}
                            className="w-full bg-yellow-600 hover:bg-yellow-700"
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Update Multiplier
                          </Button>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Breaking change notice */}
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                        <div className="text-sm text-red-800">
                          <p className="font-semibold mb-1">Breaking Change: UIMultiplierUpdated Event (3 params)</p>
                          <p className="text-xs text-red-700 mb-2">
                            The event signature was changed per EIP-8056 spec alignment. The old 4-param version included <code className="bg-red-100 px-1 rounded">setAtTimestamp</code> which was removed.
                          </p>
                          <div className="grid grid-cols-1 gap-1 font-mono text-xs">
                            <div className="bg-red-100 px-2 py-1 rounded line-through opacity-60">
                              UIMultiplierUpdated(uint256 old, uint256 new, uint256 setAt, uint256 effectiveAt)
                            </div>
                            <div className="bg-emerald-100 text-emerald-800 px-2 py-1 rounded">
                              UIMultiplierUpdated(uint256 oldMultiplier, uint256 newMultiplier, uint256 effectiveAtTimestamp)
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <ExpandableSection
                      title="View Integration Code"
                      defaultExpanded={false}
                    >
                      <CodeBlock
                        label="Update Multiplier Example"
                        copyable
                        language="typescript"
                        code={`import { parseUnits, formatUnits } from 'viem'
import { ethers } from 'ethers'

const ERC8056_SCHEDULED_INTERFACE_ID = '${ERC8056_SCHEDULED_INTERFACE_ID}'

// Update UI multiplier (owner only)
async function setUIMultiplier(
  tokenAddress: string,
  signer: ethers.Signer,
  newMultiplier: string,  // e.g. "2.0" for 2x (2-for-1 stock split)
  effectiveAtTimestamp: number  // Unix timestamp (must be in the future)
) {
  const token = new ethers.Contract(
    tokenAddress,
    [
      'function supportsInterface(bytes4) view returns (bool)',
      'function setUIMultiplier(uint256 newMultiplier, uint256 effectiveAtTimestamp)',
      'function uiMultiplier() view returns (uint256)',
      'function hasPendingMultiplier() view returns (bool)',
      'function pendingMultiplier() view returns (uint256, uint256)'
    ],
    signer
  )

  // Check for pending changes (IERC8056Scheduled extension)
  const supportsScheduled = await token.supportsInterface(ERC8056_SCHEDULED_INTERFACE_ID)
  if (supportsScheduled) {
    const hasPending = await token.hasPendingMultiplier()
    if (hasPending) {
      const [pendingValue, pendingEffectiveAt] = await token.pendingMultiplier()
      console.warn('⚠️ Warning: Pending change will be overwritten!')
      console.warn(\`   Current pending: \${formatUnits(pendingValue, 18)}x\`)
      console.warn(\`   Was effective at: \${new Date(Number(pendingEffectiveAt) * 1000)}\`)
      // UIMultiplierChangeOverwritten event will be emitted
    }
  }

  // Convert multiplier to wei (18 decimals)
  const multiplierWei = parseUnits(newMultiplier, 18)

  // Validate: effectiveAtTimestamp must be in the future
  const currentTime = Math.floor(Date.now() / 1000)
  if (effectiveAtTimestamp <= currentTime) {
    throw new Error('Effective At must be in the future')
  }

  // Execute transaction
  const tx = await token.setUIMultiplier(multiplierWei, effectiveAtTimestamp)
  const receipt = await tx.wait()

  return {
    txHash: receipt.hash,
    effectiveAt: effectiveAtTimestamp
  }
}

// Usage: 2-for-1 stock split
const result = await setUIMultiplier(
  tokenAddress,
  signer,
  '2.0',  // Double all UI balances
  Math.floor(Date.now() / 1000) + 3600  // Effective in 1 hour
)
console.log(\`Multiplier updated: \${result.txHash}\`)
console.log(\`Effective at: \${new Date(result.effectiveAt * 1000)}\`)`}
                      />
                    </ExpandableSection>
                  </CardContent>
                </Card>

              </div>
            )}
          </div>
        )}

      {/* Not Connected Message - Only show for EIP-8056 tokens */}
      {!isConnected && tokenData && tokenData.isEIP8056 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent>
            <div className="flex items-center gap-3 text-amber-700">
              <Info className="w-5 h-5" />
              <div className="text-sm">
                Connect your wallet to view your balances and interact with the
                token
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
