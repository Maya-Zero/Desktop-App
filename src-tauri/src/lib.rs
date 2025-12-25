use bip39::Mnemonic;
use cosmrs::crypto::secp256k1::SigningKey;
use std::sync::{Arc, RwLock};
use tauri_plugin_store::StoreExt;

mod security; // Import the module we just wrote
mod health;
mod balances;
mod prices;
mod notifications;
mod websocket;
mod cacao;
mod transactions;

pub mod proto {
    pub mod types {
        include!(concat!(env!("OUT_DIR"), "/types.rs"));
    }
    pub mod cosmos {
        pub mod base {
            pub mod v1beta1 {
                include!(concat!(env!("OUT_DIR"), "/cosmos.base.v1beta1.rs"));
            }
        }
    }
    pub mod cosmos_proto {
        include!(concat!(env!("OUT_DIR"), "/cosmos_proto.rs"));
    }
    pub mod common {
        include!(concat!(env!("OUT_DIR"), "/common.rs"));
    }
}

use keyring::Entry;


// Define a constant namespace for your app keys
const SERVICE_NAME: &str = "maya-zero-wallet";

// --- TAURI COMMANDS ---

#[tauri::command]
fn check_registration_status(username: String) -> bool {
    let entry = Entry::new(SERVICE_NAME, &username).unwrap();
    // We try to get the password. If it fails, the user isn't registered.
    match entry.get_password() {
        Ok(_) => true,
        Err(_) => false,
    }
}

#[tauri::command]
fn save_wallet_with_pin(username: String, pin: String, phrase: String) -> Result<(), String> {
    // 1. Encrypt the raw phrase immediately
    let encrypted_blob = security::encrypt_seed(&pin, &phrase)?;

    // 2. Save ONLY the encrypted blob to OS Keychain
    let entry = Entry::new(SERVICE_NAME, &username).map_err(|e| e.to_string())?;
    entry.set_password(&encrypted_blob).map_err(|e| e.to_string())?;
    
    Ok(())
}

#[tauri::command]
fn unlock_wallet(username: String, pin: String) -> Result<bool, String> {
    // 1. Fetch blob from Keychain
    let entry = Entry::new(SERVICE_NAME, &username).map_err(|e| e.to_string())?;
    let encrypted_blob = entry.get_password().map_err(|_| "No wallet found".to_string())?;

    // 2. Attempt Decrypt (Verify PIN)
    // We don't return the seed here! We just verify the PIN works.
    match security::decrypt_seed(&pin, &encrypted_blob) {
        Ok(_) => Ok(true), // PIN is correct
        Err(_) => Ok(false), // PIN is wrong (or "Incorrect PIN")
    }
}

#[tauri::command]
fn export_secret_phrase(username: String, pin: String) -> Result<String, String> {
    // WARNING: This returns the RAW seed phrase. Only use when user explicitly requests export.
    let entry = Entry::new(SERVICE_NAME, &username).map_err(|e| e.to_string())?;
    let encrypted_blob = entry.get_password().map_err(|e| e.to_string())?;

    let phrase = security::decrypt_seed(&pin, &encrypted_blob)?;
    Ok(phrase)
}

#[tauri::command]
fn generate_wallet() -> Result<(String, String), String> {
    // 1. Generate 12 random words
    let mnemonic = Mnemonic::generate(12).map_err(|e| e.to_string())?;
    let phrase = mnemonic.to_string();

    // 2. Derive the Private Key to get the Address
    let seed = mnemonic.to_seed("");
    
    // Standard Cosmos Path: m/44'/931'/0'/0/0 
    // (931 is the Coin Type for THORChain/Maya)
    let derivation_path = "m/44'/931'/0'/0/0".parse().map_err(|_| "Invalid derivation path")?;
    
    let signing_key = SigningKey::derive_from_path(seed, &derivation_path)
        .map_err(|e| e.to_string())?;

    // 3. Generate the public address (Bech32)
    // We strictly use "maya" as the prefix
    let account_id = signing_key.public_key()
        .account_id("maya")
        .map_err(|e| e.to_string())?;

    // Return tuple: (Secret Phrase, Public Address)
    Ok((phrase, account_id.to_string()))
}

#[tauri::command]
fn delete_wallet(username: String, pin: String) -> Result<(), String> {
    // 1. Fetch the existing encrypted blob
    let entry = Entry::new(SERVICE_NAME, &username)
        .map_err(|e| e.to_string())?;

    let encrypted_blob = entry.get_password()
        .map_err(|_| "Wallet not found".to_string())?;

    // 2. VERIFY PIN (The Security Check)
    // We try to decrypt the seed. If the PIN is wrong, this returns an Err.
    // We ignore the actual seed string (_) because we just want to verify access.
    match security::decrypt_seed(&pin, &encrypted_blob) {
        Ok(_) => {
            // 3. PIN confirmed: Nuke the entry
            entry.delete_password()
                .map_err(|e| format!("Failed to delete keychain entry: {}", e))?;
            Ok(())
        },
        Err(_) => {
            // 4. Wrong PIN: Deny the request
            Err("Incorrect PIN. Deletion aborted.".to_string())
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Load .env file if it exists
    dotenvy::dotenv().ok();

    let health_state = Arc::new(RwLock::new(health::HealthConfig::default()));
    let session_state = Arc::new(RwLock::new(None));

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::new().build())
        .plugin(tauri_plugin_opener::init())
        .manage(health::HealthState(health_state.clone()))
        .manage(balances::SessionState(session_state.clone()))
        .setup(move |app| {
            // 2. Access the Store
            // This looks for "settings.json" in the standard app data location
            let store = app.store("settings.json")?;

            // 4. Extract & Apply Settings
            // We manually check keys because the store returns untyped JSON values.
            // Note: Keys match the JS "camelCase" naming convention.
            let mut current_config = health::HealthConfig::default();
            
            if let Some(val) = store.get("tendermintUrl") {
                if let Some(s) = val.as_str() { current_config.tendermint_url = Some(s.to_string()); }
            }
            if let Some(val) = store.get("mayanodeUrl") {
                if let Some(s) = val.as_str() { current_config.mayanode_url = Some(s.to_string()); }
            }
            if let Some(val) = store.get("midgardUrl") {
                if let Some(s) = val.as_str() { current_config.midgard_url = Some(s.to_string()); }
            }

            // 5. Update the Global State
            println!("Core: Loaded initial config: {:?}", current_config);
            *health_state.write().unwrap() = current_config;

            // 6. Start the Background Monitor
            health::init_health_monitor(app.handle().clone(), health_state.clone());
            balances::init_balance_monitor(app.handle().clone(), session_state.clone(), health_state.clone());
            prices::init_price_monitor(app.handle().clone(), health_state.clone());
            websocket::init_ws_monitor(app.handle().clone(), session_state, health_state.clone());

            Ok(())
        })
        .plugin(tauri_plugin_notification::init())
        .invoke_handler(tauri::generate_handler![
            check_registration_status,
            save_wallet_with_pin,
            unlock_wallet,
            export_secret_phrase,
            delete_wallet,
            generate_wallet,
            health::update_health_config, 
            health::check_single_endpoint,
            balances::start_session,
            balances::end_session,
            balances::end_session,
            balances::force_refresh,
            cacao::get_cacao_position,
            cacao::get_pool_stats,
            transactions::send_deposit
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
