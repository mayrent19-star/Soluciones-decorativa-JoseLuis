import { useState, useEffect, useMemo } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { fetchAll } from '@/lib/supabase-service';
import { formatCurrency, formatDate, exportCSV } from '@/utils/helpers';

export default function Reportes() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [empId, setEmpId] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [caja, setCaja] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [movInv, setMovInv] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  useEffect(() => {
    Promise.all([fetchAll('empleados'), fetchAll('trabajo_empleados'), fetchAll('trabajos'), fetchAll('caja_movimientos'), fetchAll('inventario'), fetchAll('inventario_movimientos'), fetchAll('clientes')]).then(([e, a, t, c, inv, m, cl]) => {
      setEmpleados(e); setAsignaciones(a); setTrabajos(t); setCaja(c); setInventario(inv); setMovInv(m); setClientes(cl);
    });
  }, []);

  const inRange = (fecha: string) => { if (!fecha) return true; if (desde && fecha < desde) return false; if (hasta && fecha > hasta) return false; return true; };

  const empAsig = asignaciones.filter((a: any) => { if (empId && a.id_empleado !== empId) return false; const t = trabajos.find((tr: any) => tr.id === a.id_trabajo); return inRange(t?.fecha_inicio || ''); });
  const empTotal = empAsig.reduce((s: number, a: any) => s + (a.monto_pagar || 0), 0);
  const cajaFilt = caja.filter((m: any) => inRange(m.fecha));
  const cajaIng = cajaFilt.filter((m: any) => m.tipo === 'Entrada').reduce((s: number, m: any) => s + m.monto, 0);
  const cajaGas = cajaFilt.filter((m: any) => m.tipo === 'Salida').reduce((s: number, m: any) => s + m.monto, 0);
  const invFilt = movInv.filter((m: any) => inRange(m.fecha));
  const trabFilt = trabajos.filter((t: any) => { if (!inRange(t.fecha_inicio)) return false; if (estadoFilter !== 'todos' && t.estado !== estadoFilter) return false; return true; });
  const trabCotizado = trabFilt.reduce((s: number, t: any) => s + (t.monto_cotizado || 0), 0);
  const trabAbonos = trabFilt.reduce((s: number, t: any) => s + (t.abono || 0), 0);

  const DateFilters = () => (<div className="flex flex-col sm:flex-row gap-3 mb-4"><div className="grid gap-1.5 flex-1"><Label className="text-xs">Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div><div className="grid gap-1.5 flex-1"><Label className="text-xs">Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></div></div>);

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold">Reportes</h1>
      <Tabs defaultValue="empleados">
        <TabsList className="flex-wrap h-auto"><TabsTrigger value="empleados">Empleados</TabsTrigger><TabsTrigger value="caja">Caja</TabsTrigger><TabsTrigger value="inventario">Inventario</TabsTrigger><TabsTrigger value="trabajos">Trabajos</TabsTrigger></TabsList>

        <TabsContent value="empleados" className="mt-4"><Card><CardContent className="p-5 space-y-4"><DateFilters />
          <Select value={empId} onValueChange={setEmpId}><SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger><SelectContent>{empleados.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent></Select>
          <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Trabajo</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader><TableBody>{empAsig.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
          {empAsig.map((a: any) => (<TableRow key={a.id}><TableCell className="font-medium">{trabajos.find((t: any) => t.id === a.id_trabajo)?.descripcion_trabajo || '—'}</TableCell><TableCell className="text-muted-foreground">{a.descripcion}</TableCell><TableCell className="text-right">{formatCurrency(a.monto_pagar)}</TableCell></TableRow>))}
          </TableBody></Table></div>
          <div className="flex justify-between items-center"><p className="font-semibold">Total: {formatCurrency(empTotal)}</p><Button variant="outline" size="sm" onClick={() => exportCSV(empAsig.map((a: any) => ({ Trabajo: trabajos.find((t: any) => t.id === a.id_trabajo)?.descripcion_trabajo || '', Descripcion: a.descripcion, Monto: a.monto_pagar })), 'reporte_empleado')}><Download className="h-4 w-4 mr-1" />CSV</Button></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="caja" className="mt-4"><Card><CardContent className="p-5 space-y-4"><DateFilters />
          <div className="grid grid-cols-3 gap-4 text-center"><div><p className="text-xs text-muted-foreground">Ingresos</p><p className="text-lg font-bold text-success">{formatCurrency(cajaIng)}</p></div><div><p className="text-xs text-muted-foreground">Gastos</p><p className="text-lg font-bold text-accent">{formatCurrency(cajaGas)}</p></div><div><p className="text-xs text-muted-foreground">Balance</p><p className={`text-lg font-bold ${cajaIng - cajaGas >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(cajaIng - cajaGas)}</p></div></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="inventario" className="mt-4"><Card><CardContent className="p-5 space-y-4"><DateFilters />
          <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead>Motivo</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader><TableBody>{invFilt.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
          {invFilt.map((m: any) => (<TableRow key={m.id}><TableCell className="font-medium">{inventario.find((i: any) => i.id === m.id_item)?.nombre_item || '—'}</TableCell><TableCell><Badge variant={m.tipo_movimiento === 'Entrada' ? 'default' : 'destructive'}>{m.tipo_movimiento}</Badge></TableCell><TableCell className="text-right">{m.cantidad}</TableCell><TableCell className="text-muted-foreground">{m.motivo}</TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(m.fecha)}</TableCell></TableRow>))}
          </TableBody></Table></div>
        </CardContent></Card></TabsContent>

        <TabsContent value="trabajos" className="mt-4"><Card><CardContent className="p-5 space-y-4"><DateFilters />
          <Select value={estadoFilter} onValueChange={setEstadoFilter}><SelectTrigger className="w-full sm:w-[200px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem>{['Pendiente', 'En proceso', 'Finalizado', 'Entregado', 'Cancelado'].map(e => <SelectItem key={e} value={e}>{e}</SelectItem>)}</SelectContent></Select>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center"><div><p className="text-xs text-muted-foreground">Trabajos</p><p className="text-lg font-bold">{trabFilt.length}</p></div><div><p className="text-xs text-muted-foreground">Cotizado</p><p className="text-lg font-bold">{formatCurrency(trabCotizado)}</p></div><div><p className="text-xs text-muted-foreground">Abonos</p><p className="text-lg font-bold text-success">{formatCurrency(trabAbonos)}</p></div><div><p className="text-xs text-muted-foreground">Pendiente</p><p className="text-lg font-bold text-accent">{formatCurrency(trabCotizado - trabAbonos)}</p></div></div>
        </CardContent></Card></TabsContent>
      </Tabs>
    </div>
  );
}
