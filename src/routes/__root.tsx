
import { createRootRoute } from '@tanstack/react-router'
import { AppLayout } from '@/components/layout/app-layout'

const RootLayout = () => (
  <AppLayout />
)

export const Route = createRootRoute({ component: RootLayout })
