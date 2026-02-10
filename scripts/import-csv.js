const Database = require("better-sqlite3");
const fs = require("fs");
const path = require("path");

const dbPath = path.join(__dirname, "..", "database", "obrica.db");
const csvsDir = path.join(__dirname, "..", "public", "csvs");

// --- CSV Parser (handles quoted fields, escaped quotes) ---
function parseCSV(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return [];

  const headers = parseLine(lines[0]);
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseLine(lines[i]);
    const row = {};
    headers.forEach((h, idx) => {
      row[h.trim()] = (values[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

function parseLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current);
  return fields;
}

// --- Utility functions ---
function parseNumber(str) {
  if (!str || str === "-" || str.trim() === "-" || str.trim() === "") return 0;
  // Remove spaces and commas (thousand separators)
  const cleaned = str.replace(/\s/g, "").replace(/,/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function parseDate(dateStr) {
  // Convert DD/MM/YYYY to YYYY-MM-DD
  if (!dateStr) return null;
  const parts = dateStr.split("/");
  if (parts.length !== 3) return null;
  const [day, month, year] = parts;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

// --- Main import ---
function main() {
  console.log("=== Importación de datos CSV ===\n");

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = OFF"); // Temporarily disable for bulk import

  // Check if data already exists
  const materialCount = db.prepare("SELECT COUNT(*) as c FROM materiales").get();
  if (materialCount.c > 0) {
    console.log(`Ya existen ${materialCount.c} materiales en la BD, omitiendo importación.`);
    db.close();
    return;
  }

  // Clear existing inventory data (order matters for foreign keys)
  console.log("Limpiando datos existentes...");
  db.exec("DELETE FROM inventario_historial");
  db.exec("DELETE FROM entradas");
  db.exec("DELETE FROM salidas");
  db.exec("DELETE FROM compras");
  db.exec("DELETE FROM materiales");
  console.log("  Tablas limpiadas.\n");

  // =====================================================
  // 1. Import Materials from almacen.csv
  // =====================================================
  console.log("--- 1. Importando materiales (almacen.csv) ---");
  const almacenRows = parseCSV(path.join(csvsDir, "almacen.csv"));

  const insertMaterial = db.prepare(`
    INSERT INTO materiales (codigo, nombre, unidad, stock_fisico, stock_virtual, stock_minimo, activo)
    VALUES (?, ?, ?, ?, ?, ?, 1)
  `);

  const materialMap = {}; // CODIGO -> material id

  const insertMaterialsTx = db.transaction(() => {
    for (const row of almacenRows) {
      const codigo = row["CODIGO"];
      const nombre = row["MATERIAL"];
      const unidad = row["UNIDAD"] || null;
      const stockFisico = parseNumber(row["STOCK FISICO"]);
      const stockMinimo = parseNumber(row["STOCK MINIMO"]);
      const stockVirtual = parseNumber(row["STOCK VIRTUAL"]);

      if (!nombre) continue;

      const result = insertMaterial.run(codigo, nombre, unidad, stockFisico, stockVirtual, stockMinimo);
      materialMap[codigo] = result.lastInsertRowid;
    }
  });
  insertMaterialsTx();
  console.log(`  ${Object.keys(materialMap).length} materiales importados.\n`);

  // =====================================================
  // 2. Import Compras from compras.csv
  // =====================================================
  console.log("--- 2. Importando compras (compras.csv) ---");
  const comprasRows = parseCSV(path.join(csvsDir, "compras.csv"));

  const insertCompra = db.prepare(`
    INSERT INTO compras (folio, material_id, cantidad, cantidad_recibida, precio_unitario, total, fecha, estatus)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'completada')
  `);

  // Track compras by material CODIGO for linking entradas later
  const comprasByMaterial = {}; // CODIGO -> [{ compra_id, cantidad }]
  let comprasCount = 0;
  let comprasSkipped = 0;
  const usedCompraFolios = new Set();

  const insertComprasTx = db.transaction(() => {
    for (const row of comprasRows) {
      const codigo = row["CODIGO"];
      const materialId = materialMap[codigo];
      if (!materialId) {
        comprasSkipped++;
        continue;
      }

      let folio = row["FOLIO"] || `IMP-${codigo}-${comprasCount}`;
      // Ensure unique folio
      let baseFolio = folio;
      let suffix = 2;
      while (usedCompraFolios.has(folio)) {
        folio = `${baseFolio}-D${suffix}`;
        suffix++;
      }
      usedCompraFolios.add(folio);

      const cantidad = parseNumber(row["CANTIDAD"]);
      const precioUnit = parseNumber(row["P.UNIT"]);
      const importe = parseNumber(row["IMPORTE"]);
      const fecha = parseDate(row["FECHA"]);

      if (!fecha || cantidad <= 0) {
        comprasSkipped++;
        continue;
      }

      const total = importe > 0 ? importe : precioUnit * cantidad;

      const result = insertCompra.run(
        folio,
        materialId,
        cantidad,
        cantidad, // cantidad_recibida = cantidad (historical, completed)
        precioUnit,
        total,
        fecha
      );

      if (!comprasByMaterial[codigo]) comprasByMaterial[codigo] = [];
      comprasByMaterial[codigo].push({
        compra_id: result.lastInsertRowid,
        cantidad,
      });
      comprasCount++;
    }
  });
  insertComprasTx();
  console.log(`  ${comprasCount} compras importadas (${comprasSkipped} omitidas).\n`);

  // =====================================================
  // 3. Import Entradas from entradas.csv
  // =====================================================
  console.log("--- 3. Importando entradas (entradas.csv) ---");
  const entradasRows = parseCSV(path.join(csvsDir, "entradas.csv"));

  const insertEntrada = db.prepare(`
    INSERT INTO entradas (folio, compra_id, material_id, cantidad, fecha, estatus)
    VALUES (?, ?, ?, ?, ?, 'activa')
  `);

  // For entradas without matching compra, create a dummy compra
  const insertDummyCompra = db.prepare(`
    INSERT INTO compras (folio, material_id, cantidad, cantidad_recibida, precio_unitario, total, fecha, estatus)
    VALUES (?, ?, ?, ?, 0, 0, ?, 'completada')
  `);

  let entradasCount = 0;
  let entradasSkipped = 0;
  let dummyComprasCreated = 0;
  const usedEntradaFolios = new Set();

  const insertEntradasTx = db.transaction(() => {
    for (const row of entradasRows) {
      const codigo = row["CODIGO"];
      const materialId = materialMap[codigo];
      if (!materialId) {
        entradasSkipped++;
        continue;
      }

      let folio = row["FOLIO"] || `ENT-IMP-${entradasCount}`;
      let baseFolio = folio;
      let suffix = 2;
      while (usedEntradaFolios.has(folio)) {
        folio = `${baseFolio}-D${suffix}`;
        suffix++;
      }
      usedEntradaFolios.add(folio);
      const cantidad = parseNumber(row["CANTIDAD"]);
      const fecha = parseDate(row["FECHA"]);

      if (!fecha || cantidad <= 0) {
        entradasSkipped++;
        continue;
      }

      // Find a matching compra for this material
      let compraId;
      if (comprasByMaterial[codigo] && comprasByMaterial[codigo].length > 0) {
        const compra = comprasByMaterial[codigo].shift();
        compraId = compra.compra_id;
      } else {
        // Create a dummy compra for this entrada
        let dummyFolio = `AUTO-ENT-${codigo}-${dummyComprasCreated}`;
        while (usedCompraFolios.has(dummyFolio)) {
          dummyComprasCreated++;
          dummyFolio = `AUTO-ENT-${codigo}-${dummyComprasCreated}`;
        }
        usedCompraFolios.add(dummyFolio);
        const result = insertDummyCompra.run(dummyFolio, materialId, cantidad, cantidad, fecha);
        compraId = result.lastInsertRowid;
        dummyComprasCreated++;
      }

      insertEntrada.run(folio, compraId, materialId, cantidad, fecha);
      entradasCount++;
    }
  });
  insertEntradasTx();
  console.log(`  ${entradasCount} entradas importadas (${entradasSkipped} omitidas, ${dummyComprasCreated} compras auto-creadas).\n`);

  // =====================================================
  // 4. Import Salidas from salidas.csv
  // =====================================================
  console.log("--- 4. Importando salidas (salidas.csv) ---");
  const salidasRows = parseCSV(path.join(csvsDir, "salidas.csv"));

  const insertSalida = db.prepare(`
    INSERT INTO salidas (folio, material_id, cantidad, referencia, fecha, estatus)
    VALUES (?, ?, ?, ?, ?, 'activa')
  `);

  let salidasCount = 0;
  let salidasSkipped = 0;
  const usedSalidaFolios = new Set();

  const insertSalidasTx = db.transaction(() => {
    for (const row of salidasRows) {
      const codigo = row["CODIGO"];
      const materialId = materialMap[codigo];
      if (!materialId) {
        salidasSkipped++;
        continue;
      }

      let folio = row["FOLIO"] || `SAL-IMP-${salidasCount}`;
      let baseFolio = folio;
      let suffix = 2;
      while (usedSalidaFolios.has(folio)) {
        folio = `${baseFolio}-D${suffix}`;
        suffix++;
      }
      usedSalidaFolios.add(folio);
      const cantidad = parseNumber(row["CANTIDAD"]);
      const fecha = parseDate(row["FECHA"]);
      const privada = (row["PRIVADA"] || "").trim();
      const partida = (row["PARTIDA"] || "").trim();
      const referencia = [privada, partida].filter(Boolean).join(" - ") || "Importado CSV";

      if (!fecha || cantidad <= 0) {
        salidasSkipped++;
        continue;
      }

      insertSalida.run(folio, materialId, cantidad, referencia, fecha);
      salidasCount++;
    }
  });
  insertSalidasTx();
  console.log(`  ${salidasCount} salidas importadas (${salidasSkipped} omitidas).\n`);

  // =====================================================
  // Summary
  // =====================================================
  db.pragma("foreign_keys = ON");

  const matCount = db.prepare("SELECT COUNT(*) as c FROM materiales").get();
  const comCount = db.prepare("SELECT COUNT(*) as c FROM compras").get();
  const entCount = db.prepare("SELECT COUNT(*) as c FROM entradas").get();
  const salCount = db.prepare("SELECT COUNT(*) as c FROM salidas").get();

  console.log("=== Resumen final ===");
  console.log(`  Materiales: ${matCount.c}`);
  console.log(`  Compras:    ${comCount.c}`);
  console.log(`  Entradas:   ${entCount.c}`);
  console.log(`  Salidas:    ${salCount.c}`);

  // Show some stock samples
  const samples = db
    .prepare(
      "SELECT codigo, nombre, stock_fisico, stock_virtual, stock_minimo FROM materiales WHERE stock_fisico != 0 OR stock_virtual != 0 LIMIT 10"
    )
    .all();
  console.log("\n--- Muestra de materiales con stock ---");
  samples.forEach((m) => {
    console.log(
      `  [${m.codigo}] ${m.nombre}: fisico=${m.stock_fisico}, virtual=${m.stock_virtual}, minimo=${m.stock_minimo}`
    );
  });

  db.close();
  console.log("\n¡Importación completada exitosamente!");
}

main();
