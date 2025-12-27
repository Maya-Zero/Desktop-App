import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Loader2, TrendingUp, Wallet, ArrowDown, RefreshCw } from 'lucide-react'
import { useBalances } from '../providers/balance-provider'
import { useCacao } from '../providers/cacao-provider'
import { AssetIcon } from "@/components/ui/asset-icon"
import { PinDialog } from '@/components/layout/pin-dialog'
import { toast } from 'sonner'
import { FormattedBalance } from '@/components/ui/formatted-balance'

export function StakingDashboard() {
  const { position, isLoading, error, deposit, refreshPosition } = useCacao()
  const [depositAmount, setDepositAmount] = useState('')
  const { getAmount } = useBalances()
  
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  
  const handleDepositClick = () => {
    setIsDialogOpen(true)
  }

  const handleConfirmDeposit = async (pinOrPassword: string) => {
    const toastId = toast.loading("Processing deposit...", {
        description: "Please wait while we broadcast your transaction."
    })

    try {
        const tx = await deposit(depositAmount, "POOL+", pinOrPassword)
        console.log("Deposit successful:", tx)
        
        toast.success("Deposit Successful", {
            id: toastId,
            description: `Successfully staked ${depositAmount} CACAO.`
        })
        
        refreshPosition()
        setDepositAmount('')
        // PinDialog will close automatically on success if promise resolves
    } catch (e: any) {
        console.error("Deposit error:", e)
        const errorMessage = typeof e === 'string' ? e : (e.message || "Unknown error occurred")
        
        toast.error("Deposit Failed", {
            id: toastId,
            description: errorMessage
        })
        
        throw e // Rethrow so PinDialog can handle the error state
    }
  }

  return (
    <div className="container mx-auto p-8 max-w-6xl space-y-8 animate-in fade-in duration-500">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="space-y-1.5">
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-lg">
                <AssetIcon ticker="CACAO" className="h-8 w-8" />
              </div>
              <span>Cacao Pool</span>
            </h1>
            <p className="text-muted-foreground text-base max-w-2xl">
              Stake your CACAO to earn yield. Rewards are auto-compounded.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshPosition} 
            disabled={isLoading}
            className="h-9 gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg border border-destructive/20 text-sm font-medium flex items-center gap-2">
          <div className="h-1.5 w-1.5 rounded-full bg-destructive" />
          {error}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Total Staked Card */}
        <Card className="shadow-none border-border/60 bg-card/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Staked</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
               <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
                <div className="space-y-1">
                    <div className="text-2xl font-bold tracking-tight">
                        <FormattedBalance value={position?.total_staked ?? 0} />
                    </div>
                </div>
            )}
             <p className="text-xs text-muted-foreground mt-2 font-medium">Your active position</p>
          </CardContent>
        </Card>

        {/* APY Card */}
        <Card className="shadow-none border-green-500/20 bg-green-500/5">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-600 dark:text-green-400">Current APY</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
          </CardHeader>
           <CardContent>
            {isLoading ? (
               <div className="h-8 w-16 bg-muted animate-pulse rounded" />
             ) : (
             <div className="space-y-1">
                 <div className="text-2xl font-bold text-green-600 dark:text-green-400 tracking-tight">
                    {position?.apy ?? '0%'}
                 </div>
             </div>
             )}
            <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-2 font-medium">Annualized yield</p>
          </CardContent>
        </Card>

        {/* Pending Rewards Card */}
        <Card className="shadow-none border-border/60 bg-card/50">
           <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Accumulated Rewards</CardTitle>
            <Loader2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
               <div className="h-8 w-24 bg-muted animate-pulse rounded" />
            ) : (
                <div className="space-y-1">
                    <div className="text-2xl font-bold tracking-tight">
                    <FormattedBalance value={position?.pending_rewards ?? 0} />
                    </div>
                </div>
            )}
             <p className="text-xs text-muted-foreground mt-2 font-medium">Auto-compounding</p>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* Deposit Section */}
      <div className="flex justify-center">
          <Card className="w-full max-w-[480px] shadow-sm border-border/60">
            <CardHeader>
              <CardTitle>Stake CACAO</CardTitle>
              <CardDescription>Stake your CACAO to earn yield.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="p-5 rounded-xl bg-muted/30 border border-border/40 space-y-4 transition-all hover:bg-muted/40 focus-within:border-primary/20 focus-within:bg-muted/40 focus-within:ring-1 focus-within:ring-primary/10">
                    <div className="flex justify-between items-center text-xs">
                        <span className="font-medium text-muted-foreground ml-1">Amount to Stake</span>
                        <div className="flex items-center gap-2">
                             <span className="text-muted-foreground mr-1">Balance: {getAmount("cacao")}</span>
                              <button 
                                className="text-primary bg-primary/10 hover:bg-primary/20 hover:text-primary active:scale-95 px-2 py-0.5 rounded text-[10px] font-bold transition-all uppercase tracking-wide"
                                onClick={() => setDepositAmount(Math.max(0, getAmount("cacao") - 0.02).toString())}
                            >
                                Max
                            </button>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-3 relative">
                        <Input 
                            type="number" 
                            placeholder="0.00" 
                            value={depositAmount} 
                            onChange={(e) => setDepositAmount(e.target.value)}
                            className="flex-1 min-w-0 text-4xl font-bold border-none shadow-none h-auto focus-visible:ring-0 bg-transparent placeholder:text-muted/20 [&::-webkit-inner-spin-button]:appearance-none tabular-nums"
                        />
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-background/40 rounded-full border border-border/50 text-sm font-semibold shrink-0 shadow-sm backdrop-blur-sm">
                            <AssetIcon ticker="CACAO" className="h-5 w-5" />
                            CACAO
                        </div>
                    </div>
                </div>

                <Button 
                    className="w-full h-12 text-base font-semibold shadow-lg shadow-primary/10 transition-all hover:scale-[1.01] active:scale-[0.99] bg-gradient-to-r from-primary to-blue-600 hover:from-primary/90 hover:to-blue-600/90" 
                    disabled={isLoading || !depositAmount || parseFloat(depositAmount) <= 0}
                    onClick={handleDepositClick}
                >
                    {isLoading ? (
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                        <ArrowDown className="mr-2 h-5 w-5" />
                    )}
                    Deposit
                </Button>
            </CardContent>
          </Card>
      </div>

      <PinDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        title="Confirm Deposit"
        description="Enter your PIN or Password to confirm the transaction."
        onSubmit={handleConfirmDeposit} 
      >
        <div className="p-4 bg-muted/30 rounded-lg text-center space-y-1 mb-2">
            <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Staking Amount</div>
            <div className="text-2xl font-bold flex items-center justify-center gap-2">
                    <AssetIcon ticker="CACAO" className="h-6 w-6" />
                    {depositAmount} CACAO
            </div>
        </div>
      </PinDialog>
    </div>
  )
}
