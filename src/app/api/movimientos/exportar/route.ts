import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tipo = searchParams.get("tipo");
    const fecha_inicio = searchParams.get("fecha_inicio");
    const fecha_fin = searchParams.get("fecha_fin");

    const db = getDb();
    let query = `
      SELECT
        m.fecha,
        e.nombre as etapa,
        pr.nombre as privada,
        pa.codigo as partida_codigo,
        pa.nombre as partida,
        r.nombre as rubro,
        m.descripcion,
        m.estimacion,
        p.nombre as proveedor,
        c.numero_contrato as contrato,
        CASE WHEN m.tipo = 'ingreso' THEN m.monto ELSE NULL END as ingreso,
        CASE WHEN m.tipo = 'egreso' THEN m.monto ELSE NULL END as egreso,
        mp.nombre as metodo_pago
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

    const params: string[] = [];

    if (tipo) {
      query += " AND m.tipo = ?";
      params.push(tipo);
    }

    if (fecha_inicio) {
      query += " AND m.fecha >= ?";
      params.push(fecha_inicio);
    }

    if (fecha_fin) {
      query += " AND m.fecha <= ?";
      params.push(fecha_fin);
    }

    query += " ORDER BY m.fecha DESC";

    const movimientos = db.prepare(query).all(...params) as Record<string, unknown>[];

    // Generar CSV
    const headers = [
      "Fecha",
      "Etapa",
      "Privada",
      "Partida",
      "Rubro",
      "Descripción",
      "Estimación",
      "Proveedor/Contratista",
      "Contrato",
      "Ingreso",
      "Método de Pago",
      "Egreso",
    ];

    let csv = headers.join(",") + "\n";

    movimientos.forEach((m) => {
      const row = [
        m.fecha || "",
        `"${(m.etapa as string || "").replace(/"/g, '""')}"`,
        `"${(m.privada as string || "").replace(/"/g, '""')}"`,
        `"${(m.partida as string || "").replace(/"/g, '""')}"`,
        `"${(m.rubro as string || "").replace(/"/g, '""')}"`,
        `"${(m.descripcion as string || "").replace(/"/g, '""')}"`,
        m.estimacion || "",
        `"${(m.proveedor as string || "").replace(/"/g, '""')}"`,
        `"${(m.contrato as string || "").replace(/"/g, '""')}"`,
        m.ingreso || "",
        `"${(m.metodo_pago as string || "").replace(/"/g, '""')}"`,
        m.egreso || "",
      ];
      csv += row.join(",") + "\n";
    });

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="movimientos_${new Date().toISOString().split("T")[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error("Error exportando movimientos:", error);
    return NextResponse.json(
      { success: false, error: "Error al exportar movimientos" },
      { status: 500 }
    );
  }
}
