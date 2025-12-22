import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  Coins,
  Gift,
  Activity,
  Settings,
  HelpCircle,
  Command
} from "lucide-react"
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
  SidebarRail,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Link, useLocation } from "@tanstack/react-router"

// Defines the navigation structure
const navMain = [
  {
    title: "Platform",
    items: [
      { title: "Dashboard", url: "/", icon: LayoutDashboard },
      { title: "Portfolio", url: "/portfolio", icon: Wallet },
      { title: "Swap", url: "/swap", icon: ArrowRightLeft },
      { title: "Pools", url: "/pools", icon: Coins },
    ],
  },
  {
    title: "Earn",
    items: [
      { title: "Rewards", url: "/rewards", icon: Gift },
      { title: "Activity", url: "/activity", icon: Activity },
    ],
  },
]

const navSecondary = [
  { title: "Settings", url: "/settings", icon: Settings },
  { title: "Support", url: "/support", icon: HelpCircle },
]

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  // Mock current location for active state (in real app use useLocation)
  // const location = useLocation()
  
  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary/10 text-sidebar-primary">
                  <Command className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#00FFA0] to-[#00F2FA]">Maya Zero</span>
                  <span className="truncate text-xs text-muted-foreground">Power Client</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent>
        {navMain.map((group) => (
          <SidebarGroup key={group.title}>
            <SidebarGroupLabel>{group.title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild tooltip={item.title}>
                      <Link to={item.url} className="[&.active]:font-semibold [&.active]:text-primary">
                        <item.icon className="size-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
        
        <SidebarSeparator className="mx-0" />
        
        <SidebarGroup>
          <SidebarGroupContent>
             <SidebarMenu>
                {navSecondary.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild size="sm" tooltip={item.title}>
                          <Link to={item.url}>
                             <item.icon className="size-4" />
                             <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                ))}
             </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
         {/* Could add a user profile or connection status here */}
         <div className="p-2 text-xs text-center text-muted-foreground group-data-[collapsible=icon]:hidden">
            v0.1.0-alpha
         </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
