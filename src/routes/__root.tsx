import { createRootRoute, Outlet, useLocation, useNavigate } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'
import { useWallet } from '@/components/providers/wallet-provider'
import { PinDialog } from '@/components/layout/pin-dialog'
import { Toaster } from '@/components/ui/sonner'
import { useEffect } from 'react'

const RootLayout = () => {
  const { activeWallet, isLoading, isLocked, setIsLocked, wallets } = useWallet()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (!isLoading) {
      if (!activeWallet && location.pathname !== '/onboarding') {
        navigate({ to: '/onboarding' })
      }
    }
    
  }, [activeWallet, isLoading, location.pathname, navigate])

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If on onboarding, render without AppLayout (Sidebar)
  if (location.pathname === '/onboarding') {
    return <Outlet />
  }

  return (
    <>
      <AppLayout />
      <Toaster />
      {activeWallet && isLocked && (
        <PinDialog 
          open={true} 
          onOpenChange={() => {}} 
          wallet={wallets.find(w => w.address === activeWallet) || null}
          onSuccess={() => setIsLocked(false)}
        />
      )}
    </>
  )
}

export const Route = createRootRoute({ component: RootLayout })
