const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

const dbDir = path.join(__dirname, "..", "database");
const dbPath = path.join(dbDir, "obrica.db");
const schemaPath = path.join(dbDir, "schema.sql");

// Crear directorio si no existe
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Si la BD ya existe, no hacer nada
if (fs.existsSync(dbPath)) {
  console.log("Base de datos ya existe, omitiendo inicialización.");
  console.log(`Ubicación: ${dbPath}`);
  process.exit(0);
}

// Crear nueva base de datos
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Leer y ejecutar schema
const schema = fs.readFileSync(schemaPath, "utf-8");
db.exec(schema);
console.log("Esquema creado exitosamente");

// Crear usuario admin por defecto
const passwordHash = bcrypt.hashSync("admin123", 10);
db.prepare(`
  INSERT INTO usuarios (username, password_hash, nombre, rol, activo)
  VALUES (?, ?, ?, ?, ?)
`).run("admin", passwordHash, "Administrador", "admin", 1);
console.log("Usuario admin creado (usuario: admin, password: admin123)");

// Datos semilla para catálogos
const etapas = [
  { nombre: "Preliminares", orden: 1 },
  { nombre: "Cimentación", orden: 2 },
  { nombre: "Estructura", orden: 3 },
  { nombre: "Albañilería", orden: 4 },
  { nombre: "Instalaciones", orden: 5 },
  { nombre: "Acabados", orden: 6 },
  { nombre: "Herrería", orden: 7 },
  { nombre: "Carpintería", orden: 8 },
  { nombre: "Limpieza", orden: 9 },
];

const metodosPago = [
  { nombre: "Transferencia", descripcion: "Transferencia bancaria" },
  { nombre: "Efectivo", descripcion: "Pago en efectivo" },
  { nombre: "Cheque", descripcion: "Pago con cheque" },
  { nombre: "Tarjeta", descripcion: "Pago con tarjeta de crédito/débito" },
];

const rubros = [
  { nombre: "Mano de obra", descripcion: "Costos de mano de obra" },
  { nombre: "Materiales", descripcion: "Costos de materiales" },
  { nombre: "Herramienta", descripcion: "Costos de herramienta y equipo" },
  { nombre: "Subcontratos", descripcion: "Trabajos subcontratados" },
  { nombre: "Indirectos", descripcion: "Gastos indirectos" },
  { nombre: "Administración", descripcion: "Gastos administrativos" },
];

const partidas = [
  { codigo: "PRE", nombre: "Preliminares", descripcion: "Trabajos preliminares" },
  { codigo: "CIM", nombre: "Cimentación", descripcion: "Trabajos de cimentación" },
  { codigo: "EST", nombre: "Estructura", descripcion: "Trabajos estructurales" },
  { codigo: "ALB", nombre: "Albañilería", descripcion: "Trabajos de albañilería" },
  { codigo: "INS-HID", nombre: "Instalación Hidráulica", descripcion: "Instalaciones hidráulicas" },
  { codigo: "INS-SAN", nombre: "Instalación Sanitaria", descripcion: "Instalaciones sanitarias" },
  { codigo: "INS-ELE", nombre: "Instalación Eléctrica", descripcion: "Instalaciones eléctricas" },
  { codigo: "INS-GAS", nombre: "Instalación de Gas", descripcion: "Instalaciones de gas" },
  { codigo: "ACA", nombre: "Acabados", descripcion: "Acabados en general" },
  { codigo: "HER", nombre: "Herrería", descripcion: "Trabajos de herrería" },
  { codigo: "CAR", nombre: "Carpintería", descripcion: "Trabajos de carpintería" },
  { codigo: "PIN", nombre: "Pintura", descripcion: "Trabajos de pintura" },
];

// Insertar datos semilla
const insertEtapa = db.prepare("INSERT INTO etapas (nombre, orden) VALUES (?, ?)");
etapas.forEach((e) => insertEtapa.run(e.nombre, e.orden));
console.log(`${etapas.length} etapas insertadas`);

const insertMetodoPago = db.prepare("INSERT INTO metodos_pago (nombre, descripcion) VALUES (?, ?)");
metodosPago.forEach((m) => insertMetodoPago.run(m.nombre, m.descripcion));
console.log(`${metodosPago.length} métodos de pago insertados`);

const insertRubro = db.prepare("INSERT INTO rubros (nombre, descripcion) VALUES (?, ?)");
rubros.forEach((r) => insertRubro.run(r.nombre, r.descripcion));
console.log(`${rubros.length} rubros insertados`);

const insertPartida = db.prepare("INSERT INTO partidas (codigo, nombre, descripcion) VALUES (?, ?, ?)");
partidas.forEach((p) => insertPartida.run(p.codigo, p.nombre, p.descripcion));
console.log(`${partidas.length} partidas insertadas`);

db.close();
console.log("\nBase de datos inicializada exitosamente!");
console.log(`Ubicación: ${dbPath}`);
