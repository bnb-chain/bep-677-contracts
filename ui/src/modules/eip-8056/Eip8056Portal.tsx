import { useState, useEffect } from 'react'
import { useScaledToken } from './useScaledToken'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Wallet, LogOut, RefreshCw, ArrowRight, Terminal, Calculator,
  Send, Copy, Check, BookOpen, Zap, Eye, ArrowLeftRight,
  Code2, AlertTriangle, CheckCircle2, Info, Scan, XCircle
} from 'lucide-react'
import { ethers } from 'ethers'

// ============================================================================
// Reusable Components
// ============================================================================

const CodeBlock = ({ code, label, copyable = false }: { code: string; label?: string; copyable?: boolean }) => {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

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
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
          )}
      </div>
    )}
      <pre className="p-4 text-sm overflow-x-auto text-slate-300 leading-relaxed">
      <code>{code}</code>
    </pre>
  </div>
)
}

const InfoBadge = ({ children, variant = 'info' }: { children: React.ReactNode; variant?: 'info' | 'warning' | 'success' }) => {
  const styles = {
    info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    warning: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
    success: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full border ${styles[variant]}`}>
      {children}
    </span>
  )
}

const SectionHeader = ({ number, title, icon: Icon }: { number: number; title: string; icon: React.ElementType }) => (
  <div className="flex items-center gap-3 mb-6">
    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-700 text-white font-bold text-lg shadow-lg">
      {number}
    </div>
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-slate-600" />
      <h2 className="text-xl font-bold text-slate-800">{title}</h2>
    </div>
  </div>
)

// ============================================================================
// Main Component
// ============================================================================

interface ScaledUIDemoProps {
  defaultContractAddress?: string
}

export function Eip8056Portal({ defaultContractAddress = '0xE43fA578C392F5c728d54c0ddbC9225F0a395f2f' }: ScaledUIDemoProps) {
  const [contractAddress, setContractAddress] = useState(defaultContractAddress)
  const [newMultiplier, setNewMultiplier] = useState('')
  const [countdown, setCountdown] = useState<number | null>(null)

  // Interactive Demo States
  const [demoMultiplier, setDemoMultiplier] = useState<{ raw: string; formatted: string } | null>(null)
  const [demoBalance, setDemoBalance] = useState<{ raw: string; ui: string } | null>(null)
  const [isDemoLoading, setIsDemoLoading] = useState(false)

  // Converter State
  const [converterUiAmount, setConverterUiAmount] = useState('')
  const [converterRawAmount, setConverterRawAmount] = useState('')

  // Transfer Simulator State
  const [transferRecipient, setTransferRecipient] = useState('')
  const [transferUiAmount, setTransferUiAmount] = useState('')
  const [calculatedRawAmount, setCalculatedRawAmount] = useState<string | null>(null)

  const {
    account,
    network,
    tokenData,
    isLoading,
    error,
    eip8056Detection,
    connectWallet,
    disconnectWallet,
    refreshData,
    updateMultiplier,
    transfer,
    checkEIP8056Support,
  } = useScaledToken(contractAddress)

  // Countdown timer for pending multiplier
  useEffect(() => {
    const pending = tokenData.pendingMultiplier

    if (!pending) {
      // Use setTimeout to defer the setState call
      const timeout = setTimeout(() => setCountdown(null), 0)
      return () => clearTimeout(timeout)
    }

    const effectiveAt = pending.effectiveAt
    const calcRemaining = () => Math.max(0, effectiveAt - Math.floor(Date.now() / 1000))

    // Initial value set via timeout
    const initialTimeout = setTimeout(() => setCountdown(calcRemaining()), 0)

    const timer = setInterval(() => {
      const remaining = calcRemaining()
      if (remaining <= 0) {
        clearInterval(timer)
        setCountdown(null)
        refreshData()
      } else {
        setCountdown(remaining)
      }
    }, 1000)

    return () => {
      clearTimeout(initialTimeout)
      clearInterval(timer)
    }
  }, [tokenData.pendingMultiplier, refreshData])

  const handleUpdateMultiplier = async () => {
    if (!newMultiplier) return
    await updateMultiplier(newMultiplier)
    setNewMultiplier('')
  }

  // Demo: Fetch Multiplier
  const handleDemoFetchMultiplier = async () => {
    if (!contractAddress || !window.ethereum) return
    setIsDemoLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(contractAddress,
        ["function uiMultiplier() view returns (uint256)"],
        provider
      )
      const raw = await contract.uiMultiplier()
      setDemoMultiplier({
        raw: raw.toString(),
        formatted: ethers.formatUnits(raw, 18)
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsDemoLoading(false)
    }
  }

  // Demo: Fetch Balance
  const handleDemoFetchBalance = async () => {
    if (!contractAddress || !account || !window.ethereum) return
    setIsDemoLoading(true)
    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const contract = new ethers.Contract(contractAddress,
        [
          "function balanceOf(address) view returns (uint256)",
          "function balanceOfUI(address) view returns (uint256)"
        ],
        provider
      )
      const [raw, ui] = await Promise.all([
        contract.balanceOf(account),
        contract.balanceOfUI(account)
      ])
      setDemoBalance({
        raw: ethers.formatUnits(raw, 18),
        ui: ethers.formatUnits(ui, 18)
      })
    } catch (err) {
      console.error(err)
    } finally {
      setIsDemoLoading(false)
    }
  }

  // Converter handlers
  const handleUiToRaw = () => {
    if (!converterUiAmount || !tokenData.multiplier) return
    try {
      const uiVal = parseFloat(converterUiAmount)
      const mult = parseFloat(tokenData.multiplier)
      if (isNaN(uiVal) || isNaN(mult) || mult === 0) return
      const raw = uiVal / mult
      setConverterRawAmount(raw.toFixed(6))
    } catch (e) {
      console.error(e)
    }
  }

  const handleRawToUi = () => {
    if (!converterRawAmount || !tokenData.multiplier) return
    try {
      const rawVal = parseFloat(converterRawAmount)
      const mult = parseFloat(tokenData.multiplier)
      if (isNaN(rawVal) || isNaN(mult)) return
      const ui = rawVal * mult
      setConverterUiAmount(ui.toFixed(6))
    } catch (e) {
      console.error(e)
    }
  }

  const handleCalculateRaw = () => {
    if (!transferUiAmount || !tokenData.multiplier) return
    try {
        const uiAmountBN = parseFloat(transferUiAmount)
        const multBN = parseFloat(tokenData.multiplier)
        if (isNaN(uiAmountBN) || isNaN(multBN) || multBN === 0) return
        const raw = uiAmountBN / multBN
        setCalculatedRawAmount(raw.toString())
    } catch (e) {
        console.error(e)
    }
  }

  const handleTransfer = async () => {
      if (!calculatedRawAmount || !transferRecipient) return
      try {
        const weiAmount = ethers.parseUnits(calculatedRawAmount, 18).toString()
        await transfer(transferRecipient, weiAmount)
      } catch (e) {
        console.error(e)
        alert('Invalid amount')
      }
  }

  return (
    <div className="space-y-12 pb-20 max-w-6xl mx-auto">

      {/* ================================================================== */}
      {/* Header & Connection */}
      {/* ================================================================== */}
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between border-b border-slate-200 pb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
              EIP-8056 Integration Guide
            </h1>
          </div>
          <p className="text-slate-500 text-lg ml-14">
            Scaled UI Amount Extension
          </p>
        </div>

        <div className="flex gap-2 w-full md:w-auto">
             {!account ? (
            <Button onClick={connectWallet} className="w-full md:w-auto gap-2 bg-slate-900 hover:bg-slate-800" size="lg">
                    <Wallet className="h-4 w-4" /> Connect Wallet
                 </Button>
             ) : (
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-xl shadow-sm w-full md:w-auto justify-between">
                    <div className="flex flex-col items-end mr-2">
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-1.5">
                  <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"/> {network}
                        </span>
                <span className="text-xs font-mono text-slate-500">
                            {account.slice(0,6)}...{account.slice(-4)}
                        </span>
                    </div>
              <Button variant="ghost" size="icon" onClick={disconnectWallet} className="text-slate-400 hover:text-slate-600">
                        <LogOut className="h-4 w-4" />
                    </Button>
                </div>
             )}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-3 rounded-xl border border-red-200 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Contract Input */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-amber-500" />
            Target Contract
          </CardTitle>
          <CardDescription>Enter an EIP-8056 compatible contract address</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
         <Input
              placeholder="0xE43fA578C392F5c728d54c0ddbC9225F0a395f2f"
            value={contractAddress}
            onChange={(e) => setContractAddress(e.target.value)}
              className="font-mono text-base"
         />
            <Button variant="outline" onClick={refreshData} disabled={!contractAddress || !account} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Refresh
         </Button>
      </div>
        </CardContent>
      </Card>

      {account && contractAddress && (
        <div className="space-y-16">

          {/* ================================================================== */}
          {/* Section 1: Quick Reference */}
          {/* ================================================================== */}
          <section>
            <SectionHeader number={1} title="Quick Reference" icon={Zap} />

            <div className="grid md:grid-cols-2 gap-6">
              {/* Display Card */}
              <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-white shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-blue-700 flex items-center gap-2">
                      <Eye className="w-5 h-5" /> FOR DISPLAY
                    </CardTitle>
                    <InfoBadge variant="info">UI Amount</InfoBadge>
                </div>
                  <CardDescription>What to show users in your wallet/dApp</CardDescription>
                        </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Get Balance
                    </div>
                    <code className="block bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg text-sm font-mono">
                      balanceOfUI(address)
                    </code>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Get Multiplier
                    </div>
                    <code className="block bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg text-sm font-mono">
                      uiMultiplier()
                    </code>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Convert Raw → UI
                    </div>
                    <code className="block bg-slate-900 text-emerald-400 px-3 py-2 rounded-lg text-sm font-mono">
                      toUIAmount(rawAmount)
                    </code>
                             </div>
                        </CardContent>
                    </Card>

              {/* Transfer Card */}
              <Card className="border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-white shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-amber-700 flex items-center gap-2">
                      <Send className="w-5 h-5" /> FOR TRANSFER
                    </CardTitle>
                    <InfoBadge variant="warning">Raw Amount</InfoBadge>
                  </div>
                  <CardDescription>What to use in blockchain transactions</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Convert UI → Raw
                    </div>
                    <code className="block bg-slate-900 text-amber-400 px-3 py-2 rounded-lg text-sm font-mono">
                      fromUIAmount(uiAmount)
                    </code>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" /> Execute Transfer
                        </div>
                    <code className="block bg-slate-900 text-amber-400 px-3 py-2 rounded-lg text-sm font-mono">
                      transfer(to, rawAmount)
                    </code>
                        </div>
                  <div className="bg-amber-100 border border-amber-200 rounded-lg p-3 mt-2">
                    <div className="flex items-start gap-2 text-amber-800 text-sm">
                      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                      <span><strong>Important:</strong> Never use UI Amount directly in transfer(). Always convert first!</span>
                    </div>
                             </div>
                        </CardContent>
                    </Card>
                </div>
            </section>

          {/* ================================================================== */}
          {/* Section 2: Live Data Dashboard */}
          {/* ================================================================== */}
          <section>
            <SectionHeader number={2} title="Live Contract Data" icon={Eye} />

            <div className="grid md:grid-cols-3 gap-6">
              {/* Raw Balance */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-slate-500 uppercase tracking-wider">Raw Balance</CardTitle>
                    <code className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">balanceOf()</code>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono text-slate-700">
                    {isLoading ? '...' : Number(tokenData.rawBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </div>
                  <div className="mt-3 p-2 bg-slate-50 rounded-lg">
                    <div className="text-xs text-slate-500 font-medium mb-1">Used for:</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">transfer()</span>
                      <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">approve()</span>
                      <span className="text-xs bg-slate-200 px-2 py-0.5 rounded">transferFrom()</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Multiplier */}
              <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-indigo-600 uppercase tracking-wider">Multiplier</CardTitle>
                    <code className="text-xs bg-indigo-100 px-2 py-0.5 rounded text-indigo-600">uiMultiplier()</code>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-indigo-600">
                    {tokenData.multiplier}x
                  </div>

                  {tokenData.pendingMultiplier && countdown !== null && countdown > 0 && (
                    <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-200">
                      <div className="flex items-center gap-2 text-amber-700 text-sm font-medium mb-1">
                        <Zap className="w-4 h-4 animate-pulse" />
                        Pending Update
                      </div>
                      <div className="text-lg font-bold text-amber-600">
                        → {tokenData.pendingMultiplier.value}x
                      </div>
                      <div className="text-xs text-amber-600 mt-1 font-mono">
                        Effective in {countdown}s
                      </div>
                      <div className="mt-2 h-1 bg-amber-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-1000"
                          style={{ width: `${Math.max(0, (countdown / tokenData.pendingMultiplier.remainingSeconds) * 100)}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {(!tokenData.pendingMultiplier || countdown === null || countdown <= 0) && (
                    <div className="mt-3 p-2 bg-indigo-50 rounded-lg border border-indigo-100">
                      <div className="text-xs text-indigo-600 font-medium mb-1">Formula:</div>
                      <div className="text-xs font-mono text-indigo-700">
                        UI = Raw × Multiplier
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* UI Balance */}
              <Card className="border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-white">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm text-emerald-600 uppercase tracking-wider">UI Balance</CardTitle>
                    <code className="text-xs bg-emerald-100 px-2 py-0.5 rounded text-emerald-600">balanceOfUI()</code>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold font-mono text-emerald-700">
                    {isLoading ? '...' : Number(tokenData.uiBalance).toLocaleString(undefined, { maximumFractionDigits: 4 })}
                  </div>
                  <div className="mt-3 p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                    <div className="text-xs text-emerald-600 font-medium mb-1">Show to users:</div>
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs bg-emerald-200 px-2 py-0.5 rounded">Portfolio</span>
                      <span className="text-xs bg-emerald-200 px-2 py-0.5 rounded">Balance Display</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Calculation Explanation */}
            <Card className="mt-6 border-slate-200 bg-slate-50">
              <CardContent className="pt-6">
                <div className="flex items-center gap-6 justify-center text-lg font-mono">
                  <div className="text-center">
                    <div className="text-sm text-slate-500 mb-1">Raw Balance</div>
                    <div className="font-bold text-slate-700">{Number(tokenData.rawBalance).toFixed(2)}</div>
                  </div>
                  <div className="text-slate-400">×</div>
                  <div className="text-center">
                    <div className="text-sm text-indigo-500 mb-1">Multiplier</div>
                    <div className="font-bold text-indigo-600">{tokenData.multiplier}</div>
                  </div>
                  <div className="text-slate-400">=</div>
                  <div className="text-center">
                    <div className="text-sm text-emerald-500 mb-1">UI Balance</div>
                    <div className="font-bold text-emerald-600">{Number(tokenData.uiBalance).toFixed(2)}</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ================================================================== */}
          {/* Section 3: Integration Guide */}
          {/* ================================================================== */}
          <section>
            <SectionHeader number={3} title="Integration Guide" icon={Code2} />

            <div className="space-y-6">
              {/* Step 1: Detect */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-sm font-bold">1</span>
                    Detect EIP-8056 Support
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Interactive Detection */}
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <div className="text-sm font-medium text-slate-700">Detection Method</div>
                        <code className="text-sm font-mono text-indigo-600">Try calling uiMultiplier()</code>
                      </div>
                      <Button
                        onClick={checkEIP8056Support}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700"
                        disabled={!contractAddress}
                      >
                        <Scan className="w-4 h-4" /> Detect Support
                      </Button>
                    </div>

                    {eip8056Detection && (
                      <div className={`mt-3 p-3 rounded-lg border ${
                        eip8056Detection.supported
                          ? 'bg-emerald-50 border-emerald-200'
                          : 'bg-red-50 border-red-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {eip8056Detection.supported ? (
                            <>
                              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                              <span className="font-medium text-emerald-700">✅ Contract supports EIP-8056!</span>
                            </>
                          ) : (
                            <>
                              <XCircle className="w-5 h-5 text-red-600" />
                              <span className="font-medium text-red-700">❌ Contract does NOT support EIP-8056</span>
                            </>
                          )}
                        </div>
                        {eip8056Detection.supported && eip8056Detection.multiplier && (
                          <div className="text-sm text-emerald-600 mt-1">
                            Current multiplier: <strong>{eip8056Detection.multiplier}x</strong>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-slate-600">
                    Try calling <code className="bg-slate-100 px-1 rounded">uiMultiplier()</code> to detect EIP-8056 support.
                  </div>
                  <CodeBlock
                    label="Detection Code"
                    copyable
                    code={`// Detect EIP-8056 support by trying to call uiMultiplier()
async function isEIP8056Token(tokenAddress) {
  try {
    const contract = new Contract(tokenAddress,
      ["function uiMultiplier() view returns (uint256)"],
      provider
    );
    await contract.uiMultiplier();
    return true;  // ✅ Supports EIP-8056
  } catch {
    return false; // ❌ Standard ERC20
  }
}

// Usage
if (await isEIP8056Token(tokenAddress)) {
  const uiBalance = await token.balanceOfUI(user);
} else {
  const balance = await token.balanceOf(user);
}`}
                  />
                </CardContent>
              </Card>

              {/* Step 2: Get Multiplier */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-sm font-bold">2</span>
                    Get the Multiplier
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Interactive Demo */}
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-indigo-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-slate-700">
                        Call <code className="bg-slate-200 px-1 rounded">uiMultiplier()</code>
                      </div>
                      <Button
                        onClick={handleDemoFetchMultiplier}
                        className="gap-2"
                        variant="secondary"
                        disabled={!contractAddress || isDemoLoading}
                      >
                        <Zap className="w-4 h-4" /> {isDemoLoading ? 'Loading...' : 'Execute'}
                      </Button>
                    </div>

                    {demoMultiplier && (
                      <div className="mt-3 p-3 bg-white rounded-lg border border-slate-200 font-mono text-sm space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Raw (uint256):</span>
                          <span className="text-indigo-600 font-bold">{demoMultiplier.raw}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Formatted:</span>
                          <span className="text-emerald-600 font-bold">{demoMultiplier.formatted}x</span>
                        </div>
                      </div>
                    )}
                  </div>

                        <CodeBlock
                    label="Fetch Current Multiplier"
                    copyable
                    code={`// Get multiplier (18 decimals precision)
const multiplierRaw = await token.uiMultiplier();
// Returns: ${demoMultiplier?.raw || ethers.parseUnits(tokenData.multiplier, 18).toString()}

// Format for display
const multiplier = ethers.formatUnits(multiplierRaw, 18);
// Returns: "${demoMultiplier?.formatted || tokenData.multiplier}"`}
                  />
                </CardContent>
              </Card>

              {/* Step 3: Get UI Balance */}
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-3">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-200 text-slate-700 text-sm font-bold">3</span>
                    Get UI Balance for Display
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Interactive Demo */}
                  <div className="p-4 bg-gradient-to-r from-slate-50 to-emerald-50 rounded-xl border border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-sm font-medium text-slate-700">
                        Compare <code className="bg-slate-200 px-1 rounded">balanceOf()</code> vs <code className="bg-emerald-200 px-1 rounded">balanceOfUI()</code>
                      </div>
                      <Button
                        onClick={handleDemoFetchBalance}
                        className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        disabled={!contractAddress || !account || isDemoLoading}
                      >
                        <Eye className="w-4 h-4" /> {isDemoLoading ? 'Loading...' : 'Fetch Both'}
                      </Button>
                    </div>

                    {demoBalance && (
                      <div className="mt-3 grid grid-cols-2 gap-3">
                        <div className="p-3 bg-slate-100 rounded-lg border border-slate-200">
                          <div className="text-xs text-slate-500 mb-1">balanceOf() - Raw</div>
                          <div className="text-lg font-bold font-mono text-slate-700">{Number(demoBalance.raw).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                          <div className="text-xs text-slate-400 mt-1">❌ Don't display this</div>
                        </div>
                        <div className="p-3 bg-emerald-100 rounded-lg border border-emerald-200">
                          <div className="text-xs text-emerald-600 mb-1">balanceOfUI() - Scaled</div>
                          <div className="text-lg font-bold font-mono text-emerald-700">{Number(demoBalance.ui).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
                          <div className="text-xs text-emerald-500 mt-1">✅ Show this to users</div>
                        </div>
                      </div>
                    )}

                    {account && (
                      <div className="mt-2 text-xs text-slate-500">
                        Checking for: <code className="bg-slate-100 px-1 rounded">{account.slice(0,6)}...{account.slice(-4)}</code>
                      </div>
                    )}
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium text-emerald-700">Recommended: Direct Call</span>
                      </div>
                      <CodeBlock
                        copyable
                        code={`// Direct call (recommended)
const uiBalance = await token.balanceOfUI(
  userAddress
);
// Returns: ${demoBalance?.ui || tokenData.uiBalance}`}
                        />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Info className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium text-slate-500">Alternative: Manual Calculation</span>
                      </div>
                      <CodeBlock
                        code={`// Manual calculation
const raw = await token.balanceOf(addr);
const mult = await token.uiMultiplier();
const ui = (raw * mult) / 1e18;
// Result: ${demoBalance?.ui || tokenData.uiBalance}`}
                      />
                    </div>
                  </div>

                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                      <div>
                        <div className="font-medium text-red-700 mb-1">Common Mistake</div>
                        <div className="text-sm text-red-600">
                          Don't use <code className="bg-red-100 px-1 rounded">balanceOf()</code> for display.
                          It returns the raw on-chain value ({demoBalance?.raw || tokenData.rawBalance}), not the scaled UI value ({demoBalance?.ui || tokenData.uiBalance}).
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
                </div>
            </section>

          {/* ================================================================== */}
          {/* Section 4: Interactive Converter */}
          {/* ================================================================== */}
          <section>
            <SectionHeader number={4} title="Amount Converter Tool" icon={ArrowLeftRight} />

            <Card className="border-2 border-slate-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-slate-600" />
                  Convert Between UI and Raw Amounts
                </CardTitle>
                <CardDescription>
                  Test the conversion with the current multiplier: <strong>{tokenData.multiplier}x</strong>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  {/* UI Amount */}
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      UI Amount <span className="text-blue-500">(Display)</span>
                    </label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="e.g. 100"
                        value={converterUiAmount}
                        onChange={(e) => setConverterUiAmount(e.target.value)}
                        className="font-mono text-lg"
                      />
                      <Button onClick={handleUiToRaw} variant="secondary" size="icon">
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">What users see</div>
                  </div>

                  {/* Divider */}
                  <div className="hidden md:flex flex-col items-center gap-2 text-slate-300">
                    <ArrowLeftRight className="w-6 h-6" />
                    <div className="text-xs font-mono text-slate-400">÷ {tokenData.multiplier}</div>
                  </div>

                  {/* Raw Amount */}
                  <div className="flex-1 w-full">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Raw Amount <span className="text-amber-500">(Transaction)</span>
                    </label>
                    <div className="flex gap-2">
                      <Button onClick={handleRawToUi} variant="secondary" size="icon">
                        <ArrowRight className="w-4 h-4 rotate-180" />
                      </Button>
                      <Input
                        type="number"
                        placeholder="e.g. 12.5"
                        value={converterRawAmount}
                        onChange={(e) => setConverterRawAmount(e.target.value)}
                        className="font-mono text-lg"
                      />
                    </div>
                    <div className="text-xs text-slate-500 mt-1">What blockchain stores</div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-slate-900 rounded-xl text-slate-300 font-mono text-sm">
                  <div className="text-slate-500 mb-2">// Contract calls for conversion</div>
                  <div><span className="text-purple-400">const</span> raw = <span className="text-amber-400">await</span> token.<span className="text-emerald-400">fromUIAmount</span>(uiAmount);</div>
                  <div><span className="text-purple-400">const</span> ui = <span className="text-amber-400">await</span> token.<span className="text-emerald-400">toUIAmount</span>(rawAmount);</div>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* ================================================================== */}
          {/* Section 5: Transfer Flow */}
          {/* ================================================================== */}
          <section>
            <SectionHeader number={5} title="Transfer Flow Demonstration" icon={Send} />

            <Card className="border-2 border-emerald-200">
                    <CardHeader>
                <CardTitle className="flex items-center gap-2 text-emerald-700">
                  <Send className="w-5 h-5" />
                  Complete Transfer Workflow
                </CardTitle>
                        <CardDescription>
                  Users input <strong>UI Amounts</strong>. Wallets must convert to <strong>Raw Amounts</strong> before sending the transaction.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-8">
                {/* Input Form */}
                <div className="space-y-5">
                  <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">1</span>
                    User Input (UI Amount)
                  </div>
                                    <Input
                                        type="number"
                    placeholder="Amount to send (e.g. 100)"
                                        value={transferUiAmount}
                                        onChange={(e) => setTransferUiAmount(e.target.value)}
                    className="font-mono"
                                    />

                  <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center text-xs font-bold">2</span>
                    Recipient Address
                            </div>
                                <Input
                                    placeholder="0x..."
                                    value={transferRecipient}
                                    onChange={(e) => setTransferRecipient(e.target.value)}
                    className="font-mono"
                                />

                  <Button onClick={handleCalculateRaw} className="w-full bg-slate-900 hover:bg-slate-800">
                    <Calculator className="w-4 h-4 mr-2" /> Calculate Raw Amount
                            </Button>
                        </div>

                {/* Code Visualization */}
                <div className="bg-slate-950 p-5 rounded-xl font-mono text-sm space-y-3">
                  <div className="border-b border-slate-800 pb-3 text-xs text-slate-500 flex items-center gap-2">
                    <Terminal className="w-3 h-3" /> Internal Wallet Logic
                            </div>

                  <div className="text-slate-400">
                    <span className="text-slate-500">// Step 1: Get multiplier</span>
                  </div>
                            <div>
                    <span className="text-purple-400">const</span> <span className="text-slate-300">multiplier</span> = <span className="text-amber-300">{tokenData.multiplier}</span>;
                            </div>

                  <div className="text-slate-400 pt-2">
                    <span className="text-slate-500">// Step 2: User's UI input</span>
                  </div>
                            <div>
                    <span className="text-purple-400">const</span> <span className="text-slate-300">uiAmount</span> = <span className="text-amber-300">{transferUiAmount || '?'}</span>;
                            </div>

                  <div className="text-slate-400 pt-2">
                    <span className="text-slate-500">// Step 3: Convert to raw</span>
                  </div>
                  <div>
                    <span className="text-purple-400">const</span> <span className="text-slate-300">rawAmount</span> = uiAmount / multiplier;
                            </div>
                            <div>
                    <span className="text-slate-500">// Result: </span><span className="text-emerald-400">{calculatedRawAmount || '?'}</span>
                            </div>

                            {calculatedRawAmount && (
                    <div className="pt-4 border-t border-slate-800 animate-in fade-in slide-in-from-bottom-2">
                      <div className="text-slate-500 text-xs mb-2">// Step 4: Execute transfer</div>
                      <div className="bg-slate-900 p-3 rounded-lg break-all text-xs text-emerald-400">
                        token.transfer(<br/>
                        &nbsp;&nbsp;"{transferRecipient || '0x...'}", <br/>
                        &nbsp;&nbsp;{ethers.parseUnits(calculatedRawAmount, 18).toString()}<br/>
                        );
                                    </div>
                                    <Button
                                        onClick={handleTransfer}
                        className="w-full mt-4 bg-emerald-600 hover:bg-emerald-700 text-white"
                        disabled={!transferRecipient}
                                    >
                        <Send className="w-4 h-4 mr-2" /> Execute Transfer
                                    </Button>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </section>

          {/* ================================================================== */}
          {/* Section 6: Code Snippets */}
          {/* ================================================================== */}
          <section>
            <SectionHeader number={6} title="Ready-to-Use Code Snippets" icon={Code2} />

            <div className="space-y-6">
              <Card className="border-slate-200">
                <CardHeader>
                  <CardTitle className="text-base">Complete Wallet Integration Example</CardTitle>
                </CardHeader>
                <CardContent>
                  <CodeBlock
                    label="JavaScript / TypeScript"
                    copyable
                    code={`import { ethers } from 'ethers';

// EIP-8056 ABI (minimum required functions)
const ERC8056_ABI = [
  "function uiMultiplier() view returns (uint256)",
  "function balanceOfUI(address) view returns (uint256)",
  "function toUIAmount(uint256) view returns (uint256)",
  "function fromUIAmount(uint256) view returns (uint256)",
  "function transfer(address, uint256) returns (bool)"
];

class EIP8056Wallet {
  constructor(tokenAddress, provider) {
    this.token = new ethers.Contract(tokenAddress, ERC8056_ABI, provider);
  }

  // Display: Get UI balance for portfolio view
  async getDisplayBalance(userAddress) {
    const uiBalance = await this.token.balanceOfUI(userAddress);
    return ethers.formatUnits(uiBalance, 18);
  }

  // Display: Get current multiplier
  async getMultiplier() {
    const mult = await this.token.uiMultiplier();
    return ethers.formatUnits(mult, 18);
  }

  // Transfer: Convert UI input to raw amount and send
  async sendTokens(signer, toAddress, uiAmount) {
    const tokenWithSigner = this.token.connect(signer);

    // Convert UI amount to raw amount
    const uiAmountWei = ethers.parseUnits(uiAmount.toString(), 18);
    const rawAmount = await this.token.fromUIAmount(uiAmountWei);

    // Execute transfer with raw amount
    const tx = await tokenWithSigner.transfer(toAddress, rawAmount);
    return tx;
  }
}

// Usage example
const wallet = new EIP8056Wallet(tokenAddress, provider);
const balance = await wallet.getDisplayBalance(userAddress);  // "${tokenData.uiBalance}"
const multiplier = await wallet.getMultiplier();              // "${tokenData.multiplier}"`}
                  />
                </CardContent>
              </Card>
                </div>
          </section>

          {/* ================================================================== */}
          {/* Section 7: Admin Controls */}
          {/* ================================================================== */}
          <section>
            <SectionHeader number={7} title="Admin Controls (Owner Only)" icon={Zap} />

            <Card className="border-amber-200 bg-gradient-to-br from-amber-50 to-white">
                    <CardHeader>
                <CardTitle className="flex items-center gap-2 text-amber-700">
                  <Zap className="w-5 h-5" />
                  Adjust Multiplier
                </CardTitle>
                        <CardDescription>
                            Changing the multiplier affects the UI Balance of ALL users immediately, without touching their raw balances.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-medium text-slate-700 block mb-2">New Multiplier</label>
                                <Input
                                    type="number"
                      placeholder="e.g. 2.0"
                      min="0.000001"
                      step="0.1"
                                    value={newMultiplier}
                                    onChange={(e) => setNewMultiplier(e.target.value)}
                      className="font-mono"
                                />
                            </div>
                  <Button onClick={handleUpdateMultiplier} disabled={!newMultiplier} className="bg-amber-600 hover:bg-amber-700">
                                Set Multiplier
                            </Button>
                        </div>
                <div className="mt-4 p-3 bg-amber-100 rounded-lg text-sm text-amber-800">
                  <strong>Example:</strong> Setting multiplier to 2.0 will double all displayed UI balances while keeping raw balances unchanged.
                        </div>
                    </CardContent>
                </Card>
            </section>

        </div>
      )}
    </div>
  )
}
