import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Compra, Material } from "@/types";

function generarFolio(db: ReturnType<typeof getDb>): string {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `COM-${hoy}-`;
  const ultima = db
    .prepare("SELECT folio FROM compras WHERE folio LIKE ? ORDER BY folio DESC LIMIT 1")
    .get(`${prefix}%`) as { folio: string } | undefined;

  const siguiente = ultima
    ? String(parseInt(ultima.folio.split("-").pop()!) + 1).padStart(3, "0")
    : "001";
  return `${prefix}${siguiente}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estatus = searchParams.get("estatus");

    const db = getDb();
    let query = `
      SELECT c.*, m.nombre as material_nombre, m.unidad as material_unidad, p.nombre as proveedor_nombre
      FROM compras c
      LEFT JOIN materiales m ON c.material_id = m.id
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (estatus) {
      conditions.push("c.estatus = ?");
      params.push(estatus);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY c.created_at DESC";

    const compras = db.prepare(query).all(...params) as Compra[];
    return NextResponse.json({ success: true, data: compras });
  } catch (error) {
    console.error("Error obteniendo compras:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener compras" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { material_id, proveedor_id, cantidad, precio_unitario, fecha, notas } = body;

    if (!material_id || !cantidad || !precio_unitario || !fecha) {
      return NextResponse.json(
        { success: false, error: "Material, cantidad, precio unitario y fecha son requeridos" },
        { status: 400 }
      );
    }

    if (cantidad <= 0 || precio_unitario <= 0) {
      return NextResponse.json(
        { success: false, error: "Cantidad y precio deben ser mayores a 0" },
        { status: 400 }
      );
    }

    const db = getDb();
    const total = cantidad * precio_unitario;
    const folio = generarFolio(db);

    // Get current stock
    const material = db.prepare("SELECT * FROM materiales WHERE id = ?").get(material_id) as Material | undefined;
    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material no encontrado" },
        { status: 404 }
      );
    }

    const stockVirtualAnterior = material.stock_virtual || 0;
    const stockFisicoAnterior = material.stock_fisico || 0;
    const nuevoStockVirtual = stockVirtualAnterior + cantidad;

    // Transaction: create compra + update stock + register history
    const insertCompra = db.prepare(`
      INSERT INTO compras (folio, material_id, proveedor_id, cantidad, precio_unitario, total, fecha, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateStock = db.prepare("UPDATE materiales SET stock_virtual = ? WHERE id = ?");
    const insertHistorial = db.prepare(`
      INSERT INTO inventario_historial (material_id, tipo, referencia_id, cantidad, stock_fisico_anterior, stock_fisico_nuevo, stock_virtual_anterior, stock_virtual_nuevo, notas)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      const result = insertCompra.run(folio, material_id, proveedor_id || null, cantidad, precio_unitario, total, fecha, notas || null);
      updateStock.run(nuevoStockVirtual, material_id);
      insertHistorial.run(material_id, "compra", result.lastInsertRowid, cantidad, stockFisicoAnterior, stockFisicoAnterior, stockVirtualAnterior, nuevoStockVirtual, `Compra ${folio}`);
      return result.lastInsertRowid;
    });

    const compraId = transaction();
    const compra = db.prepare(`
      SELECT c.*, m.nombre as material_nombre, m.unidad as material_unidad, p.nombre as proveedor_nombre
      FROM compras c
      LEFT JOIN materiales m ON c.material_id = m.id
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      WHERE c.id = ?
    `).get(compraId) as Compra;

    return NextResponse.json({ success: true, data: compra }, { status: 201 });
  } catch (error) {
    console.error("Error creando compra:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear compra" },
      { status: 500 }
    );
  }
}
