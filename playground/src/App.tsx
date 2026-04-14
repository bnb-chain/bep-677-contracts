import { ConnectKitProvider } from "connectkit";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { ConnectKitButton } from "connectkit";
import { BookOpen } from "lucide-react";
import { Eip8056Portal } from "@/modules/eip-8056/Eip8056Portal";

function TopNavBar() {
  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl">
            <BookOpen className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              BEP-677: Implement EIP-8056 Scaled UI Amount
            </h1>
            <p className="text-sm text-slate-500">
              Reference Implementation & Interactive Playground
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <NetworkSwitcher />
          <ConnectKitButton />
        </div>
      </div>
    </header>
  );
}

function App() {
  return (
    <ConnectKitProvider>
      <div className="min-h-screen w-full bg-background flex flex-col">
        <TopNavBar />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto w-full">
            <Eip8056Portal />
          </div>
        </main>
      </div>
    </ConnectKitProvider>
  );
}

export default App;
