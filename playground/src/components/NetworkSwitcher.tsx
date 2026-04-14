import { useState, useRef, useEffect } from "react";
import { useChainId, useSwitchChain, useChains } from "wagmi";
import { Network, ChevronDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

// Chain name short form mapping
const getChainShortName = (chainId: number, chainName: string): string => {
  const shortNames: Record<number, string> = {
    56: "BSC Mainnet",
    97: "BSC Testnet",
    1337: "Localhost",
  };
  return shortNames[chainId] || chainName;
};

export function NetworkSwitcher() {
  const chainId = useChainId();
  const chains = useChains();
  const { switchChain, isPending: isSwitchingChain } = useSwitchChain();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentChain = chains.find((chain) => chain.id === chainId);
  const displayName = currentChain
    ? getChainShortName(currentChain.id, currentChain.name)
    : "Unknown";

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const handleSwitch = (targetChainId: number) => {
    switchChain({ chainId: targetChainId });
    setOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="outline"
        size="sm"
        className="justify-between min-w-[120px] h-9"
        onClick={() => setOpen(!open)}
        disabled={isSwitchingChain}
      >
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4" />
          <span className="text-sm font-medium">{displayName}</span>
        </div>
        <ChevronDown
          className={`w-4 h-4 opacity-50 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </Button>

      {open && (
        <div className="absolute top-full left-0 mt-2 min-w-[160px] bg-white border border-slate-200 rounded-lg shadow-lg z-50 overflow-hidden">
          <div className="py-1">
            {chains.map((chain) => {
              const isActive = chain.id === chainId;
              const chainDisplayName = getChainShortName(chain.id, chain.name);
              return (
                <button
                  key={chain.id}
                  onClick={() => handleSwitch(chain.id)}
                  disabled={isActive || isSwitchingChain}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-sm transition-colors ${
                    isActive
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-700 hover:bg-slate-50"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-2 h-2 rounded-full ${
                        isActive ? "bg-emerald-500" : "bg-slate-300"
                      }`}
                    />
                    <span className="font-medium">{chainDisplayName}</span>
                  </div>
                  {isActive && <Check className="w-4 h-4 text-emerald-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
