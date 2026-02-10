"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2, Download } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { Movimiento, Etapa, Privada, Partida, Rubro, Proveedor, Contrato, MetodoPago } from "@/types";

interface MovimientoExtended extends Movimiento {
  etapa_nombre?: string;
  privada_nombre?: string;
  partida_nombre?: string;
  rubro_nombre?: string;
  proveedor_nombre?: string;
  contrato_numero?: string;
  metodo_pago_nombre?: string;
}

export default function IngresosEgresosPage() {
  const [movimientos, setMovimientos] = useState<MovimientoExtended[]>([]);
  const [catalogos, setCatalogos] = useState<{
    etapas: Etapa[];
    privadas: Privada[];
    partidas: Partida[];
    rubros: Rubro[];
    proveedores: Proveedor[];
    contratos: Contrato[];
    metodosPago: MetodoPago[];
  }>({ etapas: [], privadas: [], partidas: [], rubros: [], proveedores: [], contratos: [], metodosPago: [] });
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMovimiento, setSelectedMovimiento] = useState<MovimientoExtended | null>(null);
  const [formData, setFormData] = useState({
    tipo: "egreso" as "ingreso" | "egreso",
    fecha: new Date().toISOString().split("T")[0],
    etapa_id: "",
    privada_id: "",
    partida_id: "",
    rubro_id: "",
    descripcion: "",
    estimacion: "",
    proveedor_id: "",
    contrato_id: "",
    monto: "",
    metodo_pago_id: "",
    comprobante: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchMovimientos(), fetchCatalogos()]);
  }, []);

  async function fetchMovimientos() {
    try {
      const res = await fetch("/api/movimientos");
      const data = await res.json();
      if (data.success) setMovimientos(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCatalogos() {
    try {
      const [etapasRes, privadasRes, partidasRes, rubrosRes, proveedoresRes, contratosRes, metodosPagoRes] = await Promise.all([
        fetch("/api/catalogos/etapas"),
        fetch("/api/catalogos/privadas"),
        fetch("/api/catalogos/partidas"),
        fetch("/api/catalogos/rubros"),
        fetch("/api/catalogos/proveedores"),
        fetch("/api/contratos"),
        fetch("/api/catalogos/metodos-pago"),
      ]);

      const [etapas, privadas, partidas, rubros, proveedores, contratos, metodosPago] = await Promise.all([
        etapasRes.json(),
        privadasRes.json(),
        partidasRes.json(),
        rubrosRes.json(),
        proveedoresRes.json(),
        contratosRes.json(),
        metodosPagoRes.json(),
      ]);

      setCatalogos({
        etapas: etapas.data || [],
        privadas: privadas.data || [],
        partidas: partidas.data || [],
        rubros: rubros.data || [],
        proveedores: proveedores.data || [],
        contratos: contratos.data || [],
        metodosPago: metodosPago.data || [],
      });
    } catch (err) {
      console.error(err);
    }
  }

  function openCreateModal() {
    setSelectedMovimiento(null);
    setFormData({
      tipo: "egreso",
      fecha: new Date().toISOString().split("T")[0],
      etapa_id: "",
      privada_id: "",
      partida_id: "",
      rubro_id: "",
      descripcion: "",
      estimacion: "",
      proveedor_id: "",
      contrato_id: "",
      monto: "",
      metodo_pago_id: "",
      comprobante: "",
      notas: "",
    });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(movimiento: MovimientoExtended) {
    setSelectedMovimiento(movimiento);
    setFormData({
      tipo: movimiento.tipo,
      fecha: movimiento.fecha,
      etapa_id: movimiento.etapa_id?.toString() || "",
      privada_id: movimiento.privada_id?.toString() || "",
      partida_id: movimiento.partida_id?.toString() || "",
      rubro_id: movimiento.rubro_id?.toString() || "",
      descripcion: movimiento.descripcion || "",
      estimacion: movimiento.estimacion?.toString() || "",
      proveedor_id: movimiento.proveedor_id?.toString() || "",
      contrato_id: movimiento.contrato_id?.toString() || "",
      monto: movimiento.monto?.toString() || "",
      metodo_pago_id: movimiento.metodo_pago_id?.toString() || "",
      comprobante: movimiento.comprobante || "",
      notas: movimiento.notas || "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.fecha || !formData.monto) {
      setError("Fecha y monto son requeridos");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = selectedMovimiento
        ? `/api/movimientos/${selectedMovimiento.id}`
        : "/api/movimientos";
      const method = selectedMovimiento ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          etapa_id: formData.etapa_id ? parseInt(formData.etapa_id) : null,
          privada_id: formData.privada_id ? parseInt(formData.privada_id) : null,
          partida_id: formData.partida_id ? parseInt(formData.partida_id) : null,
          rubro_id: formData.rubro_id ? parseInt(formData.rubro_id) : null,
          proveedor_id: formData.proveedor_id ? parseInt(formData.proveedor_id) : null,
          contrato_id: formData.contrato_id ? parseInt(formData.contrato_id) : null,
          metodo_pago_id: formData.metodo_pago_id ? parseInt(formData.metodo_pago_id) : null,
          estimacion: formData.estimacion ? parseFloat(formData.estimacion) : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchMovimientos();
        setModalOpen(false);
      } else {
        setError(data.error || "Error al guardar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedMovimiento) return;

    setSaving(true);
    try {
      await fetch(`/api/movimientos/${selectedMovimiento.id}`, { method: "DELETE" });
      await fetchMovimientos();
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  function handleExport() {
    window.open("/api/movimientos/exportar", "_blank");
  }

  const columns: ColumnDef<MovimientoExtended, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "fecha",
        header: "Fecha",
        cell: ({ row }) => formatDate(row.original.fecha),
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${row.original.tipo === "ingreso" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
            {row.original.tipo === "ingreso" ? "Ingreso" : "Egreso"}
          </span>
        ),
      },
      { accessorKey: "privada_nombre", header: "Privada", cell: ({ row }) => row.original.privada_nombre || "-" },
      { accessorKey: "partida_nombre", header: "Partida", cell: ({ row }) => row.original.partida_nombre || "-" },
      { accessorKey: "rubro_nombre", header: "Rubro", cell: ({ row }) => row.original.rubro_nombre || "-" },
      { accessorKey: "descripcion", header: "Descripción", cell: ({ row }) => row.original.descripcion || "-" },
      { accessorKey: "proveedor_nombre", header: "Proveedor", cell: ({ row }) => row.original.proveedor_nombre || "-" },
      { accessorKey: "contrato_numero", header: "Contrato", cell: ({ row }) => row.original.contrato_numero || "-" },
      {
        accessorKey: "monto",
        header: "Monto",
        cell: ({ row }) => (
          <span className={row.original.tipo === "ingreso" ? "text-green-600" : "text-red-600"}>
            {row.original.tipo === "ingreso" ? "+" : "-"}{formatCurrency(row.original.monto)}
          </span>
        ),
      },
      { accessorKey: "metodo_pago_nombre", header: "Método", cell: ({ row }) => row.original.metodo_pago_nombre || "-" },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button onClick={() => openEditModal(row.original)} className="p-1 hover:bg-gray-100 rounded" title="Editar">
              <Pencil className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => { setSelectedMovimiento(row.original); setDeleteDialogOpen(true); }} className="p-1 hover:bg-gray-100 rounded" title="Eliminar">
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  // Calcular totales
  const totales = useMemo(() => {
    const ingresos = movimientos.filter((m) => m.tipo === "ingreso").reduce((sum, m) => sum + m.monto, 0);
    const egresos = movimientos.filter((m) => m.tipo === "egreso").reduce((sum, m) => sum + m.monto, 0);
    return { ingresos, egresos, balance: ingresos - egresos };
  }, [movimientos]);

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>;
  }

  return (
    <div>
      <PageHeader
        title="Ingresos y Egresos"
        description="Gestiona los movimientos financieros"
        actions={
          <div className="flex gap-2">
            <button onClick={handleExport} className="btn-outline">
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </button>
            <button onClick={openCreateModal} className="btn-primary">
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Movimiento
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card">
          <p className="text-sm text-gray-500">Total Ingresos</p>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totales.ingresos)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Total Egresos</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totales.egresos)}</p>
        </div>
        <div className="card">
          <p className="text-sm text-gray-500">Balance</p>
          <p className={`text-2xl font-bold ${totales.balance >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(totales.balance)}
          </p>
        </div>
      </div>

      <DataTable data={movimientos} columns={columns} searchPlaceholder="Buscar movimiento..." />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedMovimiento ? "Editar Movimiento" : "Nuevo Movimiento"} size="xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo *</label>
              <select value={formData.tipo} onChange={(e) => setFormData({ ...formData, tipo: e.target.value as "ingreso" | "egreso" })} className="w-full">
                <option value="egreso">Egreso</option>
                <option value="ingreso">Ingreso</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
              <input type="date" value={formData.fecha} onChange={(e) => setFormData({ ...formData, fecha: e.target.value })} className="w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto *</label>
              <input type="number" step="0.01" value={formData.monto} onChange={(e) => setFormData({ ...formData, monto: e.target.value })} className="w-full" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
              <select value={formData.metodo_pago_id} onChange={(e) => setFormData({ ...formData, metodo_pago_id: e.target.value })} className="w-full">
                <option value="">Seleccionar...</option>
                {catalogos.metodosPago.map((m) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Etapa</label>
              <select value={formData.etapa_id} onChange={(e) => setFormData({ ...formData, etapa_id: e.target.value })} className="w-full">
                <option value="">Seleccionar...</option>
                {catalogos.etapas.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Privada</label>
              <select value={formData.privada_id} onChange={(e) => setFormData({ ...formData, privada_id: e.target.value })} className="w-full">
                <option value="">Seleccionar...</option>
                {catalogos.privadas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Partida</label>
              <select value={formData.partida_id} onChange={(e) => setFormData({ ...formData, partida_id: e.target.value })} className="w-full">
                <option value="">Seleccionar...</option>
                {catalogos.partidas.map((p) => <option key={p.id} value={p.id}>{p.codigo ? `${p.codigo} - ` : ""}{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rubro</label>
              <select value={formData.rubro_id} onChange={(e) => setFormData({ ...formData, rubro_id: e.target.value })} className="w-full">
                <option value="">Seleccionar...</option>
                {catalogos.rubros.map((r) => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor/Contratista</label>
              <select value={formData.proveedor_id} onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })} className="w-full">
                <option value="">Seleccionar...</option>
                {catalogos.proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contrato</label>
              <select value={formData.contrato_id} onChange={(e) => setFormData({ ...formData, contrato_id: e.target.value })} className="w-full">
                <option value="">Seleccionar...</option>
                {catalogos.contratos.map((c) => <option key={c.id} value={c.id}>{c.numero_contrato}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimación</label>
              <input type="number" step="0.01" value={formData.estimacion} onChange={(e) => setFormData({ ...formData, estimacion: e.target.value })} className="w-full" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea value={formData.descripcion} onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })} className="w-full" rows={2} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Comprobante</label>
              <input type="text" value={formData.comprobante} onChange={(e) => setFormData({ ...formData, comprobante: e.target.value })} className="w-full" placeholder="Número de factura/recibo" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
              <input type="text" value={formData.notas} onChange={(e) => setFormData({ ...formData, notas: e.target.value })} className="w-full" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Movimiento" message="¿Estás seguro de eliminar este movimiento?" confirmText="Eliminar" loading={saving} />
    </div>
  );
}
