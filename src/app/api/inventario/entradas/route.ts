import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Compra, Entrada, Material } from "@/types";

function generarFolio(db: ReturnType<typeof getDb>): string {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `ENT-${hoy}-`;
  const ultima = db
    .prepare("SELECT folio FROM entradas WHERE folio LIKE ? ORDER BY folio DESC LIMIT 1")
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
      SELECT e.*, c.folio as compra_folio, m.nombre as material_nombre, m.unidad as material_unidad
      FROM entradas e
      LEFT JOIN compras c ON e.compra_id = c.id
      LEFT JOIN materiales m ON e.material_id = m.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (estatus) {
      conditions.push("e.estatus = ?");
      params.push(estatus);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY e.created_at DESC";

    const entradas = db.prepare(query).all(...params) as Entrada[];
    return NextResponse.json({ success: true, data: entradas });
  } catch (error) {
    console.error("Error obteniendo entradas:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener entradas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { compra_id, cantidad, fecha, notas } = body;

    if (!compra_id || !cantidad || !fecha) {
      return NextResponse.json(
        { success: false, error: "Compra, cantidad y fecha son requeridos" },
        { status: 400 }
      );
    }

    if (cantidad <= 0) {
      return NextResponse.json(
        { success: false, error: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Validate compra exists and is active
    const compra = db.prepare("SELECT * FROM compras WHERE id = ?").get(compra_id) as Compra | undefined;
    if (!compra) {
      return NextResponse.json(
        { success: false, error: "Compra no encontrada" },
        { status: 404 }
      );
    }
    if (compra.estatus !== "activa") {
      return NextResponse.json(
        { success: false, error: "La compra no está activa" },
        { status: 400 }
      );
    }

    // Validate quantity doesn't exceed pending
    const pendiente = compra.cantidad - compra.cantidad_recibida;
    if (cantidad > pendiente) {
      return NextResponse.json(
        { success: false, error: `No se puede recibir más de lo pendiente (${pendiente})` },
        { status: 400 }
      );
    }

    const material = db.prepare("SELECT * FROM materiales WHERE id = ?").get(compra.material_id) as Material;
    const stockVirtualAnterior = material.stock_virtual || 0;
    const stockFisicoAnterior = material.stock_fisico || 0;
    const nuevoStockVirtual = stockVirtualAnterior - cantidad;
    const nuevoStockFisico = stockFisicoAnterior + cantidad;
    const folio = generarFolio(db);
    const nuevaCantidadRecibida = compra.cantidad_recibida + cantidad;
    const compraCompletada = nuevaCantidadRecibida >= compra.cantidad;

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO entradas (folio, compra_id, material_id, cantidad, fecha, notas)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(folio, compra_id, compra.material_id, cantidad, fecha, notas || null);

      // Transfer stock: virtual -> fisico
      db.prepare("UPDATE materiales SET stock_virtual = ?, stock_fisico = ? WHERE id = ?")
        .run(Math.max(0, nuevoStockVirtual), nuevoStockFisico, compra.material_id);

      // Update compra received quantity and status
      db.prepare("UPDATE compras SET cantidad_recibida = ?, estatus = ? WHERE id = ?")
        .run(nuevaCantidadRecibida, compraCompletada ? "completada" : "activa", compra_id);

      // Register history
      db.prepare(`
        INSERT INTO inventario_historial (material_id, tipo, referencia_id, cantidad, stock_fisico_anterior, stock_fisico_nuevo, stock_virtual_anterior, stock_virtual_nuevo, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(compra.material_id, "entrada", result.lastInsertRowid, cantidad, stockFisicoAnterior, nuevoStockFisico, stockVirtualAnterior, Math.max(0, nuevoStockVirtual), `Entrada ${folio} de compra ${compra.folio}`);

      return result.lastInsertRowid;
    });

    const entradaId = transaction();
    const entrada = db.prepare(`
      SELECT e.*, c.folio as compra_folio, m.nombre as material_nombre, m.unidad as material_unidad
      FROM entradas e
      LEFT JOIN compras c ON e.compra_id = c.id
      LEFT JOIN materiales m ON e.material_id = m.id
      WHERE e.id = ?
    `).get(entradaId) as Entrada;

    return NextResponse.json({ success: true, data: entrada }, { status: 201 });
  } catch (error) {
    console.error("Error creando entrada:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear entrada" },
      { status: 500 }
    );
  }
}
