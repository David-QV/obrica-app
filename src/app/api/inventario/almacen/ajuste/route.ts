import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Material } from "@/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { material_id, stock_fisico, stock_minimo, notas } = body;

    if (!material_id) {
      return NextResponse.json(
        { success: false, error: "Material es requerido" },
        { status: 400 }
      );
    }

    if (stock_fisico === undefined && stock_minimo === undefined) {
      return NextResponse.json(
        { success: false, error: "Debe indicar stock físico o stock mínimo" },
        { status: 400 }
      );
    }

    if (stock_fisico !== undefined && !notas) {
      return NextResponse.json(
        { success: false, error: "El motivo del ajuste es obligatorio" },
        { status: 400 }
      );
    }

    const db = getDb();
    const material = db.prepare("SELECT * FROM materiales WHERE id = ?").get(material_id) as Material | undefined;

    if (!material) {
      return NextResponse.json(
        { success: false, error: "Material no encontrado" },
        { status: 404 }
      );
    }

    const transaction = db.transaction(() => {
      const updates: string[] = [];
      const params: unknown[] = [];

      if (stock_fisico !== undefined) {
        updates.push("stock_fisico = ?");
        params.push(stock_fisico);

        // Register history for stock adjustment
        db.prepare(`
          INSERT INTO inventario_historial (material_id, tipo, referencia_id, cantidad, stock_fisico_anterior, stock_fisico_nuevo, stock_virtual_anterior, stock_virtual_nuevo, notas)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          material_id, "ajuste", null,
          stock_fisico - (material.stock_fisico || 0),
          material.stock_fisico || 0, stock_fisico,
          material.stock_virtual || 0, material.stock_virtual || 0,
          `Ajuste manual: ${notas}`
        );
      }

      if (stock_minimo !== undefined) {
        updates.push("stock_minimo = ?");
        params.push(stock_minimo);
      }

      if (updates.length > 0) {
        params.push(material_id);
        db.prepare(`UPDATE materiales SET ${updates.join(", ")} WHERE id = ?`).run(...params);
      }
    });

    transaction();

    const updated = db.prepare(`
      SELECT id, codigo, nombre, unidad, stock_fisico, stock_virtual,
             (COALESCE(stock_fisico, 0) + COALESCE(stock_virtual, 0)) as stock_disponible,
             stock_minimo, activo
      FROM materiales WHERE id = ?
    `).get(material_id);

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error("Error en ajuste de inventario:", error);
    return NextResponse.json(
      { success: false, error: "Error al realizar ajuste" },
      { status: 500 }
    );
  }
}
