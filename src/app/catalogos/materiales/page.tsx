"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Material } from "@/types";

export default function MaterialesPage() {
  const [materiales, setMateriales] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);
  const [formData, setFormData] = useState({
    codigo: "",
    nombre: "",
    unidad: "",
    stock_minimo: "",
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchMateriales();
  }, []);

  async function fetchMateriales() {
    try {
      const res = await fetch("/api/catalogos/materiales?activos=false");
      const data = await res.json();
      if (data.success) {
        setMateriales(data.data);
      }
    } catch (err) {
      console.error("Error fetching materiales:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setSelectedMaterial(null);
    setFormData({ codigo: "", nombre: "", unidad: "", stock_minimo: "", activo: true });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(material: Material) {
    setSelectedMaterial(material);
    setFormData({
      codigo: material.codigo || "",
      nombre: material.nombre,
      unidad: material.unidad || "",
      stock_minimo: String(material.stock_minimo || 0),
      activo: Boolean(material.activo),
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nombre.trim()) {
      setError("El nombre es requerido");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = selectedMaterial
        ? `/api/catalogos/materiales/${selectedMaterial.id}`
        : "/api/catalogos/materiales";
      const method = selectedMaterial ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          stock_minimo: parseFloat(formData.stock_minimo) || 0,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchMateriales();
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
    if (!selectedMaterial) return;

    setSaving(true);
    try {
      await fetch(`/api/catalogos/materiales/${selectedMaterial.id}`, {
        method: "DELETE",
      });
      await fetchMateriales();
      setDeleteDialogOpen(false);
    } catch (err) {
      console.error("Error deleting material:", err);
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<Material, unknown>[] = useMemo(
    () => [
      { accessorKey: "codigo", header: "Código", cell: ({ row }) => row.original.codigo || "-" },
      { accessorKey: "nombre", header: "Nombre" },
      { accessorKey: "unidad", header: "Unidad", cell: ({ row }) => row.original.unidad || "-" },
      {
        accessorKey: "stock_minimo",
        header: "Stock Mín.",
        cell: ({ row }) => row.original.stock_minimo || 0,
      },
      {
        accessorKey: "activo",
        header: "Estado",
        cell: ({ row }) => (
          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${row.original.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
            {row.original.activo ? "Activo" : "Inactivo"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button onClick={() => openEditModal(row.original)} className="p-1 hover:bg-gray-100 rounded" title="Editar">
              <Pencil className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => { setSelectedMaterial(row.original); setDeleteDialogOpen(true); }} className="p-1 hover:bg-gray-100 rounded" title="Eliminar">
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>;

  return (
    <div>
      <PageHeader title="Materiales" description="Gestiona el catálogo de materiales" actions={<button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Nuevo Material</button>} />
      <DataTable data={materiales} columns={columns} searchPlaceholder="Buscar material..." />
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedMaterial ? "Editar Material" : "Nuevo Material"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
            <input type="text" value={formData.codigo} onChange={(e) => setFormData({ ...formData, codigo: e.target.value })} className="w-full" placeholder="Ej: MAT-001" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full" required placeholder="Ej: Cemento Portland" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unidad</label>
            <select value={formData.unidad} onChange={(e) => setFormData({ ...formData, unidad: e.target.value })} className="w-full">
              <option value="">Seleccionar unidad...</option>
              <option value="PZA">PZA</option>
              <option value="SACOS">SACOS</option>
              <option value="KG">KG</option>
              <option value="ML">ML</option>
              <option value="CUBETA">CUBETA</option>
              <option value="M3">M3</option>
              <option value="ROLLOS">ROLLOS</option>
              <option value="ROLLO">ROLLO</option>
              <option value="CAJAS">CAJAS</option>
              <option value="CUBETAS">CUBETAS</option>
              <option value="BOLSAS">BOLSAS</option>
              <option value="LATA">LATA</option>
              <option value="GALON">GALON</option>
              <option value="LTR">LTR</option>
              <option value="MTR">MTR</option>
              <option value="M2">M2</option>
              <option value="SERVICIO">SERVICIO</option>
              <option value="MTS">MTS</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo</label>
            <input type="number" step="0.01" min="0" value={formData.stock_minimo} onChange={(e) => setFormData({ ...formData, stock_minimo: e.target.value })} className="w-full" placeholder="0" />
            <p className="text-xs text-gray-500 mt-1">Se mostrará alerta cuando el stock físico sea menor o igual a este valor</p>
          </div>
          {selectedMaterial && (
            <div className="flex items-center gap-2">
              <input type="checkbox" id="activo" checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} className="rounded border-gray-300 text-obrica-orange focus:ring-obrica-orange" />
              <label htmlFor="activo" className="text-sm text-gray-700">Activo</label>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button>
          </div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Material" message={`¿Estás seguro de eliminar "${selectedMaterial?.nombre}"?`} confirmText="Eliminar" loading={saving} />
    </div>
  );
}
