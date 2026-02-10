import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const materiales = db.prepare(`
      SELECT id, codigo, nombre, unidad, stock_fisico, stock_virtual,
             (COALESCE(stock_fisico, 0) + COALESCE(stock_virtual, 0)) as stock_disponible,
             stock_minimo, activo
      FROM materiales
      WHERE activo = 1
      ORDER BY nombre ASC
    `).all();

    return NextResponse.json({ success: true, data: materiales });
  } catch (error) {
    console.error("Error obteniendo almacén:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener almacén" },
      { status: 500 }
    );
  }
}
