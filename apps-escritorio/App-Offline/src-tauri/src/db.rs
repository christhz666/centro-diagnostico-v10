use rusqlite::{Connection, Result};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// Función para obtener la ruta segura en AppData o equivalente
fn get_db_path(app: &AppHandle) -> PathBuf {
    let mut path = app.path().app_data_dir().unwrap_or_else(|_| PathBuf::from("./"));
    
    // Si no existe la carpeta de datos de la app, la creamos
    if !path.exists() {
        fs::create_dir_all(&path).expect("No se pudo crear el directorio de datos offline");
    }
    
    path.push("centro_diagnostico_offline.db");
    path
}

// Conectar a la base de datos o crearla si no existe
pub fn init_db(app: &AppHandle) -> Result<Connection> {
    let db_path = get_db_path(app);
    let conn = Connection::open(&db_path)?;
    println!("Base de datos SQLite local conectada en: {:?}", db_path);
    
    // Crear el Schema Inicial Offline
    crear_tablas(&conn)?;
    
    Ok(conn)
}

// Definición de las tablas locales para trabajar SIN internet
fn crear_tablas(conn: &Connection) -> Result<()> {
    
    // 1. Catálogo Offline Sincronizado (Usuarios, Sucursales, Estudios)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS usuarios (
            _id TEXT PRIMARY KEY,
            nombre TEXT,
            apellido TEXT,
            rol TEXT,
            sucursal_id TEXT
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS estudios (
            _id TEXT PRIMARY KEY,
            nombre TEXT,
            codigo TEXT,
            precio REAL,
            categoria TEXT
        )",
        [],
    )?;

    // 2. Transaccional (Pacientes, Cajas, Facturas)
    
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pacientes (
            id_local INTEGER PRIMARY KEY AUTOINCREMENT,
            _id_mongo TEXT,
            cedula TEXT,
            nombre TEXT NOT NULL,
            apellido TEXT NOT NULL,
            telefono TEXT,
            email TEXT,
            fecha_nacimiento TEXT,
            sexo TEXT,
            direccion TEXT,
            sucursal_id TEXT NOT NULL,  -- El ancla Multi-Tenant
            sincronizado BOOLEAN DEFAULT 0,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    )?;

    conn.execute(
        "CREATE TABLE IF NOT EXISTS facturas (
            id_local INTEGER PRIMARY KEY AUTOINCREMENT,
            _id_mongo TEXT,
            numero_consecutivo TEXT NOT NULL, -- Ej: FAC-0001
            paciente_id_local INTEGER,
            usuario_id TEXT NOT NULL,
            sucursal_id TEXT NOT NULL,
            subtotal REAL NOT NULL,
            descuento REAL DEFAULT 0,
            impuestos REAL DEFAULT 0,
            total REAL NOT NULL,
            metodo_pago TEXT,
            estado TEXT DEFAULT 'pagada',
            sincronizado BOOLEAN DEFAULT 0,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY(paciente_id_local) REFERENCES pacientes(id_local)
        )",
        [],
    )?;

    // Detalle de los estudios facturados
    conn.execute(
        "CREATE TABLE IF NOT EXISTS factura_detalles (
            id_local INTEGER PRIMARY KEY AUTOINCREMENT,
            factura_id_local INTEGER,
            estudio_id TEXT NOT NULL,
            precio_unitario REAL NOT NULL,
            cantidad INTEGER DEFAULT 1,
            FOREIGN KEY(factura_id_local) REFERENCES facturas(id_local)
        )",
        [],
    )?;

    // 3. Pool de Códigos de Barras Offline (Para asignar IDs a los tubos)
    conn.execute(
        "CREATE TABLE IF NOT EXISTS pools_barcodes (
            id_local INTEGER PRIMARY KEY AUTOINCREMENT,
            lote_id TEXT NOT NULL,
            tipo TEXT NOT NULL, -- FACTURA, RESULTADO_LAB
            prefijo TEXT NOT NULL,
            rango_inicio INTEGER,
            rango_fin INTEGER,
            ultimo_usado INTEGER,
            agotado BOOLEAN DEFAULT 0
        )",
        [],
    )?;

    Ok(())
}
