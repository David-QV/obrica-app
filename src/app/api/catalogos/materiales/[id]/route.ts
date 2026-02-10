import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Material } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const material = db
      .prepare("SELECT * FROM materiales WHERE id = ?")
      .get(id) as Material | undefined;

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: material });
  } catch (error) {
    console.error("Error obteniendo material:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener material" },
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
    const { codigo, nombre, unidad, activo, stock_minimo } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    db.prepare(
      `UPDATE materiales
       SET codigo = ?, nombre = ?, unidad = ?, activo = ?, stock_minimo = ?
       WHERE id = ?`
    ).run(codigo || null, nombre, unidad || null, activo !== undefined ? (activo ? 1 : 0) : 1, stock_minimo != null ? stock_minimo : 0, id);

    const material = db
      .prepare("SELECT * FROM materiales WHERE id = ?")
      .get(id) as Material;

    return NextResponse.json({ success: true, data: material });
  } catch (error) {
    console.error("Error actualizando material:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar material" },
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

    db.prepare("DELETE FROM materiales WHERE id = ?").run(id);
    return NextResponse.json({ success: true, message: "Material eliminado" });
  } catch (error) {
    console.error("Error eliminando material:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar material" },
      { status: 500 }
    );
  }
}
