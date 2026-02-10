import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { MetodoPago } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activos = searchParams.get("activos") !== "false";

    const db = getDb();
    let query = "SELECT * FROM metodos_pago";
    if (activos) {
      query += " WHERE activo = 1";
    }
    query += " ORDER BY nombre ASC";

    const metodosPago = db.prepare(query).all() as MetodoPago[];
    return NextResponse.json({ success: true, data: metodosPago });
  } catch (error) {
    console.error("Error obteniendo métodos de pago:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener métodos de pago" },
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
      .prepare("INSERT INTO metodos_pago (nombre, descripcion) VALUES (?, ?)")
      .run(nombre, descripcion || null);

    const metodoPago = db
      .prepare("SELECT * FROM metodos_pago WHERE id = ?")
      .get(result.lastInsertRowid) as MetodoPago;

    return NextResponse.json({ success: true, data: metodoPago }, { status: 201 });
  } catch (error) {
    console.error("Error creando método de pago:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear método de pago" },
      { status: 500 }
    );
  }
}
