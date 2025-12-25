import { createContext, useContext, useEffect, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { useWallet } from './wallet-provider'

// Defined matching the Rust struct
export interface CacaoPosition {
    total_staked: string
    apy: string
    pending_rewards: string
}

interface CacaoProviderState {
    position: CacaoPosition | null
    isLoading: boolean
    error: string | null
    refreshPosition: () => Promise<void>
    deposit: (amount: string, memo: string, pin: string) => Promise<string>
}

const CacaoProviderContext = createContext<CacaoProviderState>({
    position: null,
    isLoading: false,
    error: null,
    refreshPosition: async () => {},
    deposit: async () => "",
})

export function CacaoProvider({ children }: { children: React.ReactNode }) {
    const { activeWallet } = useWallet()
    const [position, setPosition] = useState<CacaoPosition | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchPosition = async (address: string) => {
        setIsLoading(true)
        setError(null)
        try {
            const data = await invoke<CacaoPosition>('get_cacao_position', { address })
            console.log('Core: Fetched cacao position:', data)
            setPosition(data)
        } catch (err) {
            console.error('Failed to fetch cacao position:', err)
            setError('Failed to load staking data')
        } finally {
            setIsLoading(false)
        }
    }

    const refreshPosition = async () => {
        if (activeWallet) {
            await fetchPosition(activeWallet)
        }
    }

    const deposit = async (amount: string, memo: string, pin: string) => {
        if (!activeWallet) throw new Error("No active wallet");
        try {
            const res = await invoke<{ tx_hash: string }>('send_deposit', { 
                address: activeWallet, 
                pin, 
                amount, 
                memo 
            });
            return res.tx_hash;
        } catch (e) {
            console.error("Deposit failed:", e);
            throw e;
        }
    }

    useEffect(() => {
        if (activeWallet) {
            fetchPosition(activeWallet)
        } else {
            setPosition(null)
        }
    }, [activeWallet])

    const value = {
        position,
        isLoading,
        error,
        refreshPosition,
        deposit,
    }

    return (
        <CacaoProviderContext.Provider value={value}>
            {children}
        </CacaoProviderContext.Provider>
    )
}

export const useCacao = () => {
    const context = useContext(CacaoProviderContext)
    if (context === undefined)
        throw new Error('useCacao must be used within a CacaoProvider')
    return context
}
