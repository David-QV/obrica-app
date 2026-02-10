// Tipos para catálogos
export interface Proveedor {
  id: number;
  nombre: string;
  rfc: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  tipo: "proveedor" | "contratista" | "ambos";
  activo: boolean;
  created_at: string;
}

export interface Partida {
  id: number;
  codigo: string | null;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Rubro {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Etapa {
  id: number;
  nombre: string;
  orden: number | null;
  activo: boolean;
}

export interface MetodoPago {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
}

export interface Privada {
  id: number;
  nombre: string;
  ubicacion: string | null;
  activo: boolean;
}

export interface Material {
  id: number;
  codigo: string | null;
  nombre: string;
  unidad: string | null;
  stock_fisico: number;
  stock_virtual: number;
  stock_minimo: number;
  activo: boolean;
}

// Tipos para entidades principales
export interface Contrato {
  id: number;
  numero_contrato: string;
  descripcion: string | null;
  total: number;
  total_con_iva: number;
  estimado: number;
  pagado: number;
  por_cobrar: number;
  por_estimar: number;
  margen_operativo: number;
  porcentaje_operativo: number;
  mano_obra: number;
  materiales: number;
  indirectos: number;
  proveedor_id: number | null;
  privada_id: number | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estatus: string;
  created_at: string;
  updated_at: string;
  // Relaciones
  proveedor?: Proveedor;
  privada?: Privada;
}

export interface Movimiento {
  id: number;
  tipo: "ingreso" | "egreso";
  fecha: string;
  etapa_id: number | null;
  privada_id: number | null;
  partida_id: number | null;
  rubro_id: number | null;
  descripcion: string | null;
  estimacion: number | null;
  proveedor_id: number | null;
  contrato_id: number | null;
  monto: number;
  metodo_pago_id: number | null;
  comprobante: string | null;
  notas: string | null;
  created_at: string;
  updated_at: string;
  // Relaciones
  etapa?: Etapa;
  privada?: Privada;
  partida?: Partida;
  rubro?: Rubro;
  proveedor?: Proveedor;
  contrato?: Contrato;
  metodo_pago?: MetodoPago;
}

export interface Usuario {
  id: number;
  username: string;
  nombre: string | null;
  rol: string;
  activo: boolean;
  created_at: string;
}

// Tipos para inventario
export interface Compra {
  id: number;
  folio: string;
  material_id: number;
  proveedor_id: number | null;
  cantidad: number;
  cantidad_recibida: number;
  precio_unitario: number;
  total: number;
  fecha: string;
  notas: string | null;
  estatus: "activa" | "completada" | "cancelada";
  created_at: string;
  // Relaciones (JOIN)
  material_nombre?: string;
  material_unidad?: string;
  proveedor_nombre?: string;
}

export interface Entrada {
  id: number;
  folio: string;
  compra_id: number;
  material_id: number;
  cantidad: number;
  fecha: string;
  notas: string | null;
  estatus: "activa" | "cancelada";
  created_at: string;
  // Relaciones (JOIN)
  compra_folio?: string;
  material_nombre?: string;
  material_unidad?: string;
}

export interface Salida {
  id: number;
  folio: string;
  material_id: number;
  cantidad: number;
  referencia: string;
  fecha: string;
  notas: string | null;
  estatus: "activa" | "cancelada";
  created_at: string;
  // Relaciones (JOIN)
  material_nombre?: string;
  material_unidad?: string;
}

export interface InventarioHistorial {
  id: number;
  material_id: number;
  tipo: string;
  referencia_id: number | null;
  cantidad: number;
  stock_fisico_anterior: number;
  stock_fisico_nuevo: number;
  stock_virtual_anterior: number;
  stock_virtual_nuevo: number;
  notas: string | null;
  created_at: string;
}

// Tipos para formularios
export type ProveedorForm = Omit<Proveedor, "id" | "created_at">;
export type PartidaForm = Omit<Partida, "id">;
export type RubroForm = Omit<Rubro, "id">;
export type EtapaForm = Omit<Etapa, "id">;
export type MetodoPagoForm = Omit<MetodoPago, "id">;
export type PrivadaForm = Omit<Privada, "id">;
export type MaterialForm = Omit<Material, "id">;
export type ContratoForm = Omit<Contrato, "id" | "created_at" | "updated_at" | "proveedor" | "privada">;
export type MovimientoForm = Omit<Movimiento, "id" | "created_at" | "updated_at" | "etapa" | "privada" | "partida" | "rubro" | "proveedor" | "contrato" | "metodo_pago">;

// Tipos para API
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
