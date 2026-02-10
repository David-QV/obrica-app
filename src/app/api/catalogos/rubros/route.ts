import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Rubro } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activos = searchParams.get("activos") !== "false";

    const db = getDb();
    let query = "SELECT * FROM rubros";
    if (activos) {
      query += " WHERE activo = 1";
    }
    query += " ORDER BY nombre ASC";

    const rubros = db.prepare(query).all() as Rubro[];
    return NextResponse.json({ success: true, data: rubros });
  } catch (error) {
    console.error("Error obteniendo rubros:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener rubros" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, descripcion } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO rubros (nombre, descripcion) VALUES (?, ?)")
      .run(nombre, descripcion || null);

    const rubro = db
      .prepare("SELECT * FROM rubros WHERE id = ?")
      .get(result.lastInsertRowid) as Rubro;

    return NextResponse.json({ success: true, data: rubro }, { status: 201 });
  } catch (error) {
    console.error("Error creando rubro:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear rubro" },
      { status: 500 }
    );
  }
}
