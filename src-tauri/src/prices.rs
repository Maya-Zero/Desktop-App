use crate::health::HealthConfig;
use serde::Deserialize;
use std::collections::HashMap;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter};
use reqwest::Client;

// 1. MIDGARD RESPONSE STRUCTURE
#[derive(Debug, Deserialize, Clone)]
struct MidgardPool {
    asset: String,
    #[serde(rename = "assetPrice")]
    asset_price_cacao: String, // Price of 1 Asset in CACAO
    #[serde(rename = "assetPriceUSD")]
    asset_price_usd: String,   // Price of 1 Asset in USD
}

// 2. DATA SENT TO FRONTEND
// We send a simple Map: "Asset Name" -> "Price in USD"
pub type PriceMap = HashMap<String, f64>;

// 3. CONSTANTS
// Known stablecoins on Maya to derive CACAO price from (in order of preference)
const STABLECOINS: &[&str] = &["ETH.USDT", "ETH.USDC", "BSC.USDT", "BSC.USDC"];

pub fn init_price_monitor(
    app: AppHandle,
    config_state: Arc<RwLock<HealthConfig>>
) {
    tauri::async_runtime::spawn(async move {
        let client = Client::builder().timeout(Duration::from_secs(10)).build().unwrap();
        let mut interval = tokio::time::interval(Duration::from_secs(25)); // Poll every 25s

        loop {
            interval.tick().await;

            // A. GET MIDGARD URL
            let midgard_url = {
                let r = config_state.read().unwrap();
                r.midgard_url.clone().unwrap_or("https://midgard.mayachain.info".to_string())
            };

            // Sanitize URL
            let clean_url = midgard_url.trim_end_matches('/');
            let url = format!("{}/v2/pools", clean_url);

            // B. FETCH POOLS
            if let Ok(resp) = client.get(&url).send().await {
                if let Ok(pools) = resp.json::<Vec<MidgardPool>>().await {
                    
                    let mut prices: PriceMap = HashMap::new();
                    let mut cacao_price_usd = 0.0;

                    // C. PROCESS ASSETS
                    for pool in &pools {
                        if let Ok(price) = pool.asset_price_usd.parse::<f64>() {
                            prices.insert(pool.asset.clone(), price);
                        }

                        // Try to find CACAO price via Stablecoins
                        if cacao_price_usd == 0.0 {
                            for stable in STABLECOINS {
                                if pool.asset.starts_with(stable) {
                                    if let Ok(price_in_cacao) = pool.asset_price_cacao.parse::<f64>() {
                                        if price_in_cacao > 0.0 {
                                            cacao_price_usd = 1.0 / price_in_cacao;
                                            break;
                                        }
                                    }
                                }
                            }
                        }
                    }

                    // D. INSERT CACAO PRICE
                    // If we found a stablecoin, use calculated price. 
                    // Fallback: If no stable pools exist (rare), default to 0.
                    if cacao_price_usd > 0.0 {
                        prices.insert("CACAO".to_string(), cacao_price_usd);
                    }

                    // E. EMIT TO FRONTEND
                    // We emit every time to ensure UI stays "fresh", 
                    // or you could add diffing logic here like in balances.rs
                    println!("Core: Pushing {} prices to UI (CACAO: ${:.4})", prices.len(), cacao_price_usd);
                    let _ = app.emit("price-update", &prices);
                }
            }
        }
    });
}
