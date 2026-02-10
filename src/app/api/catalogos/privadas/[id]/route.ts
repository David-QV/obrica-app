import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Privada } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, ubicacion, activo } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      "UPDATE privadas SET nombre = ?, ubicacion = ?, activo = ? WHERE id = ?"
    ).run(nombre, ubicacion || null, activo !== undefined ? (activo ? 1 : 0) : 1, id);

    const privada = db
      .prepare("SELECT * FROM privadas WHERE id = ?")
      .get(id) as Privada;
    return NextResponse.json({ success: true, data: privada });
  } catch (error) {
    console.error("Error actualizando privada:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar privada" },
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
      .prepare("SELECT COUNT(*) as count FROM movimientos WHERE privada_id = ?")
      .get(id) as { count: number };

    const hasContratos = db
      .prepare("SELECT COUNT(*) as count FROM contratos WHERE privada_id = ?")
      .get(id) as { count: number };

    if (hasMovimientos.count > 0 || hasContratos.count > 0) {
      db.prepare("UPDATE privadas SET activo = 0 WHERE id = ?").run(id);
      return NextResponse.json({
        success: true,
        message: "Privada desactivada (tiene registros asociados)",
      });
    }

    db.prepare("DELETE FROM privadas WHERE id = ?").run(id);
    return NextResponse.json({ success: true, message: "Privada eliminada" });
  } catch (error) {
    console.error("Error eliminando privada:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar privada" },
      { status: 500 }
    );
  }
}
