"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, XCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Entrada, Compra } from "@/types";

export default function EntradasPage() {
  const [entradas, setEntradas] = useState<Entrada[]>([]);
  const [comprasActivas, setComprasActivas] = useState<Compra[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedEntrada, setSelectedEntrada] = useState<Entrada | null>(null);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [formData, setFormData] = useState({
    compra_id: "",
    cantidad: "",
    fecha: new Date().toISOString().slice(0, 10),
    notas: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const [entradasRes, comprasRes] = await Promise.all([
        fetch("/api/inventario/entradas"),
        fetch("/api/inventario/compras?estatus=activa"),
      ]);
      const [entradasData, comprasData] = await Promise.all([
        entradasRes.json(),
        comprasRes.json(),
      ]);
      if (entradasData.success) setEntradas(entradasData.data);
      if (comprasData.success) setComprasActivas(comprasData.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setSelectedCompra(null);
    setFormData({
      compra_id: "",
      cantidad: "",
      fecha: new Date().toISOString().slice(0, 10),
      notas: "",
    });
    setError("");
    setModalOpen(true);
  }

  function handleCompraChange(compraId: string) {
    const compra = comprasActivas.find((c) => c.id === parseInt(compraId));
    setSelectedCompra(compra || null);
    setFormData({ ...formData, compra_id: compraId, cantidad: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.compra_id || !formData.cantidad || !formData.fecha) {
      setError("Compra, cantidad y fecha son requeridos");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/inventario/entradas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          compra_id: parseInt(formData.compra_id),
          cantidad: parseFloat(formData.cantidad),
          fecha: formData.fecha,
          notas: formData.notas || null,
        }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
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

  async function handleCancel() {
    if (!selectedEntrada) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inventario/entradas/${selectedEntrada.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accion: "cancelar" }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setCancelDialogOpen(false);
      } else {
        setError(data.error || "Error al cancelar");
        setCancelDialogOpen(false);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const pendiente = selectedCompra
    ? selectedCompra.cantidad - selectedCompra.cantidad_recibida
    : 0;

  const columns: ColumnDef<Entrada, unknown>[] = useMemo(
    () => [
      { accessorKey: "folio", header: "Folio" },
      { accessorKey: "fecha", header: "Fecha" },
      { accessorKey: "compra_folio", header: "Compra" },
      { accessorKey: "material_nombre", header: "Material" },
      {
        accessorKey: "cantidad",
        header: "Cantidad",
        cell: ({ row }) => `${row.original.cantidad} ${row.original.material_unidad || ""}`,
      },
      {
        accessorKey: "estatus",
        header: "Estatus",
        cell: ({ row }) => {
          const colors: Record<string, string> = {
            activa: "bg-green-100 text-green-800",
            cancelada: "bg-red-100 text-red-800",
          };
          return (
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[row.original.estatus] || ""}`}>
              {row.original.estatus.charAt(0).toUpperCase() + row.original.estatus.slice(1)}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) =>
          row.original.estatus === "activa" ? (
            <button
              onClick={() => { setSelectedEntrada(row.original); setCancelDialogOpen(true); }}
              className="p-1 hover:bg-gray-100 rounded" title="Cancelar"
            >
              <XCircle className="w-4 h-4 text-red-600" />
            </button>
          ) : null,
      },
    ],
    []
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>;

  return (
    <div>
      <PageHeader
        title="Entradas"
        description="Recepción física de materiales comprados"
        actions={<button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Nueva Entrada</button>}
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

      <DataTable data={entradas} columns={columns} searchPlaceholder="Buscar entrada..." />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Entrada">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Compra *</label>
            <select
              value={formData.compra_id}
              onChange={(e) => handleCompraChange(e.target.value)}
              className="w-full" required
            >
              <option value="">Seleccionar compra...</option>
              {comprasActivas.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.folio} - {c.material_nombre} (Pendiente: {c.cantidad - c.cantidad_recibida} {c.material_unidad || ""})
                </option>
              ))}
            </select>
          </div>

          {selectedCompra && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <p><strong>Material:</strong> {selectedCompra.material_nombre}</p>
              <p><strong>Comprado:</strong> {selectedCompra.cantidad} {selectedCompra.material_unidad || ""}</p>
              <p><strong>Ya recibido:</strong> {selectedCompra.cantidad_recibida}</p>
              <p><strong>Pendiente:</strong> {pendiente} {selectedCompra.material_unidad || ""}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad a recibir * {pendiente > 0 && <span className="text-gray-400">(máx: {pendiente})</span>}</label>
            <input
              type="number" step="0.01" min="0.01" max={pendiente || undefined}
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              className="w-full" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Fecha *</label>
            <input
              type="date"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              className="w-full" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              value={formData.notas}
              onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
              className="w-full" rows={2}
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Registrar Entrada"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar Entrada"
        message={`¿Estás seguro de cancelar la entrada "${selectedEntrada?.folio}"? Se revertirá el stock.`}
        confirmText="Cancelar Entrada"
        loading={saving}
      />
    </div>
  );
}
