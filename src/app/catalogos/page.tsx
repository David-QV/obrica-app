import Link from "next/link";
import PageHeader from "@/components/ui/PageHeader";
import {
  Users,
  Layers,
  Tags,
  ListOrdered,
  CreditCard,
  Building2,
  Package,
} from "lucide-react";

const catalogos = [
  {
    title: "Proveedores",
    description: "Gestiona proveedores y contratistas",
    href: "/catalogos/proveedores",
    icon: Users,
  },
  {
    title: "Partidas",
    description: "Partidas de obra",
    href: "/catalogos/partidas",
    icon: Layers,
  },
  {
    title: "Rubros",
    description: "Categorías de gastos",
    href: "/catalogos/rubros",
    icon: Tags,
  },
  {
    title: "Etapas",
    description: "Etapas de construcción",
    href: "/catalogos/etapas",
    icon: ListOrdered,
  },
  {
    title: "Métodos de Pago",
    description: "Formas de pago disponibles",
    href: "/catalogos/metodos-pago",
    icon: CreditCard,
  },
  {
    title: "Privadas",
    description: "Proyectos y ubicaciones",
    href: "/catalogos/privadas",
    icon: Building2,
  },
  {
    title: "Materiales",
    description: "Catálogo de materiales de construcción",
    href: "/catalogos/materiales",
    icon: Package,
  },
];

export default function CatalogosPage() {
  return (
    <div>
      <PageHeader
        title="Catálogos"
        description="Administra los catálogos del sistema"
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {catalogos.map((catalogo) => {
          const Icon = catalogo.icon;
          return (
            <Link
              key={catalogo.href}
              href={catalogo.href}
              className="card hover:border-obrica-orange hover:shadow-md transition-all group"
            >
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-obrica-cream flex items-center justify-center group-hover:bg-obrica-orange transition-colors">
                  <Icon className="w-6 h-6 text-obrica-dark group-hover:text-white transition-colors" />
                </div>
                <div>
                  <h3 className="font-semibold text-obrica-dark">
                    {catalogo.title}
                  </h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {catalogo.description}
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
