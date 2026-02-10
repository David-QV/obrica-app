import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Etapa } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activos = searchParams.get("activos") !== "false";

    const db = getDb();
    let query = "SELECT * FROM etapas";
    if (activos) {
      query += " WHERE activo = 1";
    }
    query += " ORDER BY orden ASC, nombre ASC";

    const etapas = db.prepare(query).all() as Etapa[];
    return NextResponse.json({ success: true, data: etapas });
  } catch (error) {
    console.error("Error obteniendo etapas:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener etapas" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { nombre, orden } = body;

    if (!nombre) {
      return NextResponse.json(
        { success: false, error: "El nombre es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare("INSERT INTO etapas (nombre, orden) VALUES (?, ?)")
      .run(nombre, orden || null);

    const etapa = db
      .prepare("SELECT * FROM etapas WHERE id = ?")
      .get(result.lastInsertRowid) as Etapa;

    return NextResponse.json({ success: true, data: etapa }, { status: 201 });
  } catch (error) {
    console.error("Error creando etapa:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear etapa" },
      { status: 500 }
    );
  }
}
