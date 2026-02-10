import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Movimiento } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const contrato_id = searchParams.get("contrato_id");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");

    const db = getDb();
    let query = `
      SELECT m.*,
             e.nombre as etapa_nombre,
             pr.nombre as privada_nombre,
             pa.nombre as partida_nombre,
             pa.codigo as partida_codigo,
             r.nombre as rubro_nombre,
             p.nombre as proveedor_nombre,
             c.numero_contrato as contrato_numero,
             mp.nombre as metodo_pago_nombre
      FROM movimientos m
      LEFT JOIN etapas e ON m.etapa_id = e.id
      LEFT JOIN privadas pr ON m.privada_id = pr.id
      LEFT JOIN partidas pa ON m.partida_id = pa.id
      LEFT JOIN rubros r ON m.rubro_id = r.id
      LEFT JOIN proveedores p ON m.proveedor_id = p.id
      LEFT JOIN contratos c ON m.contrato_id = c.id
      LEFT JOIN metodos_pago mp ON m.metodo_pago_id = mp.id
      WHERE 1=1
    `;

    const params: (string | number)[] = [];

    if (tipo) {
      query += " AND m.tipo = ?";
      params.push(tipo);
    }

    if (contrato_id) {
      query += " AND m.contrato_id = ?";
      params.push(contrato_id);
    }

    if (fecha_inicio) {
      query += " AND m.fecha >= ?";
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += " AND m.fecha <= ?";
      params.push(fecha_fin);
    }

    query += " ORDER BY m.fecha DESC, m.id DESC";

    const movimientos = db.prepare(query).all(...params) as (Movimiento & {
      etapa_nombre: string | null;
      privada_nombre: string | null;
      partida_nombre: string | null;
      partida_codigo: string | null;
      rubro_nombre: string | null;
      proveedor_nombre: string | null;
      contrato_numero: string | null;
      metodo_pago_nombre: string | null;
    })[];

    return NextResponse.json({ success: true, data: movimientos });
  } catch (error) {
    console.error("Error obteniendo movimientos:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener movimientos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      tipo,
      fecha,
      etapa_id,
      privada_id,
      partida_id,
      rubro_id,
      descripcion,
      estimacion,
      proveedor_id,
      contrato_id,
      monto,
      metodo_pago_id,
      comprobante,
      notas,
    } = body;

    if (!tipo || !fecha || !monto) {
      return NextResponse.json(
        { success: false, error: "Tipo, fecha y monto son requeridos" },
        { status: 400 }
      );
    }

    const db = getDb();
    const result = db
      .prepare(
        `INSERT INTO movimientos (
          tipo, fecha, etapa_id, privada_id, partida_id, rubro_id,
          descripcion, estimacion, proveedor_id, contrato_id, monto,
          metodo_pago_id, comprobante, notas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        tipo,
        fecha,
        etapa_id || null,
        privada_id || null,
        partida_id || null,
        rubro_id || null,
        descripcion || null,
        estimacion || null,
        proveedor_id || null,
        contrato_id || null,
        parseFloat(monto),
        metodo_pago_id || null,
        comprobante || null,
        notas || null
      );

    const movimiento = db
      .prepare("SELECT * FROM movimientos WHERE id = ?")
      .get(result.lastInsertRowid) as Movimiento;

    return NextResponse.json({ success: true, data: movimiento }, { status: 201 });
  } catch (error) {
    console.error("Error creando movimiento:", error);
    return NextResponse.json(
      { success: false, error: "Error al crear movimiento" },
      { status: 500 }
    );
  }
}
