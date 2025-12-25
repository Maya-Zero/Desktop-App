use aes_gcm::{
    AeadCore, Aes256Gcm, Nonce, aead::{Aead, KeyInit, OsRng}
};
use argon2::{
    password_hash::{ PasswordHasher, SaltString},
    Argon2,
};
use base64::{engine::general_purpose, Engine as _};

// --- ERROR TYPES ---
// Simple string errors for now to keep it compatible with Tauri's return type
type SecurityResult<T> = Result<T, String>;

/// ENCRYPT: Wraps a raw seed phrase with a User PIN
/// Output Format: "SALT$NONCE$CIPHERTEXT" (Base64 encoded parts)
pub fn encrypt_seed(pin: &str, seed_phrase: &str) -> SecurityResult<String> {
    // 1. Generate a random Salt for Argon2
    let salt = SaltString::generate(&mut OsRng);

    // 2. Derive a 32-byte Key from the PIN using Argon2id (Memory Hard)
    // This prevents GPU farms from brute-forcing your 4-6 digit PIN.
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(pin.as_bytes(), &salt)
        .map_err(|e| e.to_string())?;
    
    // Use the raw hash output as the AES Key (Truncated to 32 bytes)
    let output_bytes = password_hash.hash.ok_or("Hash failed")?;
    // AES-256 requires exactly 32 bytes.
    let mut key_bytes = [0u8; 32]; 
    let len = std::cmp::min(output_bytes.len(), 32);
    key_bytes[0..len].copy_from_slice(&output_bytes.as_bytes()[0..len]);
    
    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);
    
    // 3. Encrypt payload using AES-GCM
    let cipher = Aes256Gcm::new(key);
    let nonce = Aes256Gcm::generate_nonce(&mut OsRng); // 96-bits unique
    let ciphertext = cipher.encrypt(&nonce, seed_phrase.as_bytes())
        .map_err(|e| e.to_string())?;

    // 4. Pack into a portable string format
    let nonce_b64 = general_purpose::STANDARD.encode(nonce);
    let cipher_b64 = general_purpose::STANDARD.encode(ciphertext);
    
    // Format: SALT $ NONCE $ CIPHERTEXT
    Ok(format!("{}${}${}", salt.as_str(), nonce_b64, cipher_b64))
}

/// DECRYPT: Unwraps the blob using the User PIN
pub fn decrypt_seed(pin: &str, encrypted_blob: &str) -> SecurityResult<String> {
    // 1. Unpack the components
    let parts: Vec<&str> = encrypted_blob.split('$').collect();
    if parts.len() != 3 { 
        return Err("Vault data corrupted or invalid format".to_string()); 
    }
    
    let salt_str = parts[0];
    let nonce_b64 = parts[1];
    let cipher_b64 = parts[2];

    // 2. Re-derive the AES Key from PIN + Stored Salt
    let salt = SaltString::from_b64(salt_str).map_err(|e| e.to_string())?;
    let argon2 = Argon2::default();
    let password_hash = argon2.hash_password(pin.as_bytes(), &salt)
        .map_err(|e| e.to_string())?;

    let output_bytes = password_hash.hash.ok_or("Hash logic error")?;
    let mut key_bytes = [0u8; 32]; 
    let len = std::cmp::min(output_bytes.len(), 32);
    key_bytes[0..len].copy_from_slice(&output_bytes.as_bytes()[0..len]);

    let key = aes_gcm::Key::<Aes256Gcm>::from_slice(&key_bytes);

    // 3. Decrypt
    let cipher = Aes256Gcm::new(key);
    let nonce_bytes = general_purpose::STANDARD.decode(nonce_b64).map_err(|e| e.to_string())?;
    let cipher_bytes = general_purpose::STANDARD.decode(cipher_b64).map_err(|e| e.to_string())?;
    let nonce = Nonce::from_slice(&nonce_bytes);

    let plaintext = cipher.decrypt(nonce, cipher_bytes.as_ref())
        .map_err(|_| "Incorrect PIN".to_string())?; // Simple error for UI

    Ok(String::from_utf8(plaintext).map_err(|e| e.to_string())?)
}