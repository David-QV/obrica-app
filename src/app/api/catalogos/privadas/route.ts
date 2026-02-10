import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Privada } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activos = searchParams.get("activos") !== "false";

    const db = getDb();
    let query = "SELECT * FROM privadas";
    if (activos) {
      query += " WHERE activo = 1";
    }
    query += " ORDER BY nombre ASC";

    const privadas = db.prepare(query).all() as Privada[];
    return NextResponse.json({ success: true, data: privadas });
  } catch (error) {
    console.error("Error obteniendo privadas:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener privadas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, ubicacion } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO privadas (nombre, ubicacion) VALUES (?, ?)")
      .run(nombre, ubicacion || null);

    const privada = db
      .prepare("SELECT * FROM privadas WHERE id = ?")
      .get(result.lastInsertRowid) as Privada;

    return NextResponse.json({ success: true, data: privada }, { status: 201 });
  } catch (error) {
    console.error("Error creando privada:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear privada" },
      { status: 500 }
    );
  }
}
