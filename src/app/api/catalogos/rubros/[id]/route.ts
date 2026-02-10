import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Rubro } from "@/types";

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
      "UPDATE rubros SET nombre = ?, descripcion = ?, activo = ? WHERE id = ?"
    ).run(nombre, descripcion || null, activo !== undefined ? (activo ? 1 : 0) : 1, id);

    const rubro = db.prepare("SELECT * FROM rubros WHERE id = ?").get(id) as Rubro;
    return NextResponse.json({ success: true, data: rubro });
  } catch (error) {
    console.error("Error actualizando rubro:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar rubro" },
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
      .prepare("SELECT COUNT(*) as count FROM movimientos WHERE rubro_id = ?")
      .get(id) as { count: number };

    if (hasMovimientos.count > 0) {
      db.prepare("UPDATE rubros SET activo = 0 WHERE id = ?").run(id);
      return NextResponse.json({
        success: true,
        message: "Rubro desactivado (tiene registros asociados)",
      });
    }

    db.prepare("DELETE FROM rubros WHERE id = ?").run(id);
    return NextResponse.json({ success: true, message: "Rubro eliminado" });
  } catch (error) {
    console.error("Error eliminando rubro:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar rubro" },
      { status: 500 }
    );
  }
}
