import { useState, useEffect } from 'react';
import { Shield, Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/helpers';

const db = supabase as any;

const accionColor: Record<string, string> = {
  crear:    'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  editar:   'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  eliminar: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
};

const moduloLabel: Record<string, string> = {
  clientes: '👥 Clientes', trabajos: '🔧 Trabajos', cotizaciones: '📋 Cotizaciones',
  inventario: '📦 Inventario', caja: '💰 Caja', empleados: '👷 Empleados',
};

const claveLabel: Record<string, string> = {
  nombre_completo: 'Nombre completo', telefono: 'Teléfono', direccion: 'Dirección',
  empresa: 'Empresa', email: 'Email', rnc: 'RNC', notas: 'Notas',
  descripcion_trabajo: 'Descripción', categoria: 'Categoría', estado: 'Estado',
  fecha_inicio: 'Fecha inicio', fecha_entrega_estimada: 'Fecha entrega',
  monto_final: 'Monto final', abono: 'Abono', tipo_trabajo: 'Tipo',
  nombre_item: 'Artículo', stock_actual: 'Stock actual', stock_minimo: 'Stock mínimo',
  costo_unitario: 'Costo unitario', unidad: 'Unidad', ubicacion: 'Ubicación',
  tipo: 'Tipo', monto: 'Monto', detalle: 'Detalle', categoria_gasto: 'Categoría',
  fecha: 'Fecha', metodo: 'Método', subtotal: 'Subtotal', itbis: 'ITBIS', total: 'Total',
  numero_cotizacion: 'N° Cotización', nombre: 'Nombre', precio: 'Precio', stock: 'Stock',
};

const camposOcultos = ['id', 'created_at', 'updated_at', 'id_cliente', 'id_trabajo',
  'id_empleado', 'foto_url', 'fotos_antes', 'fotos_despues', 'foto_muestra', 'foto_final',
  'rnc_empresa', 'rnc_cliente', 'user_id'];

function formatVal(val: any): string {
  if (val === null || val === undefined || val === '') return '—';
  if (typeof val === 'boolean') return val ? 'Sí' : 'No';
  if (typeof val === 'number') return val.toLocaleString('es-DO');
  if (typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}/)) return formatDate(val.slice(0,10));
  return String(val);
}

function DatosLegibles({ datos, color }: { datos: any; color: string }) {
  const parsed = typeof datos === 'string' ? (() => { try { return JSON.parse(datos); } catch { return {}; } })() : datos;
  const entradas = Object.entries(parsed).filter(([k]) => !camposOcultos.includes(k) && parsed[k] !== null && parsed[k] !== undefined && parsed[k] !== '');
  if (!entradas.length) return <p className="text-xs text-muted-foreground">Sin datos</p>;
  return (
    <div className="rounded-lg border overflow-hidden">
      {entradas.map(([k, v], i) => (
        <div key={k} className={`flex gap-2 px-3 py-2 text-xs ${i % 2 === 0 ? 'bg-secondary/30' : 'bg-background'}`}>
          <span className="text-muted-foreground w-32 shrink-0">{claveLabel[k] || k}:</span>
          <span className={`font-medium ${color}`}>{formatVal(v)}</span>
        </div>
      ))}
    </div>
  );
}

