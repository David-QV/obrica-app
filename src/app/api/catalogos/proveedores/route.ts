import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Proveedor } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activos = searchParams.get("activos") !== "false";

    const db = getDb();
    let query = "SELECT * FROM proveedores";
    if (activos) {
      query += " WHERE activo = 1";
    }
    query += " ORDER BY nombre ASC";

    const proveedores = db.prepare(query).all() as Proveedor[];
    return NextResponse.json({ success: true, data: proveedores });
  } catch (error) {
    console.error("Error obteniendo proveedores:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener proveedores" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, rfc, telefono, email, direccion, tipo } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO proveedores (nombre, rfc, telefono, email, direccion, tipo)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(nombre, rfc || null, telefono || null, email || null, direccion || null, tipo || "proveedor");

    const proveedor = db
      .prepare("SELECT * FROM proveedores WHERE id = ?")
      .get(result.lastInsertRowid) as Proveedor;

    return NextResponse.json({ success: true, data: proveedor }, { status: 201 });
  } catch (error) {
    console.error("Error creando proveedor:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear proveedor" },
      { status: 500 }
    );
  }
}
