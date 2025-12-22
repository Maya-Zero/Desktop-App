use bip39::Mnemonic;
use cosmrs::crypto::secp256k1::SigningKey;

#[tauri::command]
fn generate_seed_phrase() -> Result<(String, String), String> {
    let mnemonic = Mnemonic::generate(12).map_err(|e| e.to_string())?;
    let phrase = mnemonic.to_string();
    
    let seed = mnemonic.to_seed("");

    let derivation_path = "m/44'/931'/0'/0/0".parse().map_err(|_| "Invalid derivation path")?;
    let signing_key = SigningKey::derive_from_path(seed, &derivation_path)
        .map_err(|e| e.to_string())?;

    let account_id = signing_key.public_key()
        .account_id("maya")
        .map_err(|e| e.to_string())?;

    Ok((phrase, account_id.to_string()))
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![generate_seed_phrase])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
