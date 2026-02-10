import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Etapa } from "@/types";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { nombre, orden, activo } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      "UPDATE etapas SET nombre = ?, orden = ?, activo = ? WHERE id = ?"
    ).run(nombre, orden || null, activo !== undefined ? (activo ? 1 : 0) : 1, id);

    const etapa = db.prepare("SELECT * FROM etapas WHERE id = ?").get(id) as Etapa;
    return NextResponse.json({ success: true, data: etapa });
  } catch (error) {
    console.error("Error actualizando etapa:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar etapa" },
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
      .prepare("SELECT COUNT(*) as count FROM movimientos WHERE etapa_id = ?")
      .get(id) as { count: number };

    if (hasMovimientos.count > 0) {
      db.prepare("UPDATE etapas SET activo = 0 WHERE id = ?").run(id);
      return NextResponse.json({
        success: true,
        message: "Etapa desactivada (tiene registros asociados)",
      });
    }

    db.prepare("DELETE FROM etapas WHERE id = ?").run(id);
    return NextResponse.json({ success: true, message: "Etapa eliminada" });
  } catch (error) {
    console.error("Error eliminando etapa:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar etapa" },
      { status: 500 }
    );
  }
}
