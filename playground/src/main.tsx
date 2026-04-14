import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { HashRouter } from "react-router-dom";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { getDefaultConfig } from "connectkit";
import { bsc, bscTestnet } from "wagmi/chains";
import { defineChain } from "viem";
import "./index.css";
import App from "./App.tsx";

// Define localhost network for development
const localhost = defineChain({
  id: 1337,
  name: "Localhost",
  nativeCurrency: {
    decimals: 18,
    name: "BNB",
    symbol: "BNB",
  },
  rpcUrls: {
    default: {
      http: ["http://127.0.0.1:8545"],
    },
  },
});

// Put bscTestnet first as default to avoid localhost connection issues on refresh
const chains = import.meta.env.DEV
  ? ([bscTestnet, localhost, bsc] as const)
  : ([bscTestnet, bsc] as const);

const configOptions: Parameters<typeof getDefaultConfig>[0] = {
  appName: "BEP-677 Playground",
  appDescription: "BEP-677: Implement EIP-8056 Scaled UI Amount",
  appUrl: "https://example.com",
  appIcon: "https://example.com/icon.png",
  chains,
  transports: {
    [bscTestnet.id]: http("https://data-seed-prebsc-1-s2.binance.org:8545/"),
    [bsc.id]: http("https://bsc-dataseed.binance.org"),
  },
  walletConnectProjectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || "",
  enableFamily: false, // Disable FamilyAccountsSdk
};

// Add localhost transport in dev mode
if (import.meta.env.DEV) {
  configOptions.transports = {
    ...configOptions.transports,
    [localhost.id]: http(),
  };
}

const config = createConfig(getDefaultConfig(configOptions));

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <HashRouter>
          <App />
        </HashRouter>
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
