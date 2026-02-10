"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Plus, Pencil, Trash2 } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { Proveedor } from "@/types";

export default function ProveedoresPage() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProveedor, setSelectedProveedor] = useState<Proveedor | null>(null);
  const [formData, setFormData] = useState({
    nombre: "",
    rfc: "",
    telefono: "",
    email: "",
    direccion: "",
    tipo: "proveedor" as "proveedor" | "contratista" | "ambos",
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchProveedores();
  }, []);

  async function fetchProveedores() {
    try {
      const res = await fetch("/api/catalogos/proveedores?activos=false");
      const data = await res.json();
      if (data.success) {
        setProveedores(data.data);
      }
    } catch (err) {
      console.error("Error fetching proveedores:", err);
    } finally {
      setLoading(false);
    }
  }

  function openCreateModal() {
    setSelectedProveedor(null);
    setFormData({
      nombre: "",
      rfc: "",
      telefono: "",
      email: "",
      direccion: "",
      tipo: "proveedor",
      activo: true,
    });
    setError("");
    setModalOpen(true);
  }

  function openEditModal(proveedor: Proveedor) {
    setSelectedProveedor(proveedor);
    setFormData({
      nombre: proveedor.nombre,
      rfc: proveedor.rfc || "",
      telefono: proveedor.telefono || "",
      email: proveedor.email || "",
      direccion: proveedor.direccion || "",
      tipo: proveedor.tipo,
      activo: Boolean(proveedor.activo),
    });
    setError("");
    setModalOpen(true);
  }

  function openDeleteDialog(proveedor: Proveedor) {
    setSelectedProveedor(proveedor);
    setDeleteDialogOpen(true);
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
      const url = selectedProveedor
        ? `/api/catalogos/proveedores/${selectedProveedor.id}`
        : "/api/catalogos/proveedores";
      const method = selectedProveedor ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        await fetchProveedores();
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
    if (!selectedProveedor) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/catalogos/proveedores/${selectedProveedor.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (data.success) {
        await fetchProveedores();
        setDeleteDialogOpen(false);
      }
    } catch (err) {
      console.error("Error deleting proveedor:", err);
    } finally {
      setSaving(false);
    }
  }

  const columns: ColumnDef<Proveedor, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "nombre",
        header: "Nombre",
      },
      {
        accessorKey: "rfc",
        header: "RFC",
        cell: ({ row }) => row.original.rfc || "-",
      },
      {
        accessorKey: "telefono",
        header: "Teléfono",
        cell: ({ row }) => row.original.telefono || "-",
      },
      {
        accessorKey: "email",
        header: "Email",
        cell: ({ row }) => row.original.email || "-",
      },
      {
        accessorKey: "tipo",
        header: "Tipo",
        cell: ({ row }) => {
          const tipos = {
            proveedor: "Proveedor",
            contratista: "Contratista",
            ambos: "Ambos",
          };
          return tipos[row.original.tipo] || row.original.tipo;
        },
      },
      {
        accessorKey: "activo",
        header: "Estado",
        cell: ({ row }) => (
          <span
            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
              row.original.activo
                ? "bg-green-100 text-green-800"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {row.original.activo ? "Activo" : "Inactivo"}
          </span>
        ),
      },
      {
        id: "actions",
        header: "Acciones",
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditModal(row.original)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Editar"
            >
              <Pencil className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => openDeleteDialog(row.original)}
              className="p-1 hover:bg-gray-100 rounded"
              title="Eliminar"
            >
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
        title="Proveedores"
        description="Gestiona los proveedores y contratistas"
        actions={
          <button onClick={openCreateModal} className="btn-primary">
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Proveedor
          </button>
        }
      />

      <DataTable
        data={proveedores}
        columns={columns}
        searchPlaceholder="Buscar proveedor..."
      />

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedProveedor ? "Editar Proveedor" : "Nuevo Proveedor"}
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                value={formData.nombre}
                onChange={(e) =>
                  setFormData({ ...formData, nombre: e.target.value })
                }
                className="w-full"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RFC
              </label>
              <input
                type="text"
                value={formData.rfc}
                onChange={(e) =>
                  setFormData({ ...formData, rfc: e.target.value })
                }
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="text"
                value={formData.telefono}
                onChange={(e) =>
                  setFormData({ ...formData, telefono: e.target.value })
                }
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo
              </label>
              <select
                value={formData.tipo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    tipo: e.target.value as "proveedor" | "contratista" | "ambos",
                  })
                }
                className="w-full"
              >
                <option value="proveedor">Proveedor</option>
                <option value="contratista">Contratista</option>
                <option value="ambos">Ambos</option>
              </select>
            </div>

            {selectedProveedor && (
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="activo"
                  checked={formData.activo}
                  onChange={(e) =>
                    setFormData({ ...formData, activo: e.target.checked })
                  }
                  className="rounded border-gray-300 text-obrica-orange focus:ring-obrica-orange"
                />
                <label htmlFor="activo" className="text-sm text-gray-700">
                  Activo
                </label>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <textarea
              value={formData.direccion}
              onChange={(e) =>
                setFormData({ ...formData, direccion: e.target.value })
              }
              className="w-full"
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="btn-outline"
              disabled={saving}
            >
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
        title="Eliminar Proveedor"
        message={`¿Estás seguro de eliminar a "${selectedProveedor?.nombre}"? Si tiene registros asociados, será desactivado en lugar de eliminado.`}
        confirmText="Eliminar"
        loading={saving}
      />
    </div>
  );
}
