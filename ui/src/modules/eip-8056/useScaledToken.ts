import { useState, useEffect, useCallback } from 'react'
import { ethers } from 'ethers'
import { ERC8056_ABI } from './abi'

declare global {
  interface Window {
    ethereum?: ethers.Eip1193Provider
  }
}

interface PendingMultiplier {
  value: string
  effectiveAt: number
  remainingSeconds: number
}

interface TokenData {
  name: string
  symbol: string
  rawBalance: string
  uiBalance: string
  multiplier: string
  pendingMultiplier: PendingMultiplier | null
}

interface EIP8056Detection {
  supported: boolean
  multiplier: string | null
  method: 'direct-call'
  checkedAt: number
}

interface UseScaledTokenReturn {
  account: string | null
  network: string
  tokenData: TokenData
  isLoading: boolean
  error: string | null
  eip8056Detection: EIP8056Detection | null
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
  refreshData: () => Promise<void>
  updateMultiplier: (newMultiplier: string) => Promise<void>
  transfer: (to: string, amount: string) => Promise<void>
  checkEIP8056Support: () => Promise<EIP8056Detection | null>
}

export function useScaledToken(contractAddress: string): UseScaledTokenReturn {
  const [account, setAccount] = useState<string | null>(null)
  const [network, setNetwork] = useState<string>('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [eip8056Detection, setEip8056Detection] = useState<EIP8056Detection | null>(null)
  const [tokenData, setTokenData] = useState<TokenData>({
    name: '',
    symbol: '',
    rawBalance: '0',
    uiBalance: '0',
    multiplier: '1.0',
    pendingMultiplier: null,
  })

  const connectWallet = async () => {
    if (!window.ethereum) {
      setError('Please install MetaMask!')
      return
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum)
      const accounts = await provider.send('eth_requestAccounts', [])
      setAccount(accounts[0])
      const net = await provider.getNetwork()
      setNetwork(Number(net.chainId) === 97 ? 'BSC Testnet' : `Chain ${net.chainId}`)
      setError(null)
    } catch (e) {
      console.error(e)
      setError('Failed to connect wallet')
    }
  }

  const disconnectWallet = () => {
    setAccount(null)
    setTokenData({
      name: '',
      symbol: '',
      rawBalance: '0',
      uiBalance: '0',
      multiplier: '1.0',
      pendingMultiplier: null,
    })
  }

  const refreshData = useCallback(async () => {
    if (!account || !contractAddress || !ethers.isAddress(contractAddress)) return

    setIsLoading(true)
    setError(null)

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!)

      const code = await provider.getCode(contractAddress)
      if (code === '0x') {
        setError('No contract found at this address. Please check the address.')
        setIsLoading(false)
        return
      }

      const contract = new ethers.Contract(contractAddress, ERC8056_ABI, provider)

      let isEIP8056 = false
      try {
        await contract.uiMultiplier()
        isEIP8056 = true
      } catch {
        setError('Contract does not support EIP-8056 (uiMultiplier not found)')
        setIsLoading(false)
        return
      }

      if (!isEIP8056) return

      const [name, symbol, mult, raw, ui, nextMult, nextMultEffectiveAt] = await Promise.all([
        contract.name(),
        contract.symbol(),
        contract.uiMultiplier(),
        contract.balanceOf(account),
        contract.balanceOfUI(account),
        contract._nextUiMultiplier(),
        contract._nextUiMultiplierEffectiveAt(),
      ])

      const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
      const effectiveAtBigInt = BigInt(nextMultEffectiveAt.toString())
      const maxUint256 = BigInt("0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff")

      // Has pending update if: effectiveAt is in the future AND not the max value (initial state)
      const hasPendingUpdate = effectiveAtBigInt > currentTimestamp && effectiveAtBigInt < maxUint256

      let pendingMultiplier: PendingMultiplier | null = null
      if (hasPendingUpdate) {
        const remainingSeconds = Number(effectiveAtBigInt - currentTimestamp)
        pendingMultiplier = {
          value: ethers.formatUnits(nextMult, 18),
          effectiveAt: Number(effectiveAtBigInt),
          remainingSeconds,
        }
      }

      setTokenData({
        name,
        symbol,
        rawBalance: ethers.formatUnits(raw, 18),
        uiBalance: ethers.formatUnits(ui, 18),
        multiplier: ethers.formatUnits(mult, 18),
        pendingMultiplier,
      })
      setError(null)
    } catch (err: unknown) {
      console.error('Error fetching data:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      if (message.includes('BAD_DATA') || message.includes('invalid length')) {
        setError('Invalid contract response. This may not be an EIP-8056 compatible token.')
      } else if (message.includes('network')) {
        setError('Network error. Please check your connection and try again.')
      } else {
        setError(`Failed to fetch contract data: ${message.slice(0, 100)}`)
      }
    } finally {
      setIsLoading(false)
    }
  }, [account, contractAddress])

  const updateMultiplier = async (newMultiplier: string) => {
    if (!account || !contractAddress) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(contractAddress, ERC8056_ABI, signer)

      const val = ethers.parseUnits(newMultiplier, 18)
      const currentTimestamp = Math.floor(Date.now() / 1000)
      const effectiveTime = currentTimestamp + 30

      const tx = await contract.setUIMultiplier(val, effectiveTime)
      alert(`✅ Transaction sent!\n\nHash: ${tx.hash}\n\nNew multiplier will be effective in 30 seconds.`)
      await tx.wait()
      await refreshData()
    } catch (err: unknown) {
      console.error(err)
      let message = 'Unknown error'
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          message = 'Transaction rejected by user'
        } else if (err.message.includes('out-of-bounds') || err.message.includes('INVALID_ARGUMENT')) {
          message = 'Invalid value: multiplier must be a positive number'
        } else if (err.message.includes('Multiplier must be positive')) {
          message = 'Multiplier must be positive'
        } else if (err.message.includes('execution reverted')) {
          // Extract revert reason
          const match = err.message.match(/reason="([^"]+)"/) || err.message.match(/reverted: ([^"]+)/)
          message = match ? match[1] : 'Transaction reverted'
        } else {
          message = err.message.slice(0, 200)
        }
      }
      alert(`❌ Error\n\n${message}`)
    }
  }

  const transfer = async (to: string, amount: string) => {
    if (!account || !contractAddress) return

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!)
      const signer = await provider.getSigner()
      const contract = new ethers.Contract(contractAddress, ERC8056_ABI, signer)
      const tx = await contract.transfer(to, amount)
      alert(`✅ Transfer sent!\n\nHash: ${tx.hash}`)
      await tx.wait()
      await refreshData()
    } catch (err: unknown) {
      console.error(err)
      let message = 'Unknown error'
      if (err instanceof Error) {
        if (err.message.includes('user rejected')) {
          message = 'Transaction rejected by user'
        } else if (err.message.includes('execution reverted')) {
          const match = err.message.match(/reason="([^"]+)"/) || err.message.match(/reverted: ([^"]+)/)
          message = match ? match[1] : 'Transaction reverted'
        } else {
          message = err.message.slice(0, 200)
        }
      }
      alert(`❌ Transfer Error\n\n${message}`)
    }
  }

  const checkEIP8056Support = async (): Promise<EIP8056Detection | null> => {
    if (!contractAddress || !ethers.isAddress(contractAddress)) {
      setError('Please enter a valid contract address')
      return null
    }

    try {
      const provider = new ethers.BrowserProvider(window.ethereum!)

      const code = await provider.getCode(contractAddress)
      if (code === '0x') {
        setError('No contract found at this address')
        return null
      }

      // Direct call detection: try calling uiMultiplier()
      const contract = new ethers.Contract(
        contractAddress,
        ["function uiMultiplier() view returns (uint256)"],
        provider
      )

      let supported = false
      let multiplier: string | null = null

      try {
        const mult = await contract.uiMultiplier()
        supported = true
        multiplier = ethers.formatUnits(mult, 18)
      } catch {
        supported = false
      }

      const detection: EIP8056Detection = {
        supported,
        multiplier,
        method: 'direct-call',
        checkedAt: Date.now()
      }

      setEip8056Detection(detection)
      setError(null)
      return detection
    } catch (err: unknown) {
      console.error('Error checking EIP-8056 support:', err)
      const message = err instanceof Error ? err.message : 'Unknown error'
      setError(`Failed to check: ${message}`)
      return null
    }
  }

  useEffect(() => {
    if (account && contractAddress) {
      refreshData()
    }
  }, [account, contractAddress, refreshData])

  return {
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
  }
}
