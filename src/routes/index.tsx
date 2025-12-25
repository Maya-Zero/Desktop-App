import { DashboardView } from '@/components/dashboard/dashboard-view'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return (
    <DashboardView />
  )
}