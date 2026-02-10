import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Material, Salida } from "@/types";

function generarFolio(db: ReturnType<typeof getDb>): string {
  const hoy = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const prefix = `SAL-${hoy}-`;
  const ultima = db
    .prepare("SELECT folio FROM salidas WHERE folio LIKE ? ORDER BY folio DESC LIMIT 1")
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
      SELECT s.*, m.nombre as material_nombre, m.unidad as material_unidad
      FROM salidas s
      LEFT JOIN materiales m ON s.material_id = m.id
    `;
    const conditions: string[] = [];
    const params: unknown[] = [];

    if (estatus) {
      conditions.push("s.estatus = ?");
      params.push(estatus);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }
    query += " ORDER BY s.created_at DESC";

    const salidas = db.prepare(query).all(...params) as Salida[];
    return NextResponse.json({ success: true, data: salidas });
  } catch (error) {
    console.error("Error obteniendo salidas:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener salidas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { material_id, cantidad, referencia, fecha, notas } = body;

    if (!material_id || !cantidad || !referencia || !fecha) {
      return NextResponse.json(
        { success: false, error: "Material, cantidad, referencia y fecha son requeridos" },
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

    const material = db.prepare("SELECT * FROM materiales WHERE id = ?").get(material_id) as Material | undefined;
    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material no encontrado" },
        { status: 404 }
      );
    }

    const stockFisico = material.stock_fisico || 0;
    if (cantidad > stockFisico) {
      return NextResponse.json(
        { success: false, error: `Stock físico insuficiente. Disponible: ${stockFisico}` },
        { status: 400 }
      );
    }

    const stockVirtualAnterior = material.stock_virtual || 0;
    const nuevoStockFisico = stockFisico - cantidad;
    const folio = generarFolio(db);

    const transaction = db.transaction(() => {
      const result = db.prepare(`
        INSERT INTO salidas (folio, material_id, cantidad, referencia, fecha, notas)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(folio, material_id, cantidad, referencia, fecha, notas || null);

      db.prepare("UPDATE materiales SET stock_fisico = ? WHERE id = ?")
        .run(nuevoStockFisico, material_id);

      db.prepare(`
        INSERT INTO inventario_historial (material_id, tipo, referencia_id, cantidad, stock_fisico_anterior, stock_fisico_nuevo, stock_virtual_anterior, stock_virtual_nuevo, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(material_id, "salida", result.lastInsertRowid, cantidad, stockFisico, nuevoStockFisico, stockVirtualAnterior, stockVirtualAnterior, `Salida ${folio} - ${referencia}`);

      return result.lastInsertRowid;
    });

    const salidaId = transaction();
    const salida = db.prepare(`
      SELECT s.*, m.nombre as material_nombre, m.unidad as material_unidad
      FROM salidas s
      LEFT JOIN materiales m ON s.material_id = m.id
      WHERE s.id = ?
    `).get(salidaId) as Salida;

    return NextResponse.json({ success: true, data: salida }, { status: 201 });
  } catch (error) {
    console.error("Error creando salida:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear salida" },
      { status: 500 }
    );
  }
}
