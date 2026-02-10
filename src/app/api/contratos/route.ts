import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Contrato } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const estatus = searchParams.get("estatus");

    const db = getDb();
    let query = `
      SELECT c.*,
             p.nombre as proveedor_nombre,
             pr.nombre as privada_nombre
      FROM contratos c
      LEFT JOIN proveedores p ON c.proveedor_id = p.id
      LEFT JOIN privadas pr ON c.privada_id = pr.id
    `;

    if (estatus) {
      query += ` WHERE c.estatus = '${estatus}'`;
    }
    query += " ORDER BY c.created_at DESC";

    const contratos = db.prepare(query).all() as (Contrato & {
      proveedor_nombre: string | null;
      privada_nombre: string | null;
    })[];

    return NextResponse.json({ success: true, data: contratos });
  } catch (error) {
    console.error("Error obteniendo contratos:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener contratos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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

    const result = db
      .prepare(
        `INSERT INTO contratos (
          numero_contrato, descripcion, total, total_con_iva, estimado, pagado,
          por_cobrar, por_estimar, margen_operativo, porcentaje_operativo,
          mano_obra, materiales, indirectos, proveedor_id, privada_id,
          fecha_inicio, fecha_fin, estatus
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
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
        estatus || "activo"
      );

    const contrato = db
      .prepare("SELECT * FROM contratos WHERE id = ?")
      .get(result.lastInsertRowid) as Contrato;

    return NextResponse.json({ success: true, data: contrato }, { status: 201 });
  } catch (error: unknown) {
    console.error("Error creando contrato:", error);
    if (error && typeof error === "object" && "code" in error && error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return NextResponse.json(
        { success: false, error: "El número de contrato ya existe" },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { success: false, error: "Error al crear contrato" },
      { status: 500 }
    );
  }
}
