import { useState } from "react"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { GeneralSettings, AppearanceSettings } from "./app-settings"
import { WalletSettings } from "./wallet-settings"
import { Wallet, Settings2, Palette } from "lucide-react"

const sidebarNavItems = [
  {
    title: "Wallets",
    items: [
      {
        title: "Wallets",
        icon: <Wallet className="mr-2 h-4 w-4" />,
        value: "wallets",
      }
    ]
  },
  {
    title: "Application",
    items: [
        {
            title: "General",
            icon: <Settings2 className="mr-2 h-4 w-4" />,
            value: "general",
        },
        {
            title: "Appearance",
            icon: <Palette className="mr-2 h-4 w-4" />,
            value: "appearance",
        },
    ]
  },
]

export function SettingsView() {
  const [activeTab, setActiveTab] = useState("wallets")

  return (
    <div className="space-y-6 p-10 pb-16">
      <div className="space-y-0.5">
        <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">
          Manage your account settings and set e-mail preferences.
        </p>
      </div>
      <Separator className="my-6" />
      <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
        <aside className="lg:w-64">
          <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
            {sidebarNavItems.map((group, i) => (
                <div key={i} className="mb-4">
                  <h4 className="mb-2 px-4 text-sm font-semibold tracking-tight text-muted-foreground">
                    {group.title}
                  </h4>
                  {group.items.map((item) => (
                     <Button
                        key={item.value}
                        variant={activeTab === item.value ? "secondary" : "ghost"}
                        className={cn(
                        "w-full justify-start",
                        activeTab === item.value && "bg-muted hover:bg-muted"
                        )}
                        onClick={() => setActiveTab(item.value)}
                    >
                        {item.icon}
                        {item.title}
                    </Button> 
                  ))}
               </div>
            ))}
          </nav>
        </aside>
        <div className="flex-1 lg:max-w-2xl">
          {activeTab === "wallets" && <WalletSettings />}
          {activeTab === "general" && <GeneralSettings />}
          {activeTab === "appearance" && <AppearanceSettings />}
        </div>
      </div>
    </div>
  )
}
