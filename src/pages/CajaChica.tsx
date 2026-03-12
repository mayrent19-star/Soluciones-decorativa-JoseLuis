import { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/utils/helpers';

const db = supabase as any;
const emptyMov = { tipo: 'Entrada', fecha: new Date().toISOString().slice(0, 10), monto: 0, detalle: '', categoria_gasto: '', metodo_pago: 'Efectivo', cuenta_detalle: '', id_trabajo: null, id_empleado: null };

export default function CajaChica() {
  const { isOwner } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyMov);
  const { toast } = useToast();

  const reload = async () => {
    const [{ data: c }, { data: t }, { data: e }, { data: cfg }] = await Promise.all([
      db.from('caja_movimientos').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false }),
      db.from('trabajos').select('*'),
      db.from('empleados').select('*'),
      db.from('configuracion').select('clave, valor'),
    ]);
    setItems(c || []);
    setTrabajos(t || []);
    setEmpleados(e || []);
    if (cfg) {
      const map: Record<string, string> = {};
      cfg.forEach((d: any) => { map[d.clave] = d.valor; });
      try { setCuentas(JSON.parse(map.cuentas_banco || '[]')); } catch { setCuentas([]); }
      try { setTarjetas(JSON.parse(map.tarjetas || '[]')); } catch { setTarjetas([]); }
    }
  };

  useEffect(() => { reload(); }, []);

  const filtered = items.filter((i: any) => {
    const ms = i.detalle?.toLowerCase().includes(search.toLowerCase());
    const mt = tipoFilter === 'todos' || i.tipo === tipoFilter;
    const md = !desde || i.fecha >= desde;
    const mh = !hasta || i.fecha <= hasta;
    return ms && mt && md && mh;
  });

  const ingresos = filtered.filter((m: any) => m.tipo === 'Entrada').reduce((s: number, m: any) => s + m.monto, 0);
  const gastos = filtered.filter((m: any) => m.tipo === 'Salida').reduce((s: number, m: any) => s + m.monto, 0);
  const balance = ingresos - gastos;

  const handleSave = async () => {
    if (!form.monto || !form.detalle) { toast({ title: 'Completa monto y detalle', variant: 'destructive' }); return; }
    const metodoCompleto = form.cuenta_detalle ? `${form.metodo_pago}: ${form.cuenta_detalle}` : form.metodo_pago;
    const { error } = await db.from('caja_movimientos').insert({
      tipo: form.tipo,
      fecha: form.fecha,
      monto: form.monto,
      detalle: form.detalle,
      categoria_gasto: form.categoria_gasto ? `${form.categoria_gasto} (${metodoCompleto})` : `(${metodoCompleto})`,
      id_trabajo: form.id_trabajo || null,
      id_empleado: form.id_empleado || null,
    });
    if (error) { toast({ title: 'Error al guardar', variant: 'destructive' }); return; }
    reload(); setDialogOpen(false);
    setForm(emptyMov);
    toast({ title: `✅ ${form.tipo} registrada` });
  };

  const metodoBadgeColor = (cat: string) => {
    if (cat?.includes('Transferencia')) return 'bg-blue-100 text-blue-700';
    if (cat?.includes('Tarjeta')) return 'bg-purple-100 text-purple-700';
    return 'bg-green-100 text-green-700';
  };

  const getMetodo = (cat: string) => {
    const match = cat?.match(/\((.*?)\)/);
    return match ? match[1] : 'Efectivo';
  };

  const getCatSinMetodo = (cat: string) => cat?.replace(/\s*\(.*?\)/, '') || '—';

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Caja Chica</h1>
        {isOwner && <div className="flex gap-2">
          <Button variant="outline" onClick={() => { setForm({ ...emptyMov, tipo: 'Entrada' }); setDialogOpen(true); }} className="text-success border-success">+ Entrada</Button>
          <Button variant="outline" onClick={() => { setForm({ ...emptyMov, tipo: 'Salida' }); setDialogOpen(true); }} className="text-accent border-accent">+ Salida</Button>
        </div>}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Ingresos</p><p className="text-lg font-bold text-success">{formatCurrency(ingresos)}</p></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Gastos</p><p className="text-lg font-bold text-accent">{formatCurrency(gastos)}</p></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Balance</p><p className={`text-lg font-bold ${balance >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(balance)}</p></CardContent></Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
        <Select value={tipoFilter} onValueChange={setTipoFilter}><SelectTrigger className="w-full sm:w-[150px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="todos">Todos</SelectItem><SelectItem value="Entrada">Entradas</SelectItem><SelectItem value="Salida">Salidas</SelectItem></SelectContent></Select>
        <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="w-full sm:w-[150px]" />
        <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="w-full sm:w-[150px]" />
      </div>

      <div className="border rounded-lg overflow-x-auto bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Detalle</TableHead>
            <TableHead className="hidden sm:table-cell">Categoría</TableHead>
            <TableHead className="hidden sm:table-cell">Método</TableHead>
            <TableHead className="text-right">Monto</TableHead>
            <TableHead>Fecha</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>}
            {filtered.map((m: any) => (
              <TableRow key={m.id}>
                <TableCell><Badge variant={m.tipo === 'Entrada' ? 'default' : 'destructive'}>{m.tipo}</Badge></TableCell>
                <TableCell>
                  <span className="font-medium">{m.detalle}</span>
                  {m.id_trabajo && <span className="block text-xs text-muted-foreground">OT: {trabajos.find((t: any) => t.id === m.id_trabajo)?.descripcion_trabajo || ''}</span>}
                  {m.id_empleado && <span className="block text-xs text-muted-foreground">Emp: {empleados.find((e: any) => e.id === m.id_empleado)?.nombre || ''}</span>}
                </TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{getCatSinMetodo(m.categoria_gasto)}</TableCell>
                <TableCell className="hidden sm:table-cell">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${metodoBadgeColor(m.categoria_gasto)}`}>{getMetodo(m.categoria_gasto)}</span>
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(m.monto)}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{formatDate(m.fecha)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.tipo === 'Entrada' ? '📥 Nueva Entrada' : '📤 Nueva Salida'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label className="text-xs">Monto *</Label><Input type="number" value={form.monto || ''} onChange={e => setForm({ ...form, monto: +e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Fecha</Label><Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Detalle *</Label><Input value={form.detalle || ''} onChange={e => setForm({ ...form, detalle: e.target.value })} placeholder="Descripción del movimiento" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Categoría</Label><Input value={form.categoria_gasto || ''} onChange={e => setForm({ ...form, categoria_gasto: e.target.value })} placeholder="Material, Transporte, Herramienta..." /></div>

            {/* Método de pago */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Método de Pago</Label>
              <Select value={form.metodo_pago} onValueChange={v => setForm({ ...form, metodo_pago: v, cuenta_detalle: '' })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Efectivo">💵 Efectivo</SelectItem>
                  <SelectItem value="Transferencia">🏦 Transferencia</SelectItem>
                  <SelectItem value="Tarjeta">💳 Tarjeta</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Cuentas bancarias si eligió Transferencia */}
            {form.metodo_pago === 'Transferencia' && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Cuenta Bancaria</Label>
                <Select value={form.cuenta_detalle || 'ninguna'} onValueChange={v => setForm({ ...form, cuenta_detalle: v === 'ninguna' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguna">Sin especificar</SelectItem>
                    {cuentas.map((c: any, i: number) => <SelectItem key={i} value={c.nombre}>{c.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {cuentas.length === 0 && <p className="text-xs text-muted-foreground">No hay cuentas. Añádelas en Configuración → Cuentas y Tarjetas.</p>}
              </div>
            )}

            {/* Tarjetas si eligió Tarjeta */}
            {form.metodo_pago === 'Tarjeta' && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Tarjeta</Label>
                <Select value={form.cuenta_detalle || 'ninguna'} onValueChange={v => setForm({ ...form, cuenta_detalle: v === 'ninguna' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tarjeta" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ninguna">Sin especificar</SelectItem>
                    {tarjetas.map((t: any, i: number) => <SelectItem key={i} value={t.nombre}>{t.nombre}</SelectItem>)}
                  </SelectContent>
                </Select>
                {tarjetas.length === 0 && <p className="text-xs text-muted-foreground">No hay tarjetas. Añádelas en Configuración → Cuentas y Tarjetas.</p>}
              </div>
            )}

            <div className="grid gap-1.5">
              <Label className="text-xs">Trabajo (opcional)</Label>
              <Select value={form.id_trabajo || 'ninguno'} onValueChange={v => setForm({ ...form, id_trabajo: v === 'ninguno' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar trabajo" /></SelectTrigger>
                <SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{trabajos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.descripcion_trabajo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Empleado (opcional)</Label>
              <Select value={form.id_empleado || 'ninguno'} onValueChange={v => setForm({ ...form, id_empleado: v === 'ninguno' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger>
                <SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{empleados.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Registrar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}