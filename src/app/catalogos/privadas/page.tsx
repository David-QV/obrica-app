"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Privada } from "@/types";

export default function PrivadasPage() {
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPrivada, setSelectedPrivada] = useState<Privada | null>(null);
  const [formData, setFormData] = useState({ nombre: "", ubicacion: "", activo: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchPrivadas(); }, []);

  async function fetchPrivadas() {
    try {
      const res = await fetch("/api/catalogos/privadas?activos=false");
      const data = await res.json();
      if (data.success) setPrivadas(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreateModal() {
    setSelectedPrivada(null);
    setFormData({ nombre: "", ubicacion: "", activo: true });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(privada: Privada) {
    setSelectedPrivada(privada);
    setFormData({ nombre: privada.nombre, ubicacion: privada.ubicacion || "", activo: Boolean(privada.activo) });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nombre.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true);
    setError("");
    try {
      const url = selectedPrivada ? `/api/catalogos/privadas/${selectedPrivada.id}` : "/api/catalogos/privadas";
      const method = selectedPrivada ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(formData) });
      const data = await res.json();
      if (data.success) { await fetchPrivadas(); setModalOpen(false); }
      else setError(data.error || "Error al guardar");
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selectedPrivada) return;
    setSaving(true);
    try { await fetch(`/api/catalogos/privadas/${selectedPrivada.id}`, { method: "DELETE" }); await fetchPrivadas(); setDeleteDialogOpen(false); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  const columns: ColumnDef<Privada, unknown>[] = useMemo(() => [
    { accessorKey: "nombre", header: "Nombre" },
    { accessorKey: "ubicacion", header: "Ubicación", cell: ({ row }) => row.original.ubicacion || "-" },
    { accessorKey: "activo", header: "Estado", cell: ({ row }) => <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${row.original.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{row.original.activo ? "Activo" : "Inactivo"}</span> },
    { id: "actions", header: "Acciones", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button onClick={() => openEditModal(row.original)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-4 h-4 text-gray-600" /></button>
        <button onClick={() => { setSelectedPrivada(row.original); setDeleteDialogOpen(true); }} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-600" /></button>
      </div>
    )},
  ], []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>;

  return (
    <div>
      <PageHeader title="Privadas" description="Gestiona los proyectos y ubicaciones" actions={<button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Nueva Privada</button>} />
      <DataTable data={privadas} columns={columns} searchPlaceholder="Buscar privada..." />
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedPrivada ? "Editar Privada" : "Nueva Privada"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Ubicación</label><textarea value={formData.ubicacion} onChange={(e) => setFormData({ ...formData, ubicacion: e.target.value })} className="w-full" rows={2} /></div>
          {selectedPrivada && <div className="flex items-center gap-2"><input type="checkbox" id="activo" checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} className="rounded border-gray-300 text-obrica-orange focus:ring-obrica-orange" /><label htmlFor="activo" className="text-sm text-gray-700">Activo</label></div>}
          <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn-outline" disabled={saving}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Privada" message={`¿Estás seguro de eliminar "${selectedPrivada?.nombre}"?`} confirmText="Eliminar" loading={saving} />
    </div>
  );
}
