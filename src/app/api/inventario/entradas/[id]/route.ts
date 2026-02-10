import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Compra, Entrada, Material } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const entrada = db.prepare(`
      SELECT e.*, c.folio as compra_folio, m.nombre as material_nombre, m.unidad as material_unidad
      FROM entradas e
      LEFT JOIN compras c ON e.compra_id = c.id
      LEFT JOIN materiales m ON e.material_id = m.id
      WHERE e.id = ?
    `).get(id) as Entrada | undefined;

    if (!entrada) {
      return NextResponse.json(
        { success: false, error: "Entrada no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: entrada });
  } catch (error) {
    console.error("Error obteniendo entrada:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener entrada" },
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
    const entrada = db.prepare("SELECT * FROM entradas WHERE id = ?").get(id) as Entrada | undefined;

    if (!entrada) {
      return NextResponse.json(
        { success: false, error: "Entrada no encontrada" },
        { status: 404 }
      );
    }

    if (entrada.estatus === "cancelada") {
      return NextResponse.json(
        { success: false, error: "La entrada ya está cancelada" },
        { status: 400 }
      );
    }

    const material = db.prepare("SELECT * FROM materiales WHERE id = ?").get(entrada.material_id) as Material;
    const compra = db.prepare("SELECT * FROM compras WHERE id = ?").get(entrada.compra_id) as Compra;

    const stockVirtualAnterior = material.stock_virtual || 0;
    const stockFisicoAnterior = material.stock_fisico || 0;
    const nuevoStockVirtual = stockVirtualAnterior + entrada.cantidad;
    const nuevoStockFisico = stockFisicoAnterior - entrada.cantidad;

    const transaction = db.transaction(() => {
      db.prepare("UPDATE entradas SET estatus = 'cancelada' WHERE id = ?").run(id);

      // Revert stock: +virtual, -fisico
      db.prepare("UPDATE materiales SET stock_virtual = ?, stock_fisico = ? WHERE id = ?")
        .run(nuevoStockVirtual, Math.max(0, nuevoStockFisico), entrada.material_id);

      // Update compra received quantity and reactivate if needed
      const nuevaCantidadRecibida = compra.cantidad_recibida - entrada.cantidad;
      db.prepare("UPDATE compras SET cantidad_recibida = ?, estatus = ? WHERE id = ?")
        .run(Math.max(0, nuevaCantidadRecibida), compra.estatus === "cancelada" ? "cancelada" : "activa", entrada.compra_id);

      db.prepare(`
        INSERT INTO inventario_historial (material_id, tipo, referencia_id, cantidad, stock_fisico_anterior, stock_fisico_nuevo, stock_virtual_anterior, stock_virtual_nuevo, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(entrada.material_id, "cancelacion_entrada", entrada.id, entrada.cantidad, stockFisicoAnterior, Math.max(0, nuevoStockFisico), stockVirtualAnterior, nuevoStockVirtual, `Cancelación entrada ${entrada.folio}`);
    });

    transaction();
    return NextResponse.json({ success: true, message: "Entrada cancelada exitosamente" });
  } catch (error) {
    console.error("Error cancelando entrada:", error);
    return NextResponse.json(
      { success: false, error: "Error al cancelar entrada" },
      { status: 500 }
    );
  }
}
