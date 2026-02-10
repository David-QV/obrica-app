import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();

    // Totales de movimientos
    const totalesMovimientos = db
      .prepare(
        `SELECT
          SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as total_ingresos,
          SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as total_egresos,
          COUNT(*) as total_movimientos
        FROM movimientos`
      )
      .get() as { total_ingresos: number; total_egresos: number; total_movimientos: number };

    // Totales de contratos
    const totalesContratos = db
      .prepare(
        `SELECT
          COUNT(*) as total_contratos,
          COUNT(CASE WHEN estatus = 'activo' THEN 1 END) as contratos_activos,
          SUM(total) as suma_total,
          SUM(pagado) as suma_pagado,
          SUM(por_cobrar) as suma_por_cobrar
        FROM contratos`
      )
      .get() as {
        total_contratos: number;
        contratos_activos: number;
        suma_total: number;
        suma_pagado: number;
        suma_por_cobrar: number;
      };

    // Movimientos recientes
    const movimientosRecientes = db
      .prepare(
        `SELECT m.*, p.nombre as proveedor_nombre
         FROM movimientos m
         LEFT JOIN proveedores p ON m.proveedor_id = p.id
         ORDER BY m.fecha DESC, m.id DESC
         LIMIT 5`
      )
      .all() as Array<{
        id: number;
        tipo: string;
        fecha: string;
        monto: number;
        descripcion: string;
        proveedor_nombre: string | null;
      }>;

    // Contratos activos
    const contratosActivos = db
      .prepare(
        `SELECT c.*, pr.nombre as privada_nombre
         FROM contratos c
         LEFT JOIN privadas pr ON c.privada_id = pr.id
         WHERE c.estatus = 'activo'
         ORDER BY c.created_at DESC
         LIMIT 5`
      )
      .all() as Array<{
        id: number;
        numero_contrato: string;
        total: number;
        pagado: number;
        por_cobrar: number;
        privada_nombre: string | null;
      }>;

    // Movimientos por mes (últimos 6 meses)
    const movimientosPorMes = db
      .prepare(
        `SELECT
          strftime('%Y-%m', fecha) as mes,
          SUM(CASE WHEN tipo = 'ingreso' THEN monto ELSE 0 END) as ingresos,
          SUM(CASE WHEN tipo = 'egreso' THEN monto ELSE 0 END) as egresos
        FROM movimientos
        WHERE fecha >= date('now', '-6 months')
        GROUP BY strftime('%Y-%m', fecha)
        ORDER BY mes ASC`
      )
      .all() as Array<{ mes: string; ingresos: number; egresos: number }>;

    return NextResponse.json({
      success: true,
      data: {
        totalesMovimientos: {
          ingresos: totalesMovimientos.total_ingresos || 0,
          egresos: totalesMovimientos.total_egresos || 0,
          balance: (totalesMovimientos.total_ingresos || 0) - (totalesMovimientos.total_egresos || 0),
          totalMovimientos: totalesMovimientos.total_movimientos || 0,
        },
        totalesContratos: {
          total: totalesContratos.total_contratos || 0,
          activos: totalesContratos.contratos_activos || 0,
          sumaTotal: totalesContratos.suma_total || 0,
          sumaPagado: totalesContratos.suma_pagado || 0,
          sumaPorCobrar: totalesContratos.suma_por_cobrar || 0,
        },
        movimientosRecientes,
        contratosActivos,
        movimientosPorMes,
      },
    });
  } catch (error) {
    console.error("Error obteniendo datos del dashboard:", error);
    return NextResponse.json(
      { success: false, error: "Error al obtener datos del dashboard" },
      { status: 500 }
    );
  }
}
