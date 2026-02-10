-- Esquema de base de datos para Obrica - Sistema de Gestión de Construcción

-- Usuarios
CREATE TABLE IF NOT EXISTS usuarios (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    nombre TEXT,
    rol TEXT DEFAULT 'usuario',
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Proveedores/Contratistas
CREATE TABLE IF NOT EXISTS proveedores (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    rfc TEXT,
    telefono TEXT,
    email TEXT,
    direccion TEXT,
    tipo TEXT CHECK(tipo IN ('proveedor', 'contratista', 'ambos')) DEFAULT 'proveedor',
    activo INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Partidas
CREATE TABLE IF NOT EXISTS partidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo INTEGER DEFAULT 1
);

-- Rubros
CREATE TABLE IF NOT EXISTS rubros (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo INTEGER DEFAULT 1
);

-- Etapas de obra
CREATE TABLE IF NOT EXISTS etapas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    orden INTEGER,
    activo INTEGER DEFAULT 1
);

-- Métodos de pago
CREATE TABLE IF NOT EXISTS metodos_pago (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    descripcion TEXT,
    activo INTEGER DEFAULT 1
);

-- Privadas/Proyectos
CREATE TABLE IF NOT EXISTS privadas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    ubicacion TEXT,
    activo INTEGER DEFAULT 1
);

-- Materiales
CREATE TABLE IF NOT EXISTS materiales (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    codigo TEXT UNIQUE,
    nombre TEXT NOT NULL,
    unidad TEXT,
    stock_fisico REAL DEFAULT 0,
    stock_virtual REAL DEFAULT 0,
    stock_minimo REAL DEFAULT 0,
    activo INTEGER DEFAULT 1
);

-- Contratos
CREATE TABLE IF NOT EXISTS contratos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    numero_contrato TEXT NOT NULL UNIQUE,
    descripcion TEXT,
    total REAL DEFAULT 0,
    total_con_iva REAL DEFAULT 0,
    estimado REAL DEFAULT 0,
    pagado REAL DEFAULT 0,
    por_cobrar REAL DEFAULT 0,
    por_estimar REAL DEFAULT 0,
    margen_operativo REAL DEFAULT 0,
    porcentaje_operativo REAL DEFAULT 0,
    mano_obra REAL DEFAULT 0,
    materiales REAL DEFAULT 0,
    indirectos REAL DEFAULT 0,
    proveedor_id INTEGER REFERENCES proveedores(id),
    privada_id INTEGER REFERENCES privadas(id),
    fecha_inicio DATE,
    fecha_fin DATE,
    estatus TEXT DEFAULT 'activo',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Movimientos (Ingresos y Egresos)
CREATE TABLE IF NOT EXISTS movimientos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tipo TEXT CHECK(tipo IN ('ingreso', 'egreso')) NOT NULL,
    fecha DATE NOT NULL,
    etapa_id INTEGER REFERENCES etapas(id),
    privada_id INTEGER REFERENCES privadas(id),
    partida_id INTEGER REFERENCES partidas(id),
    rubro_id INTEGER REFERENCES rubros(id),
    descripcion TEXT,
    estimacion REAL,
    proveedor_id INTEGER REFERENCES proveedores(id),
    contrato_id INTEGER REFERENCES contratos(id),
    monto REAL NOT NULL,
    metodo_pago_id INTEGER REFERENCES metodos_pago(id),
    comprobante TEXT,
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Compras de materiales
CREATE TABLE IF NOT EXISTS compras (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT NOT NULL UNIQUE,
    material_id INTEGER NOT NULL REFERENCES materiales(id),
    proveedor_id INTEGER REFERENCES proveedores(id),
    cantidad REAL NOT NULL,
    cantidad_recibida REAL DEFAULT 0,
    precio_unitario REAL NOT NULL,
    total REAL NOT NULL,
    fecha DATE NOT NULL,
    notas TEXT,
    estatus TEXT DEFAULT 'activa' CHECK(estatus IN ('activa','completada','cancelada')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Entradas de material al almacén
CREATE TABLE IF NOT EXISTS entradas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT NOT NULL UNIQUE,
    compra_id INTEGER NOT NULL REFERENCES compras(id),
    material_id INTEGER NOT NULL REFERENCES materiales(id),
    cantidad REAL NOT NULL,
    fecha DATE NOT NULL,
    notas TEXT,
    estatus TEXT DEFAULT 'activa' CHECK(estatus IN ('activa','cancelada')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Salidas de material del almacén
CREATE TABLE IF NOT EXISTS salidas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    folio TEXT NOT NULL UNIQUE,
    material_id INTEGER NOT NULL REFERENCES materiales(id),
    cantidad REAL NOT NULL,
    referencia TEXT NOT NULL,
    fecha DATE NOT NULL,
    notas TEXT,
    estatus TEXT DEFAULT 'activa' CHECK(estatus IN ('activa','cancelada')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Historial de movimientos de inventario
CREATE TABLE IF NOT EXISTS inventario_historial (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    material_id INTEGER NOT NULL REFERENCES materiales(id),
    tipo TEXT NOT NULL CHECK(tipo IN ('compra','entrada','salida','ajuste','cancelacion_compra','cancelacion_entrada','cancelacion_salida')),
    referencia_id INTEGER,
    cantidad REAL NOT NULL,
    stock_fisico_anterior REAL,
    stock_fisico_nuevo REAL,
    stock_virtual_anterior REAL,
    stock_virtual_nuevo REAL,
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Índices para mejorar rendimiento
CREATE INDEX IF NOT EXISTS idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX IF NOT EXISTS idx_movimientos_tipo ON movimientos(tipo);
CREATE INDEX IF NOT EXISTS idx_movimientos_contrato ON movimientos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estatus ON contratos(estatus);
CREATE INDEX IF NOT EXISTS idx_contratos_privada ON contratos(privada_id);
CREATE INDEX IF NOT EXISTS idx_compras_material ON compras(material_id);
CREATE INDEX IF NOT EXISTS idx_compras_estatus ON compras(estatus);
CREATE INDEX IF NOT EXISTS idx_entradas_compra ON entradas(compra_id);
CREATE INDEX IF NOT EXISTS idx_salidas_material ON salidas(material_id);
CREATE INDEX IF NOT EXISTS idx_historial_material ON inventario_historial(material_id);
