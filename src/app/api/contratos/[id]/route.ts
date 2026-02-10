import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Contrato } from "@/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const db = getDb();
    const contrato = db
      .prepare(
        `SELECT c.*,
                p.nombre as proveedor_nombre,
                pr.nombre as privada_nombre
         FROM contratos c
         LEFT JOIN proveedores p ON c.proveedor_id = p.id
         LEFT JOIN privadas pr ON c.privada_id = pr.id
         WHERE c.id = ?`
      )
      .get(id) as Contrato | undefined;

    if (!contrato) {
      return NextResponse.json(
        { success: false, error: "Contrato no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: contrato });
  } catch (error) {
    console.error("Error obteniendo contrato:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener contrato" },
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
    const {
      numero_contrato,
      descripcion,
      total,
      total_con_iva,
      estimado,
      pagado,
      margen_operativo,
      porcentaje_operativo,
      mano_obra,
      materiales,
      indirectos,
      proveedor_id,
      privada_id,
      fecha_inicio,
      fecha_fin,
      estatus,
    } = body;

    if (!numero_contrato) {
      return NextResponse.json(
        { success: false, error: "El número de contrato es requerido" },
        { status: 400 }
      );
    }

    const db = getDb();

    // Calcular campos derivados
    const totalNum = parseFloat(total) || 0;
    const estimadoNum = parseFloat(estimado) || 0;
    const pagadoNum = parseFloat(pagado) || 0;
    const por_cobrar = estimadoNum - pagadoNum;
    const por_estimar = totalNum - estimadoNum;

    db.prepare(
      `UPDATE contratos SET
        numero_contrato = ?, descripcion = ?, total = ?, total_con_iva = ?,
        estimado = ?, pagado = ?, por_cobrar = ?, por_estimar = ?,
        margen_operativo = ?, porcentaje_operativo = ?, mano_obra = ?,
        materiales = ?, indirectos = ?, proveedor_id = ?, privada_id = ?,
        fecha_inicio = ?, fecha_fin = ?, estatus = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      numero_contrato,
      descripcion || null,
      totalNum,
      parseFloat(total_con_iva) || 0,
      estimadoNum,
      pagadoNum,
      por_cobrar,
      por_estimar,
      parseFloat(margen_operativo) || 0,
      parseFloat(porcentaje_operativo) || 0,
      parseFloat(mano_obra) || 0,
      parseFloat(materiales) || 0,
      parseFloat(indirectos) || 0,
      proveedor_id || null,
      privada_id || null,
      fecha_inicio || null,
      fecha_fin || null,
      estatus || "activo",
      id
    );

    const contrato = db
      .prepare("SELECT * FROM contratos WHERE id = ?")
      .get(id) as Contrato;

    return NextResponse.json({ success: true, data: contrato });
  } catch (error) {
    console.error("Error actualizando contrato:", error);
    return NextResponse.json(
      { success: false, error: "Error al actualizar contrato" },
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

    // Verificar si tiene movimientos asociados
    const hasMovimientos = db
      .prepare("SELECT COUNT(*) as count FROM movimientos WHERE contrato_id = ?")
      .get(id) as { count: number };

    if (hasMovimientos.count > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "No se puede eliminar el contrato porque tiene movimientos asociados",
        },
        { status: 400 }
      );
    }

    db.prepare("DELETE FROM contratos WHERE id = ?").run(id);
    return NextResponse.json({ success: true, message: "Contrato eliminado" });
  } catch (error) {
    console.error("Error eliminando contrato:", error);
    return NextResponse.json(
      { success: false, error: "Error al eliminar contrato" },
      { status: 500 }
    );
  }
}
