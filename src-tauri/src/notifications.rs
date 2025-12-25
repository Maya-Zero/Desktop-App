use serde::{Deserialize, Serialize};
use tauri::{AppHandle, Emitter};
use tauri_plugin_notification::NotificationExt; // Requires 'tauri-plugin-notification'
use std::time::{SystemTime, UNIX_EPOCH};

#[derive(Clone, Serialize, Deserialize)]
pub struct AppNotification {
    pub id: String,
    pub title: String,
    pub message: String,
    pub severity: String,
    pub timestamp: u128,
}

// This function handles the "Fan Out" logic
pub fn send_notification(app: &AppHandle, title: &str, message: &str, severity: &str) {
    // 1. Prepare Internal Data
    let now = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_millis();
    let notification = AppNotification {
        id: uuid::Uuid::new_v4().to_string(),
        title: title.to_string(),
        message: message.to_string(),
        severity: severity.to_string(),
        timestamp: now,
    };

    // 2. Emit to React (For the Bell Icon history)
    let _ = app.emit("app-notification", &notification);

    // 3. Fire Native OS Notification (The Pop-up)
    // This allows the user to know about the Tx even if the app is minimized
    let _ = app.notification()
        .builder()
        .title(title)
        .body(message)
        .show(); 
        
    println!("Core: Notification dispatched -> {}", title);
}
