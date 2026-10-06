#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use serde::{Deserialize, Serialize};
use serde_json::{json, Value};
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::{
    collections::HashMap,
    fs,
    io::{BufRead, BufReader, BufWriter, Write},
    path::PathBuf,
    process::{Child, ChildStdin, Command, Stdio},
    sync::{
        atomic::{AtomicU64, Ordering},
        mpsc::{self, Sender},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use tauri::{Emitter, Manager, RunEvent, State};

const BRIDGE_TIMEOUT: Duration = Duration::from_secs(45);
const ALLOWED_METHODS: &[&str] = &[
    "status",
    "context",
    "context.refresh",
    "projects",
    "project.generate",
    "project.generation.status",
    "library",
    "knowledge.search",
    "agent.start",
    "agent.send",
    "agent.abort",
    "agent.permission",
    "agent.input",
    "agent.snapshot",
    "tools.list",
    "tools.call",
    "tools.cancel",
    "intake",
    "review.list",
    "review.open",
    "review.state",
    "review.studio",
    "review.seek",
    "review.play",
    "review.pause",
    "review.ack",
    "review.update",
    "review.frame",
    "review.subtitles",
    "review.spectrogram",
];

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct AppSettings {
    workspace: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    node_path: Option<String>,
}

#[derive(Debug)]
struct BridgeInner {
    child: Option<Child>,
    stdin: Option<BufWriter<ChildStdin>>,
    pending: HashMap<String, Sender<Result<Value, String>>>,
    next_id: AtomicU64,
    workspace: PathBuf,
    node_path: Option<PathBuf>,
    generation: u64,
}

#[derive(Clone, Debug)]
struct BridgeManager {
    inner: Arc<Mutex<BridgeInner>>,
    app: tauri::AppHandle,
}

impl BridgeManager {
    fn new(app: tauri::AppHandle, settings: &AppSettings) -> Self {
        Self {
            inner: Arc::new(Mutex::new(BridgeInner {
                child: None,
                stdin: None,
                pending: HashMap::new(),
                next_id: AtomicU64::new(1),
                workspace: PathBuf::from(&settings.workspace),
                node_path: settings.node_path.as_ref().map(PathBuf::from),
                generation: 0,
            })),
            app,
        }
    }

    fn start(&self) -> Result<(), String> {
        let mut inner = self.inner.lock().map_err(|_| "bridge state poisoned")?;
        if inner.child.is_some() {
            return Ok(());
        }
        let node = inner
            .node_path
            .clone()
            .or_else(|| std::env::var_os("A2SWE_NODE").map(PathBuf::from))
            .unwrap_or_else(|| PathBuf::from("node"));
        let script = inner
            .workspace
            .join("library/integrations/copilot/desktop.ts");
        if !script.is_file() {
            return Err(format!("Bridge script not found: {}", script.display()));
        }
        let mut command = Command::new(&node);
        #[cfg(windows)]
        command.creation_flags(0x08000000);
        command
            .arg(&script)
            .arg("--workspace")
            .arg(&inner.workspace)
            .current_dir(&inner.workspace)
            .env("A2SWE_DESKTOP_BRIDGE", "1")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        let mut child = command.spawn().map_err(|error| {
            format!(
                "Unable to start Node bridge with {}: {error}",
                node.display()
            )
        })?;
        let stdout = child
            .stdout
            .take()
            .ok_or("Node bridge stdout unavailable")?;
        let stderr = child
            .stderr
            .take()
            .ok_or("Node bridge stderr unavailable")?;
        let stdin = child.stdin.take().ok_or("Node bridge stdin unavailable")?;
        inner.stdin = Some(BufWriter::new(stdin));
        inner.child = Some(child);
        inner.generation += 1;
        let generation = inner.generation;
        let shared = Arc::clone(&self.inner);
        let app = self.app.clone();
        thread::spawn(move || {
            for line in BufReader::new(stdout).lines() {
                match line {
                    Ok(line) if line.trim().is_empty() => {}
                    Ok(line) => handle_bridge_line(&shared, &app, &line),
                    Err(error) => {
                        let _ = app.emit(
                            "a2swe-bridge-event",
                            json!({
                                "event": "agent.error",
                                "data": { "message": format!("Bridge stdout error: {error}") }
                            }),
                        );
                        break;
                    }
                }
            }
            if let Ok(mut inner) = shared.lock() {
                if inner.generation == generation {
                    inner.stdin.take();
                    if let Some(mut child) = inner.child.take() {
                        let _ = child.wait();
                    }
                    for (_, sender) in inner.pending.drain() {
                        let _ = sender.send(Err(
                            "Node bridge exited; reconnect to restart it".to_string()
                        ));
                    }
                    let _ = app.emit(
                        "a2swe-bridge-event",
                        json!({
                            "event": "agent.error", "data": {"message": "Node bridge exited"}
                        }),
                    );
                }
            }
        });
        let app = self.app.clone();
        thread::spawn(move || {
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                if !line.trim().is_empty() {
                    let _ = app.emit(
                        "a2swe-bridge-event",
                        json!({
                            "event": "agent.tool",
                            "data": { "name": "bridge", "status": "log", "details": line }
                        }),
                    );
                }
            }
        });
        Ok(())
    }

    fn restart(&self, settings: &AppSettings) -> Result<(), String> {
        self.shutdown();
        {
            let mut inner = self.inner.lock().map_err(|_| "bridge state poisoned")?;
            inner.workspace = PathBuf::from(&settings.workspace);
            inner.node_path = settings.node_path.as_ref().map(PathBuf::from);
        }
        self.start()
    }

    fn request(&self, method: &str, params: Value) -> Result<Value, String> {
        if !ALLOWED_METHODS.contains(&method) {
            return Err(format!("Bridge method is not allowed: {method}"));
        }
        self.start()?;
        let id = {
            let inner = self.inner.lock().map_err(|_| "bridge state poisoned")?;
            inner.next_id.fetch_add(1, Ordering::Relaxed).to_string()
        };
        let (sender, receiver) = mpsc::channel();
        {
            let mut inner = self.inner.lock().map_err(|_| "bridge state poisoned")?;
            inner.pending.insert(id.clone(), sender);
            let payload = json!({ "id": id.clone(), "method": method, "params": params });
            let serialized = match serde_json::to_vec(&payload) {
                Ok(bytes) => bytes,
                Err(error) => {
                    inner.pending.remove(&id);
                    return Err(error.to_string());
                }
            };
            let write_result = match inner.stdin.as_mut() {
                Some(stdin) => stdin
                    .write_all(&serialized)
                    .and_then(|_| stdin.write_all(b"\n"))
                    .and_then(|_| stdin.flush()),
                None => {
                    inner.pending.remove(&id);
                    return Err("Bridge stdin unavailable".to_string());
                }
            };
            if let Err(error) = write_result {
                inner.pending.remove(&id);
                return Err(error.to_string());
            }
        }
        let timeout = if method == "tools.call" {
            Duration::from_secs(2100)
        } else if method == "project.generate" {
            Duration::from_secs(600)
        } else if method == "review.frame" || method == "review.spectrogram" {
            Duration::from_secs(120)
        } else {
            BRIDGE_TIMEOUT
        };
        match receiver.recv_timeout(timeout) {
            Ok(result) => result,
            Err(_) => {
                if let Ok(mut inner) = self.inner.lock() {
                    inner.pending.remove(&id);
                }
                Err(format!(
                    "Bridge request timed out after {} seconds: {method}",
                    timeout.as_secs()
                ))
            }
        }
    }

    fn workspace(&self) -> Result<PathBuf, String> {
        self.inner
            .lock()
            .map(|inner| inner.workspace.clone())
            .map_err(|_| "bridge state poisoned".to_string())
    }

    fn shutdown(&self) {
        if let Ok(mut inner) = self.inner.lock() {
            inner.generation += 1;
            for (_, sender) in inner.pending.drain() {
                let _ = sender.send(Err("Bridge shutting down".to_string()));
            }
            inner.stdin.take();
            if let Some(mut child) = inner.child.take() {
                let deadline = std::time::Instant::now() + Duration::from_secs(7);
                while std::time::Instant::now() < deadline {
                    if matches!(child.try_wait(), Ok(Some(_))) {
                        return;
                    }
                    thread::sleep(Duration::from_millis(50));
                }
                #[cfg(windows)]
                {
                    let _ = Command::new("taskkill")
                        .args(["/PID", &child.id().to_string(), "/T", "/F"])
                        .creation_flags(0x08000000)
                        .stdout(Stdio::null())
                        .stderr(Stdio::null())
                        .status();
                }
                #[cfg(not(windows))]
                let _ = child.kill();
                let _ = child.wait();
            }
        }
    }
}

fn handle_bridge_line(shared: &Arc<Mutex<BridgeInner>>, app: &tauri::AppHandle, line: &str) {
    let parsed: Value = match serde_json::from_str(line) {
        Ok(value) => value,
        Err(error) => {
            let _ = app.emit(
                "a2swe-bridge-event",
                json!({
                    "event": "agent.error",
                    "data": { "message": format!("Invalid bridge JSON: {error}") }
                }),
            );
            return;
        }
    };
    if let Some(id) = parsed.get("id").and_then(Value::as_str) {
        if let Ok(mut inner) = shared.lock() {
            if let Some(sender) = inner.pending.remove(id) {
                let result = if let Some(error) = parsed.get("error") {
                    Err(error
                        .get("message")
                        .and_then(Value::as_str)
                        .unwrap_or("Bridge request failed")
                        .to_string())
                } else {
                    Ok(parsed.get("result").cloned().unwrap_or(Value::Null))
                };
                let _ = sender.send(result);
                return;
            }
        }
    }
    if parsed.get("event").is_some() {
        let _ = app.emit("a2swe-bridge-event", parsed);
    }
}

fn default_workspace() -> PathBuf {
    if let Some(value) = std::env::var_os("A2SWE_WORKSPACE") {
        return PathBuf::from(value);
    }
    PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("../../..")
}

fn portable_path(path: PathBuf) -> PathBuf {
    #[cfg(windows)]
    {
        let text = path.to_string_lossy();
        if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
            return PathBuf::from(format!(r"\\{rest}"));
        }
        if let Some(rest) = text.strip_prefix(r"\\?\") {
            return PathBuf::from(rest);
        }
    }
    path
}

