import { Routes, Route, useLocation, useNavigate } from "react-router-dom";
import { ConnectKitProvider } from "connectkit";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { NetworkSwitcher } from "@/components/NetworkSwitcher";
import { ConnectKitButton } from "connectkit";
import { BookOpen } from "lucide-react";
import { Home } from "@/pages/Home";
import { Eip8056Page } from "@/pages/Eip8056Page";

function TopNavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const isEip8056Page = location.pathname === "/eip-8056";

  const handleIconClick = () => {
    navigate("/eip-8056");
  };

  return (
    <header className="border-b border-slate-200 bg-white px-6 py-4">
      <div
        className={`flex items-center justify-between ${
          isEip8056Page ? "max-w-7xl mx-auto w-full" : ""
        }`}
      >
        {isEip8056Page && (
          <div className="flex items-center gap-3">
            <button
              onClick={handleIconClick}
              className="p-2 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-xl hover:from-yellow-500 hover:to-yellow-700 transition-colors cursor-pointer"
              aria-label="Go to EIP-8056 home"
            >
              <BookOpen className="w-5 h-5 text-white" />
            </button>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                EIP-8056 Integration Guide
              </h1>
              <p className="text-sm text-slate-500">
                Scaled UI Amount Extension
              </p>
            </div>
          </div>
        )}
        <div className="flex items-center gap-3 ml-auto">
          <NetworkSwitcher />
          <ConnectKitButton />
        </div>
      </div>
    </header>
  );
}

function App() {
  const location = useLocation();
  const isEip8056Page = location.pathname === "/eip-8056";

  return (
    <ConnectKitProvider>
      {isEip8056Page ? (
        <div className="min-h-screen w-full bg-background flex flex-col">
          <TopNavBar />
          <main className="flex-1 p-6">
            <div className="max-w-7xl mx-auto w-full">
              <Routes>
                <Route path="/eip-8056" element={<Eip8056Page />} />
              </Routes>
            </div>
          </main>
        </div>
      ) : (
        <SidebarProvider>
          <div className="flex min-h-screen w-full bg-background">
            <AppSidebar />
            <div className="flex-1 flex flex-col">
              <TopNavBar />
              <main className="flex-1 p-6">
                <Routes>
                  <Route path="/" element={<Home />} />
                </Routes>
              </main>
            </div>
          </div>
        </SidebarProvider>
      )}
    </ConnectKitProvider>
  );
}

export default App;
