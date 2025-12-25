import { useEffect, useState } from "react"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Eye, Pencil, Trash2, Loader2 } from "lucide-react"
import { useWallet, walletStorage } from "@/components/providers/wallet-provider"
import { Mnemonic } from "../ui/mnemonic"


export function WalletSettings() {
  const { activeWallet, renameWallet, exportSecretPhrase, deleteWallet } = useWallet()
  const [walletName, setWalletName] = useState("")
  const [walletAddress, setWalletAddress] = useState("")
  
  // Edit Name State
  const [isEditingName, setIsEditingName] = useState(false)
  const [newName, setNewName] = useState("")

  // Export State
  const [isExportOpen, setIsExportOpen] = useState(false)
  const [exportPin, setExportPin] = useState("")
  const [exportedPhrase, setExportedPhrase] = useState("")
  const [exportError, setExportError] = useState("")
  const [isExporting, setIsExporting] = useState(false)

  // Delete State
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [deletePin, setDeletePin] = useState("")
  const [deleteError, setDeleteError] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const loadWallet = async () => {
      if (activeWallet) {
        const w = await walletStorage.get(activeWallet)
        if (w) {
            setWalletName(w.name)
            setWalletAddress(w.address)
            setNewName(w.name)
        }
      }
    }
    loadWallet()
  }, [activeWallet])

  const handleSaveName = async () => {
    if (activeWallet && newName.trim()) {
        await renameWallet(activeWallet, newName)
        setWalletName(newName)
        setIsEditingName(false)
    }
  }

  const handleExport = async () => {
    if (!activeWallet) return
    setIsExporting(true)
    setExportError("")
    try {
        const phrase = await exportSecretPhrase(activeWallet, exportPin)
        setExportedPhrase(phrase)
    } catch (e: any) {
        setExportError(e.toString() || "Failed to export phrase")
    } finally {
        setIsExporting(false)
    }
  }

  const handleDelete = async () => {
    if (!activeWallet) return
    setIsDeleting(true)
    setDeleteError("")
    try {
        await deleteWallet(activeWallet, deletePin)
        setIsDeleteOpen(false)
        // Active wallet will be nullified by provider, UI should react to that
    } catch (e: any) {
        setDeleteError(e.toString() || "Failed to delete wallet")
    } finally {
        setIsDeleting(false)
    }
  }

  if (!activeWallet) {
      return (
          <div className="text-center py-10 text-muted-foreground">
              No active wallet selected.
          </div>
      )
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Wallet Settings</h3>
        <p className="text-sm text-muted-foreground">
          Manage your active wallet, rename it, or export your secret phrase.
        </p>
      </div>
      <Separator />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="space-y-1">
               {isEditingName ? (
                    <div className="flex items-center gap-2">
                        <Input 
                            value={newName} 
                            onChange={(e) => setNewName(e.target.value)}
                            className="h-8 w-[200px]"
                        />
                        <Button size="sm" onClick={handleSaveName}>Save</Button>
                         <Button size="sm" variant="ghost" onClick={() => setIsEditingName(false)}>Cancel</Button>
                    </div>
               ) : (
                    <div className="flex items-center gap-2 group">
                         <CardTitle className="text-xl">{walletName}</CardTitle>
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => setIsEditingName(true)}
                        >
                            <Pencil className="h-3 w-3" />
                         </Button>
                    </div>
               )}
              <CardDescription className="font-mono">{walletAddress}</CardDescription>
            </div>
            <div className="flex items-center gap-2">
                {/* Export Secret Phrase Dialog */}
                <Dialog open={isExportOpen} onOpenChange={(open) => {
                    setIsExportOpen(open)
                    if(!open) {
                        setExportPin("")
                        setExportedPhrase("")
                        setExportError("")
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            Export Secret
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Export Secret Phrase</DialogTitle>
                            <DialogDescription>
                                Enter your PIN to reveal your secret phrase. Never share this with anyone.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                            {!exportedPhrase ? (
                                <div className="space-y-2">
                                    <Label>Wallet PIN</Label>
                                    <Input 
                                        type="password" 
                                        value={exportPin}
                                        onChange={(e) => setExportPin(e.target.value)}
                                        placeholder="Enter PIN"
                                    />
                                    {exportError && <p className="text-sm text-destructive">{exportError}</p>}
                                </div>
                            ) : (
                                <Mnemonic
                                    mnemonic={exportedPhrase}
                                    showMnemonic={true}
                                    setShowMnemonic={() => setIsExportOpen(false)}
                                    
                                />
                            )}
                        </div>
                        <DialogFooter>
                            {!exportedPhrase ? (
                                <Button onClick={handleExport} disabled={!exportPin || isExporting}>
                                    {isExporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Reveal Phrase
                                </Button>
                            ) : (
                                <Button onClick={() => setIsExportOpen(false)}>Close</Button>
                            )}
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                {/* Delete Wallet Dialog */}
                <Dialog open={isDeleteOpen} onOpenChange={(open) => {
                    setIsDeleteOpen(open)
                    if (!open) {
                        setDeletePin("")
                        setDeleteError("")
                    }
                }}>
                    <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                        </Button>
                    </DialogTrigger>
                     <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Delete Wallet</DialogTitle>
                            <DialogDescription>
                                Are you sure you want to delete <span className="font-semibold text-foreground">{walletName}</span>? 
                                This action <span className="font-bold text-destructive">cannot be undone</span> unless you have your secret phrase backed up.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="py-4 space-y-4">
                             <div className="space-y-2">
                                <Label>Confirm with PIN</Label>
                                <Input 
                                    type="password" 
                                    value={deletePin}
                                    onChange={(e) => setDeletePin(e.target.value)}
                                    placeholder="Enter PIN"
                                />
                                {deleteError && <p className="text-sm text-destructive">{deleteError}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsDeleteOpen(false)}>Cancel</Button>
                            <Button 
                                variant="destructive" 
                                onClick={handleDelete}
                                disabled={!deletePin || isDeleting}
                            >
                                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Delete Wallet
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
          </div>
        </CardHeader>
      </Card>
    </div>
  )
}