export default function Auditoria() {
  const [registros,  setRegistros]  = useState<any[]>([]);
  const [search,     setSearch]     = useState('');
  const [filtroMod,  setFiltroMod]  = useState('todos');
  const [filtroAcc,  setFiltroAcc]  = useState('todos');
  const [desde,      setDesde]      = useState('');
  const [hasta,      setHasta]      = useState('');
  const [detalle,    setDetalle]    = useState<any>(null);
  const [loading,    setLoading]    = useState(true);

  const load = async () => {
    setLoading(true);
    const { data } = await db
      .from('auditoria')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);
    setRegistros(data || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = registros.filter(r => {
    const ms = r.descripcion?.toLowerCase().includes(search.toLowerCase()) ||
               r.user_nombre?.toLowerCase().includes(search.toLowerCase());
    const mm = filtroMod === 'todos' || r.modulo === filtroMod;
    const ma = filtroAcc === 'todos' || r.accion === filtroAcc;
    const md = !desde || r.created_at?.slice(0,10) >= desde;
    const mh = !hasta || r.created_at?.slice(0,10) <= hasta;
    return ms && mm && ma && md && mh;
  });

  return (
    <div className="page-container">
      <div className="flex items-center gap-2">
        <Shield className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Auditoría</h1>
        <Badge variant="outline" className="ml-2">{filtered.length} registros</Badge>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por usuario o descripción..." value={search}
            onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={filtroMod} onValueChange={setFiltroMod}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder="Módulo" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los módulos</SelectItem>
            {Object.entries(moduloLabel).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filtroAcc} onValueChange={setFiltroAcc}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="Acción" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas</SelectItem>
            <SelectItem value="crear">Crear</SelectItem>
            <SelectItem value="editar">Editar</SelectItem>
            <SelectItem value="eliminar">Eliminar</SelectItem>
          </SelectContent>
        </Select>
        <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-[140px]" />
        <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-[140px]" />
        <Button variant="outline" size="sm" onClick={() => { setSearch(''); setFiltroMod('todos'); setFiltroAcc('todos'); setDesde(''); setHasta(''); }}>
          Limpiar
        </Button>
      </div>

      {/* Tabla */}
      <div className="border rounded-lg overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha / Hora</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="w-[80px]">Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Cargando...</TableCell></TableRow>
            )}
            {!loading && filtered.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Sin registros</TableCell></TableRow>
            )}
            {filtered.map((r: any) => (
              <TableRow key={r.id} className="hover:bg-secondary/30">
                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                  <p>{formatDate(r.created_at?.slice(0,10))}</p>
                  <p>{r.created_at?.slice(11,16)}</p>
                </TableCell>
                <TableCell className="font-medium text-sm">{r.user_nombre || '—'}</TableCell>
                <TableCell>
                  <span className="text-xs">{moduloLabel[r.modulo] || r.modulo}</span>
                </TableCell>
                <TableCell>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium capitalize ${accionColor[r.accion] || ''}`}>
                    {r.accion}
                  </span>
                </TableCell>
                <TableCell className="text-sm max-w-[250px] truncate">{r.descripcion}</TableCell>
                <TableCell>
                  {(r.datos_anteriores || r.datos_nuevos) && (
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setDetalle(r)}>
                      Ver
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Dialog detalle */}
      <Dialog open={!!detalle} onOpenChange={() => setDetalle(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Detalle del cambio
            </DialogTitle>
          </DialogHeader>
          {detalle && (
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">Usuario:</span> <span className="font-medium">{detalle.user_nombre}</span></div>
                <div><span className="text-muted-foreground">Módulo:</span> <span className="font-medium">{moduloLabel[detalle.modulo] || detalle.modulo}</span></div>
                <div><span className="text-muted-foreground">Acción:</span> <span className={`px-2 py-0.5 rounded-full font-medium capitalize ${accionColor[detalle.accion]}`}>{detalle.accion}</span></div>
                <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{formatDate(detalle.created_at?.slice(0,10))} {detalle.created_at?.slice(11,16)}</span></div>
              </div>
              <p className="text-muted-foreground text-xs border-l-2 border-primary pl-3">{detalle.descripcion}</p>

              {detalle.datos_anteriores && (
                <div>
                  <p className="text-xs font-semibold text-orange-600 mb-2">📋 Datos anteriores:</p>
                  <DatosLegibles datos={detalle.datos_anteriores} color="text-orange-700 dark:text-orange-400" />
                </div>
              )}
              {detalle.datos_nuevos && (
                <div>
                  <p className="text-xs font-semibold text-green-600 mb-2">✅ Datos nuevos:</p>
                  <DatosLegibles datos={detalle.datos_nuevos} color="text-green-700 dark:text-green-400" />
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}