use crate::health::HealthConfig;
use serde::{Deserialize, Serialize};
use serde_json::json;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use tauri_plugin_store::StoreExt; // <--- The Magic Trait
use reqwest::Client;

// 1. DATA STRUCTURES
#[derive(Debug, Deserialize, Serialize, Clone, PartialEq)]
pub struct Coin {
    pub denom: String,
    pub amount: String,
}

#[derive(Deserialize)]
struct BankResponse {
    balances: Vec<Coin>,
}

#[derive(Deserialize)]
pub struct TradeAccountAsset {
    pub asset: String,
    pub units: String,
}

// 2. SHARED STATE
pub struct SessionState(pub Arc<RwLock<Option<String>>>);

// --- CACHING HELPERS (USING STORE PLUGIN) ---

fn save_to_store(app: &AppHandle, address: &str, balances: &Vec<Coin>) {
    // 1. Create a unique filename for this wallet
    // The plugin resolves this relative to AppData automatically
    let filename = format!("balances_{}.json", address);
    
    // 2. Get the store instance
    if let Ok(store) = app.store(&filename) {
        // 3. Set the data (Key: "balances")
        // We wrap it in json!() to convert our Vec<Coin> into a serde_json::Value
        store.set("balances", json!(balances));
        
        // 4. Persist to disk
        let _ = store.save(); 
        // println!("Core: Balances saved to store: {}", filename);
    }
}

fn load_from_store(app: &AppHandle, address: &str) -> Option<Vec<Coin>> {
    let filename = format!("balances_{}.json", address);
    
    if let Ok(store) = app.store(&filename) {
        
        
        
        // Get the "balances" key
        if let Some(value) = store.get("balances") {
            // Deserialize back into Vec<Coin>
            if let Ok(balances) = serde_json::from_value::<Vec<Coin>>(value) {
                println!("Core: Loaded balances from store: {}", filename);
                return Some(balances);
            }
        }
    }
    None
}

// --- NETWORK FETCHING (Standard) ---

async fn fetch_balances(address: &str, node_url: &str, client: &Client) -> Result<Vec<Coin>, String> {
    let clean_url = node_url.trim_end_matches('/');
    
    // 1. Fetch Bank Balances (L1)
    let bank_url = format!("{}/cosmos/bank/v1beta1/balances/{}", clean_url, address);
    let bank_fut = client.get(&bank_url).send();

    // 2. Fetch Trade Assets (Maya Trade)
    let trade_url = format!("{}/mayachain/trade/account/{}", clean_url, address);
    let trade_fut = client.get(&trade_url).send();

    // Wait for both
    let (bank_res, trade_res) = tokio::join!(bank_fut, trade_fut);

    let mut all_coins: Vec<Coin> = vec![];

    // --- Process Bank ---
    match bank_res {
        Ok(resp) => {
             if resp.status().is_success() {
                 if let Ok(data) = resp.json::<BankResponse>().await {
                     all_coins.extend(data.balances);
                 }
             } else {
                 // Treat 404 and everything else as Error to strictly preserve state during glitches
                 return Err(format!("Bank API Error: {}", resp.status()));
             }
        },
        Err(e) => return Err(format!("Bank Network Error: {}", e)),
    }

    // --- Process Trade ---
    match trade_res {
        Ok(resp) => {
            if resp.status().is_success() {
                if let Ok(data) = resp.json::<Vec<TradeAccountAsset>>().await {
                    for asset in data {
                        all_coins.push(Coin {
                            denom: asset.asset,
                            amount: asset.units,
                        });
                    }
                }
            } else {
                // Treat 404 and everything else as Error
                 return Err(format!("Trade API Error: {}", resp.status()));
            }
        },
        Err(e) => return Err(format!("Trade Network Error: {}", e)),
    }

    Ok(all_coins)
}

// 3. BACKGROUND MONITOR
pub fn init_balance_monitor(
    app: AppHandle, 
    session: Arc<RwLock<Option<String>>>,
    config_state: Arc<RwLock<HealthConfig>>
) {
    tauri::async_runtime::spawn(async move {
        let client = Client::builder().timeout(Duration::from_secs(5)).build().unwrap();
        let mut last_known_balances: Vec<Coin> = vec![]; 
        let mut interval = tokio::time::interval(Duration::from_secs(6));

        loop {
            interval.tick().await;

            // A. GET SESSION
            let address = {
                let r = session.read().unwrap();
                r.clone()
            };

            if address.is_none() { continue; }
            let addr_str = address.unwrap();

            // B. GET CONFIG
            let node_url = {
                let r = config_state.read().unwrap();
                r.mayanode_url.clone().unwrap_or("https://mayanode.mayachain.info".to_string())
            };

            // C. FETCH
            if let Ok(balances) = fetch_balances(&addr_str, &node_url, &client).await {
                // D. DIFF & SAVE
                if balances != last_known_balances {
                    last_known_balances = balances.clone();
                    
                    // SAVE TO STORE PLUGIN
                    save_to_store(&app, &addr_str, &balances);
                    
                    // EMIT TO UI
                    println!("Core: Balance updated. Emitting...");
                    let _ = app.emit("balance-update", &balances);
                }
            }
        }
    });
}

// 4. COMMAND: START SESSION
#[tauri::command]
pub fn start_session(
    session_state: State<'_, SessionState>,
    health_state: State<'_, crate::health::HealthState>,
    app: AppHandle,
    address: String
) -> Result<(), String> {
    
    // 1. Set Session Memory
    *session_state.0.write().unwrap() = Some(address.clone());

    // 2. INSTANT LOAD FROM STORE
    // This makes the UI feel instant
    if let Some(cached_balances) = load_from_store(&app, &address) {
        let _ = app.emit("balance-update", &cached_balances);
    }
    
    // 3. Get URL
    let node_url = {
        let r = health_state.0.read().unwrap();
        r.mayanode_url.clone().unwrap_or("https://mayanode.mayachain.info".to_string())
    };

    // 4. Network Fetch (Async)
    tauri::async_runtime::spawn(async move {
         let client = Client::builder().timeout(Duration::from_secs(5)).build().unwrap();
         if let Ok(balances) = fetch_balances(&address, &node_url, &client).await {
             save_to_store(&app, &address, &balances);
             let _ = app.emit("balance-update", &balances);
         }
    });

    Ok(())
}

#[tauri::command]
pub fn end_session(state: State<'_, SessionState>) -> Result<(), String> {
    *state.0.write().unwrap() = None;
    Ok(())
}

#[tauri::command]
pub async fn force_refresh(
    session_state: State<'_, SessionState>, 
    health_state: State<'_, crate::health::HealthState>,
    app: AppHandle
) -> Result<(), String> {
    let address = {
        let r = session_state.0.read().unwrap();
        r.clone()
    };

    let node_url = {
        let r = health_state.0.read().unwrap();
        r.mayanode_url.clone().unwrap_or("https://mayanode.mayachain.info".to_string())
    };

    if let Some(addr_str) = address {
        let client = Client::builder().timeout(Duration::from_secs(5)).build().unwrap();
        match fetch_balances(&addr_str, &node_url, &client).await {
             Ok(balances) => {
                 save_to_store(&app, &addr_str, &balances); // <--- Uses Store Plugin
                 let _ = app.emit("balance-update", &balances);
                 Ok(())
             },
             Err(e) => Err(e)
        }
    } else {
        Ok(())
    }
}