import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { Activity, Server, Database, Globe } from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";

// Matches the Rust struct 'EndpointStatus'
interface EndpointStatus {
  id: string;      // "midgard", "mayanode", "rpc"
  url: string;     // The actual URL being checked
  status: "online" | "degraded" | "offline";
  latency_ms: number;
}

export function NetworkStatus() {
  const [statuses, setStatuses] = useState<EndpointStatus[]>([]);
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  useEffect(() => {
    // Subscribe to the event emitted by health.rs
    const unlistenPromise = listen<EndpointStatus[]>("network-health-update", (event) => {
      // Sort to keep order consistent (RPC -> Node -> Midgard)
      const sorted = event.payload.sort((a, b) => a.id.localeCompare(b.id));
      setStatuses(sorted);
    });

    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  // Helper to map ID to Icon
  const getIcon = (id: string) => {
    switch (id) {
      case "rpc": return <Activity size={12} />;
      case "mayanode": return <Server size={12} />;
      case "midgard": return <Database size={12} />;
      default: return <Globe size={12} />;
    }
  };

  if (statuses.length === 0) {
    if (isCollapsed) return null; // Hide in collapsed mode if initializing
    return (
      <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-xs text-zinc-500 font-mono animate-pulse">
        <Activity size={12} />
        <span>ESTABLISHING UPLINK...</span>
      </div>
    );
  }

  
  return (
    <div className={`flex flex-col gap-1 bg-zinc-950/40 px-2 py-2 rounded-lg border border-zinc-900/50 shadow-sm select-none w-full ${isCollapsed ? 'items-center px-1' : ''}`}>
      {statuses.map((s) => {
        // Dynamic Coloring Logic
        const isOnline = s.status === "online";
        
        let colorClass = "text-red-500";
        let dotClass = "bg-red-500";
        
        if (isOnline) {
            colorClass = "text-emerald-500";
            dotClass = "bg-emerald-500";
        }

        return (
          <div 
            key={s.id} 
            className={`group/status relative flex items-center gap-2 font-mono text-[10px] cursor-help w-full py-1 hover:bg-zinc-900/80 rounded transition-colors ${isCollapsed ? 'justify-center' : 'justify-between px-2'}`}
          >
            <div className={`flex items-center gap-2 overflow-hidden ${isCollapsed ? 'justify-center w-full' : ''}`}>
                 {/* Status Dot */}
                <span className={`relative flex h-1.5 w-1.5 shrink-0`}>
                {isOnline && (
                    <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotClass}`}></span>
                )}
                <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotClass}`}></span>
                </span>

                {/* Label - Hidden when collapsed */}
                {!isCollapsed && (
                    <span className={`uppercase font-bold tracking-wider truncate ${colorClass}`}>{s.id}</span>
                )}
            </div>
            
            {/* Latency / Icon */}
            {!isCollapsed && (
                <div className={`flex items-center gap-1.5 opacity-70 shrink-0 ${colorClass}`}>
                    <span className="text-[9px]">{s.status === "offline" ? "OFF" : `${s.latency_ms}ms`}</span>
                    {getIcon(s.id)}
                </div>
            )}

            {/* Tooltip (Shows specific URL) */}
            <div className="absolute bottom-full left-0 mb-2 w-max max-w-[240px] hidden group-hover/status:block z-[100] pointer-events-none">
              <div className="bg-zinc-950 text-zinc-400 px-3 py-2 rounded-md border border-zinc-800 text-[10px] break-all shadow-xl leading-relaxed">
                <span className="block text-zinc-600 text-[9px] uppercase tracking-wider mb-0.5">Endpoint</span>
                <span className="font-mono text-zinc-300">{s.url}</span>
                {/* Latency in tooltip when collapsed */}
                  {isCollapsed && (
                     <div className={`mt-1 font-bold ${colorClass}`}>
                       {s.id.toUpperCase()} • {s.status === "offline" ? "OFFLINE" : `${s.latency_ms}ms`}
                     </div>
                  )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}