use tauri::State;
use crate::health::HealthState;
use crate::security;
use crate::proto::types::MsgDeposit;
use crate::proto::common::{Coin, Asset};
use cosmrs::tx::{Body, Fee, SignDoc, SignerInfo};
use cosmrs::{Any, Coin as CosmosCoin};
use cosmrs::rpc::{HttpClient, Client};
use cosmrs::crypto::secp256k1::SigningKey;
use keyring::Entry;
use bip39::Mnemonic;
use std::str::FromStr;
use prost::Message;
use bech32::{self, FromBase32}; // Import bech32

// Constants
const SERVICE_NAME: &str = "maya-zero-wallet";
const MSG_DEPOSIT_TYPE_URL: &str = "/types.MsgDeposit"; 

#[derive(serde::Serialize)]
pub struct TxResponse {
    pub tx_hash: String,
}

// Helper to parse string or number to u64
fn parse_u64(val: &serde_json::Value) -> Option<u64> {
    if let Some(s) = val.as_str() {
        s.parse::<u64>().ok()
    } else {
        val.as_u64()
    }
}

#[tauri::command]
pub async fn send_deposit(
    address: String,
    pin: String,
    amount: String,
    memo: String,
    state: State<'_, HealthState>,
) -> Result<TxResponse, String> {
    println!("Core: send_deposit called for address: {}", address);

    // 1. Get Node URLs from State
    let (rpc_url, lcd_url) = {
        let config = state.0.read().map_err(|e| e.to_string())?;
        (
            config.tendermint_url.clone().ok_or("Tendermint URL not configured")?,
            config.mayanode_url.clone().ok_or("MayaNode API URL not configured")?
        )
    };

    // 2. Retrieve & Decrypt Private Key
    let entry = Entry::new(SERVICE_NAME, &address).map_err(|e| e.to_string())?;
    let encrypted_blob = entry.get_password().map_err(|e| e.to_string())?;
    let phrase = security::decrypt_seed(&pin, &encrypted_blob)?;
    
    let mnemonic = Mnemonic::from_str(&phrase).map_err(|e| e.to_string())?;
    let seed = mnemonic.to_seed("");
    let derivation_path = "m/44'/931'/0'/0/0".parse().map_err(|_| "Invalid derivation path")?;
    let signing_key = SigningKey::derive_from_path(seed, &derivation_path).map_err(|e| e.to_string())?;
    let account_id = signing_key.public_key().account_id("maya").map_err(|e| e.to_string())?;

    if account_id.to_string() != address {
        return Err("Wallet address mismatch".to_string());
    }

    // Decode Address to Bytes for MsgDeposit
    let (_hrp, data, _variant) = bech32::decode(&address).map_err(|e| format!("Invalid bech32 address: {}", e))?;
    let signer_bytes = Vec::<u8>::from_base32(&data).map_err(|e| format!("Failed to convert from base32: {:?}", e))?;

    // 3. Connect to RPC & Fetch Chain ID
    let rpc_client = HttpClient::new(rpc_url.as_str()).map_err(|e| e.to_string())?;
    let status = rpc_client.status().await.map_err(|e| format!("Failed to get node status: {}", e))?;
    let chain_id = status.node_info.network.as_str().to_string();

    // 4. Fetch Account Number & Sequence via LCD (REST)
    let account_url = format!("{}/cosmos/auth/v1beta1/accounts/{}", lcd_url, address);
    println!("Core: Fetching account info from {}", account_url);
    
    let res = reqwest::get(&account_url).await.map_err(|e| format!("Reqwest failed: {}", e))?;
    
    if !res.status().is_success() {
         return Err(format!("Failed to fetch account info: Status {}", res.status()));
    }

    let val: serde_json::Value = res.json().await.map_err(|e| format!("Parse json failed: {}", e))?;
    
    let acc_obj = val.get("account")
        .or_else(|| val.get("value")) 
        .ok_or("Could not find account object in response")?;

    let base_acc = acc_obj.get("base_account").unwrap_or(acc_obj);

    let account_number = base_acc.get("account_number")
        .and_then(parse_u64)
        .ok_or("Could not find account_number")?;

    let sequence = base_acc.get("sequence")
        .and_then(parse_u64)
        .unwrap_or(0);

    println!("Core: Account {} Number: {} Sequence: {}", address, account_number, sequence);

    // 5. Construct MsgDeposit
    // Convert amount to base units (10^10 for CACAO)
    let amount_f64 = amount.parse::<f64>().map_err(|_| "Invalid amount format")?;
    let amount_base = (amount_f64 * 10_000_000_000.0).round() as u128; // 10 decimals
    let amount_str = amount_base.to_string();

    println!("Core: Deposit amount: {} CACAO -> {} base units", amount, amount_str);

    let coin = Coin {
        asset: Some(Asset {
            chain: "MAYA".to_string(),
            symbol: "CACAO".to_string(),
            ticker: "CACAO".to_string(),
            synth: false,
            trade: false,
        }),
        amount: amount_str,
        decimals: 10,
    };

    let msg_deposit = MsgDeposit {
        coins: vec![coin],
        memo: memo.clone(),
        signer: signer_bytes, // Use raw bytes
    };

    // 6. Pack into Any
    let msg_any = Any {
        type_url: MSG_DEPOSIT_TYPE_URL.to_string(),
        value: msg_deposit.encode_to_vec(),
    };

    // 7. Build Transaction
    // 7. Build Transaction
    // 0.02 CACAO fee (10 decimals) => 200,000,000
    let fee_amount = 2000000u128;
    let fee = Fee::from_amount_and_gas(
        CosmosCoin {
            denom: "cacao".parse().unwrap(),
            amount: fee_amount,
        },
        200000u64, // Gas limit reduced to 200k
    );

    let body = Body::new(vec![msg_any], memo, 0u32); 
    let auth_info = SignerInfo::single_direct(Some(signing_key.public_key()), sequence)
        .auth_info(fee);

    let sign_doc = SignDoc::new(
        &body,
        &auth_info,
        &chain_id.parse().unwrap(),
        account_number,
    ).map_err(|e| e.to_string())?;

    let tx_raw = sign_doc.sign(&signing_key).map_err(|e| e.to_string())?;

    // 8. Broadcast
    println!("Core: Broadcasting transaction...");
    let response = tx_raw
        .broadcast_commit(&rpc_client)
        .await
        .map_err(|e| format!("Broadcast failed: {}", e))?;

    println!("Core: Broadcast response: {:?}", response);

    if response.check_tx.code.is_err() {
        return Err(format!("CheckTx failed: {:?}", response.check_tx));
    }
    
    if response.tx_result.code.is_err() {
        return Err(format!("DeliverTx failed: {:?}", response.tx_result));
    }

    Ok(TxResponse {
        tx_hash: response.hash.to_string(),
    })
}
