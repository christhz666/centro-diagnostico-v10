use rusqlite::Connection;
use std::thread;
use std::time::Duration;
use reqwest::blocking::Client;
use serde_json::json;

// Recibe la ruta física a la Base de Datos
pub fn start_sync_daemon(db_path: String) {
    // Levantamos un hilo 100% independiente de la Interfaz Gráfica
    thread::spawn(move || {
        let client = Client::new();
        // TODO: En producción, esta URL se leería de la configuración (o el archivo env local)
        let backend_url = "https://miesperanzalab.duckdns.org/api"; 

        loop {
            // Intentar abrir conexión en cada ciclo para no bloquearla
            if let Ok(conn) = Connection::open(&db_path) {
                // 1. Descargas de Nube a Local (Pull)
                sincronizar_usuarios(&conn, &client, backend_url);
                sincronizar_pools(&conn, &client, backend_url);
                
                // 2. Subidas de Local a Nube (Push)
                sincronizar_pacientes(&conn, &client, backend_url);
            } else {
                eprintln!("[Sync Daemon] No se pudo abrir la BD para sincronizar");
            }
            
            // Esperar 10 segundos antes del siguiente ping
            thread::sleep(Duration::from_secs(10));
        }
    });
}

fn sincronizar_pacientes(conn: &Connection, client: &Client, url: &str) {
    // 1. Buscar todos los que no han subido a Mongo
    let mut stmt = match conn.prepare("SELECT id_local, nombre, apellido, cedula, sucursal_id FROM pacientes WHERE sincronizado = 0") {
        Ok(s) => s,
        Err(_) => return,
    };
    
    let rows = stmt.query_map([], |row| {
        Ok((
            row.get::<_, i64>(0)?,
            row.get::<_, String>(1)?,
            row.get::<_, String>(2)?,
            row.get::<_, String>(3)?,
            row.get::<_, String>(4)?,
        ))
    });

    if let Ok(mapped_rows) = rows {
        for paciente_result in mapped_rows {
            if let Ok((id_local, nombre, apellido, cedula, sucursal)) = paciente_result {
                
                // 2. Armar JSON para el VPS
                let payload = json!({
                    "nombre": nombre,
                    "apellido": apellido,
                    "cedula": cedula,
                    "sucursal": sucursal,
                    // Indicamos que es una subida diferida
                    "source": "offline-sync"
                });

                // 3. POST al servidor usando Reqwest
                let res = client.post(&format!("{}/pacientes", url))
                    .json(&payload)
                    .send();

                // 4. Si el servidor respondió OK, marcar como sincronizado en SQLite
                match res {
                    Ok(response) if response.status().is_success() => {
                        println!("Paciente Local {} subido a la nube correctamente!", id_local);
                        // Marcamos
                        let _ = conn.execute(
                            "UPDATE pacientes SET sincronizado = 1 WHERE id_local = ?1",
                            [&id_local],
                        );
                    },
                    Ok(r) => eprintln!("El servidor rechazó al paciente {}: {}", id_local, r.status()),
                    Err(_e) => {
                        // Internet está probablemente caído
                    }
                }
            }
        }
    }
}

use serde::{Deserialize, Serialize};

#[derive(Deserialize, Debug)]
struct ServerResponseUsuarios {
    success: bool,
    data: Vec<UsuarioServer>,
}

#[derive(Deserialize, Debug)]
struct UsuarioServer {
    #[serde(rename = "_id")]
    id: String,
    nombre: String,
    apellido: Option<String>,
    rol: Option<String>,
    sucursal: Option<String>,
}

pub fn sincronizar_usuarios(conn: &Connection, client: &Client, url: &str) {
    // GET /api/admin/usuarios (Asumiendo que devuelve la lista y no requiere admin temporalmente para el offline, deberia tener un endpoint offline especial)
    let res = client.get(&format!("{}/admin/usuarios/offline-sync", url)).send();
    
    match res {
        Ok(response) if response.status().is_success() => {
            if let Ok(json_response) = response.json::<ServerResponseUsuarios>() {
                if json_response.success {
                    for u in json_response.data {
                        // Upsert
                        let _ = conn.execute(
                            "INSERT INTO usuarios (_id, nombre, apellido, rol, sucursal_id) 
                             VALUES (?1, ?2, ?3, ?4, ?5)
                             ON CONFLICT(_id) DO UPDATE SET 
                             nombre=excluded.nombre, apellido=excluded.apellido, rol=excluded.rol, sucursal_id=excluded.sucursal_id",
                            [
                                &u.id, 
                                &u.nombre, 
                                &u.apellido.unwrap_or_default(), 
                                &u.rol.unwrap_or_default(), 
                                &u.sucursal.unwrap_or_default()
                            ],
                        );
                    }
                    println!("Catalogo de Usuarios Sincronizado Ok");
                }
            }
        },
        _ => {}
    }
}

// -----------------------------------------
// SINCRONIZADOR DE ESTUDIOS (PULL BASE DE DATOS)
// -----------------------------------------

