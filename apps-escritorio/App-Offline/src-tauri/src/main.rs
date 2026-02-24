use std::sync::Mutex;
use rusqlite::Connection;
use tauri::Manager;

mod db;   // Importar db.rs
mod sync; // Importar el Demonio Sincronizador

// Estructura para compartir el estado de la BD local entre comandos de Tauri de forma segura
pub struct AppState {
    pub db_conn: Mutex<Option<Connection>>,
}

// ---- Comandos de Ejemplo para el Frontend React Offline -----

#[tauri::command]
fn login_offline(
    estado: tauri::State<AppState>,
    username: String,
    _clave_hash_bypass: String // NOTA: Offline confiaremos en un token/pin cacheado o bypassearemos contraseñas complejas por un PIN si no hay red
) -> Result<String, String> {
    
    let mut conn_guard = estado.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("No hay conexión BD local")?;

    // Buscar en SQLite
    let mut stmt = conn.prepare("SELECT _id, nombre, apellido, rol, sucursal_id FROM usuarios WHERE _id = ?1 OR nombre = ?1")
        .map_err(|e| e.to_string())?;
        
    let mut rows = stmt.query([&username]).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let id: String = row.get(0).unwrap_or_default();
        let n: String = row.get(1).unwrap_or_default();
        let a: String = row.get(2).unwrap_or_default();
        let r: String = row.get(3).unwrap_or_default();
        let s: String = row.get(4).unwrap_or_default();
        
        let user_json = format!(r#"{{"_id":"{}","nombre":"{}","apellido":"{}","rol":"{}","sucursal":"{}"}}"#, id, n, a, r, s);
        Ok(user_json)
    } else {
        Err("Credenciales incorrectas o Usuario no descargado en esta PC".to_string())
    }
}

// Comando invocado por React justo al abrir la app "Primera Vez"
#[tauri::command]
fn forzar_sincronizacion_inicial(estado: tauri::State<AppState>) -> Result<String, String> {
    
    let mut conn_guard = estado.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("No hay conexión BD local")?;
    
    let base_url = "https://miesperanzalab.duckdns.org/api"; // O usar un setting local
    let cliente = reqwest::blocking::Client::new();
    
    // Descargar tablas esenciales bloqueando temporalmente a Tauri
    sync::sincronizar_usuarios(&conn, &cliente, base_url);
    sync::sincronizar_estudios(&conn, &cliente, base_url);
    sync::sincronizar_sucursales(&conn, &cliente, base_url);
    sync::sincronizar_pools(&conn, &cliente, base_url);
    
    Ok("Sincronización inicial maestra completada. Puede Iniciar Sesión.".to_string())
}


#[tauri::command]
fn guardar_paciente_offline(
    estado: tauri::State<AppState>,
    nombre: String, 
    apellido: String, 
    cedula: String,
    sucursal_id: String
) -> Result<String, String> {
    
    // Bloquear mutex para usar la base de datos
    let mut conn_guard = estado.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("No hay conexión a la base de datos local")?;

    // Guardar en disco duro!
    match conn.execute(
        "INSERT INTO pacientes (nombre, apellido, cedula, sucursal_id) VALUES (?1, ?2, ?3, ?4)",
        [&nombre, &apellido, &cedula, &sucursal_id],
    ) {
        Ok(_) => Ok("Paciente guardado exitosamente sin internet".to_string()),
        Err(e) => Err(format!("Error guardando en el SQLite Local: {}", e)),
    }
}

// ----------------------------------------------------
// DISPENSADOR LOCAL DE CÓDIGOS DE BARRAS (POOLS)
// ----------------------------------------------------
#[derive(serde::Serialize)]
struct BarcodeResult {
    barcode: String,
}

#[tauri::command]
fn obtener_codigo_barras_offline(
    estado: tauri::State<AppState>,
    tipo: String // Ej: "FACTURA"
) -> Result<String, String> {
    
    let mut conn_guard = estado.db_conn.lock().unwrap();
    let conn = conn_guard.as_mut().ok_or("No hay conexión BD local")?;

    // 1. Buscar un Lote Activo de este Tipo
    let res: rusqlite::Result<(i64, String, String, i64, i64, i64)> = conn.query_row(
        "SELECT id_local, lote_id, prefijo, rango_inicio, rango_fin, ultimo_usado 
         FROM pools_barcodes 
         WHERE tipo = ?1 AND agotado = 0 
         ORDER BY id_local ASC LIMIT 1",
        [&tipo],
        |row| Ok((
            row.get(0)?, row.get(1)?, row.get(2)?, 
            row.get(3)?, row.get(4)?, row.get(5)?
        ))
    );

    match res {
        Ok((id_local, _lote, prefijo, _inicio, fin, ultimo_usado)) => {
            let nuevo_numero = ultimo_usado + 1;
            
            if nuevo_numero > fin {
                // Se acaba de agotar en este microsegundo (poco probable por la query pre-filtro, pero posible límite)
                let _ = conn.execute("UPDATE pools_barcodes SET agotado = 1 WHERE id_local = ?1", [&id_local]);
                return Err("Lote numérico agotado. Conecte la PC a internet para reabastecer pool.".to_string());
            }

            // Actualizar uso en base de datos local
            let _ = conn.execute(
                "UPDATE pools_barcodes SET ultimo_usado = ?1, agotado = CASE WHEN ?1 >= rango_fin THEN 1 ELSE 0 END WHERE id_local = ?2",
                [nuevo_numero, id_local]
            );

            // Retornar código: ej: FAC-PIA-000000005
            let barcode_final = format!("{}{:09}", prefijo, nuevo_numero);
            
            // Retornamos JSON puro para que React lo parsee facil
            let res_json = serde_json::json!({
                "success": true,
                "barcode": barcode_final
            });
            Ok(res_json.to_string())
        },
        Err(_) => {
            Err("No hay lotes de códigos de barras disponibles sin internet. Debe sincronizar primero.".to_string())
        }
    }
}


fn main() {
    tauri::Builder::default()
        .manage(AppState {
            db_conn: Mutex::new(None),
        })
        .setup(|app| {
            // Cuando la app arranca, intentamos abrir o crear el archivo SQLite
            match db::init_db(&app.handle()) {
                Ok(conn) => {
                    // 1. Guardar la conexión permanentemente en el estado compartido
                    let state = app.state::<AppState>();
                    *state.db_conn.lock().unwrap() = Some(conn);
                    println!("Tauri Setup finalizado: BD Local Lista.");
                    
                    // 2. Encender el Sincronizador en Background (Rust)
                    let bd_path = app.handle().path().app_data_dir()
                                     .unwrap_or_else(|_| std::path::PathBuf::from("./"))
                                     .join("centro_diagnostico_offline.db")
                                     .to_string_lossy()
                                     .into_owned();
                    
                    sync::start_sync_daemon(bd_path);
                    println!("Tauri Daemon Sincronizador Encendido en Background.");
                }
                Err(e) => {
                    eprintln!("Error fatal iniciando la Base de Datos Offline: {}", e);
                }
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            guardar_paciente_offline,
            login_offline,
            forzar_sincronizacion_inicial,
            obtener_codigo_barras_offline
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri app");
}
