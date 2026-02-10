"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, XCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/lib/utils";
import type { Compra, Material, Proveedor } from "@/types";

export default function ComprasPage() {
  const [compras, setCompras] = useState<Compra[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedCompra, setSelectedCompra] = useState<Compra | null>(null);
  const [formData, setFormData] = useState({
    material_id: "",
    proveedor_id: "",
    cantidad: "",
    precio_unitario: "",
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
      const [comprasRes, materialesRes, proveedoresRes] = await Promise.all([
        fetch("/api/inventario/compras"),
        fetch("/api/catalogos/materiales"),
        fetch("/api/catalogos/proveedores"),
      ]);
      const [comprasData, materialesData, proveedoresData] = await Promise.all([
        comprasRes.json(),
        materialesRes.json(),
        proveedoresRes.json(),
      ]);
      if (comprasData.success) setCompras(comprasData.data);
      if (materialesData.success) setMateriales(materialesData.data);
      if (proveedoresData.success) setProveedores(proveedoresData.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setFormData({
      material_id: "",
      proveedor_id: "",
      cantidad: "",
      precio_unitario: "",
      fecha: new Date().toISOString().slice(0, 10),
      notas: "",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.material_id || !formData.cantidad || !formData.precio_unitario || !formData.fecha) {
      setError("Material, cantidad, precio unitario y fecha son requeridos");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/inventario/compras", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_id: parseInt(formData.material_id),
          proveedor_id: formData.proveedor_id ? parseInt(formData.proveedor_id) : null,
          cantidad: parseFloat(formData.cantidad),
          precio_unitario: parseFloat(formData.precio_unitario),
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
    if (!selectedCompra) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inventario/compras/${selectedCompra.id}`, {
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

  const totalCalculado = formData.cantidad && formData.precio_unitario
    ? (parseFloat(formData.cantidad) * parseFloat(formData.precio_unitario))
    : 0;

  const columns: ColumnDef<Compra, unknown>[] = useMemo(
    () => [
      { accessorKey: "folio", header: "Folio" },
      { accessorKey: "fecha", header: "Fecha" },
      { accessorKey: "material_nombre", header: "Material" },
      { accessorKey: "proveedor_nombre", header: "Proveedor", cell: ({ row }) => row.original.proveedor_nombre || "-" },
      {
        accessorKey: "cantidad",
        header: "Cantidad",
        cell: ({ row }) => `${row.original.cantidad} ${row.original.material_unidad || ""}`,
      },
      {
        accessorKey: "precio_unitario",
        header: "P. Unitario",
        cell: ({ row }) => formatCurrency(row.original.precio_unitario),
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.total),
      },
      {
        accessorKey: "cantidad_recibida",
        header: "Recibido",
        cell: ({ row }) => `${row.original.cantidad_recibida} / ${row.original.cantidad}`,
      },
      {
        accessorKey: "estatus",
        header: "Estatus",
        cell: ({ row }) => {
          const colors: Record<string, string> = {
            activa: "bg-blue-100 text-blue-800",
            completada: "bg-green-100 text-green-800",
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
              onClick={() => { setSelectedCompra(row.original); setCancelDialogOpen(true); }}
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
        title="Compras"
        description="Registro de compras de materiales"
        actions={<button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Nueva Compra</button>}
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

      <DataTable data={compras} columns={columns} searchPlaceholder="Buscar compra..." />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Compra" size="lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
              <select
                value={formData.material_id}
                onChange={(e) => setFormData({ ...formData, material_id: e.target.value })}
                className="w-full" required
              >
                <option value="">Seleccionar material...</option>
                {materiales.map((m) => (
                  <option key={m.id} value={m.id}>{m.codigo ? `${m.codigo} - ` : ""}{m.nombre} ({m.unidad || "s/u"})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Proveedor</label>
              <select
                value={formData.proveedor_id}
                onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
                className="w-full"
              >
                <option value="">Seleccionar proveedor...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad *</label>
              <input
                type="number" step="0.01" min="0.01"
                value={formData.cantidad}
                onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
                className="w-full" required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario *</label>
              <input
                type="number" step="0.01" min="0.01"
                value={formData.precio_unitario}
                onChange={(e) => setFormData({ ...formData, precio_unitario: e.target.value })}
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
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <div className="w-full px-3 py-2 bg-gray-100 border border-gray-300 rounded-md text-gray-700 font-medium">
                {formatCurrency(totalCalculado)}
              </div>
            </div>
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
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Registrar Compra"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar Compra"
        message={`¿Estás seguro de cancelar la compra "${selectedCompra?.folio}"? Se revertirá el stock virtual.`}
        confirmText="Cancelar Compra"
        loading={saving}
      />
    </div>
  );
}
