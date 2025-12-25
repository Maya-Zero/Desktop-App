use serde::{Deserialize, Serialize};
use std::sync::{Arc, RwLock};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, State};

// 1. Configuration Structure
// We use Option<String> so we can partially update if needed.
#[derive(Debug, Clone, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")] // Matches JSON keys like "tendermintUrl"
pub struct HealthConfig {
    pub tendermint_url: Option<String>,
    pub mayanode_url: Option<String>,
    pub midgard_url: Option<String>,
    pub websocket_url: Option<String>,
    pub cacao_tracker_url: Option<String>,
}

// 2. Defaults (Fail-safe)
impl Default for HealthConfig {
    fn default() -> Self {
        Self {
            tendermint_url: Some("https://tendermint.mayachain.info".into()),
            mayanode_url: Some("https://mayanode.mayachain.info".into()),
            midgard_url: Some("https://midgard.mayachain.info".into()),
            websocket_url: Some("ws://ws.tendermint.mayachain.info:27147/websocket".into()),
            cacao_tracker_url: Some("https://api.cacaotracker.xyz".into()),
        }
    }
}

// 3. Thread-Safe State Container
pub struct HealthState(pub Arc<RwLock<HealthConfig>>);

#[derive(Clone, Serialize)]
struct EndpointStatus {
    id: String,
    url: String,
    status: String,
    latency_ms: u64,
}

// 4. Command: Called by React to update settings live
#[tauri::command]
pub async fn update_health_config(
    state: State<'_, HealthState>,
    config: HealthConfig,
) -> Result<(), String> {
    let mut w = state.0.write().map_err(|_| "Failed to acquire lock")?;

    // Update fields if provided
    if let Some(url) = config.tendermint_url { w.tendermint_url = Some(url); }
    if let Some(url) = config.mayanode_url { w.mayanode_url = Some(url); }
    if let Some(url) = config.midgard_url { w.midgard_url = Some(url); }

    println!("Core: Health config updated: {:?}", *w);
    Ok(())
}

// 5. Background Monitor
pub fn init_health_monitor(app: AppHandle, state: Arc<RwLock<HealthConfig>>) {
    tauri::async_runtime::spawn(async move {
        // Poll every 30 seconds
        let mut interval = tokio::time::interval(Duration::from_secs(30));

        loop {
            interval.tick().await;

            // COPY settings from lock (Read Lock) to minimize blocking time
            let (rpc, node, midgard, cacao) = {
                let r = state.read().unwrap();
                (
                    r.tendermint_url.clone().unwrap_or_default(),
                    r.mayanode_url.clone().unwrap_or_default(),
                    r.midgard_url.clone().unwrap_or_default(),
                    r.cacao_tracker_url.clone().unwrap_or_default(),
                )
            };

            let endpoints = vec![
                ("midgard", format!("{}/v2/health", midgard)),
                ("mayanode", format!("{}/mayachain/ping", node)),
                ("rpc", format!("{}/status", rpc)),
                ("cacaotracker", format!("{}/health", cacao)),
            ];

            let client = reqwest::Client::builder()
                .timeout(Duration::from_secs(3))
                .build()
                .unwrap();

            let mut results = Vec::new();

            for (id, url) in endpoints {
                let start = Instant::now();
                let status = match client.get(&url).send().await {
                    Ok(resp) => if resp.status().is_success() { "online" } else { "degraded" },
                    Err(_) => "offline",
                };
                let latency = start.elapsed().as_millis() as u64;

                results.push(EndpointStatus {
                    id: id.to_string(),
                    url,
                    status: status.to_string(),
                    latency_ms: latency,
                });
            }

            // Emit to Frontend
            let _ = app.emit("network-health-update", &results);
        }
    });
}

#[derive(Clone, Serialize)]
pub struct SingleCheckResult {
    pub status: String,   // "online", "degraded", "offline"
    pub latency_ms: u64,
    pub details: String,  // HTTP Status code or Error message
}

#[tauri::command]
pub async fn check_single_endpoint(url: String, service_type: String) -> Result<SingleCheckResult, String> {
    // 1. Sanitize input (remove trailing slash if present)
    let clean_url = url.trim_end_matches('/');

    // 2. Append the specific path based on the service type
    // This matches the logic in your background monitor
    let target_url = match service_type.as_str() {
        "midgard" => format!("{}/v2/health", clean_url),
        "mayanode" => format!("{}/mayachain/ping", clean_url),
        "rpc" => format!("{}/status", clean_url),
        _ => clean_url.to_string(), // Fallback: Ping exact URL
    };

    let client = reqwest::Client::builder()
        .timeout(Duration::from_secs(3))
        .build()
        .map_err(|e| e.to_string())?;

    let start = Instant::now();
    
    match client.get(&target_url).send().await {
        Ok(resp) => {
            let latency = start.elapsed().as_millis() as u64;
            if resp.status().is_success() {
                Ok(SingleCheckResult {
                    status: "online".into(),
                    latency_ms: latency,
                    details: format!("OK ({})", resp.status()),
                })
            } else {
                Ok(SingleCheckResult {
                    status: "degraded".into(),
                    latency_ms: latency,
                    details: format!("HTTP {}", resp.status()),
                })
            }
        },
        Err(e) => {
            Ok(SingleCheckResult {
                status: "offline".into(),
                latency_ms: 0,
                // Simplify error message for UI (e.g. "error sending request..." -> "Connection Refused")
                details: if e.is_timeout() { "Timeout".into() } else { "Unreachable".into() },
            })
        }
    }
}