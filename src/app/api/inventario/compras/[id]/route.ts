import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Compra, Material } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const compra = db.prepare(`
      SELECT c.*, m.nombre as material_nombre, m.unidad as material_unidad, p.nombre as proveedor_nombre
      FROM compras c
      LEFT JOIN materiales m ON c.material_id = m.id
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      WHERE c.id = ?
    `).get(id) as Compra | undefined;

    if (!compra) {
      return NextResponse.json(
        { success: false, error: "Compra no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: compra });
  } catch (error) {
    console.error("Error obteniendo compra:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener compra" },
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
    const compra = db.prepare("SELECT * FROM compras WHERE id = ?").get(id) as Compra | undefined;

    if (!compra) {
      return NextResponse.json(
        { success: false, error: "Compra no encontrada" },
        { status: 404 }
      );
    }

    if (compra.estatus === "cancelada") {
      return NextResponse.json(
        { success: false, error: "La compra ya está cancelada" },
        { status: 400 }
      );
    }

    // Check for active entries
    const entradasActivas = db.prepare(
      "SELECT COUNT(*) as count FROM entradas WHERE compra_id = ? AND estatus = 'activa'"
    ).get(id) as { count: number };

    if (entradasActivas.count > 0) {
      return NextResponse.json(
        { success: false, error: "No se puede cancelar: tiene entradas activas asociadas. Cancele las entradas primero." },
        { status: 400 }
      );
    }

    const material = db.prepare("SELECT * FROM materiales WHERE id = ?").get(compra.material_id) as Material;
    const stockVirtualAnterior = material.stock_virtual || 0;
    const stockFisicoAnterior = material.stock_fisico || 0;
    const cantidadPendiente = compra.cantidad - compra.cantidad_recibida;
    const nuevoStockVirtual = stockVirtualAnterior - cantidadPendiente;

    const transaction = db.transaction(() => {
      db.prepare("UPDATE compras SET estatus = 'cancelada' WHERE id = ?").run(id);
      db.prepare("UPDATE materiales SET stock_virtual = ? WHERE id = ?").run(Math.max(0, nuevoStockVirtual), compra.material_id);
      db.prepare(`
        INSERT INTO inventario_historial (material_id, tipo, referencia_id, cantidad, stock_fisico_anterior, stock_fisico_nuevo, stock_virtual_anterior, stock_virtual_nuevo, notas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(compra.material_id, "cancelacion_compra", compra.id, cantidadPendiente, stockFisicoAnterior, stockFisicoAnterior, stockVirtualAnterior, Math.max(0, nuevoStockVirtual), `Cancelación compra ${compra.folio}`);
    });

    transaction();
    return NextResponse.json({ success: true, message: "Compra cancelada exitosamente" });
  } catch (error) {
    console.error("Error cancelando compra:", error);
    return NextResponse.json(
      { success: false, error: "Error al cancelar compra" },
      { status: 500 }
    );
  }
}
