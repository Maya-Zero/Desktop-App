use serde::{Deserialize, Serialize};
use reqwest::Client;
// use std::env; // We'll use std::env directly or lazy_static if needed, but for now just inline

#[derive(Debug, Serialize, Deserialize)]
pub struct CacaoPosition {
    pub total_staked: String,
    pub apy: String,
    pub pending_rewards: String,
}

#[derive(Debug, Serialize, Deserialize)]
struct ApyDetails {
    net_pnl_cacao: f64,
    current_value_cacao: f64,
}

#[derive(Debug, Serialize, Deserialize)]
struct ApyResponse {
    apy_cacao: f64,
    details: Option<ApyDetails>,
}

#[tauri::command]
pub async fn get_cacao_position(address: String) -> Result<CacaoPosition, String> {
    // Check for API Key
    let api_key = std::env::var("CACAO_TRACKER_API_KEY")
        .map_err(|_| "CACAO_TRACKER_API_KEY environment variable not set".to_string())?;
    
    let url = format!("https://api.cacaotracker.xyz/apy/{}", address);

    let client = Client::new();
    let res = client
        .get(&url)
        .header("x-api-key", api_key)
        .send()
        .await
        .map_err(|e| format!("Failed to send request: {}", e))?;

    if !res.status().is_success() {
        return Err(format!("API request failed with status: {}", res.status()));
    }

    let data = res.json::<ApyResponse>()
        .await
        .map_err(|e| format!("Failed to parse API response: {}", e))?;

    let (staked, pending) = match data.details {
        Some(d) => (d.current_value_cacao, d.net_pnl_cacao),
        None => (0.0, 0.0),
    };

    Ok(CacaoPosition {
        total_staked: format!("{:.8}", staked),
        apy: format!("{:.2}%", data.apy_cacao),
        pending_rewards: format!("{:.8}", pending),
    })
}

#[tauri::command]
pub async fn get_pool_stats() -> Result<serde_json::Value, String> {
   let api_key = std::env::var("CACAO_TRACKER_API_KEY")
        .map_err(|_| "CACAO_TRACKER_API_KEY environment variable not set".to_string())?;

    let client = Client::new();
    let res = client
        .get("https://api.cacaotracker.xyz/cacao/stats")
        .header("x-api-key", api_key)
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

     res.json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Parse error: {}", e))
}