fn settings_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let directory = app
        .path()
        .app_config_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&directory).map_err(|error| error.to_string())?;
    Ok(directory.join("settings.json"))
}

fn load_settings(app: &tauri::AppHandle) -> Result<AppSettings, String> {
    let path = settings_path(app)?;
    if path.is_file() {
        let contents = fs::read_to_string(&path).map_err(|error| error.to_string())?;
        return serde_json::from_str::<AppSettings>(&contents)
            .map_err(|error| format!("Invalid desktop settings at {}: {error}", path.display()));
    }
    let workspace = portable_path(
        default_workspace()
            .canonicalize()
            .unwrap_or_else(|_| default_workspace()),
    );
    Ok(AppSettings {
        workspace: workspace.display().to_string(),
        node_path: None,
    })
}

fn validate_settings(settings: &AppSettings) -> Result<AppSettings, String> {
    let workspace = portable_path(
        PathBuf::from(&settings.workspace)
            .canonicalize()
            .map_err(|error| format!("Workspace is not accessible: {error}"))?,
    );
    if !workspace.is_dir() {
        return Err("Workspace must be a directory".to_string());
    }
    if !workspace
        .join("library/integrations/copilot/desktop.ts")
        .is_file()
    {
        return Err("Select an a2swe checkout containing its Copilot desktop bridge".to_string());
    }
    let node_path = match settings
        .node_path
        .as_ref()
        .filter(|value| !value.trim().is_empty())
    {
        Some(path) => {
            let value = portable_path(
                PathBuf::from(path)
                    .canonicalize()
                    .map_err(|error| format!("Node runtime is not accessible: {error}"))?,
            );
            if !value.is_file() {
                return Err("Node runtime setting must point to a file".to_string());
            }
            Some(value.display().to_string())
        }
        None => None,
    };
    Ok(AppSettings {
        workspace: workspace.display().to_string(),
        node_path,
    })
}

