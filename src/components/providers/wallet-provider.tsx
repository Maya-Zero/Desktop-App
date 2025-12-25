import { createContext, useContext, useEffect, useState } from "react"
import { Storage } from "@/lib/storage"
import { invoke } from "@tauri-apps/api/core"

import { speedSettingsStorage } from "./theme-provider"

export type Wallet = {
    address: string
    name: string
    id: string
    active: boolean
}



export const walletStorage = new Storage<{
    [key: string]: Wallet
}>("wallets.json")

export type WalletProviderProps = {
    children: React.ReactNode
}

export type WalletProviderState = {
    activeWallet: string | null;
    isLoading: boolean;
    setActiveWallet: (wallet: string | null) => void;
    generateWallet: () => Promise<[string, string]>;
    saveWallet: (name: string, pin: string, phrase: string, address: string) => Promise<void>;
    renameWallet: (walletId: string, newName: string) => Promise<void>;
    deleteWallet: (walletId: string, pin: string) => Promise<void>;
    exportSecretPhrase: (walletId: string, pin: string) => Promise<string>;
    isLocked: boolean;
    setIsLocked: (value: boolean) => void;
    wallets: Wallet[];
}

export const WalletProviderContext = createContext<WalletProviderState>({
    activeWallet: null,
    isLoading: true,
    setActiveWallet: () => null,
    generateWallet: async () => ["", ""],
    saveWallet: async () => {},
    renameWallet: async () => {},
    deleteWallet: async () => {},
    exportSecretPhrase: async () => "",

    isLocked: true,
    setIsLocked: () => {},
    wallets: [],
})

export  function WalletProvider({
    children,
}: WalletProviderProps) {
    const [activeWallet, setActiveWallet] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const [isLocked, setIsLocked] = useState(true)
    const [wallets, setWallets] = useState<Wallet[]>([])

    const handleActiveWalletChange = async (wallet: string | null) => {
        if(!wallet) {
            setActiveWallet(null)
            speedSettingsStorage.delete("activeWallet")
            return
        }
        const currentWallet = activeWallet
        if (currentWallet) {
            setActiveWallet(wallet)
            speedSettingsStorage.set("activeWallet", wallet)
            const currentWalletData = await walletStorage.get(currentWallet)
            const newWalletData = await walletStorage.get(wallet)
            if (currentWalletData && newWalletData) {
               walletStorage.bundleOperations([
                {
                    type: "set",
                    key: currentWallet,
                    value: {
                        ...currentWalletData,
                        active: false
                    }
                },
                {
                    type: "set",
                    key: wallet,
                    value: {
                        ...newWalletData,
                        active: true
                    }
                }
            ]) 
            }
            
        } else {
            setActiveWallet(wallet)
            speedSettingsStorage.set("activeWallet", wallet)
            const newWalletData = await walletStorage.get(wallet)
            if (newWalletData) {
                walletStorage.set(wallet, {
                    ...newWalletData,
                    active: true
                })
            }
        }
    }

    const refreshWallets = async () => {
        const allWallets = await walletStorage.loadAllData()
        if (allWallets) {
             // Convert [key, value] array to value array
            setWallets(allWallets.map(([_, w]) => w))
        } else {
            setWallets([])
        }
    }

    useEffect(() => {
        (async () => {
            try {
                const storedWallet = await speedSettingsStorage.get("activeWallet")
                if (storedWallet) {
                    const walletData = await walletStorage.get(storedWallet)
                    if (walletData) {
                        setActiveWallet(storedWallet)
                        // Ensure consistency

                        await walletStorage.set(storedWallet, {
                            ...walletData,
                            active: true
                        })
                    }
                }
            } catch (e) {
                console.error("Failed to load wallet:", e)
            } finally {
                await refreshWallets() // Load wallets initially
                setIsLoading(false)
            }
        })()
    }, [])

    useEffect(() => {
        (async () => {
             if (activeWallet) {
                 await invoke("start_session", { address: activeWallet });
                 // If we have an active wallet on mount (load), we keep isLocked = true
                 // If we just switched to a new wallet via UI (not implemented here but just in case), 
                 // we might want logic, but for now default true is safe for cold start.
             } else {
                 await invoke("end_session");
             }
        })();
    }, [activeWallet]);

    const generateWallet = async () => {
        return await invoke<[string, string]>("generate_wallet")
    }

    const saveWallet = async (name: string, pin: string, phrase: string, address: string) => {
        try {
            await invoke("save_wallet_with_pin", { username: address, pin, phrase })
            const currentActiveWallet = await speedSettingsStorage.get("activeWallet")
            if (currentActiveWallet) {
                const wallet = await walletStorage.get(currentActiveWallet)
                if (wallet) {
                    await walletStorage.set(currentActiveWallet, {
                        ...wallet,
                        active: false
                    })
                }
            }
            
            await walletStorage.set(address, {
                address,
                name: name,
                id: address,
                active: true
            })
            setActiveWallet(address)
            setIsLocked(false)
            await speedSettingsStorage.set("activeWallet", address)
            await refreshWallets() // Refresh list
        } catch (e) {
            console.error("Failed to save wallet:", e)
            throw e
        }
    }

    const renameWallet = async (walletId: string, newName: string) => {
        const wallet = await walletStorage.get(walletId)
        if (wallet) {
            await walletStorage.set(walletId, { ...wallet, name: newName })
            await walletStorage.set(walletId, { ...wallet, name: newName })
            // Force re-render if needed or just rely on consumers re-fetching
            await refreshWallets()
        }
    }

    const deleteWallet = async (walletId: string, pin: string) => {
        // 1. Invoke backend to delete from keychain
        await invoke("delete_wallet", { username: walletId, pin })
        
        // 2. Remove from storage
        await walletStorage.delete(walletId)

        // 3. If active, clear active wallet
        if (activeWallet === walletId) {
            setActiveWallet(null)
            await speedSettingsStorage.delete("activeWallet")
        }
        await refreshWallets()
    }

    const exportSecretPhrase = async (walletId: string, pin: string): Promise<string> => {
        return await invoke<string>("export_secret_phrase", { username: walletId, pin })
    }

    const value = {
        activeWallet,
        isLoading,
        isLocked,
        setIsLocked,
        setActiveWallet: handleActiveWalletChange,
       
        generateWallet,
        saveWallet,
        renameWallet,
        deleteWallet,
        exportSecretPhrase,
        wallets
    }

    return (
        <WalletProviderContext.Provider value={value}>
            {children}
        </WalletProviderContext.Provider>
    )
}

export const useWallet = () => {
    const context = useContext(WalletProviderContext)

    if (context === undefined)
        throw new Error("useWallet must be used within a WalletProvider")

    return context
}


    