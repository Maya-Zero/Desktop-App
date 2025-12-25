import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { invoke } from "@tauri-apps/api/core"
import { Loader2, Lock, KeyRound, Hash } from "lucide-react"
import { useState, useRef, useEffect } from "react"
import { Wallet } from "@/components/providers/wallet-provider"
import { cn } from "@/lib/utils"

interface PinDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    wallet?: Wallet | null
    onSuccess?: (walletId: string) => void
    title?: string
    description?: React.ReactNode
    children?: React.ReactNode
    onSubmit?: (authValue: string) => Promise<void> | void
}

export function PinDialog({ open, onOpenChange, wallet, onSuccess, title = "Welcome Back", description, children, onSubmit }: PinDialogProps) {
    const [authValue, setAuthValue] = useState("")
    const [authMode, setAuthMode] = useState<'pin' | 'password'>('pin')
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)

    // Focus input when dialog opens or mode changes
    useEffect(() => {
        if (open) {
            setAuthValue("")
            setError(null)
            // Small timeout to ensure dialog is fully mounted
            setTimeout(() => inputRef.current?.focus(), 100)
        }
    }, [open, authMode])

    const handleVerifyParams = async () => {
        // Basic validation depending on mode
        if (authMode === 'pin' && authValue.length < 4) return
        if (authMode === 'password' && authValue.length === 0) return

        setIsLoading(true)
        setError(null)

        try {
            if (onSubmit) {
                // If generic submit handler is provided, use it
                await onSubmit(authValue)
                onOpenChange(false) // Close on success if no error thrown
                setAuthValue("")
            } else if (wallet && onSuccess) {
                // Default wallet unlock behavior
                const isValid = await invoke<boolean>("unlock_wallet", {
                    username: wallet.address,
                    pin: authValue
                })

                if (isValid) {
                    onSuccess(wallet.address)
                    onOpenChange(false)
                    setAuthValue("")
                } else {
                    throw new Error(authMode === 'pin' ? "Incorrect PIN" : "Incorrect Password")
                }
            }
        } catch (e: any) {
            console.error("Failed to verify:", e)
            // If it's a string error, show it. If it's an object, try to show message or default
            const msg = typeof e === 'string' ? e : (e.message || "Authentication failed")
            setError(msg)
            setAuthValue("")
            // Refocus so they can try again immediately
            inputRef.current?.focus()
        } finally {
            setIsLoading(false)
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
             if (authMode === 'pin' && authValue.length >= 4) handleVerifyParams()
             if (authMode === 'password' && authValue.length > 0) handleVerifyParams()
        }
    }
    
    const toggleMode = () => {
        setAuthMode(prev => prev === 'pin' ? 'password' : 'pin')
        setAuthValue("")
        setError(null)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-none bg-background shadow-2xl">
                 <div className="p-8 flex flex-col items-center space-y-6 text-center bg-gradient-to-b from-muted/20 to-transparent">
                    <div className="h-16 w-16 bg-primary/10 rounded-full flex items-center justify-center mb-2 animate-in zoom-in duration-300">
                        {authMode === 'pin' ? <Lock className="h-8 w-8 text-primary" /> : <KeyRound className="h-8 w-8 text-primary" />}
                    </div>
                    
                    <div className="space-y-2 w-full">
                        <DialogTitle className="text-2xl font-bold">{title}</DialogTitle>
                        {description ? (
                            <div className="text-center text-muted-foreground text-sm">
                                {description}
                            </div>
                        ) : wallet ? (
                            <DialogDescription className="text-center text-muted-foreground">
                                Enter your {authMode === 'pin' ? '6-digit PIN' : 'Password'} to unlock <br/>
                                <span className="font-semibold text-foreground mt-1 block">{wallet.name}</span>
                            </DialogDescription>
                        ) : null}
                    </div>

                    {/* Custom Children Content (e.g. Transaction Details) */}
                    {children && (
                        <div className="w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {children}
                        </div>
                    )}

                    <div className="relative w-full max-w-[300px]">
                        
                        {authMode === 'pin' ? (
                            <>
                                {/* Hidden Input for PIN Focus/Typing */}
                                <Input
                                    ref={inputRef}
                                    type="password"
                                    value={authValue}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/[^0-9]/g, '').slice(0, 6)
                                        setAuthValue(val)
                                        if (error) setError(null)
                                    }}
                                    onKeyDown={handleKeyDown}
                                    className="absolute inset-0 opacity-0 cursor-pointer h-full z-10"
                                    autoComplete="off"
                                    inputMode="numeric"
                                />
                                {/* Visual PIN Slots */}
                                <div className="flex justify-between gap-3" onClick={() => inputRef.current?.focus()}>
                                    {[...Array(6)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={cn(
                                                "w-10 h-12 border-b-2 flex items-center justify-center text-xl font-bold transition-all duration-200",
                                                authValue.length === i ? "border-primary text-foreground scale-110" : "border-border/50 text-muted-foreground",
                                                authValue.length > i && "border-primary/50 text-primary",
                                                error && "border-destructive text-destructive"
                                            )}
                                        >
                                            {authValue[i] ? "•" : ""}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            /* Standard Password Input */
                            <div className="space-y-2">
                                <Input
                                    ref={inputRef}
                                    type="password"
                                    value={authValue}
                                    onChange={(e) => {
                                        setAuthValue(e.target.value)
                                        if (error) setError(null)
                                    }}
                                    onKeyDown={handleKeyDown}
                                    className="h-12 text-center text-lg tracking-widest"
                                    placeholder="Enter password"
                                    autoComplete="off"
                                />
                            </div>
                        )}
                        
                        {/* Error Message with Layout Stability */}
                        <div className="h-6 mt-4 flex items-center justify-center">
                            {error ? (
                                <span className="text-sm text-destructive font-semibold animate-in fade-in slide-in-from-top-1">
                                    {error}
                                </span>
                            ) : (
                                <span className="text-xs text-muted-foreground/50">
                                    Press Enter to unlock
                                </span>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="w-full pt-2">
                         <div className="flex flex-col gap-4 w-full">
                             <div className="grid grid-cols-2 gap-4 w-full">
                                <Button variant="ghost" onClick={() => onOpenChange(false)} className="h-11">Cancel</Button>
                                 <Button 
                                    onClick={handleVerifyParams} 
                                    disabled={isLoading || (authMode === 'pin' && authValue.length < 4) || (authMode === 'password' && authValue.length === 0)} 
                                    className="h-11 shadow-lg shadow-primary/20"
                                >
                                    {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Confirm
                                </Button>
                            </div>
                            
                            <Button variant="link" onClick={toggleMode} className="text-xs text-muted-foreground hover:text-foreground">
                                {authMode === 'pin' ? (
                                    <>
                                        <KeyRound className="h-3 w-3 mr-1.5" /> Use Password instead
                                    </>
                                ) : (
                                    <>
                                        <Hash className="h-3 w-3 mr-1.5" /> Use PIN instead
                                    </>
                                )}
                            </Button>
                        </div>
                    </DialogFooter>
                 </div>
            </DialogContent>
        </Dialog>
    )
}