#[tauri::command]
fn get_settings(app: tauri::AppHandle) -> Result<AppSettings, String> {
    load_settings(&app)
}

#[tauri::command]
fn save_settings(app: tauri::AppHandle, settings: AppSettings) -> Result<AppSettings, String> {
    let settings = validate_settings(&settings)?;
    let path = settings_path(&app)?;
    fs::write(
        path,
        serde_json::to_vec_pretty(&settings).map_err(|error| error.to_string())?,
    )
    .map_err(|error| error.to_string())?;
    Ok(settings)
}

#[tauri::command]
async fn restart_bridge(
    manager: State<'_, BridgeManager>,
    settings: AppSettings,
) -> Result<(), String> {
    let manager = manager.inner().clone();
    let settings = validate_settings(&settings)?;
    tauri::async_runtime::spawn_blocking(move || manager.restart(&settings))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn bridge_request(
    manager: State<'_, BridgeManager>,
    method: String,
    params: Value,
) -> Result<Value, String> {
    let manager = manager.inner().clone();
    tauri::async_runtime::spawn_blocking(move || manager.request(&method, params))
        .await
        .map_err(|e| e.to_string())?
}

fn show_window(app: &tauri::AppHandle, label: &str) -> Result<(), String> {
    let window = app
        .get_webview_window(label)
        .ok_or_else(|| format!("Window not found: {label}"))?;
    window.show().map_err(|error| error.to_string())?;
    window.set_focus().map_err(|error| error.to_string())
}

#[tauri::command]
fn show_widget(app: tauri::AppHandle) -> Result<(), String> {
    show_window(&app, "widget")
}

#[tauri::command]
fn hide_widget(app: tauri::AppHandle) -> Result<(), String> {
    app.get_webview_window("widget")
        .ok_or("Window not found: widget")?
        .hide()
        .map_err(|error| error.to_string())
}

#[tauri::command]
fn focus_main(app: tauri::AppHandle) -> Result<(), String> {
    show_window(&app, "main")
}

#[tauri::command]
fn quit_app(app: tauri::AppHandle) {
    app.exit(0);
}

#[tauri::command]
fn read_image(manager: State<'_, BridgeManager>, path: String) -> Result<String, String> {
    let workspace = manager
        .workspace()?
        .canonicalize()
        .map_err(|error| error.to_string())?;
    let input = PathBuf::from(path);
    let requested = if input.is_absolute() {
        input
    } else {
        workspace.join(input)
    }
    .canonicalize()
    .map_err(|error| format!("Asset is not accessible: {error}"))?;
    if !requested.starts_with(&workspace) {
        return Err("Asset path is outside the selected workspace".to_string());
    }
    let metadata = fs::metadata(&requested).map_err(|error| error.to_string())?;
    if metadata.len() > 10 * 1024 * 1024 {
        return Err("Asset preview exceeds the 10 MB limit".to_string());
    }
    let mime = match requested
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
        .as_str()
    {
        "png" => "image/png",
        "jpg" | "jpeg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "svg" => "image/svg+xml",
        _ => return Err("Only image assets can be previewed".to_string()),
    };
    let bytes = fs::read(requested).map_err(|error| error.to_string())?;
    Ok(format!("data:{mime};base64,{}", BASE64.encode(bytes)))
}

pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let settings = load_settings(app.handle())?;
            let manager = BridgeManager::new(app.handle().clone(), &settings);
            // Keep the native shell usable when the explicitly configured workspace
            // does not yet contain the backend adapter. Requests will return the
            // concrete startup error instead of fabricating project or agent data.
            if let Err(error) = manager.start() {
                eprintln!("a2swe bridge startup: {error}");
            }
            app.manage(manager);
            let position_path = app.path().app_config_dir()?.join("widget-position.json");
            if position_path.is_file() {
                let position: [i32; 2] = serde_json::from_slice(&fs::read(position_path)?)?;
                if let Some(widget) = app.get_webview_window("widget") {
                    let visible = widget.available_monitors()?.iter().any(|monitor| {
                        let start = monitor.position();
                        let size = monitor.size();
                        position[0] >= start.x
                            && position[0] < start.x + size.width as i32 - 40
                            && position[1] >= start.y
                            && position[1] < start.y + size.height as i32 - 40
                    });
                    if visible {
                        widget
                            .set_position(tauri::PhysicalPosition::new(position[0], position[1]))?;
                    }
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            bridge_request,
            get_settings,
            save_settings,
            restart_bridge,
            show_widget,
            hide_widget,
            focus_main,
            quit_app,
            read_image
        ])
        .on_window_event(|window, event| {
            if window.label() == "widget" {
                if let tauri::WindowEvent::Moved(position) = event {
                    let result = (|| -> Result<(), String> {
                        let directory = window
                            .app_handle()
                            .path()
                            .app_config_dir()
                            .map_err(|e| e.to_string())?;
                        fs::create_dir_all(&directory).map_err(|e| e.to_string())?;
                        let bytes = serde_json::to_vec(&[position.x, position.y])
                            .map_err(|e| e.to_string())?;
                        let staging = directory.join("widget-position.json.tmp");
                        fs::write(&staging, bytes).map_err(|e| e.to_string())?;
                        fs::rename(staging, directory.join("widget-position.json"))
                            .map_err(|e| e.to_string())
                    })();
                    if let Err(error) = result {
                        eprintln!("Persist widget position: {error}");
                    }
                }
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let app = window.app_handle();
                if window.label() == "widget" {
                    api.prevent_close();
                    if let Err(error) = window.hide() {
                        eprintln!("Hide widget: {error}");
                    }
                } else if app
                    .get_webview_window("widget")
                    .and_then(|w| w.is_visible().ok())
                    .unwrap_or(false)
                {
                    api.prevent_close();
                    if let Err(error) = window.hide() {
                        eprintln!("Hide console: {error}");
                    }
                } else {
                    app.exit(0);
                }
            }
        })
        .build(tauri::generate_context!())
        .expect("error while building a2swe desktop")
        .run(|app, event| {
            if matches!(event, RunEvent::Exit | RunEvent::ExitRequested { .. }) {
                if let Some(manager) = app.try_state::<BridgeManager>() {
                    manager.shutdown();
                }
            }
        });
}

fn main() {
    run();
}
