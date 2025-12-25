import { Storage } from "@/lib/storage";
import { invoke } from "@tauri-apps/api/core";
import { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type Settings = {
    defaultCurrency: "USD" | "EUR";
    tendermintUrl: string;
    mayanodeUrl: string;
    midgardUrl: string;
    tendermintWebsocket: string;
}

const defaultSettings: Settings = {
    defaultCurrency: "USD",
    tendermintUrl: "https://tendermint.mayachain.info",
    mayanodeUrl: "https://mayanode.mayachain.info",
    midgardUrl: "https://midgard.mayachain.info",
    tendermintWebsocket: "ws://ws.tendermint.mayachain.info:27147/websocket"
}

export const settingsStorage = new Storage<Settings>("settings.json", "lazy", defaultSettings)

type SettingsContextType = {
    settings: Settings;
    updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
    isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    const [settings, setSettings] = useState<Settings>(defaultSettings);
    const [isLoading, setIsLoading] = useState(true);

    const syncWithRust = async (s: Settings) => {
        try {
            await invoke("update_health_config", { 
                config: {
                    tendermint_url: s.tendermintUrl,
                    mayanode_url: s.mayanodeUrl,
                    midgard_url: s.midgardUrl
                }
            });
        } catch (e) {
            console.error("Failed to sync settings with Rust backend:", e);
        }
    };

    useEffect(() => {
        const loadSettings = async () => {
            try {
                await settingsStorage.ensureInitialized();
                const entries = await settingsStorage.loadAllData();
                
                if (entries) {
                   const loadedSettings = { ...defaultSettings };
                   for (const [key, value] of entries) {
                       // @ts-ignore
                       if (key in loadedSettings) {
                           // @ts-ignore
                           loadedSettings[key as keyof Settings] = value; 
                       }
                   }
                   setSettings(loadedSettings);
                }
            } catch (error) {
                console.error("Failed to load settings:", error);
            } finally {
                setIsLoading(false);
            }
        };

        loadSettings();
    }, []);

    const updateSettings = async (newSettings: Partial<Settings>) => {
        const updated = { ...settings, ...newSettings };
        setSettings(updated);
        
        for (const [key, value] of Object.entries(newSettings)) {
            // @ts-ignore
            await settingsStorage.set(key as keyof Settings, value);
        }
        
        await settingsStorage.save();
        await syncWithRust(updated);
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, isLoading }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error("useSettings must be used within a SettingsProvider");
    }
    return context;
}
