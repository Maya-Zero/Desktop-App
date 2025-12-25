import { Eye, EyeOff, Copy } from "lucide-react"
import { Button } from "./button"
import { Card, CardContent } from "./card"

export const Mnemonic = ({mnemonic, showMnemonic, setShowMnemonic, setStep}: {mnemonic: string, showMnemonic: boolean, setShowMnemonic: (show: boolean) => void, setStep?: (step: 'welcome' | 'mnemonic' | 'secure') => void}) => {
    
    const copyToClipboard = () => {
        navigator.clipboard.writeText(mnemonic)
        // toast.success("Copied to clipboard") 
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
             <div className="text-center space-y-2 mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Secret Phrase</h1>
                <p className="text-muted-foreground max-w-[80%] mx-auto">
                    Write down these 12 words. This is the <span className="text-red-400 font-medium">only way</span> to recover your wallet.
                </p>
             </div>

            <CardContent className="space-y-6 p-0">
                    <div className="relative group">
                    <div className={`grid grid-cols-3 gap-3 p-6 bg-muted/20 border border-border/50 rounded-2xl transition-all duration-500 ${!showMnemonic ? 'blur-xl select-none opacity-50 scale-95' : 'scale-100 opacity-100'}`}>
                        {mnemonic.split(' ').map((word, i) => (
                            <div key={i} className="flex items-center space-x-3 bg-background/50 p-2.5 rounded-lg border border-border/40">
                                <span className="text-xs font-medium text-muted-foreground w-4 tabular-nums text-right">{i + 1}</span>
                                <span className="font-mono font-semibold tracking-wide">{word}</span>
                            </div>
                        ))}
                    </div>
                    
                    {!showMnemonic && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
                            <Button 
                                variant="outline" 
                                className="h-12 px-6 rounded-full shadow-lg border-primary/20 bg-background/80 backdrop-blur-md hover:bg-background hover:scale-105 transition-all"
                                onClick={() => setShowMnemonic(true)}
                            >
                                <Eye className="mr-2 h-4 w-4 text-primary" /> 
                                Reveal Secret Phrase
                            </Button>
                        </div>
                    )}
                    </div>

                    <div className="flex justify-center gap-4">
                        {showMnemonic && (
                            <>
                                <Button variant="ghost" size="sm" onClick={() => setShowMnemonic(false)}>
                                    <EyeOff className="mr-2 h-4 w-4" /> Hide
                                </Button>
                                <Button variant="ghost" size="sm" onClick={copyToClipboard}>
                                    <Copy className="mr-2 h-4 w-4" /> Copy
                                </Button>
                            </>
                        )}
                    </div>
            </CardContent>
            
            {setStep && (
                <div className="flex justify-between mt-8 pt-4 border-t border-border/20">
                    <Button variant="ghost" onClick={() => setStep('welcome')} className="text-muted-foreground hover:text-foreground">
                        Back
                    </Button>
                    <Button 
                        onClick={() => setStep('secure')} 
                        disabled={!showMnemonic}
                        className="bg-primary hover:bg-primary/90 min-w-[140px]"
                    >
                        I've Saved It
                    </Button>
                </div>
            )}
        </Card>
    )
}