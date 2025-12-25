
import { cn } from "@/lib/utils"

// Import all assets
import arb from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/arb.png'
import auto from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/auto.png'
import aztec from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/aztec.png'
import cacao from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/cacao.svg'
import cbbtc from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/cbbtc.png'
import dash from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/dash.png'
import dogecoin from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/dogecoin.png'
import gld from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/gld.png'
import kuji from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/kuji.png'
import leo from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/leo.png'
import link from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/link.png'
import lld from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/lld.svg'
import lqdy from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/lqdy.png'
import maya from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/maya.svg'
import nami from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/nami.png'
import pepe from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/pepe.png'
import ruji from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/ruji.svg'
import tcy from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/tcy.svg'
import tgt from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/tgt.png'
import usdc from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/usdc.png'
import wbtc from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/wbtc.png'
import wsteth from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/wsteth.png'
import xrd from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/xrd.png'
import yum from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/yum.png'
import zec from '@/assets/mayachain-explorer-v2-main-assets-images-assets/assets/images/assets/zec.png'

const ASSET_LOGOS: Record<string, string> = {
    // Exact matches
    "ARB": arb,
    "AUTO": auto,
    "AZTEC": aztec,
    "CACAO": cacao,
    "CBBTC": cbbtc,
    "DASH": dash,
    "DOGE": dogecoin,
    "DOGECOIN": dogecoin,
    "GLD": gld,
    "KUJI": kuji,
    "LEO": leo,
    "LINK": link,
    "LLD": lld,
    "LQDY": lqdy,
    "MAYA": maya,
    "NAMI": nami,
    "PEPE": pepe,
    "RUJI": ruji,
    "TCY": tcy,
    "TGT": tgt,
    "USDC": usdc,
    "WBTC": wbtc,
    "WSTETH": wsteth,
    "XRD": xrd,
    "YUM": yum,
    "ZEC": zec,
    
    // Common mappings (mapped to available wrapped/alternatives if main not available)
    //"BTC": wbtc, // Fallback to WBTC icon as BTC is not in list but likely visual match
    //"ETH": wsteth, // Fallback to wstETH icon as ETH is not in list
    //"USDT": usdc, // Visual fallback? No, better to keep generic if no match. Actually let's NOT map USDT to USDC, that's confusing.
    // "USDT": usdc, // Commented out, better generic than wrong.
}

interface AssetIconProps {
    ticker: string
    className?: string
    showFallback?: boolean
}

export function AssetIcon({ ticker, className, showFallback = true }: AssetIconProps) {
    // Handle cases like "BTC.BTC" -> "BTC" or "ETH-USDT" -> "ETH" (if we want primary). 
    // For now, simple uppercase check.
    // If ticker contains '.', split and take second part? e.g. ETH.USDT -> USDT? 
    // Usually asset objects have `denom: "cacao"` or `denom: "btc/btc"`. 
    // Let's assume input is the "ticker" symbol like "CACAO", "BTC", "USDT".
    
    // Clean ticker: "ETH.USDT" -> "USDT" is risky if valid asset. 
    // "BTC/BTC" -> "BTC". 
    // Let's rely on what is passed.
    
    const normalizedTicker = ticker.toUpperCase().split('.')[0].split('/')[0].split('~')[0]; 
    // Only split if it helps match? 
    // Actually in dashboard view: `ticker` passed is e.g. "CACAO", "BTC", "USDT".
    // Wait, the dashboard view passes `meta.ticker` which comes from `ASSET_META`.
    
    const logo = ASSET_LOGOS[normalizedTicker];

    if (logo) {
        return (
            <div className={cn("relative flex items-center justify-center shrink-0 overflow-hidden rounded-full", className)}>
                <img 
                    src={logo} 
                    alt={ticker} 
                    className="aspect-square h-full w-full object-cover" 
                />
            </div>
        )
    }

    if (!showFallback) return null;

    return (
        <div className={cn("flex items-center justify-center rounded-full bg-secondary text-muted-foreground font-bold shrink-0", className)}>
            {ticker.charAt(0).toUpperCase()}
        </div>
    )
}
