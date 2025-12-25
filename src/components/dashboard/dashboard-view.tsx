import { Zap, Wallet, Layers, ArrowUpRight, TrendingUp, Loader2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useWallet } from "@/components/providers/wallet-provider"
import { useBalances } from "@/components/providers/balance-provider"
import { usePrices } from "@/components/providers/price-provider"
import { useCacao } from "../providers/cacao-provider"
import { Link } from "@tanstack/react-router"
import { AssetIcon } from "@/components/ui/asset-icon"

// Mock Pricing & Metadata Map - Prices removed as they come from API
// We keep names and tickers for display.
const ASSET_META: Record<string, { name: string, ticker: string }> = {
    "cacao": { name: "CACAO", ticker: "CACAO" },
    "maya": { name: "Maya", ticker: "MAYA" },
    "btc~btc": { name: "Bitcoin (Trade)", ticker: "BTC" },
    "eth~eth": { name: "Ethereum (Trade)", ticker: "ETH" },
    "usdt": { name: "Tether", ticker: "USDT" },
    "ARB~ETH": { name: "Arbitrum (Trade)", ticker: "ETH" },
    "ETH~USDT": { name: "Tether (ETH Trade)", ticker: "USDT" },
    "BSC~USDT": { name: "Tether (BSC Trade)", ticker: "USDT" },
}

