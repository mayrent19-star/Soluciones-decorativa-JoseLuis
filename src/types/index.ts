export interface Cliente {
  id: string;
  nombreCompleto: string;
  empresa?: string;
  telefono: string;
  direccion: string;
  email?: string;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Empleado {
  id: string;
  nombre: string;
  cedula?: string;
  fechaIngreso?: string;
  direccion?: string;
  email?: string;
  tipo: 'Fijo' | 'Ajuste';
  telefono?: string;
  pagoFijoMensual?: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Trabajo {
  id: string;
  idCliente: string;
  descripcionTrabajo: string;
  categoria: 'Tapicería' | 'Ebanistería' | 'Mixto';
  estado: 'Pendiente' | 'En proceso' | 'Finalizado' | 'Entregado' | 'Cancelado';
  fechaInicio: string;
  fechaEntregaEstimada?: string;
  fechaFinalizado?: string;
  montoCotizado: number;
  montoFinal?: number;
  abono?: number;
  notas?: string;
  createdAt: string;
  updatedAt: string;

  // Nuevos campos (BD)
  tipo_trabajo?: string;
  fotos_antes?: string[];
  fotos_despues?: string[];
  foto_muestra?: string;
  foto_final?: string;
}

export interface TrabajoEmpleado {
  id: string;
  idTrabajo: string;
  idEmpleado: string;
  descripcion: string;
  horas?: number;
  montoPagar: number;
  notas?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventarioItem {
  id: string;
  nombreItem: string;
  categoria: string;
  unidad: string;
  stockActual: number;
  stockMinimo: number;
  costoUnitario?: number;
  ubicacion?: string;
  foto?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InventarioMovimiento {
  id: string;
  idItem: string;
  tipoMovimiento: 'Entrada' | 'Salida' | 'Ajuste';
  fecha: string;
  cantidad: number;
  motivo: string;
  idTrabajo?: string;
  idEmpleado?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CajaMovimiento {
  id: string;
  tipo: 'Entrada' | 'Salida';
  fecha: string;
  monto: number;
  detalle: string;
  categoriaGasto?: string;
  idTrabajo?: string;
  idEmpleado?: string;
  fotoFactura?: string;
  createdAt: string;
  updatedAt: string;
}

export type EstadoTrabajo = Trabajo['estado'];
export type CategoriaTrabajo = Trabajo['categoria'];
export type TipoEmpleado = Empleado['tipo'];
