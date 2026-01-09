import { Link, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Beaker, Home, FlaskConical } from 'lucide-react'

const demos = [
  {
    title: 'EIP-8056',
    url: '/eip-8056',
    icon: FlaskConical,
    description: 'Scaled UI Amount',
  },
]

export function AppSidebar() {
  const location = useLocation()

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <Beaker className="h-6 w-6" />
          <span className="font-semibold text-lg">POC Labs</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={location.pathname === '/'}>
                <Link to="/">
                  <Home className="h-4 w-4" />
                  <span>Home</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Demos</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {demos.map((demo) => (
                <SidebarMenuItem key={demo.url}>
                  <SidebarMenuButton
                    asChild
                    isActive={location.pathname === demo.url}
                  >
                    <Link to={demo.url}>
                      <demo.icon className="h-4 w-4" />
                      <span>{demo.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t px-4 py-3 text-xs text-muted-foreground">
        BNB Chain POC Labs
      </SidebarFooter>
    </Sidebar>
  )
}