export function DashboardView() {
    const { activeWallet } = useWallet()
    const { getAmount, assets } = useBalances()
    const { getUsdValue } = usePrices()
    const { position, isLoading, error } = useCacao()

    // 1. Ensure CACAO is always present
    const hasCacao = assets.find(a => a.denom === "cacao");
    const displayAssets = [...assets];
    
    if (!hasCacao) {
        displayAssets.unshift({ denom: "cacao", amount: "0" });
    }

    // 2. Sort: CACAO first
    displayAssets.sort((a, b) => {
        if (a.denom === "cacao") return -1;
        if (b.denom === "cacao") return 1;
        return 0; 
    });

    

    const cacaoBalance = getAmount("cacao")
    
    // Calculate Net Worth
    const netWorth = displayAssets.reduce((sum, asset) => {
        const amount = asset.denom === "cacao" ? cacaoBalance : parseInt(asset.amount) / 100000000;
        return sum + getUsdValue(amount, asset.denom);
    }, 0) + getUsdValue(parseFloat(position?.total_staked!), 'cacao');
    
  return (
    <div className="flex flex-col space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Header & KPI Section */}
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between px-1">
            <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
            <div className="text-sm text-muted-foreground font-mono">
                Block: <span className="text-primary">12,492,021</span>
                <p className="text-xs text-muted-foreground">{activeWallet}</p>
            </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KpiItem 
                label="Net Worth" 
                value={`$${netWorth.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 

                icon={<Wallet className="h-4 w-4 text-muted-foreground" />} 
            />
            <KpiItem 
                label="LP Value" 
                value="$82,100.00" 
                icon={<Layers className="h-4 w-4 text-muted-foreground" />} 
            />
            <KpiItem 
                label="Available CACAO" 
                value={`${cacaoBalance.toLocaleString()} CACAO`} 
                sub={`$${getUsdValue(cacaoBalance, 'cacao').toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                icon={<Zap className="h-4 w-4 text-muted-foreground" />} 
            />
            <KpiItem 
                label="Unclaimed Rewards" 
                value={position?.pending_rewards.toLocaleString()!} 
                sub={`$${getUsdValue(parseInt(position?.pending_rewards!), 'cacao').toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                highlight 
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" />} 
            />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Tables (Assets & LP) */}
        <div className="lg:col-span-2 space-y-8">
            
            {/* Assets Table */}
            <div className="space-y-4">
                <div className="flex items-center justify-between px-1">
                    <h2 className="text-lg font-semibold tracking-tight">Assets</h2>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground hover:text-primary">View All</Button>
                </div>
                <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent border-b-muted">
                                <TableHead className="w-[300px]">Asset</TableHead>
                                <TableHead>Price</TableHead>
                                <TableHead>Balance</TableHead>
                                <TableHead className="text-right">Value</TableHead>
                                <TableHead className="w-[100px] text-right">Alloc</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayAssets.map((asset) => {
                                const meta = ASSET_META[asset.denom] || { 
                                    name: "Unknown", 
                                    ticker: asset.denom.toUpperCase()
                                };
                                
                                const amount = getAmount(asset.denom);
                                const value = getUsdValue(amount, asset.denom);
                                
                                // Price per unit
                                const unitPrice = getUsdValue(1, asset.denom);

                                const allocation = netWorth > 0 ? (value / netWorth) * 100 : 0;

                                return (
                                    <AssetTableRow 
                                        key={asset.denom}
                                        name={meta.name} 
                                        ticker={meta.ticker} 
                                        price={`$${unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}`} 
                                        balance={amount.toLocaleString(undefined, { maximumFractionDigits: 6 })} 
                                        value={`$${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} 
                                        allocation={allocation.toFixed(1)} 
                                    />
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            </div>

            {/* LP Positions Table */}
            <div className="space-y-4">
                <h2 className="text-lg font-semibold tracking-tight px-1">Liquidity Positions</h2>
                <div className="rounded-xl border bg-card/50 backdrop-blur-sm overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent border-b-muted">
                                <TableHead className="w-[300px]">Pool</TableHead>
                                <TableHead>Liquidity</TableHead>
                                <TableHead>Earnings (24h)</TableHead>
                                <TableHead className="text-right">APY</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <LPRow pool="BTC / CACAO" liquidity="$42,000.00" earnings="$12.40" apy="8.5%" />
                            <LPRow pool="ETH / CACAO" liquidity="$28,500.00" earnings="$9.15" apy="11.2%" />
                            <LPRow pool="USDT / CACAO" liquidity="$11,600.00" earnings="$3.20" apy="9.4%" />
                        </TableBody>
                    </Table>
                </div>
            </div>

        </div>

        {/* Right Column: CACAO Focus Widget */}
        <div className="space-y-6">
            <Card className="border-primary/20 bg-gradient-to-b from-primary/10 to-transparent shadow-none rounded-xl">
                <CardHeader>
                    <CardTitle className="text-xs font-bold uppercase tracking-widest text-primary flex items-center gap-2">
                        <Zap className="h-3 w-3" /> Protocol Staking
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                    {isLoading ? (
                        <div className="space-y-6">
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Staked CACAO</div>
                                <Skeleton className="h-9 w-32 mt-2" />
                                <Skeleton className="h-4 w-24 mt-1" />
                            </div>
                            <div className="grid grid-cols-2 gap-4 py-2">
                                <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
                                    <div className="text-xs text-muted-foreground">Unclaimed</div>
                                    <Skeleton className="h-6 w-16" />
                                </div>
                                <div className="p-3 rounded-lg bg-background/50 border border-border/50 space-y-2">
                                    <div className="text-xs text-muted-foreground">APY</div>
                                    <Skeleton className="h-6 w-16" />
                                </div>
                            </div>
                        </div>
                    ) : error ? (
                         <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                            <p className="text-sm text-destructive font-medium">Failed to load data</p>
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => window.location.reload()} // Simple reload for now, or we can expose refresh from provider
                                className="h-8 text-xs"
                            >
                                <Loader2 className="mr-2 h-3 w-3" /> Retry
                            </Button>
                        </div>
                    ) : (
                        <>
                            <div>
                                <div className="text-sm font-medium text-muted-foreground">Staked CACAO</div>
                                <div className="text-3xl font-mono font-bold tracking-tighter mt-2 text-foreground">{position?.total_staked.toLocaleString()}</div>
                                <div className="text-xs text-muted-foreground mt-1">≈ ${getUsdValue(parseInt(position?.total_staked!), 'cacao').toLocaleString(undefined, { minimumFractionDigits: 2 })} USD</div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 py-2">
                                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                                    <div className="text-xs text-muted-foreground mb-1">Unclaimed</div>
                                    <div className="text-lg font-mono font-medium text-emerald-400">{position?.pending_rewards.toLocaleString()}</div>
                                </div>
                                <div className="p-3 rounded-lg bg-background/50 border border-border/50">
                                    <div className="text-xs text-muted-foreground mb-1">APY</div>
                                    <div className="text-lg font-mono font-medium text-primary">{position?.apy}</div>
                                </div>
                            </div>
                        </>
                    )}

                    <Button className="w-full font-semibold shadow-lg shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 h-10" asChild>
                        <Link to="/cacaopool">Manage Position</Link>
                    </Button>
                </CardContent>
            </Card>

            <Card className="shadow-none border bg-card/30 rounded-xl">
                 <CardHeader className="pb-3 pt-5">
                    <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Node Bonding</CardTitle>
                 </CardHeader>
                 <CardContent>
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-background/40">
                        <div className="relative">
                            <div className="h-2 w-2 rounded-full bg-emerald-500" />
                            <div className="absolute inset-0 h-2 w-2 rounded-full bg-emerald-500 animate-ping opacity-75" />
                        </div>
                        <div className="space-y-0.5">
                             <div className="font-mono text-sm font-medium">thor1...9a2</div>
                             <div className="text-[10px] text-muted-foreground uppercase">Active Validator</div>
                        </div>
                        <div className="ml-auto text-xs font-mono font-bold">16k BOND</div>
                    </div>
                 </CardContent>
            </Card>
        </div>

      </div>
    </div>
  )
}

function KpiItem({ label, value, change, sub, highlight, icon }: { label: string, value: string, change?: string, sub?: string, highlight?: boolean, icon?: React.ReactNode }) {
    return (
        <div className="flex flex-col p-4 rounded-xl border bg-card/40 hover:bg-card/60 transition-colors space-y-2">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</span>
                {icon}
            </div>
            <div>
                <div className={`text-2xl font-mono font-bold tracking-tight ${highlight ? "text-primary drop-shadow-[0_0_8px_rgba(0,242,250,0.3)]" : "text-foreground"}`}>
                    {value}
                </div>
                {(change || sub) && (
                    <div className="flex items-center gap-2 mt-1">
                        {change && (
                            <div className="flex items-center text-xs font-medium text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                                <ArrowUpRight className="h-3 w-3 mr-0.5" />
                                {change}
                            </div>
                        )}
                        {sub && <span className="text-xs text-muted-foreground font-mono">{sub}</span>}
                    </div>
                )}
            </div>
        </div>
    )
}

function AssetTableRow({ name, ticker, price, balance, value, allocation }: any) {
    return (
        <TableRow className="group">
            <TableCell>
                <div className="flex items-center gap-3">
                    <AssetIcon ticker={ticker} className="h-8 w-8 bg-secondary/50 border group-hover:border-primary/50 transition-colors" />
                    <div>
                        <div className="font-medium text-sm text-foreground">{name}</div>
                        <div className="text-xs text-muted-foreground">{ticker}</div>
                    </div>
                </div>
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">{price}</TableCell>
            <TableCell className="font-mono text-sm">{balance}</TableCell>
            <TableCell className="text-right font-mono font-medium text-sm">{value}</TableCell>
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-2">
                    <span className="text-xs font-mono text-muted-foreground w-8">{allocation}%</span>
                    <div className="h-1.5 w-12 rounded-full bg-secondary overflow-hidden">
                        <div className="h-full bg-primary/80 rounded-full" style={{ width: `${allocation}%` }} />
                    </div>
                </div>
            </TableCell>
        </TableRow>
    )
}

function LPRow({ pool, liquidity, earnings, apy }: any) {
    return (
        <TableRow className="group">
            <TableCell className="font-medium">
                <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                        <div className="h-6 w-6 rounded-full bg-muted border-2 border-background z-10" />
                        <div className="h-6 w-6 rounded-full bg-primary/20 border-2 border-background" />
                    </div>
                    <span className="text-sm group-hover:text-primary transition-colors">{pool}</span>
                </div>
            </TableCell>
            <TableCell className="font-mono text-sm text-muted-foreground">{liquidity}</TableCell>
            <TableCell className="font-mono text-sm text-emerald-400">{earnings}</TableCell>
            <TableCell className="text-right font-mono text-sm font-bold text-foreground">{apy}</TableCell>
        </TableRow>
    )
}
