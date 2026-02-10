import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Movimiento } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const movimiento = db
      .prepare("SELECT * FROM movimientos WHERE id = ?")
      .get(id) as Movimiento | undefined;

    if (!movimiento) {
      return NextResponse.json(
        { success: false, error: "Movimiento no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: movimiento });
  } catch (error) {
    console.error("Error obteniendo movimiento:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener movimiento" },
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
    const {
      tipo,
      fecha,
      etapa_id,
      privada_id,
      partida_id,
      rubro_id,
      descripcion,
      estimacion,
      proveedor_id,
      contrato_id,
      monto,
      metodo_pago_id,
      comprobante,
      notas,
    } = body;

    if (!tipo || !fecha || !monto) {
      return NextResponse.json(
        { success: false, error: "Tipo, fecha y monto son requeridos" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      `UPDATE movimientos SET
        tipo = ?, fecha = ?, etapa_id = ?, privada_id = ?, partida_id = ?,
        rubro_id = ?, descripcion = ?, estimacion = ?, proveedor_id = ?,
        contrato_id = ?, monto = ?, metodo_pago_id = ?, comprobante = ?,
        notas = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      tipo,
      fecha,
      etapa_id || null,
      privada_id || null,
      partida_id || null,
      rubro_id || null,
      descripcion || null,
      estimacion || null,
      proveedor_id || null,
      contrato_id || null,
      parseFloat(monto),
      metodo_pago_id || null,
      comprobante || null,
      notas || null,
      id
    );

    const movimiento = db
      .prepare("SELECT * FROM movimientos WHERE id = ?")
      .get(id) as Movimiento;

    return NextResponse.json({ success: true, data: movimiento });
  } catch (error) {
    console.error("Error actualizando movimiento:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar movimiento" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    db.prepare("DELETE FROM movimientos WHERE id = ?").run(id);
    return NextResponse.json({ success: true, message: "Movimiento eliminado" });
  } catch (error) {
    console.error("Error eliminando movimiento:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar movimiento" },
      { status: 500 }
    );
  }
}
