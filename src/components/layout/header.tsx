import { Wallet, Bell, ChevronDown, Plus, Check, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useWallet } from '@/components/providers/wallet-provider'
import { useNavigate } from '@tanstack/react-router'
import { PinDialog } from './pin-dialog'
import { useState } from 'react'
import { Wallet as WalletType } from '@/components/providers/wallet-provider'
import { useNotifications } from '@/components/providers/notification-provider'
import { formatDistanceToNow } from 'date-fns'

export function Header() {
    const { activeWallet, wallets, setActiveWallet } = useWallet()
    const { notifications, unreadCount, markAllAsRead, clearNotifications } = useNotifications()
    const navigate = useNavigate()
    const [targetWallet, setTargetWallet] = useState<WalletType | null>(null)
    const [isPinDialogOpen, setIsPinDialogOpen] = useState(false)

    const handleWalletSelect = (wallet: WalletType) => {
        if (wallet.address === activeWallet) return
        setTargetWallet(wallet)
        setIsPinDialogOpen(true)
    }

    const handlePinSuccess = (walletId: string) => {
        setActiveWallet(walletId)
        setIsPinDialogOpen(false)
        setTargetWallet(null)
    }

    return (
    <div className="flex items-center gap-2">
        <PinDialog 
            open={isPinDialogOpen} 
            onOpenChange={setIsPinDialogOpen}
            wallet={targetWallet}
            onSuccess={handlePinSuccess}
        />
        

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground relative">
                    <Bell className="h-4 w-4" />
                    {unreadCount > 0 && (
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background" />
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[320px]">
                <div className="flex items-center justify-between px-2 py-1.5">
                    <DropdownMenuLabel className="p-0">Notifications</DropdownMenuLabel>
                    {notifications.length > 0 && (
                        <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-auto px-1.5 py-0.5 text-[10px] text-muted-foreground hover:text-foreground"
                            onClick={markAllAsRead}
                        >
                            Mark all read
                        </Button>
                    )}
                </div>
                <DropdownMenuSeparator />
                <div className="max-h-[300px] overflow-y-auto">
                    {notifications.length === 0 ? (
                        <div className="px-2 py-8 text-center text-xs text-muted-foreground">
                            No new notifications
                        </div>
                    ) : (
                        notifications.map((notification) => (
                            <DropdownMenuItem key={notification.id} className="flex flex-col items-start gap-1 p-3 cursor-default">
                                <div className="flex w-full items-start justify-between gap-2">
                                    <span className={`text-sm font-medium ${notification.severity === 'success' ? 'text-emerald-500' : notification.severity === 'error' ? 'text-red-500' : 'text-foreground'}`}>
                                        {notification.title}
                                    </span>
                                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                        {formatDistanceToNow(notification.timestamp, { addSuffix: true })}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    {notification.message}
                                </p>
                            </DropdownMenuItem>
                        ))
                    )}
                </div>
                {notifications.length > 0 && (
                     <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem 
                            className="justify-center text-xs text-muted-foreground cursor-pointer"
                            onClick={clearNotifications}
                        >
                            Clear all
                        </DropdownMenuItem>
                    </>
                )}
             </DropdownMenuContent>
        </DropdownMenu>

        {activeWallet ? (
             <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-2 bg-background">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="max-w-[100px] truncate">
                            {wallets.find(w => w.address === activeWallet)?.name || activeWallet}
                        </span>
                        <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[240px]">
                    <DropdownMenuLabel>My Wallets</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {wallets.map((wallet) => (
                        <DropdownMenuItem 
                            key={wallet.address}
                            className="justify-between cursor-pointer"
                            onClick={() => handleWalletSelect(wallet)}
                        >
                            <div className="flex flex-col gap-1 overflow-hidden">
                                <span className="font-medium truncate">{wallet.name}</span>
                                <span className="text-xs text-muted-foreground truncate w-[180px]">
                                    {wallet.address}
                                </span>
                            </div>
                            {activeWallet === wallet.address && (
                                <Check className="h-3 w-3 ml-2 text-emerald-500" />
                            )}
                        </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        onClick={() => navigate({ to: '/onboarding' })}
                        className="cursor-pointer text-muted-foreground focus:text-foreground"
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        Add New Wallet
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                        onClick={() => setActiveWallet(null)}
                        className="cursor-pointer text-red-500 focus:text-red-500 focus:bg-red-50 dark:focus:bg-red-950/20"
                    >
                        <LogOut className="mr-2 h-4 w-4" />
                        Disconnect
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        ) : (
            <Button 
                size="sm" 
                className="h-8 font-semibold shadow-none"
                onClick={() => navigate({ to: '/onboarding' })}
            >
                <Wallet className="mr-2 h-3.5 w-3.5" />
                Connect
            </Button>
        )}
      </div>
  )
}
