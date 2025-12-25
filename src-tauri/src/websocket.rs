use crate::health::HealthConfig;
use crate::notifications; // Import your helper
use futures_util::{SinkExt, StreamExt};
use serde_json::json;
use std::sync::{Arc, RwLock};
use std::time::Duration;
use tauri::AppHandle;
use tokio_tungstenite::{connect_async, tungstenite::protocol::Message};
use url::Url;

// Filter: Only tell me about Transactions where I am the recipient
const SUBSCRIPTION_QUERY: &str = "tm.event='Tx' AND transfer.recipient='{}'";

fn get_ws_url(config: &HealthConfig) -> String {
    config.websocket_url.clone()
        .unwrap_or("ws://ws.tendermint.mayachain.info:27147/websocket".to_string())
        .replace("http", "ws")
        .replace("https", "wss")
}

pub fn init_ws_monitor(
    app: AppHandle,
    session_state: Arc<RwLock<Option<String>>>,
    health_state: Arc<RwLock<HealthConfig>>,
) {
    tauri::async_runtime::spawn(async move {
        let mut current_session: Option<String> = None;
        let mut active_url: String = String::new();

        loop {
            // ... (Session / Connection Setup Logic from previous steps) ...
            
            // 1. Check Session
            let session_addr = {
                let r = session_state.read().unwrap();
                r.clone()
            };

            if session_addr.is_none() {
                current_session = None;
                tokio::time::sleep(Duration::from_secs(2)).await;
                continue;
            }
            let address = session_addr.unwrap();
            current_session = Some(address.clone());

            // 2. Get URL
            let target_url_base = {
                let r = health_state.read().unwrap();
                get_ws_url(&r)
            };
            let target_url = if target_url_base.ends_with("/websocket") {
                target_url_base
            } else {
                format!("{}/websocket", target_url_base)
            };
            active_url = target_url.clone();

            println!("Core: WS Connecting to {}...", active_url);

            // 3. Connect & Subscribe
            match connect_async(Url::parse(&active_url).unwrap()).await {
                Ok((ws_stream, _)) => {
                    let (mut write, mut read) = ws_stream.split();

                    let query = SUBSCRIPTION_QUERY.replace("{}", &address);
                    let subscribe_msg = json!({
                        "jsonrpc": "2.0",
                        "method": "subscribe",
                        "id": 1,
                        "params": { "query": query }
                    });

                    if let Err(_) = write.send(Message::Text(subscribe_msg.to_string())).await {
                        tokio::time::sleep(Duration::from_secs(2)).await;
                        continue;
                    }

                    // 4. THE LISTENER LOOP
                    loop {
                        match tokio::time::timeout(Duration::from_secs(1), read.next()).await {
                            Ok(Some(Ok(Message::Text(text)))) => {
                                // A. CHECK FOR TX EVENT
                                if text.contains("transfer.recipient") && text.contains("Tx") {
                                    
                                    // 1. Parse JSON to get the Base64 Tx
                                    let v: serde_json::Value = serde_json::from_str(&text).unwrap_or(json!({}));
                                    let tx_base64 = v["result"]["data"]["value"]["TxResult"]["tx"].as_str();

                                    let mut title = "Incoming Transaction".to_string();
                                    let mut message = "Funds have arrived in your wallet.".to_string();

                                    if let Some(tx_str) = tx_base64 {
                                        // 2. Decode Base64
                                        use base64::{engine::general_purpose, Engine as _};
                                        use prost::Message;

                                        if let Ok(tx_bytes) = general_purpose::STANDARD.decode(tx_str) {
                                            // 3. Decode TxRaw (Outer Envelope)
                                            // We use cosmrs definitions for the outer shell
                                            if let Ok(tx_raw) = cosmrs::proto::cosmos::tx::v1beta1::TxRaw::decode(tx_bytes.as_slice()) {
                                                 // 4. Decode TxBody
                                                 if let Ok(tx_body) = cosmrs::proto::cosmos::tx::v1beta1::TxBody::decode(tx_raw.body_bytes.as_slice()) {
                                                     // 5. Find MsgSend
                                                     for msg in tx_body.messages {
                                                         // Check for Maya MsgSend
                                                         if msg.type_url == "/types.MsgSend" {
                                                             // 6. Decode Inner MsgSend
                                                             // We use OUR generated proto here
                                                             if let Ok(msg_send) = crate::proto::types::MsgSend::decode(msg.value.as_slice()) {
                                                                 // 7. Extract Details
                                                                 // Convert bytes address to string (Bech32)
                                                                 // The bytes are in `msg_send.from_address`. 
                                                                 // We blindly assume 'maya' prefix for now as it's incoming to us on Maya chain.
                                                                 // Or we use `cosmrs::AccountId` to format it.
                                                                 let sender_addr = cosmrs::AccountId::new("maya", &msg_send.from_address)
                                                                     .map(|a| a.to_string())
                                                                     .unwrap_or("Unknown".to_string());

                                                                 // Format Amount
                                                                 // MsgSend has `amount: Vec<Coin>`
                                                                 if let Some(coin) = msg_send.amount.first() {
                                                                     // Coin has `denom` and `amount` (string)
                                                                     let amount_val = coin.amount.clone();
                                                                     let denom = coin.denom.clone().to_uppercase();
                                                                     
                                                                     // Simple formatting (raw amount)
                                                                     // Ideally we divide by 1e8 or 1e10 depending on asset, 
                                                                     // but for notify we can just show "100 CACAO" or "10000000000 cacao"
                                                                     // Let's try to make it readable if it's CACAO (1e10 decimals? No, usually 1e8 or similar)
                                                                     // Thorchain/Maya often use 1e8.
                                                                     // Let's just output the raw string + denom for safety first, or basic parsing.
                                                                     
                                                                     // Let's clean up the denom. "cacao" -> "CACAO"
                                                                     title = format!("Received {} {}", amount_val, denom);
                                                                     message = format!("From: {}", sender_addr);

                                                                     // Attempt readable amount
                                                                     if let Ok(amt_float) = amount_val.parse::<f64>() {
                                                                         let divisor = if denom == "CACAO" { 10_000_000_000.0 } else { 100_000_000.0 };
                                                                         let readable_amt = amt_float / divisor;
                                                                         title = format!("Received {:.2} {}", readable_amt, denom);
                                                                     }
                                                                 }
                                                                 break; // Found one, good enough
                                                             }
                                                         }
                                                     }
                                                 }
                                            }
                                        }
                                    }

                                    // B. TRIGGER NOTIFICATION (The Integration Point)
                                    notifications::send_notification(
                                        &app,
                                        &title, 
                                        &message, 
                                        "success"
                                    );

                                    // C. OPTIONAL: TRIGGER BALANCE REFRESH
                                    // You can call your balance fetch logic here too
                                }
                            },
                            Ok(None) => break,
                            Ok(Some(Err(_))) => break,
                            Ok(Some(Ok(Message::Close(_)))) => break,
                            Err(_) => {}, // Timeout is normal
                            _ => {}
                        }

                        // ... (Configuration Change Checks from previous steps) ...
                        // Check if session changed
                         let check_addr = session_state.read().unwrap().clone();
                         if check_addr != current_session { break; }
                         
                         // Check if URL changed
                         let check_url = {
                             let r = health_state.read().unwrap();
                             get_ws_url(&r)
                         };
                         if !active_url.contains(&check_url.replace("wss://", "").replace("ws://", "").split(':').next().unwrap()) {
                             break;
                         }
                    }
                }
                Err(_) => {
                    tokio::time::sleep(Duration::from_secs(5)).await;
                }
            }
        }
    });
}
