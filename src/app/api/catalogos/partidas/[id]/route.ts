import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Partida } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const partida = db
      .prepare("SELECT * FROM partidas WHERE id = ?")
      .get(id) as Partida | undefined;

    if (!partida) {
      return NextResponse.json(
        { success: false, error: "Partida no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: partida });
  } catch (error) {
    console.error("Error obteniendo partida:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener partida" },
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
    const { codigo, nombre, descripcion, activo } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      `UPDATE partidas
       SET codigo = ?, nombre = ?, descripcion = ?, activo = ?
       WHERE id = ?`
    ).run(codigo || null, nombre, descripcion || null, activo !== undefined ? (activo ? 1 : 0) : 1, id);

    const partida = db
      .prepare("SELECT * FROM partidas WHERE id = ?")
      .get(id) as Partida;

    return NextResponse.json({ success: true, data: partida });
  } catch (error) {
    console.error("Error actualizando partida:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar partida" },
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
      .prepare("SELECT COUNT(*) as count FROM movimientos WHERE partida_id = ?")
      .get(id) as { count: number };

    if (hasMovimientos.count > 0) {
      db.prepare("UPDATE partidas SET activo = 0 WHERE id = ?").run(id);
      return NextResponse.json({
        success: true,
        message: "Partida desactivada (tiene registros asociados)",
      });
    }

    db.prepare("DELETE FROM partidas WHERE id = ?").run(id);
    return NextResponse.json({ success: true, message: "Partida eliminada" });
  } catch (error) {
    console.error("Error eliminando partida:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar partida" },
      { status: 500 }
    );
  }
}
