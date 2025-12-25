
import { createLazyFileRoute, useNavigate } from '@tanstack/react-router'
import { OnboardingLayout } from '@/components/layout/onboarding-layout'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useWallet } from '@/components/providers/wallet-provider'
import { useState, useRef, useEffect } from 'react'
import { Loader2, Wallet, ArrowRight, ShieldCheck, Check } from 'lucide-react'
import { Mnemonic } from '@/components/ui/mnemonic'
import { cn } from '@/lib/utils'

export const Route = createLazyFileRoute('/onboarding')({
    component: OnboardingPage,
})

function OnboardingPage() {
    const { generateWallet, saveWallet } = useWallet()
    const navigate = useNavigate()
    
    // Steps: 'welcome' -> 'mnemonic' -> 'secure'
    const [step, setStep] = useState<'welcome' | 'mnemonic' | 'secure'>('welcome')
    
    // Secure Sub-steps: 'name' -> 'create-pin' -> 'confirm-pin'
    const [secureStep, setSecureStep] = useState<'name' | 'create-pin' | 'confirm-pin'>('name')
    
    const [mnemonic, setMnemonic] = useState<string>("")
    const [address, setAddress] = useState<string>("")
    const [walletName, setWalletName] = useState<string>("Main Wallet")
    const [pin, setPin] = useState<string>("")
    const [confirmPin, setConfirmPin] = useState<string>("")
    const [isGenerating, setIsGenerating] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [showMnemonic, setShowMnemonic] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Refs for PIN inputs
    const createPinRef = useRef<HTMLInputElement>(null)
    const confirmPinRef = useRef<HTMLInputElement>(null)

    const handleGenerate = async () => {
        setIsGenerating(true)
        try {
            // Simulate a slight delay for better UX ("Generating...")
            await new Promise(resolve => setTimeout(resolve, 800))
            const [phrase, addr] = await generateWallet()
            setMnemonic(phrase)
            setAddress(addr)
            setStep('mnemonic')
        } catch (e) {
            console.error(e)
            setError("Failed to generate wallet")
        } finally {
            setIsGenerating(false)
        }
    }

    const handlePinInput = (val: string, type: 'create' | 'confirm') => {
        const cleanVal = val.replace(/[^0-9]/g, '').slice(0, 6)
        
        if (type === 'create') {
            setPin(cleanVal)
            if (cleanVal.length === 6) {
                setTimeout(() => setSecureStep('confirm-pin'), 300)
            }
        } else {
            setConfirmPin(cleanVal)
            if (cleanVal.length === 6) {
                if (cleanVal === pin) {
                    // Auto-save if matching? Or show button?
                    // Let's show a success state briefly or enable the button to avoid accidental submissions
                } else {
                    setError("PINs do not match. Try again.")
                    setTimeout(() => {
                        setConfirmPin("")
                        setError(null)
                        confirmPinRef.current?.focus()
                    }, 1500)
                }
            }
        }
    }
    
    const handleSave = async () => {
        if (pin !== confirmPin) {
            setError("PINs do not match")
            return
        }
        
        setIsSaving(true)
        setError(null)
        try {
            await saveWallet(walletName, pin, mnemonic, address)
            // Navigate after small delay
            setTimeout(() => navigate({ to: '/' }), 500)
        } catch (e) {
            console.error(e)
            setError("Failed to save. Try again.")
        } finally {
            setIsSaving(false)
        }
    }

    // Auto-focus logic for secure steps
    useEffect(() => {
        if (step === 'secure') {
            if (secureStep === 'create-pin') {
                setTimeout(() => createPinRef.current?.focus(), 100)
            } else if (secureStep === 'confirm-pin') {
                setTimeout(() => confirmPinRef.current?.focus(), 100)
            }
        }
    }, [step, secureStep])


    if (step === 'welcome') {
        return (
            <OnboardingLayout>
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-8 animate-in fade-in zoom-in duration-500">
                     <div className="relative">
                        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-xl animate-pulse"></div>
                        <div className="h-24 w-24 bg-background border border-border rounded-2xl flex items-center justify-center relative shadow-2xl">
                            <Wallet className="h-10 w-10 text-primary" />
                        </div>
                     </div>
                     
                     <div className="space-y-3 max-w-md">
                        <h1 className="text-4xl font-extrabold tracking-tight">Maya Zero</h1>
                        <p className="text-muted-foreground text-lg">
                            The secure, non-custodial wallet for the Maya Protocol.
                        </p>
                     </div>

                     <div className="pt-8">
                        <Button 
                            size="lg" 
                            onClick={handleGenerate} 
                            disabled={isGenerating}
                            className="h-14 px-8 text-lg rounded-full shadow-xl shadow-primary/20 transition-all hover:scale-105"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Creating Wallet...
                                </>
                            ) : (
                                <>
                                    Create New Wallet <ArrowRight className="ml-2 h-5 w-5" />
                                </>
                            )}
                        </Button>
                        <p className="mt-4 text-xs text-muted-foreground">
                            Already have a wallet? <span className="text-primary hover:underline cursor-pointer">Import existing</span>
                        </p>
                     </div>
                </div>
            </OnboardingLayout>
        )
    }

    if (step === 'mnemonic') {
        return (
            <OnboardingLayout>
                <Mnemonic
                    mnemonic={mnemonic}
                    showMnemonic={showMnemonic}
                    setShowMnemonic={setShowMnemonic}
                    setStep={setStep}
                />
            </OnboardingLayout>
        )
    }

    if (step === 'secure') {
        return (
            <OnboardingLayout>
                <Card className="border-none shadow-none bg-transparent max-w-md mx-auto">
                    <CardHeader className="text-center pb-8">
                        <div className="mx-auto h-12 w-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                            <ShieldCheck className="h-6 w-6 text-primary" />
                        </div>
                        <CardTitle className="text-2xl">Secure Your Wallet</CardTitle>
                        <CardDescription>
                            Set up security for this device.
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="min-h-[300px] flex flex-col items-center">
                        {secureStep === 'name' && (
                             <div className="w-full space-y-6 animate-in slide-in-from-right-4 fade-in duration-300">
                                <div className="space-y-2">
                                    <Label className="text-muted-foreground ml-1">Wallet Name</Label>
                                    <Input 
                                        type="text" 
                                        value={walletName}
                                        onChange={(e) => setWalletName(e.target.value)}
                                        className="h-14 text-lg bg-muted/30 border-border/50 focus-visible:ring-primary/20"
                                        placeholder="e.g. Main Vault"
                                        autoFocus
                                    />
                                </div>
                                <Button 
                                    className="w-full h-12" 
                                    onClick={() => setSecureStep('create-pin')}
                                    disabled={!walletName.trim()}
                                >
                                    Continue <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                             </div>
                        )}

                        {(secureStep === 'create-pin' || secureStep === 'confirm-pin') && (
                            <div className="w-full space-y-8 animate-in slide-in-from-right-8 fade-in duration-300">
                                <div className="text-center space-y-1">
                                    <h3 className="text-lg font-medium">
                                        {secureStep === 'create-pin' ? "Create 6-digit PIN" : "Confirm your PIN"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {secureStep === 'create-pin' ? "This PIN will unlock your wallet on this device." : "Re-enter to verify."}
                                    </p>
                                </div>

                                <div className="relative max-w-[280px] mx-auto">
                                    <Input
                                        ref={secureStep === 'create-pin' ? createPinRef : confirmPinRef}
                                        type="password"
                                        value={secureStep === 'create-pin' ? pin : confirmPin}
                                        onChange={(e) => handlePinInput(e.target.value, secureStep === 'create-pin' ? 'create' : 'confirm')}
                                        className="absolute inset-0 opacity-0 cursor-pointer h-full z-10"
                                        autoComplete="off"
                                        inputMode="numeric"
                                    />
                                    
                                    <div className="flex justify-between gap-3">
                                        {[...Array(6)].map((_, i) => {
                                            const val = secureStep === 'create-pin' ? pin : confirmPin
                                            return (
                                                <div
                                                    key={i}
                                                    className={cn(
                                                        "w-10 h-12 border-b-2 flex items-center justify-center text-xl font-bold transition-all duration-200",
                                                        val.length === i ? "border-primary text-foreground scale-110" : "border-border/50 text-muted-foreground",
                                                        val.length > i && "border-primary/50 text-primary",
                                                        error && secureStep === 'confirm-pin' && "border-destructive text-destructive"
                                                    )}
                                                >
                                                    {val[i] && (secureStep === 'confirm-pin' && val.length === 6 ? <Check className="h-4 w-4" /> : "•")}
                                                </div>
                                            )
                                        })}
                                    </div>
                                     {error && (
                                        <div className="absolute top-full left-0 right-0 pt-4 text-center text-sm text-destructive font-medium animate-in fade-in">
                                            {error}
                                        </div>
                                    )}
                                </div>
                                
                                <div className="pt-4 grid grid-cols-2 gap-4 max-w-[280px] mx-auto">
                                     <Button 
                                        variant="ghost" 
                                        className="w-full" 
                                        onClick={() => secureStep === 'create-pin' ? setSecureStep('name') : setSecureStep('create-pin')}
                                    >
                                        Back
                                    </Button>
                                    
                                     {secureStep === 'confirm-pin' && (
                                        <Button 
                                            className="w-full shadow-lg shadow-primary/20" 
                                            onClick={handleSave}
                                            disabled={isSaving || confirmPin.length !== 6 || confirmPin !== pin}
                                        >
                                            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Finish Setup"}
                                        </Button>
                                     )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </OnboardingLayout>
        )
    }

    return null
}
