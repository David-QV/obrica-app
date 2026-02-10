"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, XCircle } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Salida, Material } from "@/types";

export default function SalidasPage() {
  const [salidas, setSalidas] = useState<Salida[]>([]);
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedSalida, setSelectedSalida] = useState<Salida | null>(null);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    material_id: "",
    cantidad: "",
    referencia: "",
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
      const [salidasRes, almacenRes] = await Promise.all([
        fetch("/api/inventario/salidas"),
        fetch("/api/inventario/almacen"),
      ]);
      const [salidasData, almacenData] = await Promise.all([
        salidasRes.json(),
        almacenRes.json(),
      ]);
      if (salidasData.success) setSalidas(salidasData.data);
      if (almacenData.success) setMateriales(almacenData.data);
    } catch (err) {
      console.error("Error fetching data:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setSelectedMaterial(null);
    setFormData({
      material_id: "",
      cantidad: "",
      referencia: "",
      fecha: new Date().toISOString().slice(0, 10),
      notas: "",
    });
    setError("");
    setModalOpen(true);
  }

  function handleMaterialChange(materialId: string) {
    const mat = materiales.find((m) => m.id === parseInt(materialId));
    setSelectedMaterial(mat || null);
    setFormData({ ...formData, material_id: materialId, cantidad: "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.material_id || !formData.cantidad || !formData.referencia || !formData.fecha) {
      setError("Material, cantidad, referencia y fecha son requeridos");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/inventario/salidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_id: parseInt(formData.material_id),
          cantidad: parseFloat(formData.cantidad),
          referencia: formData.referencia,
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
    if (!selectedSalida) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/inventario/salidas/${selectedSalida.id}`, {
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

  const columns: ColumnDef<Salida, unknown>[] = useMemo(
    () => [
      { accessorKey: "folio", header: "Folio" },
      { accessorKey: "fecha", header: "Fecha" },
      { accessorKey: "material_nombre", header: "Material" },
      {
        accessorKey: "cantidad",
        header: "Cantidad",
        cell: ({ row }) => `${row.original.cantidad} ${row.original.material_unidad || ""}`,
      },
      { accessorKey: "referencia", header: "Referencia" },
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
              onClick={() => { setSelectedSalida(row.original); setCancelDialogOpen(true); }}
              className="p-1 hover:bg-gray-100 rounded" title="Cancelar"
            >
              <XCircle className="w-4 h-4 text-red-600" />
            </button>
          ) : null,
      },
    ],
    []
  );

  const materialesConStock = materiales.filter((m) => (m.stock_fisico || 0) > 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>;

  return (
    <div>
      <PageHeader
        title="Salidas"
        description="Consumo y entrega de materiales"
        actions={<button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Nueva Salida</button>}
      />

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

      <DataTable data={salidas} columns={columns} searchPlaceholder="Buscar salida..." />

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Nueva Salida">
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Material *</label>
            <select
              value={formData.material_id}
              onChange={(e) => handleMaterialChange(e.target.value)}
              className="w-full" required
            >
              <option value="">Seleccionar material...</option>
              {materialesConStock.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.codigo ? `${m.codigo} - ` : ""}{m.nombre} (Stock: {m.stock_fisico} {m.unidad || ""})
                </option>
              ))}
            </select>
          </div>

          {selectedMaterial && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 text-sm">
              <p><strong>Stock físico:</strong> {selectedMaterial.stock_fisico} {selectedMaterial.unidad || ""}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cantidad * {selectedMaterial && <span className="text-gray-400">(máx: {selectedMaterial.stock_fisico})</span>}
            </label>
            <input
              type="number" step="0.01" min="0.01"
              max={selectedMaterial?.stock_fisico || undefined}
              value={formData.cantidad}
              onChange={(e) => setFormData({ ...formData, cantidad: e.target.value })}
              className="w-full" required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Referencia * <span className="text-gray-400">(proyecto, área o cliente)</span></label>
            <input
              type="text"
              value={formData.referencia}
              onChange={(e) => setFormData({ ...formData, referencia: e.target.value })}
              className="w-full" required placeholder="Ej: Proyecto Residencial Norte"
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
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Registrar Salida"}</button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancel}
        title="Cancelar Salida"
        message={`¿Estás seguro de cancelar la salida "${selectedSalida?.folio}"? Se restaurará el stock físico.`}
        confirmText="Cancelar Salida"
        loading={saving}
      />
    </div>
  );
}
