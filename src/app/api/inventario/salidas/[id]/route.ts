import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Material, Salida } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const salida = db.prepare(`
      SELECT s.*, m.nombre as material_nombre, m.unidad as material_unidad
      FROM salidas s
      LEFT JOIN materiales m ON s.material_id = m.id
      WHERE s.id = ?
    `).get(id) as Salida | undefined;

    if (!salida) {
      return NextResponse.json(
        { success: false, error: "Salida no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: salida });
  } catch (error) {
    console.error("Error obteniendo salida:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener salida" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { accion } = body;

    if (accion !== "cancelar") {
      return NextResponse.json(
        { success: false, error: "Acción no válida" },
        { status: 400 }
      );
    }

    const db = getDb();
    const salida = db.prepare("SELECT * FROM salidas WHERE id = ?").get(id) as Salida | undefined;

    if (!salida) {
      return NextResponse.json(
        { success: false, error: "Salida no encontrada" },
        { status: 404 }
      );
    }

    if (salida.estatus === "cancelada") {
      return NextResponse.json(
        { success: false, error: "La salida ya está cancelada" },
        { status: 400 }
      );
    }

    const material = db.prepare("SELECT * FROM materiales WHERE id = ?").get(salida.material_id) as Material;
    const stockFisicoAnterior = material.stock_fisico || 0;
    const stockVirtualAnterior = material.stock_virtual || 0;
    const nuevoStockFisico = stockFisicoAnterior + salida.cantidad;

    const transaction = db.transaction(() => {
      db.prepare("UPDATE salidas SET estatus = 'cancelada' WHERE id = ?").run(id);
      db.prepare("UPDATE materiales SET stock_fisico = ? WHERE id = ?")
        .run(nuevoStockFisico, salida.material_id);

      db.prepare(`
        INSERT INTO inventario_historial (material_id, tipo, referencia_id, cantidad, stock_fisico_anterior, stock_fisico_nuevo, stock_virtual_anterior, stock_virtual_nuevo, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(salida.material_id, "cancelacion_salida", salida.id, salida.cantidad, stockFisicoAnterior, nuevoStockFisico, stockVirtualAnterior, stockVirtualAnterior, `Cancelación salida ${salida.folio}`);
    });

    transaction();
    return NextResponse.json({ success: true, message: "Salida cancelada exitosamente" });
  } catch (error) {
    console.error("Error cancelando salida:", error);
    return NextResponse.json(
      { success: false, error: "Error al cancelar salida" },
      { status: 500 }
    );
  }
}
