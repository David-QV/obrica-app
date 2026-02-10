import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Material } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activos = searchParams.get("activos") !== "false";

    const db = getDb();
    let query = "SELECT * FROM materiales";
    if (activos) {
      query += " WHERE activo = 1";
    }
    query += " ORDER BY codigo ASC, nombre ASC";

    const materiales = db.prepare(query).all() as Material[];
    return NextResponse.json({ success: true, data: materiales });
  } catch (error) {
    console.error("Error obteniendo materiales:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener materiales" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, nombre, unidad, stock_minimo } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO materiales (codigo, nombre, unidad, stock_minimo)
         VALUES (?, ?, ?, ?)`
      )
      .run(codigo || null, nombre, unidad || null, stock_minimo != null ? stock_minimo : 0);

    const material = db
      .prepare("SELECT * FROM materiales WHERE id = ?")
      .get(result.lastInsertRowid) as Material;

    return NextResponse.json({ success: true, data: material }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creando material:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return NextResponse.json(
        { success: false, error: "El código ya existe" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Error al crear material" },
      { status: 500 }
    );
  }
}
