import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useChainId } from "wagmi";
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
  Wallet,
  RefreshCw,
  Terminal,
  Send,
  Copy,
  Check,
  Zap,
  AlertTriangle,
  AlertCircle,
  Info,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Rocket,
  Search,
} from "lucide-react";
import { isAddress } from "viem";
import { ERC8056_INTERFACE_ID } from "./interfaceId";

const DEFAULT_TOKEN_ADDRESS = "0x9E7eD6e2299aAd157d4243C049DfD391f1742214";

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
  const [countdown, setCountdown] = useState<number | null>(null);

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

  // Countdown timer for pending multiplier
  useEffect(() => {
    const pending = tokenData?.pendingMultiplier;

    if (!pending) {
      const timeout = setTimeout(() => setCountdown(null), 0);
      return () => clearTimeout(timeout);
    }

    const effectiveAt = pending.effectiveAt;
    const calcRemaining = () =>
      Math.max(0, effectiveAt - Math.floor(Date.now() / 1000));

    const initialTimeout = setTimeout(() => setCountdown(calcRemaining()), 0);

    const timer = setInterval(() => {
      const remaining = calcRemaining();
      if (remaining <= 0) {
        clearInterval(timer);
        setCountdown(null);
        refreshData();
      } else {
        setCountdown(remaining);
      }
    }, 1000);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(timer);
    };
  }, [tokenData?.pendingMultiplier, refreshData]);

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
    try {
      await transfer(transferRecipient, transferUiAmount);
      alert(`✅ Transfer successful!`);
      setTransferRecipient("");
      setTransferUiAmount("");
    } catch (err: any) {
      alert(`❌ Transfer failed: ${err.message}`);
    }
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
                <p className="font-medium mb-2">
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
                    If you don't have an existing EIP-8056 token contract, you
                    can deploy one using the{" "}
                    <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">
                      ScaledUIToken
                    </code>{" "}
                    contract from{" "}
                    <code className="bg-emerald-100 px-1.5 py-0.5 rounded text-xs">
                      scaled-ui-amount/ERC8056Token
                    </code>
                  </p>
                  <div className="space-y-3">
                    <div className="p-3 bg-white rounded border border-emerald-100">
                      <h4 className="font-medium text-sm text-slate-900 mb-2">
                        Deployment Steps:
                      </h4>
                      <ol className="text-xs text-slate-600 space-y-1.5 list-decimal list-inside">
                        <li>
                          Navigate to the{" "}
                          <code className="bg-emerald-50 px-1 rounded">
                            contracts
                          </code>{" "}
                          directory
                        </li>
                        <li>
                          Install dependencies:{" "}
                          <code className="bg-emerald-50 px-1 rounded">
                            npm install
                          </code>
                        </li>
                        <li>
                          Configure your{" "}
                          <code className="bg-emerald-50 px-1 rounded">
                            .env
                          </code>{" "}
                          file with your private key and RPC URLs
                        </li>
                        <li>
                          Deploy to testnet:{" "}
                          <code className="bg-emerald-50 px-1 rounded">
                            npm run deploy:testnet
                          </code>
                        </li>
                        <li>
                          Copy the deployed contract address and use it below
                        </li>
                      </ol>
                    </div>
                    <div className="p-3 bg-white rounded border border-emerald-100">
                      <h4 className="font-medium text-sm text-slate-900 mb-2">
                        Contract Details:
                      </h4>
                      <div className="text-xs text-slate-600 space-y-1">
                        <p>
                          <span className="font-medium">Contract:</span>{" "}
                          <code className="bg-emerald-50 px-1 rounded">
                            ScaledUIToken
                          </code>
                        </p>
                        <p>
                          <span className="font-medium">Location:</span>{" "}
                          <code className="bg-emerald-50 px-1 rounded">
                            contracts/scaled-ui-amount/ERC8056Token.sol
                          </code>
                        </p>
                        <p>
                          <span className="font-medium">
                            Constructor Parameters:
                          </span>{" "}
                          <code className="bg-emerald-50 px-1 rounded">
                            name, symbol, initialSupply, initialOwner
                          </code>
                        </p>
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
                    <div>
                      <div className="text-xs text-slate-500 mb-1">
                        Total Supply
                      </div>
                      <div className="font-medium text-slate-900 text-sm">
                        {Number(tokenData.totalSupply).toLocaleString(
                          undefined,
                          {
                            maximumFractionDigits: 2,
                          }
                        )}
                      </div>
                    </div>
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
                          {tokenData.pendingMultiplier &&
                            countdown !== null &&
                            countdown > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <div className="text-xs text-amber-600">
                                  Pending: {tokenData.pendingMultiplier.value}×
                                  (in {countdown}s)
                                </div>
                              </div>
                            )}
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
                      <div className="text-sm font-medium text-yellow-700 mb-2">
                        Key Difference from Standard ERC20:
                      </div>
                      <ul className="text-sm text-yellow-600 space-y-1 list-disc list-inside">
                        <li>
                          Check to see if the token supports using{" "}
                          <code className="bg-yellow-100 px-1 rounded">
                            supportsInterface
                          </code>{" "}
                          with Interface ID:{" "}
                          <code className="bg-blue-100 px-1 rounded font-mono">
                            ERC8056_INTERFACE_ID={ERC8056_INTERFACE_ID}
                          </code>{" "}
                          (erc8056 interface id)
                        </li>
                        <li>
                          Get UI balance using{" "}
                          <code className="bg-yellow-100 px-1 rounded">
                            balanceOfUI(address)
                          </code>{" "}
                          - this is the scaled amount users should see
                        </li>
                        <li>
                          Get raw balance using{" "}
                          <code className="bg-yellow-100 px-1 rounded">
                            balanceOf(address)
                          </code>{" "}
                          - this is the actual on-chain balance
                        </li>
                        <li>
                          Display both UI balance and raw balance to users for
                          transparency
                        </li>
                        <li>
                          Get the multiplier using{" "}
                          <code className="bg-yellow-100 px-1 rounded">
                            uiMultiplier()
                          </code>
                        </li>
                      </ul>
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
import { ERC8056_INTERFACE_ID } from './interfaceId'
import { ERC8056_ABI } from './abi'

