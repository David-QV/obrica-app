"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  ArrowLeftRight,
  FileText,
  FolderOpen,
  Users,
  Layers,
  Tags,
  ListOrdered,
  CreditCard,
  Building2,
  Package,
  Boxes,
  ShoppingCart,
  PackagePlus,
  PackageMinus,
  Warehouse,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import type { LucideIcon } from "lucide-react";

interface MenuItem {
  label: string;
  href: string;
  icon: LucideIcon;
  submenu?: { label: string; href: string; icon: LucideIcon }[];
}

const menuItems: MenuItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
  },
  {
    label: "Ingresos/Egresos",
    href: "/ingresos-egresos",
    icon: ArrowLeftRight,
  },
  {
    label: "Contratos",
    href: "/contratos",
    icon: FileText,
  },
  {
    label: "Inventario",
    href: "/inventario",
    icon: Boxes,
    submenu: [
      { label: "Compras", href: "/inventario/compras", icon: ShoppingCart },
      { label: "Entradas", href: "/inventario/entradas", icon: PackagePlus },
      { label: "Salidas", href: "/inventario/salidas", icon: PackageMinus },
      { label: "Almacén", href: "/inventario/almacen", icon: Warehouse },
    ],
  },
  {
    label: "Catálogos",
    href: "/catalogos",
    icon: FolderOpen,
    submenu: [
      { label: "Proveedores", href: "/catalogos/proveedores", icon: Users },
      { label: "Partidas", href: "/catalogos/partidas", icon: Layers },
      { label: "Rubros", href: "/catalogos/rubros", icon: Tags },
      { label: "Etapas", href: "/catalogos/etapas", icon: ListOrdered },
      { label: "Métodos de Pago", href: "/catalogos/metodos-pago", icon: CreditCard },
      { label: "Privadas", href: "/catalogos/privadas", icon: Building2 },
      { label: "Materiales", href: "/catalogos/materiales", icon: Package },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenus, setOpenMenus] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    menuItems.forEach((item) => {
      if (item.submenu && pathname.startsWith(item.href)) {
        initial[item.href] = true;
      }
    });
    return initial;
  });

  const toggleMenu = (href: string) => {
    setOpenMenus((prev) => ({ ...prev, [href]: !prev[href] }));
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return pathname === "/";
    }
    return pathname.startsWith(href);
  };

  const NavContent = () => (
    <>
      <div className="p-4 border-b border-obrica-dark-light">
        <div className="flex items-center justify-center">
          <img
            src="/logo-obrica-2.png"
            alt="Obrica Constructora"
            className="h-10"
          />
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);

          if (item.submenu) {
            const isOpen = openMenus[item.href] || false;
            return (
              <div key={item.href}>
                <button
                  onClick={() => toggleMenu(item.href)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm transition-colors",
                    active
                      ? "bg-obrica-orange text-white"
                      : "text-gray-300 hover:bg-obrica-dark-light hover:text-white"
                  )}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-5 h-5" />
                    {item.label}
                  </span>
                  <svg
                    className={cn(
                      "w-4 h-4 transition-transform",
                      isOpen && "rotate-180"
                    )}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
                {isOpen && (
                  <div className="mt-1 ml-4 space-y-1">
                    {item.submenu.map((subitem) => {
                      const SubIcon = subitem.icon;
                      const subActive = pathname === subitem.href;
                      return (
                        <Link
                          key={subitem.href}
                          href={subitem.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                            subActive
                              ? "bg-obrica-orange text-white"
                              : "text-gray-400 hover:bg-obrica-dark-light hover:text-white"
                          )}
                        >
                          <SubIcon className="w-4 h-4" />
                          {subitem.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                active
                  ? "bg-obrica-orange text-white"
                  : "text-gray-300 hover:bg-obrica-dark-light hover:text-white"
              )}
            >
              <Icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-obrica-dark-light">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-obrica-orange rounded-full flex items-center justify-center text-white text-sm font-medium">
            {user?.nombre?.charAt(0) || user?.username?.charAt(0) || "U"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.nombre || user?.username}
            </p>
            <p className="text-xs text-gray-400">{user?.rol}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-2 w-full px-3 py-2 text-sm text-gray-300 hover:bg-obrica-dark-light hover:text-white rounded-md transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Cerrar Sesión
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-obrica-dark text-white rounded-md"
      >
        {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-64 bg-obrica-dark flex flex-col transform transition-transform duration-200 ease-in-out",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <NavContent />
      </aside>
    </>
  );
}
