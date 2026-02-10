import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import {
  ShoppingCart,
  PackagePlus,
  PackageMinus,
  Warehouse,
} from "lucide-react";

const submodulos = [
  {
    title: "Compras",
    description: "Registra y gestiona órdenes de compra de materiales",
    href: "/inventario/compras",
    icon: ShoppingCart,
  },
  {
    title: "Entradas",
    description: "Registra la recepción física de material comprado",
    href: "/inventario/entradas",
    icon: PackagePlus,
  },
  {
    title: "Salidas",
    description: "Registra el consumo o entrega de materiales",
    href: "/inventario/salidas",
    icon: PackageMinus,
  },
  {
    title: "Almacén",
    description: "Consulta existencias y ajusta inventario",
    href: "/inventario/almacen",
    icon: Warehouse,
  },
];

export default function InventarioPage() {
  return (
    <div>
      <PageHeader
        title="Inventario"
        description="Gestión de inventario de materiales de construcción"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {submodulos.map((sub) => {
          const Icon = sub.icon;
          return (
            <Link
              key={sub.href}
              href={sub.href}
              className="card hover:border-obrica-orange hover:shadow-md transition-all group"
            >
              <div className="flex flex-col items-center text-center gap-3 py-4">
                <div className="w-14 h-14 rounded-lg bg-obrica-cream flex items-center justify-center group-hover:bg-obrica-orange transition-colors">
                  <Icon className="w-7 h-7 text-obrica-dark group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-obrica-dark">
                    {sub.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {sub.description}
                  </p>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
