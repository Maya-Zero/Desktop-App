import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

export type Asset = {
  denom: string;
  amount: string;
};

type BalanceContextType = {
  assets: Asset[];
  getAmount: (denom: string) => number;
  refreshBalances: () => Promise<void>;
};

const BalanceContext = createContext<BalanceContextType | undefined>(undefined);

export function BalanceProvider({ children }: { children: ReactNode }) {
  const [assets, setAssets] = useState<Asset[]>([]);

  useEffect(() => {
    // 1. LISTEN FOR RUST EVENTS
    const unlistenPromise = listen<Asset[]>("balance-update", (event) => {
      console.log("UI: Received balance update", event.payload);
      setAssets(event.payload);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Helper to safely parse string amounts to numbers
  // Maya uses 1e8 decimals (1 CACAO = 100,000,000)
  const getAmount = (denom: string) => {
    const asset = assets.find((a) => a.denom === denom);
    if (!asset) return 0;
    // Basic parsing, assuming 1e8 for CACAO/Native RUNE-like assets. 
    // Ideally this should use a token list or metadata for decimals.
    // For now, based on user input, we divide by 1e8.
    
    if (denom === "cacao") {
      // CACAO uses 1e10 decimals
      console.log("UI: Getting amount for CACAO", parseInt(asset.amount) / 10000000000);
      return parseInt(asset.amount) / 10000000000;
    }

    return parseInt(asset.amount) / 100000000;
  };

  const refreshBalances = async () => {
    try {
        await invoke("force_refresh");
    } catch(e) {
        console.error("Failed to force refresh balances:", e);
    }
  }

  return (
    <BalanceContext.Provider value={{ assets, getAmount, refreshBalances }}>
      {children}
    </BalanceContext.Provider>
  );
}

export function useBalances() {
  const context = useContext(BalanceContext);
  if (!context) throw new Error("useBalances must be used within BalanceProvider");
  return context;
}
