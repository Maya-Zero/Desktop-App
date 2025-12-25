import { createLazyFileRoute } from '@tanstack/react-router'
import { StakingDashboard } from '@/components/cacao-pool/staking-dashboard'

export const Route = createLazyFileRoute('/cacaopool')({
  component: CacaoPool,
})

function CacaoPool() {
  return <StakingDashboard />
}
