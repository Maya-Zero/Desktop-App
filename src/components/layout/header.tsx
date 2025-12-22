import { Wallet, Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function Header() {
  return (
    <div className="flex items-center gap-2">
        <div className="hidden md:flex items-center gap-2 text-xs font-medium bg-muted px-2 py-1 rounded-md text-muted-foreground border">
          <span className="relative flex h-2 w-2">
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          Maya Chain
        </div>

        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
            <Bell className="h-4 w-4" />
        </Button>

        <Button size="sm" className="h-8 font-semibold shadow-none">
          <Wallet className="mr-2 h-3.5 w-3.5" />
          Connect
        </Button>
      </div>
  )
}
