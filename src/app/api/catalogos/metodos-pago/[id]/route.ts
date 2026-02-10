import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { MetodoPago } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, descripcion, activo } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      "UPDATE metodos_pago SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?"
    ).run(nombre, descripcion || null, activo !== undefined ? (activo ? 1 : 0) : 1, id);

    const metodoPago = db
      .prepare("SELECT * FROM metodos_pago WHERE id = ?")
      .get(id) as MetodoPago;
    return NextResponse.json({ success: true, data: metodoPago });
  } catch (error) {
    console.error("Error actualizando método de pago:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar método de pago" },
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

    const hasMovimientos = db
      .prepare("SELECT COUNT(*) as count FROM movimientos WHERE metodo_pago_id = ?")
      .get(id) as { count: number };

    if (hasMovimientos.count > 0) {
      db.prepare("UPDATE metodos_pago SET activo = 0 WHERE id = ?").run(id);
      return NextResponse.json({
        success: true,
        message: "Método de pago desactivado (tiene registros asociados)",
      });
    }

    db.prepare("DELETE FROM metodos_pago WHERE id = ?").run(id);
    return NextResponse.json({ success: true, message: "Método de pago eliminado" });
  } catch (error) {
    console.error("Error eliminando método de pago:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar método de pago" },
      { status: 500 }
    );
  }
}