#[derive(Deserialize, Debug)]
struct ServerResponseEstudios {
    success: bool,
    data: Vec<EstudioServer>,
}

#[derive(Deserialize, Debug)]
struct EstudioServer {
    #[serde(rename = "_id")]
    id: String,
    nombre: String,
    codigo: Option<String>,
    precio: Option<f64>,
    categoria: Option<String>,
}

pub fn sincronizar_estudios(conn: &Connection, client: &Client, url: &str) {
    let res = client.get(&format!("{}/estudios", url)).send();
    
    match res {
        Ok(response) if response.status().is_success() => {
            if let Ok(json_response) = response.json::<ServerResponseEstudios>() {
                if json_response.success {
                    for e in json_response.data {
                        let _ = conn.execute(
                            "INSERT INTO estudios (_id, nombre, codigo, precio, categoria) 
                             VALUES (?1, ?2, ?3, ?4, ?5)
                             ON CONFLICT(_id) DO UPDATE SET 
                             nombre=excluded.nombre, codigo=excluded.codigo, precio=excluded.precio, categoria=excluded.categoria",
                            [
                                &e.id, 
                                &e.nombre, 
                                &e.codigo.unwrap_or_default(), 
                                &e.precio.unwrap_or(0.0).to_string(), 
                                &e.categoria.unwrap_or_default()
                            ],
                        );
                    }
                    println!("Catalogo de Estudios Sincronizado Ok");
                }
            }
        },
        _ => {}
    }
}

// -----------------------------------------
// SINCRONIZADOR DE SUCURSALES (PULL BASE DE DATOS)
// -----------------------------------------

#[derive(Deserialize, Debug)]
struct ServerResponseSucursales {
    success: bool,
    data: Vec<SucursalServer>,
}

#[derive(Deserialize, Debug)]
struct SucursalServer {
    #[serde(rename = "_id")]
    id: String,
    nombre: String,
}

pub fn sincronizar_sucursales(_conn: &Connection, client: &Client, url: &str) {
    let res2 = client.get(&format!("{}/admin/sucursales", url)).send(); 
    
    match res2 {
        Ok(response) if response.status().is_success() => {
            if let Ok(json_response) = response.json::<ServerResponseSucursales>() {
                if json_response.success {
                    // Aqui iria el execute SQL para tabla sucursales si existiera.
                    println!("Catalogo de Sucursales Sincronizado Ok");
                }
            }
        },
        _ => {}
    }
}

// -----------------------------------------
// SINCRONIZADOR DE LOTES (POOLS BARCODES)
// -----------------------------------------

#[derive(Deserialize, Debug)]
pub struct ServerResponsePool {
    success: bool,
    pool: Option<PoolInfo>,
}

#[derive(Deserialize, Debug)]
pub struct PoolInfo {
    #[serde(rename = "loteId")]
    lote_id: String,
    prefijo: String,
    #[serde(rename = "rangoInicio")]
    rango_inicio: i64,
    #[serde(rename = "rangoFin")]
    rango_fin: i64,
    #[serde(rename = "ultimoSincronizadoEnNube")]
    ultimo_sincronizado: i64,
}

pub fn sincronizar_pools(conn: &Connection, client: &Client, url: &str) {
    // Buscar sucursales activas en la computadora
    let mut stmt = match conn.prepare("SELECT DISTINCT sucursal_id FROM usuarios WHERE sucursal_id IS NOT NULL") {
        Ok(s) => s,
        Err(_) => return,
    };
    
    let sucursales_iter = stmt.query_map([], |row| row.get::<_, String>(0));
    
    if let Ok(iterator) = sucursales_iter {
        for s in iterator {
            if let Ok(sucursal_id) = s {
                // Tratar de bajar el lote de facturación
                let res = client.get(&format!("{}/poolBarcodes/offline-sync/{}/FACTURA", url, sucursal_id)).send();
                
                match res {
                    Ok(response) if response.status().is_success() => {
                        if let Ok(json_response) = response.json::<ServerResponsePool>() {
                            if json_response.success {
                                if let Some(p) = json_response.pool {
                                    // Comprobar que no exista o crear
                                    let existe: Result<i64, _> = conn.query_row(
                                        "SELECT id_local FROM pools_barcodes WHERE lote_id = ?1",
                                        [&p.lote_id],
                                        |row| row.get(0),
                                    );
                                    
                                    if existe.is_err() {
                                        let _ = conn.execute(
                                            "INSERT INTO pools_barcodes (lote_id, tipo, prefijo, rango_inicio, rango_fin, ultimo_usado, agotado) 
                                             VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0)",
                                            [
                                                &p.lote_id,
                                                &"FACTURA".to_string(),
                                                &p.prefijo,
                                                &p.rango_inicio.to_string(),
                                                &p.rango_fin.to_string(),
                                                &p.ultimo_sincronizado.to_string()
                                            ],
                                        );
                                        println!("Lote de Numeración {} Descargado!", p.lote_id);
                                    }
                                }
                            }
                        }
                    },
                    _ => {}
                }
            }
        }
    }
}