/**
 * Get token balance information with Scaled UI support
 * Returns both display (UI) and raw balances, plus multiplier if supported
 */
async function displayBalance(
  tokenAddress: Address,
  userAddress: Address,
  publicClient: PublicClient
): Promise<{
  display: string
  raw: string
  multiplier: string
  isEIP8056: boolean
}> {
  // Create contract instance
  const token = getContract({
    address: tokenAddress,
    abi: ERC8056_ABI,
    client: publicClient,
  })

  // Check if scaled UI is supported
  const supportsScaledUI = await token.read.supportsInterface([
    ERC8056_INTERFACE_ID,
  ])

  // Get decimals first (needed for formatting)
  const decimals = await token.read.decimals()

  if (supportsScaledUI) {
    // Get UI balance, raw balance, and multiplier
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
    }
  } else {
    // Fall back to standard ERC-20
    const balance = await token.read.balanceOf([userAddress])

    return {
      display: formatUnits(balance as bigint, Number(decimals)),
      raw: formatUnits(balance as bigint, Number(decimals)),
      multiplier: '1.0',
      isEIP8056: false,
    }
  }
}

// Usage in wallet UI
const balance = await displayBalance(
  tokenAddress,  // Token contract address
  userAddress,   // User wallet address
  publicClient   // viem PublicClient instance
)

console.log(\`Display: \${balance.display} tokens\`)
console.log(\`Raw: \${balance.raw} tokens\`)
console.log(\`Multiplier: \${balance.multiplier}x\`)
console.log(\`Is EIP-8056: \${balance.isEIP8056}\`)`}
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
                    <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-yellow-800">
                          <p className="font-medium mb-1">
                            Owner Only: Only the contract owner can update the
                            UI multiplier
                          </p>
                          <p className="text-xs text-yellow-700">
                            This function is restricted to the contract owner
                            address. If you're not the owner, you can view the
                            multiplier but cannot modify it.
                          </p>
                        </div>
                      </div>
                    </div>
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

                    <ExpandableSection
                      title="View Integration Code"
                      defaultExpanded={false}
                    >
                      <CodeBlock
                        label="Update Multiplier Example"
                        copyable
                        language="typescript"
                        code={`import { parseUnits } from 'viem'
import { ethers } from 'ethers'

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
      'function setUIMultiplier(uint256 newMultiplier, uint256 effectiveAtTimestamp)',
      'function uiMultiplier() view returns (uint256)'
    ],
    signer
  )

  // Convert multiplier to wei (18 decimals)
  // Multiplier uses 18 decimal places: 1e18 = 1.0
  const multiplierWei = parseUnits(newMultiplier, 18)

  // Validate: effectiveAtTimestamp must be in the future
  const currentTime = Math.floor(Date.now() / 1000)
  if (effectiveAtTimestamp <= currentTime) {
    throw new Error('Effective At must be in the future')
  }

  // Execute transaction
  // This will emit UIMultiplierUpdated event
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
