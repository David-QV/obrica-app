"use client";

import { useState, useEffect, useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Settings2, AlertTriangle, Package, PackageCheck } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import Modal from "@/components/ui/Modal";

interface MaterialAlmacen {
  id: number;
  codigo: string | null;
  nombre: string;
  unidad: string | null;
  stock_fisico: number;
  stock_virtual: number;
  stock_disponible: number;
  stock_minimo: number;
  activo: boolean;
}

export default function AlmacenPage() {
  const [materiales, setMateriales] = useState<MaterialAlmacen[]>([]);
  const [loading, setLoading] = useState(true);
  const [ajusteModalOpen, setAjusteModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialAlmacen | null>(null);
  const [ajusteForm, setAjusteForm] = useState({
    stock_fisico: "",
    stock_minimo: "",
    notas: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      const res = await fetch("/api/inventario/almacen");
      const data = await res.json();
      if (data.success) setMateriales(data.data);
    } catch (err) {
      console.error("Error fetching almacen:", err);
    } finally {
      setLoading(false);
    }
  }

  function openAjusteModal(material: MaterialAlmacen) {
    setSelectedMaterial(material);
    setAjusteForm({
      stock_fisico: String(material.stock_fisico || 0),
      stock_minimo: String(material.stock_minimo || 0),
      notas: "",
    });
    setError("");
    setAjusteModalOpen(true);
  }

  async function handleAjuste(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedMaterial) return;

    const nuevoStockFisico = parseFloat(ajusteForm.stock_fisico);
    const nuevoStockMinimo = parseFloat(ajusteForm.stock_minimo);
    const cambioFisico = nuevoStockFisico !== (selectedMaterial.stock_fisico || 0);

    if (cambioFisico && !ajusteForm.notas.trim()) {
      setError("El motivo del ajuste de stock físico es obligatorio");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const payload: Record<string, unknown> = { material_id: selectedMaterial.id };
      if (cambioFisico) {
        payload.stock_fisico = nuevoStockFisico;
        payload.notas = ajusteForm.notas;
      }
      if (nuevoStockMinimo !== (selectedMaterial.stock_minimo || 0)) {
        payload.stock_minimo = nuevoStockMinimo;
      }

      const res = await fetch("/api/inventario/almacen/ajuste", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        await fetchData();
        setAjusteModalOpen(false);
      } else {
        setError(data.error || "Error al ajustar");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  const alertasBajoStock = materiales.filter(
    (m) => m.stock_minimo > 0 && m.stock_fisico <= m.stock_minimo
  );

  const columns: ColumnDef<MaterialAlmacen, unknown>[] = useMemo(
    () => [
      { accessorKey: "codigo", header: "Código", cell: ({ row }) => row.original.codigo || "-" },
      { accessorKey: "nombre", header: "Material" },
      { accessorKey: "unidad", header: "Unidad", cell: ({ row }) => row.original.unidad || "-" },
      {
        accessorKey: "stock_fisico",
        header: "Stock Físico",
        cell: ({ row }) => (
          <span className="font-medium">{row.original.stock_fisico || 0}</span>
        ),
      },
      {
        accessorKey: "stock_virtual",
        header: "Stock Virtual",
        cell: ({ row }) => (
          <span className="text-blue-600">{row.original.stock_virtual || 0}</span>
        ),
      },
      {
        accessorKey: "stock_disponible",
        header: "Disponible",
        cell: ({ row }) => (
          <span className="font-bold text-obrica-dark">{row.original.stock_disponible || 0}</span>
        ),
      },
      {
        accessorKey: "stock_minimo",
        header: "Stock Mín.",
        cell: ({ row }) => row.original.stock_minimo || 0,
      },
      {
        id: "estado",
        header: "Estado",
        cell: ({ row }) => {
          const fisico = row.original.stock_fisico || 0;
          const minimo = row.original.stock_minimo || 0;

          if (fisico === 0) {
            return (
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                Sin stock
              </span>
            );
          }
          if (minimo > 0 && fisico <= minimo) {
            return (
              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                Bajo
              </span>
            );
          }
          return (
            <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
              OK
            </span>
          );
        },
      },
      {
        id: "actions",
        header: "Ajuste",
        cell: ({ row }) => (
          <button
            onClick={() => openAjusteModal(row.original)}
            className="p-1 hover:bg-gray-100 rounded" title="Ajustar inventario"
          >
            <Settings2 className="w-4 h-4 text-gray-600" />
          </button>
        ),
      },
    ],
    []
  );

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Cargando...</div></div>;

  return (
    <div>
      <PageHeader
        title="Almacén"
        description="Existencias en tiempo real"
      />

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Materiales</p>
            <p className="text-2xl font-bold text-obrica-dark">{materiales.length}</p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center">
            <PackageCheck className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Con Stock</p>
            <p className="text-2xl font-bold text-green-600">
              {materiales.filter((m) => (m.stock_fisico || 0) > 0).length}
            </p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-sm text-gray-500">Alertas Bajo Stock</p>
            <p className="text-2xl font-bold text-yellow-600">{alertasBajoStock.length}</p>
          </div>
        </div>
      </div>

      {/* Low stock alerts */}
      {alertasBajoStock.length > 0 && (
        <div className="mb-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-yellow-800">Materiales con bajo inventario</h3>
          </div>
          <ul className="space-y-1">
            {alertasBajoStock.map((m) => (
              <li key={m.id} className="text-sm text-yellow-700">
                <strong>{m.nombre}</strong> - Stock: {m.stock_fisico} {m.unidad || ""} (Mínimo: {m.stock_minimo})
              </li>
            ))}
          </ul>
        </div>
      )}

      <DataTable data={materiales} columns={columns} searchPlaceholder="Buscar material..." />

      <Modal isOpen={ajusteModalOpen} onClose={() => setAjusteModalOpen(false)} title={`Ajuste: ${selectedMaterial?.nombre || ""}`}>
        <form onSubmit={handleAjuste} className="space-y-4">
          {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">{error}</div>}

          <div className="bg-gray-50 border rounded-md p-3 text-sm">
            <p><strong>Material:</strong> {selectedMaterial?.nombre}</p>
            <p><strong>Stock físico actual:</strong> {selectedMaterial?.stock_fisico || 0} {selectedMaterial?.unidad || ""}</p>
            <p><strong>Stock virtual:</strong> {selectedMaterial?.stock_virtual || 0}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nuevo Stock Físico</label>
            <input
              type="number" step="0.01" min="0"
              value={ajusteForm.stock_fisico}
              onChange={(e) => setAjusteForm({ ...ajusteForm, stock_fisico: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock Mínimo (para alertas)</label>
            <input
              type="number" step="0.01" min="0"
              value={ajusteForm.stock_minimo}
              onChange={(e) => setAjusteForm({ ...ajusteForm, stock_minimo: e.target.value })}
              className="w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Motivo del ajuste {parseFloat(ajusteForm.stock_fisico) !== (selectedMaterial?.stock_fisico || 0) && <span className="text-red-500">*</span>}
            </label>
            <textarea
              value={ajusteForm.notas}
              onChange={(e) => setAjusteForm({ ...ajusteForm, notas: e.target.value })}
              className="w-full" rows={2}
              placeholder="Ej: Conteo físico, merma, corrección..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setAjusteModalOpen(false)} className="btn-outline" disabled={saving}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={saving}>{saving ? "Guardando..." : "Aplicar Ajuste"}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
