"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatCurrency, formatPercent } from "@/lib/utils";
import type { Contrato, Proveedor, Privada } from "@/types";

interface ContratoExtended extends Contrato {
  proveedor_nombre?: string;
  privada_nombre?: string;
}

export default function ContratosPage() {
  const [contratos, setContratos] = useState<ContratoExtended[]>([]);
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [privadas, setPrivadas] = useState<Privada[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedContrato, setSelectedContrato] = useState<ContratoExtended | null>(null);
  const [formData, setFormData] = useState({
    numero_contrato: "",
    descripcion: "",
    total: "",
    total_con_iva: "",
    estimado: "",
    pagado: "",
    margen_operativo: "",
    porcentaje_operativo: "",
    mano_obra: "",
    materiales: "",
    indirectos: "",
    proveedor_id: "",
    privada_id: "",
    fecha_inicio: "",
    fecha_fin: "",
    estatus: "activo",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([fetchContratos(), fetchProveedores(), fetchPrivadas()]);
  }, []);

  async function fetchContratos() {
    try {
      const res = await fetch("/api/contratos");
      const data = await res.json();
      if (data.success) setContratos(data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchProveedores() {
    try {
      const res = await fetch("/api/catalogos/proveedores");
      const data = await res.json();
      if (data.success) setProveedores(data.data);
    } catch (err) {
      console.error(err);
    }
  }

  async function fetchPrivadas() {
    try {
      const res = await fetch("/api/catalogos/privadas");
      const data = await res.json();
      if (data.success) setPrivadas(data.data);
    } catch (err) {
      console.error(err);
    }
  }

  function openCreateModal() {
    setSelectedContrato(null);
    setFormData({
      numero_contrato: "",
      descripcion: "",
      total: "",
      total_con_iva: "",
      estimado: "",
      pagado: "",
      margen_operativo: "",
      porcentaje_operativo: "",
      mano_obra: "",
      materiales: "",
      indirectos: "",
      proveedor_id: "",
      privada_id: "",
      fecha_inicio: "",
      fecha_fin: "",
      estatus: "activo",
    });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(contrato: ContratoExtended) {
    setSelectedContrato(contrato);
    setFormData({
      numero_contrato: contrato.numero_contrato,
      descripcion: contrato.descripcion || "",
      total: contrato.total?.toString() || "",
      total_con_iva: contrato.total_con_iva?.toString() || "",
      estimado: contrato.estimado?.toString() || "",
      pagado: contrato.pagado?.toString() || "",
      margen_operativo: contrato.margen_operativo?.toString() || "",
      porcentaje_operativo: contrato.porcentaje_operativo?.toString() || "",
      mano_obra: contrato.mano_obra?.toString() || "",
      materiales: contrato.materiales?.toString() || "",
      indirectos: contrato.indirectos?.toString() || "",
      proveedor_id: contrato.proveedor_id?.toString() || "",
      privada_id: contrato.privada_id?.toString() || "",
      fecha_inicio: contrato.fecha_inicio || "",
      fecha_fin: contrato.fecha_fin || "",
      estatus: contrato.estatus || "activo",
    });
    setError("");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formData.numero_contrato.trim()) {
      setError("El número de contrato es requerido");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const url = selectedContrato
        ? `/api/contratos/${selectedContrato.id}`
        : "/api/contratos";
      const method = selectedContrato ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          proveedor_id: formData.proveedor_id ? parseInt(formData.proveedor_id) : null,
          privada_id: formData.privada_id ? parseInt(formData.privada_id) : null,
        }),
      });

      const data = await res.json();

      if (data.success) {
        await fetchContratos();
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
    if (!selectedContrato) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/contratos/${selectedContrato.id}`, {
        method: "DELETE",
      });
      const data = await res.json();

      if (data.success) {
        await fetchContratos();
        setDeleteDialogOpen(false);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<ContratoExtended, unknown>[] = useMemo(
    () => [
      { accessorKey: "numero_contrato", header: "Contrato" },
      {
        accessorKey: "privada_nombre",
        header: "Privada",
        cell: ({ row }) => row.original.privada_nombre || "-",
      },
      {
        accessorKey: "total",
        header: "Total",
        cell: ({ row }) => formatCurrency(row.original.total || 0),
      },
      {
        accessorKey: "estimado",
        header: "Estimado",
        cell: ({ row }) => formatCurrency(row.original.estimado || 0),
      },
      {
        accessorKey: "pagado",
        header: "Pagado",
        cell: ({ row }) => formatCurrency(row.original.pagado || 0),
      },
      {
        accessorKey: "por_cobrar",
        header: "X Cobrar",
        cell: ({ row }) => formatCurrency(row.original.por_cobrar || 0),
      },
      {
        accessorKey: "porcentaje_operativo",
        header: "% Operativo",
        cell: ({ row }) => formatPercent(row.original.porcentaje_operativo || 0),
      },
      {
        accessorKey: "estatus",
        header: "Estado",
        cell: ({ row }) => {
          const status = row.original.estatus;
          const colors: Record<string, string> = {
            activo: "bg-green-100 text-green-800",
            pausado: "bg-yellow-100 text-yellow-800",
            finalizado: "bg-blue-100 text-blue-800",
            cancelado: "bg-red-100 text-red-800",
          };
          return (
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${colors[status] || "bg-gray-100 text-gray-800"}`}>
              {status}
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button onClick={() => openEditModal(row.original)} className="p-1 hover:bg-gray-100 rounded" title="Editar">
              <Pencil className="w-4 h-4 text-gray-600" />
            </button>
            <button onClick={() => { setSelectedContrato(row.original); setDeleteDialogOpen(true); }} className="p-1 hover:bg-gray-100 rounded" title="Eliminar">
              <Trash2 className="w-4 h-4 text-red-600" />
            </button>
          </div>
        ),
      },
    ],
    []
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Contratos"
        description="Gestiona los contratos de obra"
        actions={
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Contrato
          </button>
        }
      />

      <DataTable data={contratos} columns={columns} searchPlaceholder="Buscar contrato..." />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedContrato ? "Editar Contrato" : "Nuevo Contrato"}
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Número de Contrato *
              </label>
              <input
                type="text"
                value={formData.numero_contrato}
                onChange={(e) => setFormData({ ...formData, numero_contrato: e.target.value })}
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor/Contratista
              </label>
              <select
                value={formData.proveedor_id}
                onChange={(e) => setFormData({ ...formData, proveedor_id: e.target.value })}
                className="w-full"
              >
                <option value="">Seleccionar...</option>
                {proveedores.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Privada
              </label>
              <select
                value={formData.privada_id}
                onChange={(e) => setFormData({ ...formData, privada_id: e.target.value })}
                className="w-full"
              >
                <option value="">Seleccionar...</option>
                {privadas.map((p) => (
                  <option key={p.id} value={p.id}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Descripción
            </label>
            <textarea
              value={formData.descripcion}
              onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
              className="w-full"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
              <input type="number" step="0.01" value={formData.total} onChange={(e) => setFormData({ ...formData, total: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total c/IVA</label>
              <input type="number" step="0.01" value={formData.total_con_iva} onChange={(e) => setFormData({ ...formData, total_con_iva: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estimado</label>
              <input type="number" step="0.01" value={formData.estimado} onChange={(e) => setFormData({ ...formData, estimado: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pagado</label>
              <input type="number" step="0.01" value={formData.pagado} onChange={(e) => setFormData({ ...formData, pagado: e.target.value })} className="w-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Margen Operativo</label>
              <input type="number" step="0.01" value={formData.margen_operativo} onChange={(e) => setFormData({ ...formData, margen_operativo: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">% Operativo</label>
              <input type="number" step="0.01" value={formData.porcentaje_operativo} onChange={(e) => setFormData({ ...formData, porcentaje_operativo: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mano de Obra</label>
              <input type="number" step="0.01" value={formData.mano_obra} onChange={(e) => setFormData({ ...formData, mano_obra: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Materiales</label>
              <input type="number" step="0.01" value={formData.materiales} onChange={(e) => setFormData({ ...formData, materiales: e.target.value })} className="w-full" />
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Indirectos</label>
              <input type="number" step="0.01" value={formData.indirectos} onChange={(e) => setFormData({ ...formData, indirectos: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Inicio</label>
              <input type="date" value={formData.fecha_inicio} onChange={(e) => setFormData({ ...formData, fecha_inicio: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha Fin</label>
              <input type="date" value={formData.fecha_fin} onChange={(e) => setFormData({ ...formData, fecha_fin: e.target.value })} className="w-full" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estatus</label>
              <select value={formData.estatus} onChange={(e) => setFormData({ ...formData, estatus: e.target.value })} className="w-full">
                <option value="activo">Activo</option>
                <option value="pausado">Pausado</option>
                <option value="finalizado">Finalizado</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-outline" disabled={saving}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDelete}
        title="Eliminar Contrato"
        message={`¿Estás seguro de eliminar el contrato "${selectedContrato?.numero_contrato}"?`}
        confirmText="Eliminar"
        loading={saving}
      />
    </div>
  );
}
