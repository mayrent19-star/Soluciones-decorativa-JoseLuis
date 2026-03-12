const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const now = () => new Date().toISOString();

export function getAll<T>(key: string): T[] {
  try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
}

export function getById<T extends { id: string }>(key: string, id: string): T | undefined {
  return getAll<T>(key).find(i => i.id === id);
}

export function create<T>(key: string, data: Record<string, unknown>): T {
  const items = getAll<T>(key);
  const item = { ...data, id: genId(), createdAt: now(), updatedAt: now() } as T;
  items.push(item);
  localStorage.setItem(key, JSON.stringify(items));
  return item;
}

export function update<T extends { id: string }>(key: string, id: string, data: Record<string, unknown>): T {
  const items = getAll<T>(key);
  const idx = items.findIndex((i) => i.id === id);
  if (idx === -1) throw new Error('Not found');
  items[idx] = { ...items[idx], ...data, updatedAt: now() } as T;
  localStorage.setItem(key, JSON.stringify(items));
  return items[idx];
}

export function remove(key: string, id: string): void {
  const items = getAll<{ id: string }>(key);
  localStorage.setItem(key, JSON.stringify(items.filter(i => i.id !== id)));
}

export function initSeedData() {
  if (localStorage.getItem('_seeded')) return;

  const clientes = [
    { id: 'c1', nombreCompleto: 'María García López', telefono: '809-555-0101', direccion: 'Calle 1ra #45, Santo Domingo', email: 'maria@email.com', notas: 'Cliente frecuente', createdAt: '2025-01-15T10:00:00Z', updatedAt: '2025-01-15T10:00:00Z' },
    { id: 'c2', nombreCompleto: 'Carlos Méndez', empresa: 'Hotel Paraíso', telefono: '809-555-0202', direccion: 'Av. Principal #120', createdAt: '2025-02-01T10:00:00Z', updatedAt: '2025-02-01T10:00:00Z' },
    { id: 'c3', nombreCompleto: 'Ana Rodríguez', telefono: '809-555-0303', direccion: 'Res. Los Pinos, Apto 3B', createdAt: '2025-02-10T10:00:00Z', updatedAt: '2025-02-10T10:00:00Z' },
    { id: 'c4', nombreCompleto: 'Roberto Sánchez', empresa: 'Restaurante Don Pepe', telefono: '809-555-0404', direccion: 'Calle del Sol #78', createdAt: '2025-03-01T10:00:00Z', updatedAt: '2025-03-01T10:00:00Z' },
  ];

  const empleados = [
    { id: 'e1', nombre: 'Juan Pérez', tipo: 'Ajuste', telefono: '809-555-1001', activo: true, createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    { id: 'e2', nombre: 'Pedro Martínez', tipo: 'Ajuste', telefono: '809-555-1002', activo: true, createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    { id: 'e3', nombre: 'Luis Hernández', tipo: 'Fijo', telefono: '809-555-1003', pagoFijoMensual: 25000, activo: true, createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
  ];

  const trabajos = [
    { id: 't1', idCliente: 'c1', descripcionTrabajo: 'Tapizado de juego de sala completo (3-2-1)', categoria: 'Tapicería', estado: 'En proceso', fechaInicio: '2026-02-01', montoCotizado: 45000, abono: 20000, createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-02-01T10:00:00Z' },
    { id: 't2', idCliente: 'c2', descripcionTrabajo: 'Restauración de 12 sillas de comedor para hotel', categoria: 'Mixto', estado: 'Pendiente', fechaInicio: '2026-02-10', montoCotizado: 60000, createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z' },
    { id: 't3', idCliente: 'c3', descripcionTrabajo: 'Gabinetes de cocina en caoba', categoria: 'Ebanistería', estado: 'Finalizado', fechaInicio: '2026-01-15', fechaFinalizado: '2026-02-15', montoCotizado: 85000, montoFinal: 90000, abono: 85000, createdAt: '2026-01-15T10:00:00Z', updatedAt: '2026-02-15T10:00:00Z' },
    { id: 't4', idCliente: 'c4', descripcionTrabajo: 'Tapizado de 8 banquetas para restaurante', categoria: 'Tapicería', estado: 'Entregado', fechaInicio: '2026-01-05', fechaFinalizado: '2026-01-28', montoCotizado: 32000, montoFinal: 32000, abono: 32000, createdAt: '2026-01-05T10:00:00Z', updatedAt: '2026-01-28T10:00:00Z' },
    { id: 't5', idCliente: 'c1', descripcionTrabajo: 'Cabecera tapizada king size', categoria: 'Mixto', estado: 'En proceso', fechaInicio: '2026-02-12', montoCotizado: 18000, abono: 9000, createdAt: '2026-02-12T10:00:00Z', updatedAt: '2026-02-12T10:00:00Z' },
  ];

  const trabajoEmpleados = [
    { id: 'te1', idTrabajo: 't1', idEmpleado: 'e1', descripcion: 'Desmonte y tapizado', montoPagar: 8000, createdAt: '2026-02-02T10:00:00Z', updatedAt: '2026-02-02T10:00:00Z' },
    { id: 'te2', idTrabajo: 't1', idEmpleado: 'e2', descripcion: 'Costura de fundas', montoPagar: 5000, createdAt: '2026-02-02T10:00:00Z', updatedAt: '2026-02-02T10:00:00Z' },
    { id: 'te3', idTrabajo: 't3', idEmpleado: 'e1', descripcion: 'Carpintería gabinetes', montoPagar: 15000, createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z' },
    { id: 'te4', idTrabajo: 't4', idEmpleado: 'e2', descripcion: 'Tapizado banquetas', montoPagar: 6000, createdAt: '2026-01-10T10:00:00Z', updatedAt: '2026-01-10T10:00:00Z' },
    { id: 'te5', idTrabajo: 't5', idEmpleado: 'e3', descripcion: 'Estructura de madera cabecera', montoPagar: 4000, createdAt: '2026-02-13T10:00:00Z', updatedAt: '2026-02-13T10:00:00Z' },
  ];

  const inventario = [
    { id: 'i1', nombreItem: 'Tela chenille beige', categoria: 'Tela', unidad: 'yarda', stockActual: 25, stockMinimo: 10, costoUnitario: 450, ubicacion: 'Estante A1', createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    { id: 'i2', nombreItem: 'Espuma alta densidad 4"', categoria: 'Espuma', unidad: 'plancha', stockActual: 8, stockMinimo: 5, costoUnitario: 1200, ubicacion: 'Almacén', createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    { id: 'i3', nombreItem: 'Madera caoba 1x12', categoria: 'Madera', unidad: 'pie', stockActual: 3, stockMinimo: 10, costoUnitario: 350, ubicacion: 'Patio', createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    { id: 'i4', nombreItem: 'Pegamento blanco galón', categoria: 'Pegamento', unidad: 'galón', stockActual: 2, stockMinimo: 3, costoUnitario: 800, createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    { id: 'i5', nombreItem: 'Tornillos 2" (caja)', categoria: 'Herramienta', unidad: 'caja', stockActual: 15, stockMinimo: 5, costoUnitario: 150, createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    { id: 'i6', nombreItem: 'Tela vinílica negra', categoria: 'Tela', unidad: 'yarda', stockActual: 4, stockMinimo: 8, costoUnitario: 550, ubicacion: 'Estante A2', createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    { id: 'i7', nombreItem: 'Laca brillante', categoria: 'Acabado', unidad: 'galón', stockActual: 1, stockMinimo: 2, costoUnitario: 1500, createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
    { id: 'i8', nombreItem: 'Grapas tapicería (caja)', categoria: 'Herramienta', unidad: 'caja', stockActual: 20, stockMinimo: 5, costoUnitario: 200, createdAt: '2025-01-01T10:00:00Z', updatedAt: '2025-01-01T10:00:00Z' },
  ];

  const inventarioMovimientos = [
    { id: 'im1', idItem: 'i1', tipoMovimiento: 'Salida', fecha: '2026-02-03', cantidad: 12, motivo: 'Para tapizado sala', idTrabajo: 't1', createdAt: '2026-02-03T10:00:00Z', updatedAt: '2026-02-03T10:00:00Z' },
    { id: 'im2', idItem: 'i2', tipoMovimiento: 'Salida', fecha: '2026-02-03', cantidad: 3, motivo: 'Espuma para cojines', idTrabajo: 't1', createdAt: '2026-02-03T10:00:00Z', updatedAt: '2026-02-03T10:00:00Z' },
    { id: 'im3', idItem: 'i3', tipoMovimiento: 'Salida', fecha: '2026-01-20', cantidad: 15, motivo: 'Gabinetes cocina', idTrabajo: 't3', createdAt: '2026-01-20T10:00:00Z', updatedAt: '2026-01-20T10:00:00Z' },
    { id: 'im4', idItem: 'i5', tipoMovimiento: 'Entrada', fecha: '2026-02-01', cantidad: 10, motivo: 'Compra reposición', createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-02-01T10:00:00Z' },
  ];

  const cajaMovimientos = [
    { id: 'cm1', tipo: 'Entrada', fecha: '2026-02-01', monto: 20000, detalle: 'Abono tapizado sala - María García', idTrabajo: 't1', createdAt: '2026-02-01T10:00:00Z', updatedAt: '2026-02-01T10:00:00Z' },
    { id: 'cm2', tipo: 'Salida', fecha: '2026-02-02', monto: 5400, detalle: 'Compra tela chenille', categoriaGasto: 'Material', createdAt: '2026-02-02T10:00:00Z', updatedAt: '2026-02-02T10:00:00Z' },
    { id: 'cm3', tipo: 'Salida', fecha: '2026-02-03', monto: 3600, detalle: 'Compra espuma', categoriaGasto: 'Material', createdAt: '2026-02-03T10:00:00Z', updatedAt: '2026-02-03T10:00:00Z' },
    { id: 'cm4', tipo: 'Entrada', fecha: '2026-02-05', monto: 9000, detalle: 'Abono cabecera - María García', idTrabajo: 't5', createdAt: '2026-02-05T10:00:00Z', updatedAt: '2026-02-05T10:00:00Z' },
    { id: 'cm5', tipo: 'Salida', fecha: '2026-02-06', monto: 8000, detalle: 'Pago Juan Pérez - tapizado sala', idEmpleado: 'e1', idTrabajo: 't1', categoriaGasto: 'Mano de obra', createdAt: '2026-02-06T10:00:00Z', updatedAt: '2026-02-06T10:00:00Z' },
    { id: 'cm6', tipo: 'Entrada', fecha: '2026-01-28', monto: 32000, detalle: 'Pago completo banquetas - Rest. Don Pepe', idTrabajo: 't4', createdAt: '2026-01-28T10:00:00Z', updatedAt: '2026-01-28T10:00:00Z' },
    { id: 'cm7', tipo: 'Salida', fecha: '2026-02-10', monto: 1500, detalle: 'Transporte materiales', categoriaGasto: 'Transporte', createdAt: '2026-02-10T10:00:00Z', updatedAt: '2026-02-10T10:00:00Z' },
    { id: 'cm8', tipo: 'Salida', fecha: '2026-02-12', monto: 500, detalle: 'Almuerzo equipo', categoriaGasto: 'Alimentación', createdAt: '2026-02-12T10:00:00Z', updatedAt: '2026-02-12T10:00:00Z' },
  ];

  localStorage.setItem('clientes', JSON.stringify(clientes));
  localStorage.setItem('empleados', JSON.stringify(empleados));
  localStorage.setItem('trabajos', JSON.stringify(trabajos));
  localStorage.setItem('trabajoEmpleados', JSON.stringify(trabajoEmpleados));
  localStorage.setItem('inventario', JSON.stringify(inventario));
  localStorage.setItem('inventarioMovimientos', JSON.stringify(inventarioMovimientos));
  localStorage.setItem('cajaMovimientos', JSON.stringify(cajaMovimientos));
  localStorage.setItem('_seeded', 'true');
}
