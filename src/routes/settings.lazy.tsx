import { createLazyFileRoute } from '@tanstack/react-router'
import { SettingsView } from '@/components/settings/settings-view'

export const Route = createLazyFileRoute('/settings')({
  component: SettingsView,
})
