import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "./sidebar"
import { Separator } from "@/components/ui/separator"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb"
import { Outlet, useLocation } from "@tanstack/react-router"
import { Header } from "./header"

export function AppLayout() {
  const location = useLocation()
  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12 border-b px-4">
          <div className="flex items-center gap-2">
            <SidebarTrigger className="-ml-1" />
            <Separator orientation="vertical" className="mr-2 h-4" />
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem className="hidden md:block">
                  <BreadcrumbLink href="#">
                    {location.pathname.startsWith('/rewards') || location.pathname.startsWith('/activity') ? 'Earn' : 'Platform'}
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator className="hidden md:block" />
                <BreadcrumbItem>
                  <BreadcrumbPage>
                    {location.pathname === '/' && 'Dashboard'}
                    {location.pathname === '/portfolio' && 'Portfolio'}
                    {location.pathname === '/swap' && 'Swap'}
                    {location.pathname === '/pools' && 'Pools'}
                    {location.pathname === '/cacaopool' && 'Cacao Pool'}
                    {location.pathname === '/activity' && 'Activity'}
                    {location.pathname === '/settings' && 'Settings'}
                    {location.pathname === '/support' && 'Support'}
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          </div>
          <div className="ml-auto">
             {/* We can place the top-right actions here (Connect Wallet, etc.) */}
             <Header /> 
          </div>
        </header>

        <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
          <div className="min-h-[100vh] flex-1 rounded-xl bg-muted/50 md:min-h-min p-4">
             <Outlet />
          </div>
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

