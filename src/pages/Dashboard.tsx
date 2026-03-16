import { useState, useEffect } from 'react';
import { Search, Lock, Unlock, History, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { registrarAuditoria } from '@/hooks/useAuditoria';

const db = supabase as any;
const hoyStr = new Date().toISOString().slice(0, 10);
const emptyMov = { tipo: 'Entrada', fecha: hoyStr, monto: 0, detalle: '', categoria_gasto: '', metodo_pago: 'Efectivo', cuenta_detalle: '', id_trabajo: null, id_empleado: null };

export default function CajaChica() {
  const { isOwner } = useAuth();
  const { toast } = useToast();

  // ── Estado movimientos ──
  const [items,     setItems]     = useState<any[]>([]);
  const [trabajos,  setTrabajos]  = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [cuentas,   setCuentas]   = useState<any[]>([]);
  const [tarjetas,  setTarjetas]  = useState<any[]>([]);
  const [search,    setSearch]    = useState('');
  const [tipoFilter, setTipoFilter] = useState('todos');
  const [desde,     setDesde]     = useState('');
  const [hasta,     setHasta]     = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form,      setForm]      = useState<any>(emptyMov);

  // ── Estado caja ──
  const [cajaEstado,    setCajaEstado]    = useState<any>(null);
  const [arqueos,       setArqueos]       = useState<any[]>([]);
  const [ultimoArqueo,  setUltimoArqueo]  = useState<any>(null);
  const [abrirDialog,   setAbrirDialog]   = useState(false);
  const [cerrarDialog,  setCerrarDialog]  = useState(false);
  const [montoApertura, setMontoApertura] = useState('');

  const reload = async () => {
    const [{ data: c }, { data: t }, { data: e }, { data: cfg }, { data: estado }, { data: arqs }] = await Promise.all([
      db.from('caja_movimientos').select('*').order('fecha', { ascending: false }).order('created_at', { ascending: false }),
      db.from('trabajos').select('*'),
      db.from('empleados').select('*'),
      db.from('configuracion').select('clave, valor'),
      db.from('caja_estado').select('*').limit(1).single(),
      db.from('caja_arqueos').select('*').order('fecha', { ascending: false }),
    ]);
    setItems(c || []);
    setTrabajos(t || []);
    setEmpleados(e || []);
    setCajaEstado(estado);
    setArqueos(arqs || []);
    if (arqs && arqs.length > 0) setUltimoArqueo(arqs[0]);
    if (cfg) {
      const map: Record<string, string> = {};
      cfg.forEach((d: any) => { map[d.clave] = d.valor; });
      try { setCuentas(JSON.parse(map.cuentas_banco || '[]')); } catch { setCuentas([]); }
      try { setTarjetas(JSON.parse(map.tarjetas || '[]')); } catch { setTarjetas([]); }
    }
  };

  useEffect(() => { reload(); }, []);

  // ── Movimientos de hoy ──
  const movHoy = items.filter(i => i.fecha === hoyStr);
  const entradaHoy = movHoy.filter(m => m.tipo === 'Entrada').reduce((s, m) => s + m.monto, 0);
  const salidaHoy  = movHoy.filter(m => m.tipo === 'Salida').reduce((s, m) => s + m.monto, 0);
  const montoInicial = cajaEstado?.monto_inicial || 0;
  const montoFinalEsperado = montoInicial + entradaHoy - salidaHoy;

  // ── Historial filtrado ──
  const filtered = items.filter((i: any) => {
    const ms = i.detalle?.toLowerCase().includes(search.toLowerCase());
    const mt = tipoFilter === 'todos' || i.tipo === tipoFilter;
    const md = !desde || i.fecha >= desde;
    const mh = !hasta || i.fecha <= hasta;
    return ms && mt && md && mh;
  });
  const ingresos = filtered.filter(m => m.tipo === 'Entrada').reduce((s, m) => s + m.monto, 0);
  const gastos   = filtered.filter(m => m.tipo === 'Salida').reduce((s, m) => s + m.monto, 0);

  // ── Abrir caja ──
  const handleAbrirCaja = async () => {
    const monto = parseFloat(montoApertura);
    if (isNaN(monto) || monto < 0) { toast({ title: 'Ingresa un monto válido', variant: 'destructive' }); return; }
    await db.from('caja_estado').update({
      abierta: true,
      fecha_apertura: hoyStr,
      monto_inicial: monto,
      abierta_at: new Date().toISOString(),
    }).eq('id', cajaEstado.id);
    await registrarAuditoria({ modulo: 'caja', accion: 'crear', descripcion: `Abrió caja con monto inicial: ${formatCurrency(monto)}` });
    setAbrirDialog(false);
    setMontoApertura('');
    reload();
    toast({ title: `✅ Caja abierta con ${formatCurrency(monto)}` });
  };

  // ── Cerrar caja ──
  const handleCerrarCaja = async () => {
    await db.from('caja_arqueos').insert({
      fecha:           hoyStr,
      monto_inicial:   montoInicial,
      total_entradas:  entradaHoy,
      total_salidas:   salidaHoy,
      monto_final:     montoFinalEsperado,
    });
    await db.from('caja_estado').update({
      abierta: false,
      monto_inicial: 0,
    }).eq('id', cajaEstado.id);
    await registrarAuditoria({ modulo: 'caja', accion: 'editar', descripcion: `Cerró caja. Monto final: ${formatCurrency(montoFinalEsperado)}` });
    setCerrarDialog(false);
    reload();
    toast({ title: `✅ Caja cerrada — Monto final: ${formatCurrency(montoFinalEsperado)}` });
  };

  // ── Guardar movimiento ──
  const handleSave = async () => {
    if (!form.monto || !form.detalle) { toast({ title: 'Completa monto y detalle', variant: 'destructive' }); return; }
    const metodoCompleto = form.cuenta_detalle ? `${form.metodo_pago}: ${form.cuenta_detalle}` : form.metodo_pago;
    const { error } = await db.from('caja_movimientos').insert({
      tipo: form.tipo, fecha: form.fecha, monto: form.monto, detalle: form.detalle,
      categoria_gasto: form.categoria_gasto ? `${form.categoria_gasto} (${metodoCompleto})` : `(${metodoCompleto})`,
      id_trabajo: form.id_trabajo || null, id_empleado: form.id_empleado || null,
    });
    if (error) { toast({ title: 'Error al guardar', variant: 'destructive' }); return; }
    await registrarAuditoria({ modulo: 'caja', accion: 'crear', descripcion: `Registró ${form.tipo}: ${form.detalle} — RD$${form.monto}`, datos_nuevos: form });
    reload(); setDialogOpen(false); setForm(emptyMov);
    toast({ title: `✅ ${form.tipo} registrada` });
  };

  const metodoBadgeColor = (cat: string) => {
    if (cat?.includes('Transferencia')) return 'bg-blue-100 text-blue-700';
    if (cat?.includes('Tarjeta')) return 'bg-purple-100 text-purple-700';
    return 'bg-green-100 text-green-700';
  };
  const getMetodo     = (cat: string) => { const m = cat?.match(/\((.*?)\)/); return m ? m[1] : 'Efectivo'; };
  const getCatSinMet  = (cat: string) => cat?.replace(/\s*\(.*?\)/, '') || '—';

  const cajaAbierta = cajaEstado?.abierta === true;

  return (
    <div className="page-container">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Caja Chica</h1>
          <Badge variant={cajaAbierta ? 'default' : 'secondary'} className={cajaAbierta ? 'bg-green-600' : ''}>
            {cajaAbierta ? '🟢 Abierta' : '🔴 Cerrada'}
          </Badge>
        </div>
        {isOwner && (
          <div className="flex gap-2 flex-wrap justify-end">
            {!cajaAbierta ? (
              <Button onClick={() => { setMontoApertura(ultimoArqueo ? String(ultimoArqueo.monto_final) : ''); setAbrirDialog(true); }}
                className="gap-2 bg-green-600 hover:bg-green-700">
                <Unlock className="h-4 w-4" /> Abrir Caja
              </Button>
            ) : (
              <>
                <Button variant="outline" onClick={() => { setForm({ ...emptyMov, tipo: 'Entrada' }); setDialogOpen(true); }} className="text-green-600 border-green-600">+ Entrada</Button>
                <Button variant="outline" onClick={() => { setForm({ ...emptyMov, tipo: 'Salida' }); setDialogOpen(true); }} className="text-destructive border-destructive">+ Salida</Button>
                <Button variant="outline" onClick={() => setCerrarDialog(true)} className="gap-2">
                  <Lock className="h-4 w-4" /> Cerrar Caja
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      <Tabs defaultValue="hoy">
        <TabsList>
          <TabsTrigger value="hoy">📅 Hoy</TabsTrigger>
          <TabsTrigger value="historial">📋 Historial</TabsTrigger>
          <TabsTrigger value="arqueos">🗂️ Arqueos</TabsTrigger>
        </TabsList>

        {/* ══ TAB HOY ══ */}
        <TabsContent value="hoy" className="mt-4 space-y-4">
          {!cajaAbierta ? (
            <div className="text-center py-16 border rounded-xl bg-card space-y-3">
              <Lock className="h-12 w-12 mx-auto text-muted-foreground opacity-40" />
              <p className="text-base font-semibold text-muted-foreground">La caja está cerrada</p>
              <p className="text-sm text-muted-foreground">
                {ultimoArqueo ? `Último cierre: ${formatDate(ultimoArqueo.fecha)} — Monto final: ${formatCurrency(ultimoArqueo.monto_final)}` : 'No hay cierres anteriores'}
              </p>
              {isOwner && (
                <Button onClick={() => { setMontoApertura(ultimoArqueo ? String(ultimoArqueo.monto_final) : ''); setAbrirDialog(true); }}
                  className="mt-2 gap-2 bg-green-600 hover:bg-green-700">
                  <Unlock className="h-4 w-4" /> Abrir Caja
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Resumen del día */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Card className="stat-card"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Monto Inicial</p><p className="text-lg font-bold">{formatCurrency(montoInicial)}</p></CardContent></Card>
                <Card className="stat-card"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Entradas</p><p className="text-lg font-bold text-green-600">+{formatCurrency(entradaHoy)}</p></CardContent></Card>
                <Card className="stat-card"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Salidas</p><p className="text-lg font-bold text-destructive">-{formatCurrency(salidaHoy)}</p></CardContent></Card>
                <Card className="stat-card"><CardContent className="p-3"><p className="text-xs text-muted-foreground">Efectivo en caja</p><p className={`text-lg font-bold ${montoFinalEsperado >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(montoFinalEsperado)}</p></CardContent></Card>
              </div>

              {/* Movimientos de hoy */}
              <div className="border rounded-lg overflow-x-auto bg-card">
                <Table>
                  <TableHeader><TableRow>
                    <TableHead>Tipo</TableHead><TableHead>Detalle</TableHead>
                    <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                    <TableHead className="hidden sm:table-cell">Método</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                  </TableRow></TableHeader>
                  <TableBody>
                    {movHoy.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin movimientos hoy — registra una entrada o salida</TableCell></TableRow>}
                    {movHoy.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell><Badge variant={m.tipo === 'Entrada' ? 'default' : 'destructive'}>{m.tipo}</Badge></TableCell>
                        <TableCell>
                          <span className="font-medium">{m.detalle}</span>
                          {m.id_trabajo && <span className="block text-xs text-muted-foreground">OT: {trabajos.find(t => t.id === m.id_trabajo)?.descripcion_trabajo || ''}</span>}
                          {m.id_empleado && <span className="block text-xs text-muted-foreground">Emp: {empleados.find(e => e.id === m.id_empleado)?.nombre || ''}</span>}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{getCatSinMet(m.categoria_gasto)}</TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${metodoBadgeColor(m.categoria_gasto)}`}>{getMetodo(m.categoria_gasto)}</span>
                        </TableCell>
                        <TableCell className="text-right font-medium">{formatCurrency(m.monto)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </TabsContent>

        {/* ══ TAB HISTORIAL ══ */}
        <TabsContent value="historial" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Ingresos</p><p className="text-lg font-bold text-green-600">{formatCurrency(ingresos)}</p></CardContent></Card>
            <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Gastos</p><p className="text-lg font-bold text-destructive">{formatCurrency(gastos)}</p></CardContent></Card>
            <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Balance</p><p className={`text-lg font-bold ${ingresos - gastos >= 0 ? 'text-green-600' : 'text-destructive'}`}>{formatCurrency(ingresos - gastos)}</p></CardContent></Card>
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
                <TableHead>Tipo</TableHead><TableHead>Detalle</TableHead>
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
                      {m.id_trabajo && <span className="block text-xs text-muted-foreground">OT: {trabajos.find(t => t.id === m.id_trabajo)?.descripcion_trabajo || ''}</span>}
                      {m.id_empleado && <span className="block text-xs text-muted-foreground">Emp: {empleados.find(e => e.id === m.id_empleado)?.nombre || ''}</span>}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{getCatSinMet(m.categoria_gasto)}</TableCell>
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
        </TabsContent>

        {/* ══ TAB ARQUEOS ══ */}
        <TabsContent value="arqueos" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">Resumen de cada cierre de caja</p>
          {arqueos.length === 0 && (
            <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground">
              <History className="h-10 w-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No hay arqueos registrados todavía</p>
            </div>
          )}
          <div className="border rounded-lg overflow-x-auto bg-card">
            {arqueos.length > 0 && (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead className="text-right">Monto Inicial</TableHead>
                  <TableHead className="text-right">Entradas</TableHead>
                  <TableHead className="text-right">Salidas</TableHead>
                  <TableHead className="text-right font-bold">Monto Final</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {arqueos.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{formatDate(a.fecha)}</TableCell>
                      <TableCell className="text-right text-muted-foreground">{formatCurrency(a.monto_inicial)}</TableCell>
                      <TableCell className="text-right text-green-600">+{formatCurrency(a.total_entradas)}</TableCell>
                      <TableCell className="text-right text-destructive">-{formatCurrency(a.total_salidas)}</TableCell>
                      <TableCell className="text-right font-bold">{formatCurrency(a.monto_final)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Dialog Abrir Caja ── */}
      <Dialog open={abrirDialog} onOpenChange={setAbrirDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><Unlock className="h-5 w-5 text-green-600" />Abrir Caja</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">¿Con cuánto abre la caja hoy?</p>
            {ultimoArqueo && (
              <div className="p-3 rounded-lg bg-secondary/50 text-sm">
                <p className="text-muted-foreground text-xs mb-1">Último cierre — {formatDate(ultimoArqueo.fecha)}</p>
                <div className="flex items-center justify-between">
                  <span className="font-semibold">Monto final: {formatCurrency(ultimoArqueo.monto_final)}</span>
                  <Button size="sm" variant="outline" className="text-xs h-7"
                    onClick={() => setMontoApertura(String(ultimoArqueo.monto_final))}>
                    Usar este monto
                  </Button>
                </div>
              </div>
            )}
            <div className="grid gap-1.5">
              <Label className="text-xs">Monto inicial *</Label>
              <Input type="number" min={0} placeholder="0.00" value={montoApertura}
                onChange={e => setMontoApertura(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setAbrirDialog(false)}>Cancelar</Button>
            <Button onClick={handleAbrirCaja} className="bg-green-600 hover:bg-green-700">Abrir Caja</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Cerrar Caja ── */}
      <AlertDialog open={cerrarDialog} onOpenChange={setCerrarDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2"><Lock className="h-5 w-5" />Cerrar Caja — {formatDate(hoyStr)}</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 mt-2">
                <div className="rounded-lg border p-3 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-muted-foreground">Monto inicial</span><span>{formatCurrency(montoInicial)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">+ Entradas del día</span><span className="text-green-600">+{formatCurrency(entradaHoy)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">- Salidas del día</span><span className="text-destructive">-{formatCurrency(salidaHoy)}</span></div>
                  <div className="flex justify-between font-bold border-t pt-2"><span>Monto final en caja</span><span className="text-lg">{formatCurrency(montoFinalEsperado)}</span></div>
                </div>
                <p className="text-xs text-muted-foreground">Este arqueo quedará guardado en el historial. Mañana podrás abrir con este monto.</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleCerrarCaja}>Cerrar Caja</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Dialog Nuevo Movimiento ── */}
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
            {form.metodo_pago === 'Transferencia' && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Cuenta Bancaria</Label>
                <Select value={form.cuenta_detalle || 'ninguna'} onValueChange={v => setForm({ ...form, cuenta_detalle: v === 'ninguna' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar cuenta" /></SelectTrigger>
                  <SelectContent><SelectItem value="ninguna">Sin especificar</SelectItem>{cuentas.map((c: any, i) => <SelectItem key={i} value={c.nombre}>{c.nombre}</SelectItem>)}</SelectContent>
                </Select>
                {cuentas.length === 0 && <p className="text-xs text-muted-foreground">No hay cuentas. Añádelas en Configuración.</p>}
              </div>
            )}
            {form.metodo_pago === 'Tarjeta' && (
              <div className="grid gap-1.5">
                <Label className="text-xs">Tarjeta</Label>
                <Select value={form.cuenta_detalle || 'ninguna'} onValueChange={v => setForm({ ...form, cuenta_detalle: v === 'ninguna' ? '' : v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar tarjeta" /></SelectTrigger>
                  <SelectContent><SelectItem value="ninguna">Sin especificar</SelectItem>{tarjetas.map((t: any, i) => <SelectItem key={i} value={t.nombre}>{t.nombre}</SelectItem>)}</SelectContent>
                </Select>
                {tarjetas.length === 0 && <p className="text-xs text-muted-foreground">No hay tarjetas. Añádelas en Configuración.</p>}
              </div>
            )}
            <div className="grid gap-1.5">
              <Label className="text-xs">Trabajo (opcional)</Label>
              <Select value={form.id_trabajo || 'ninguno'} onValueChange={v => setForm({ ...form, id_trabajo: v === 'ninguno' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar trabajo" /></SelectTrigger>
                <SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{trabajos.map(t => <SelectItem key={t.id} value={t.id}>{t.descripcion_trabajo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Empleado (opcional)</Label>
              <Select value={form.id_empleado || 'ninguno'} onValueChange={v => setForm({ ...form, id_empleado: v === 'ninguno' ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger>
                <SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{empleados.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Registrar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}