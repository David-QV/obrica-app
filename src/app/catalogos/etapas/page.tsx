"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Etapa } from "@/types";

export default function EtapasPage() {
  const [etapas, setEtapas] = useState<Etapa[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState<Etapa | null>(null);
  const [formData, setFormData] = useState({ nombre: "", orden: "", activo: true });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { fetchEtapas(); }, []);

  async function fetchEtapas() {
    try {
      const res = await fetch("/api/catalogos/etapas?activos=false");
      const data = await res.json();
      if (data.success) setEtapas(data.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  function openCreateModal() {
    setSelectedEtapa(null);
    setFormData({ nombre: "", orden: "", activo: true });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(etapa: Etapa) {
    setSelectedEtapa(etapa);
    setFormData({ nombre: etapa.nombre, orden: etapa.orden?.toString() || "", activo: Boolean(etapa.activo) });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.nombre.trim()) { setError("El nombre es requerido"); return; }
    setSaving(true);
    setError("");
    try {
      const url = selectedEtapa ? `/api/catalogos/etapas/${selectedEtapa.id}` : "/api/catalogos/etapas";
      const method = selectedEtapa ? "PUT" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...formData, orden: formData.orden ? parseInt(formData.orden) : null }) });
      const data = await res.json();
      if (data.success) { await fetchEtapas(); setModalOpen(false); }
      else setError(data.error || "Error al guardar");
    } catch { setError("Error de conexión"); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!selectedEtapa) return;
    setSaving(true);
    try { await fetch(`/api/catalogos/etapas/${selectedEtapa.id}`, { method: "DELETE" }); await fetchEtapas(); setDeleteDialogOpen(false); }
    catch (err) { console.error(err); }
    finally { setSaving(false); }
  }

  const columns: ColumnDef<Etapa, unknown>[] = useMemo(() => [
    { accessorKey: "orden", header: "Orden", cell: ({ row }) => row.original.orden || "-" },
    { accessorKey: "nombre", header: "Nombre" },
    { accessorKey: "activo", header: "Estado", cell: ({ row }) => <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${row.original.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>{row.original.activo ? "Activo" : "Inactivo"}</span> },
    { id: "actions", header: "Acciones", cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <button onClick={() => openEditModal(row.original)} className="p-1 hover:bg-gray-100 rounded"><Pencil className="w-4 h-4 text-gray-600" /></button>
        <button onClick={() => { setSelectedEtapa(row.original); setDeleteDialogOpen(true); }} className="p-1 hover:bg-gray-100 rounded"><Trash2 className="w-4 h-4 text-red-600" /></button>
      </div>
    )},
  ], []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>;

  return (
    <div>
      <PageHeader title="Etapas" description="Gestiona las etapas de construcción" actions={<button onClick={openCreateModal} className="btn-primary"><Plus className="w-4 h-4 mr-2" />Nueva Etapa</button>} />
      <DataTable data={etapas} columns={columns} searchPlaceholder="Buscar etapa..." />
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={selectedEtapa ? "Editar Etapa" : "Nueva Etapa"}>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label><input type="text" value={formData.nombre} onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} className="w-full" required /></div>
          <div><label className="block text-sm font-medium text-gray-700 mb-1">Orden</label><input type="number" value={formData.orden} onChange={(e) => setFormData({ ...formData, orden: e.target.value })} className="w-full" /></div>
          {selectedEtapa && <div className="flex items-center gap-2"><input type="checkbox" id="activo" checked={formData.activo} onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} className="rounded border-gray-300 text-obrica-orange focus:ring-obrica-orange" /><label htmlFor="activo" className="text-sm text-gray-700">Activo</label></div>}
          <div className="flex justify-end gap-3 pt-4"><button type="button" onClick={() => setModalOpen(false)} className="btn-outline" disabled={saving}>Cancelar</button><button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Guardar"}</button></div>
        </form>
      </Modal>
      <ConfirmDialog isOpen={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)} onConfirm={handleDelete} title="Eliminar Etapa" message={`¿Estás seguro de eliminar "${selectedEtapa?.nombre}"?`} confirmText="Eliminar" loading={saving} />
    </div>
  );
}
