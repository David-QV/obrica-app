"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowUpRight, ArrowDownRight, FileText, ArrowLeftRight, TrendingUp, TrendingDown } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import { formatCurrency, formatDate } from "@/lib/utils";

interface DashboardData {
  totalesMovimientos: {
    ingresos: number;
    egresos: number;
    balance: number;
    totalMovimientos: number;
  };
  totalesContratos: {
    total: number;
    activos: number;
    sumaTotal: number;
    sumaPagado: number;
    sumaPorCobrar: number;
  };
  movimientosRecientes: Array<{
    id: number;
    tipo: string;
    fecha: string;
    monto: number;
    descripcion: string;
    proveedor_nombre: string | null;
  }>;
  contratosActivos: Array<{
    id: number;
    numero_contrato: string;
    total: number;
    pagado: number;
    por_cobrar: number;
    privada_nombre: string | null;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  async function fetchDashboardData() {
    try {
      const res = await fetch("/api/dashboard");
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Error al cargar datos</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Resumen general del sistema"
      />

      {/* Tarjetas de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Ingresos</p>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(data.totalesMovimientos.ingresos)}
              </p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Egresos</p>
              <p className="text-2xl font-bold text-red-600">
                {formatCurrency(data.totalesMovimientos.egresos)}
              </p>
            </div>
            <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Balance</p>
              <p className={`text-2xl font-bold ${data.totalesMovimientos.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {formatCurrency(data.totalesMovimientos.balance)}
              </p>
            </div>
            <div className="w-12 h-12 bg-obrica-cream rounded-lg flex items-center justify-center">
              <ArrowLeftRight className="w-6 h-6 text-obrica-orange" />
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Contratos Activos</p>
              <p className="text-2xl font-bold text-obrica-dark">
                {data.totalesContratos.activos}
              </p>
            </div>
            <div className="w-12 h-12 bg-obrica-cream rounded-lg flex items-center justify-center">
              <FileText className="w-6 h-6 text-obrica-orange" />
            </div>
          </div>
        </div>
      </div>

      {/* Tarjetas de contratos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="card bg-obrica-dark text-white">
          <p className="text-sm text-gray-300">Total Contratos</p>
          <p className="text-2xl font-bold">{formatCurrency(data.totalesContratos.sumaTotal)}</p>
        </div>
        <div className="card bg-obrica-orange text-white">
          <p className="text-sm text-orange-100">Pagado</p>
          <p className="text-2xl font-bold">{formatCurrency(data.totalesContratos.sumaPagado)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Por Cobrar</p>
          <p className="text-2xl font-bold text-obrica-orange">{formatCurrency(data.totalesContratos.sumaPorCobrar)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Movimientos recientes */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-obrica-dark">Movimientos Recientes</h3>
            <Link href="/ingresos-egresos" className="text-sm text-obrica-orange hover:underline">
              Ver todos
            </Link>
          </div>
          {data.movimientosRecientes.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay movimientos registrados</p>
          ) : (
            <div className="space-y-3">
              {data.movimientosRecientes.map((mov) => (
                <div key={mov.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${mov.tipo === "ingreso" ? "bg-green-100" : "bg-red-100"}`}>
                      {mov.tipo === "ingreso" ? (
                        <ArrowUpRight className="w-4 h-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {mov.descripcion || mov.proveedor_nombre || (mov.tipo === "ingreso" ? "Ingreso" : "Egreso")}
                      </p>
                      <p className="text-xs text-gray-500">{formatDate(mov.fecha)}</p>
                    </div>
                  </div>
                  <p className={`font-medium ${mov.tipo === "ingreso" ? "text-green-600" : "text-red-600"}`}>
                    {mov.tipo === "ingreso" ? "+" : "-"}{formatCurrency(mov.monto)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Contratos activos */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-obrica-dark">Contratos Activos</h3>
            <Link href="/contratos" className="text-sm text-obrica-orange hover:underline">
              Ver todos
            </Link>
          </div>
          {data.contratosActivos.length === 0 ? (
            <p className="text-gray-500 text-sm">No hay contratos activos</p>
          ) : (
            <div className="space-y-3">
              {data.contratosActivos.map((contrato) => (
                <div key={contrato.id} className="py-2 border-b border-gray-100 last:border-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-sm font-medium text-gray-700">{contrato.numero_contrato}</p>
                    <p className="text-sm font-medium text-obrica-dark">{formatCurrency(contrato.total)}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-500">{contrato.privada_nombre || "Sin privada"}</p>
                    <p className="text-xs text-obrica-orange">Por cobrar: {formatCurrency(contrato.por_cobrar)}</p>
                  </div>
                  <div className="mt-2 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-obrica-orange rounded-full h-2"
                      style={{ width: `${contrato.total > 0 ? (contrato.pagado / contrato.total) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
