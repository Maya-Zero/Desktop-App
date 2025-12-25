import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { useSettings, Settings } from "../providers/settings-provider"
import { useState, useEffect } from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Loader2, CheckCircle2, AlertTriangle, XCircle, RefreshCw } from "lucide-react"
import { invoke } from "@tauri-apps/api/core"

interface EndpointInputProps {
    id: string;
    label: string;
    value: string;
    type: "rpc" | "midgard" | "mayanode";
    onChange: (value: string) => void;
    description: string;
    placeholder?: string;
}

interface ValidationResult {
    status: "online" | "degraded" | "offline" | "idle" | "checking";
    latency_ms: number;
    details: string;
}

function EndpointInput({ id, label, value, type, onChange, description, placeholder }: EndpointInputProps) {
    const [validation, setValidation] = useState<ValidationResult>({ status: "idle", latency_ms: 0, details: "" });
    const [debouncedValue, setDebouncedValue] = useState(value);

    // Debounce logic
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedValue(value);
        }, 800); // 800ms debounce

        return () => clearTimeout(timer);
    }, [value]);

    // Check endpoint when debounced value changes
    useEffect(() => {
        if (!debouncedValue) {
            setValidation({ status: "idle", latency_ms: 0, details: "" });
            return;
        }

        // Don't check if it doesn't look like a URL
        if (!debouncedValue.startsWith("http")) {
            setValidation({ status: "offline", latency_ms: 0, details: "Invalid URL format" });
            return;
        }

        const check = async () => {
            setValidation(prev => ({ ...prev, status: "checking" }));
            try {
                const result = await invoke<{ status: string; latency_ms: number; details: string; }>("check_single_endpoint", { 
                    url: debouncedValue,
                    serviceType: type
                });
                setValidation({
                    status: result.status as any,
                    latency_ms: result.latency_ms,
                    details: result.details
                });
            } catch (e) {
                setValidation({
                    status: "offline",
                    latency_ms: 0,
                    details: String(e)
                });
            }
        };

        check();
    }, [debouncedValue]);

    // Helper to get helper text and style
    const getStatusDisplay = () => {
        switch (validation.status) {
            case "checking":
                return (
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1.5 animate-pulse">
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        <span>Checking availability...</span>
                    </div>
                );
            case "online":
                return (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-500 mt-1.5">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Online ({validation.latency_ms}ms) - {validation.details}</span>
                    </div>
                );
            case "degraded":
                return (
                    <div className="flex items-center gap-1.5 text-xs text-yellow-500 mt-1.5">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Degraded ({validation.latency_ms}ms) - {validation.details}</span>
                    </div>
                );
            case "offline":
                return (
                    <div className="flex items-center gap-1.5 text-xs text-red-500 mt-1.5">
                        <XCircle className="h-3 w-3" />
                        <span>Unreachable - {validation.details}</span>
                    </div>
                );
            default:
                 return (
                    <p className="text-[0.8rem] text-muted-foreground mt-1.5">
                        {description}
                    </p>
                );
        }
    };

    return (
        <div className="space-y-2 col-span-2">
            <Label htmlFor={id}>{label}</Label>
            <div className="relative">
                <Input 
                    id={id} 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={validation.status === "offline" ? "border-red-500 focus-visible:ring-red-500" : ""}
                />
                 {/* Icon inside input would be nice, but putting status below is clearer for details */}
            </div>
           {getStatusDisplay()}
        </div>
    );
}

export function GeneralSettings() {
  const { settings, updateSettings, isLoading } = useSettings()
  const [localSettings, setLocalSettings] = useState<Settings>(settings)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleChange = (key: keyof Settings, value: string) => {
    setLocalSettings(prev => ({ ...prev, [key]: value as any }))
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await updateSettings(localSettings)
    } finally {
      setIsSaving(false)
    }
  }

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(localSettings)

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">General Settings</h3>
        <p className="text-sm text-muted-foreground">
          Configure general settings for the application.
        </p>
      </div>
      <Separator />
      
      <Card>
        <CardHeader>
          <CardTitle>General</CardTitle>
          <CardDescription>
            Configure general settings for the application.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="currency">Currency</Label>
              <Select 
                value={localSettings.defaultCurrency} 
                onValueChange={(value) => handleChange("defaultCurrency", value)}
              >
                <SelectTrigger id="currency">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[0.8rem] text-muted-foreground">
                The default currency used for display.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Network</CardTitle>
          <CardDescription>
            Configure API endpoints for data fetching.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            
            <EndpointInput 
                id="endpoint"
                label="RPC Endpoint (Tendermint)"
                value={localSettings.tendermintUrl}
                type="rpc"
                onChange={(v) => handleChange("tendermintUrl", v)}
                description="The Tendermint RPC endpoint."
            />

            <div className="space-y-2 col-span-2">
              <Label htmlFor="tendermintWebsocket">Tendermint Websocket</Label>
              <Input 
                id="tendermintWebsocket" 
                value={localSettings.tendermintWebsocket} 
                onChange={(e) => handleChange("tendermintWebsocket", e.target.value)}
              />
               <p className="text-[0.8rem] text-muted-foreground">
                The Tendermint Websocket endpoint.
              </p>
            </div>

            <EndpointInput 
                id="mayanode"
                label="Mayanode Client Url"
                type="mayanode"
                value={localSettings.mayanodeUrl}
                onChange={(v) => handleChange("mayanodeUrl", v)}
                description="The Mayanode API endpoint."
            />

            <EndpointInput 
                id="midgard"
                label="Midgard Url"
                type="midgard"
                value={localSettings.midgardUrl}
                onChange={(v) => handleChange("midgardUrl", v)}
                description="The Midgard API endpoint."
            />

          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={!hasChanges || isLoading || isSaving}>
          {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  )
}

export function AppearanceSettings() {
    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-lg font-medium">Appearance</h3>
                <p className="text-sm text-muted-foreground">
                    Customize the look and feel of the application.
                </p>
            </div>
            <Separator />
            <Card>
                <CardHeader>
                <CardTitle>Appearance</CardTitle>
                <CardDescription>
                    Customize the look and feel of the application.
                </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label className="text-base">Dark Mode</Label>
                            <p className="text-sm text-muted-foreground">
                                Enable dark mode for the application. (Always on)
                            </p>
                        </div>
                        <Button variant="outline" size="sm" disabled>Enabled</Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
