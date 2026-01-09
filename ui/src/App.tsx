import { Routes, Route } from 'react-router-dom'
import { SidebarProvider } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/layout/AppSidebar'
import { Home } from '@/pages/Home'
import { Eip8056Page } from '@/pages/Eip8056Page'

function App() {
  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background">
        <AppSidebar />
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/eip-8056" element={<Eip8056Page />} />
          </Routes>
        </main>
      </div>
    </SidebarProvider>
  )
}

export default App
