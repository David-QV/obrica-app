import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Proveedor } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const proveedor = db
      .prepare("SELECT * FROM proveedores WHERE id = ?")
      .get(id) as Proveedor | undefined;

    if (!proveedor) {
      return NextResponse.json(
        { success: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: proveedor });
  } catch (error) {
    console.error("Error obteniendo proveedor:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener proveedor" },
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
    const { nombre, rfc, telefono, email, direccion, tipo, activo } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    const existing = db
      .prepare("SELECT id FROM proveedores WHERE id = ?")
      .get(id);

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Proveedor no encontrado" },
        { status: 404 }
      );
    }

    db.prepare(
      `UPDATE proveedores
       SET nombre = ?, rfc = ?, telefono = ?, email = ?, direccion = ?, tipo = ?, activo = ?
       WHERE id = ?`
    ).run(
      nombre,
      rfc || null,
      telefono || null,
      email || null,
      direccion || null,
      tipo || "proveedor",
      activo !== undefined ? (activo ? 1 : 0) : 1,
      id
    );

    const proveedor = db
      .prepare("SELECT * FROM proveedores WHERE id = ?")
      .get(id) as Proveedor;

    return NextResponse.json({ success: true, data: proveedor });
  } catch (error) {
    console.error("Error actualizando proveedor:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar proveedor" },
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

    // Verificar si tiene movimientos o contratos asociados
    const hasMovimientos = db
      .prepare("SELECT COUNT(*) as count FROM movimientos WHERE proveedor_id = ?")
      .get(id) as { count: number };

    const hasContratos = db
      .prepare("SELECT COUNT(*) as count FROM contratos WHERE proveedor_id = ?")
      .get(id) as { count: number };

    if (hasMovimientos.count > 0 || hasContratos.count > 0) {
      // Soft delete
      db.prepare("UPDATE proveedores SET activo = 0 WHERE id = ?").run(id);
      return NextResponse.json({
        success: true,
        message: "Proveedor desactivado (tiene registros asociados)",
      });
    }

    // Hard delete si no tiene registros
    db.prepare("DELETE FROM proveedores WHERE id = ?").run(id);
    return NextResponse.json({ success: true, message: "Proveedor eliminado" });
  } catch (error) {
    console.error("Error eliminando proveedor:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar proveedor" },
      { status: 500 }
    );
  }
}
