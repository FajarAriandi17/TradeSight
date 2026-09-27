use std::sync::Mutex;

use tauri::{Manager, RunEvent};
use tauri_plugin_shell::{process::CommandChild, ShellExt};

/// Menyimpan handle proses sidecar Python agar bisa dimatikan saat app ditutup.
struct Sidecar(Mutex<Option<CommandChild>>);

const SIDECAR_PORT: &str = "8765";

#[tauri::command]
fn sidecar_port() -> String {
    SIDECAR_PORT.to_string()
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .manage(Sidecar(Mutex::new(None)))
        .invoke_handler(tauri::generate_handler![sidecar_port])
        .setup(|app| {
            // Jalankan engine analisa (FastAPI sidecar hasil PyInstaller)
            let data_dir = app
                .path()
                .app_local_data_dir()
                .map(|p| p.to_string_lossy().to_string())
                .unwrap_or_default();
            match app.shell().sidecar("tradesight-sidecar") {
                Ok(cmd) => {
                    let cmd = cmd
                        .args(["--host", "127.0.0.1", "--port", SIDECAR_PORT])
                        .env("TRADESIGHT_DATA_DIR", data_dir);
                    match cmd.spawn() {
                        Ok((_rx, child)) => {
                            *app.state::<Sidecar>().0.lock().unwrap() = Some(child);
                        }
                        Err(e) => eprintln!("[tradesight] gagal menjalankan sidecar: {e}"),
                    }
                }
                Err(e) => eprintln!("[tradesight] sidecar tidak ditemukan: {e}"),
            }
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("error while building TradeSight");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            if let Some(child) = handle.state::<Sidecar>().0.lock().unwrap().take() {
                let _ = child.kill();
            }
        }
    });
}
