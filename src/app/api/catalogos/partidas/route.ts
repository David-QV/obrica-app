import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Partida } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activos = searchParams.get("activos") !== "false";

    const db = getDb();
    let query = "SELECT * FROM partidas";
    if (activos) {
      query += " WHERE activo = 1";
    }
    query += " ORDER BY codigo ASC, nombre ASC";

    const partidas = db.prepare(query).all() as Partida[];
    return NextResponse.json({ success: true, data: partidas });
  } catch (error) {
    console.error("Error obteniendo partidas:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener partidas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { codigo, nombre, descripcion } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO partidas (codigo, nombre, descripcion)
         VALUES (?, ?, ?)`
      )
      .run(codigo || null, nombre, descripcion || null);

    const partida = db
      .prepare("SELECT * FROM partidas WHERE id = ?")
      .get(result.lastInsertRowid) as Partida;

    return NextResponse.json({ success: true, data: partida }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creando partida:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return NextResponse.json(
        { success: false, error: "El código ya existe" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Error al crear partida" },
      { status: 500 }
    );
  }
}
