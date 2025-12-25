import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";

// Matches Rust "PriceMap"
type PriceMap = Record<string, number>;

type PriceContextType = {
  prices: PriceMap;
  cacaoPrice: number;
  getUsdValue: (amount: number, assetDenom: string) => number;
};

const PriceContext = createContext<PriceContextType | undefined>(undefined);

export function PriceProvider({ children }: { children: ReactNode }) {
  const [prices, setPrices] = useState<PriceMap>({});

  useEffect(() => {
    // Listen for the "push" from Rust
    const unlistenPromise = listen<PriceMap>("price-update", (event) => {
      console.log("Core: Received price update", event.payload);
      setPrices(event.payload);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  const getUsdValue = (amount: number, assetDenom: string): number => {
    // 1. Normalize Denom
    // Rust sends "BTC.BTC", "ETH.USDT", "CACAO"
    // Your balances might be "cacao" (lowercase) or "btc/btc" (synth)
    
    let key = assetDenom.toUpperCase();

    // Handle "CACAO" explicitly if needed, although Rust sends "CACAO".
    
    // Handle Trade Assets: "BTC~BTC" -> Look up "BTC.BTC" price
    // We treat Trade Assets as having the same price as the L1 asset.
    if (key.includes("~")) {
        key = key.replace("~", ".");
    }
    
    // Note: Synths ("/") are explicitly NOT supported.
    
    // Some responses might just be "BTC" if native?
    // Usually Midgard sends "BTC.BTC".

    const lookupKey = key;
    
    // 2. Try Exact Match
    if (prices[lookupKey]) {
        return amount * prices[lookupKey];
    }

    // 3. Try Fuzzy Match (Prefix) implementation
    // e.g. "ETH.USDT" should match "ETH.USDT-0XDAC..."
    // We iterate over the keys if exact match fails. This is O(N) but N is small (~50 pools).
    const foundKey = Object.keys(prices).find(k => k.startsWith(lookupKey + "-"));
    if (foundKey) {
        return amount * prices[foundKey];
    }

    const price = 0;
    return amount * price;
  };

  return (
    <PriceContext.Provider value={{ 
        prices, 
        cacaoPrice: prices["CACAO"] || 0, 
        getUsdValue 
    }}>
      {children}
    </PriceContext.Provider>
  );
}

export function usePrices() {
  const context = useContext(PriceContext);
  if (!context) throw new Error("usePrices must be used within PriceProvider");
  return context;
}
