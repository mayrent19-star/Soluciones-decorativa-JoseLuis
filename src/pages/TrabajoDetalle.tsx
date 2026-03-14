import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, DollarSign, CreditCard, Banknote, Smartphone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchById, fetchAll, fetchWhere, insertRow, updateRow, deleteRow, getConfig } from '@/lib/supabase-service';
import { formatDate, formatCurrency } from '@/utils/helpers';
import { supabase } from '@/integrations/supabase/client';
import { registrarAuditoria } from '@/hooks/useAuditoria';

const db = supabase as any;
const metodosPago = ['Efectivo', 'Transferencia', 'Tarjeta'];
const metodoBadge: Record<string, string> = {
  'Efectivo':      'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
  'Transferencia': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  'Tarjeta':       'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
};
const metodoIcon: Record<string, any> = {
  'Efectivo': Banknote, 'Transferencia': Smartphone, 'Tarjeta': CreditCard,
};

export default function TrabajoDetalle() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isOwner } = useAuth();

  const [trabajo,      setTrabajo]      = useState<any>(null);
  const [cliente,      setCliente]      = useState<any>(null);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [materiales,   setMateriales]   = useState<any[]>([]);
  const [movCaja,      setMovCaja]      = useState<any[]>([]);
  const [empleados,    setEmpleados]    = useState<any[]>([]);
  const [inventario,   setInventario]   = useState<any[]>([]);
  const [pagos,        setPagos]        = useState<any[]>([]);

  const [asigDialog, setAsigDialog] = useState(false);
  const [matDialog,  setMatDialog]  = useState(false);
  const [pagoDialog, setPagoDialog] = useState(false);
  const [asigForm, setAsigForm] = useState<any>({});
  const [matForm,  setMatForm]  = useState<any>({ id_item: '', cantidad: 1, costo_unitario: 0 });
  const [pagoForm, setPagoForm] = useState<any>({
    monto: '', metodo: 'Efectivo',
    fecha: new Date().toISOString().slice(0, 10), notas: ''
  });

  const reload = async () => {
    if (!id) return;
    const [t, asigs, mats, caja, emps, inv] = await Promise.all([
      fetchById('trabajos', id),
      fetchWhere('trabajo_empleados', 'id_trabajo', id),
      fetchWhere('trabajo_materiales', 'id_trabajo', id),
      fetchWhere('caja_movimientos',   'id_trabajo', id),
      fetchAll('empleados',  'nombre',     true),
      fetchAll('inventario', 'nombre_item', true),
    ]);
    const { data: pags } = await db.from('trabajo_pagos').select('*').eq('id_trabajo', id).order('fecha');
    setTrabajo(t); setAsignaciones(asigs); setMateriales(mats);
    setMovCaja(caja); setEmpleados(emps); setInventario(inv);
    setPagos(pags || []);
    if ((t as any)?.id_cliente) setCliente(await fetchById('clientes', (t as any).id_cliente));
  };

  useEffect(() => { reload(); }, [id]);

  if (!trabajo) return (
    <div className="page-container">
      <p className="text-muted-foreground">Cargando...</p>
      <Link to="/trabajos"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button></Link>
    </div>
  );

  const totalAsig  = asignaciones.reduce((s: number, a: any) => s + (a.monto_pagar || 0), 0);
  const totalMat   = materiales.reduce((s: number, m: any) => s + (m.costo_total || m.cantidad * m.costo_unitario || 0), 0);
  const totalPagos = pagos.reduce((s: number, p: any) => s + (p.monto || 0), 0);
  const montoTotal = trabajo.monto_final || trabajo.monto_cotizado || 0;
  const pendiente  = Math.max(0, montoTotal - totalPagos);

  const marcarFinalizado = async () => {
    await updateRow('trabajos', trabajo.id, { estado: 'Finalizado', fecha_finalizado: new Date().toISOString().slice(0, 10) });
    reload(); toast({ title: 'Trabajo finalizado' });
  };

  const saveAsig = async () => {
    if (!asigForm.id_empleado || !asigForm.descripcion) { toast({ title: 'Completa los campos', variant: 'destructive' }); return; }
    await insertRow('trabajo_empleados', { ...asigForm, id_trabajo: id });
    reload(); setAsigDialog(false); setAsigForm({});
    toast({ title: 'Asignación guardada' });
  };

  const saveMat = async () => {
    if (!matForm.id_item) { toast({ title: 'Selecciona un material', variant: 'destructive' }); return; }
    await insertRow('trabajo_materiales', { ...matForm, id_trabajo: id });
    reload(); setMatDialog(false); setMatForm({ id_item: '', cantidad: 1, costo_unitario: 0 });
    toast({ title: 'Material agregado' });
  };

  const savePago = async () => {
    const monto = parseFloat(pagoForm.monto);
    if (!monto || monto <= 0) { toast({ title: 'Ingresa un monto válido', variant: 'destructive' }); return; }
    if (monto > pendiente + 0.01) { toast({ title: `El monto supera el pendiente (${formatCurrency(pendiente)})`, variant: 'destructive' }); return; }
    await db.from('trabajo_pagos').insert({
      id_trabajo: id,
      monto,
      metodo: pagoForm.metodo,
      fecha:  pagoForm.fecha,
      notas:  pagoForm.notas || null,
    });
    await updateRow('trabajos', id!, { abono: totalPagos + monto });
    await registrarAuditoria({
      modulo: 'trabajos',
      accion: 'editar',
      descripcion: `Registró pago de ${formatCurrency(monto)} (${pagoForm.metodo}) en trabajo: ${trabajo?.descripcion_trabajo || id}`,
      datos_nuevos: { monto, metodo: pagoForm.metodo, fecha: pagoForm.fecha },
    });
    reload();
    setPagoDialog(false);
    setPagoForm({ monto: '', metodo: 'Efectivo', fecha: new Date().toISOString().slice(0, 10), notas: '' });
    toast({ title: '✅ Pago registrado' });
  };

  const deletePago = async (pagoId: string, monto: number) => {
    await db.from('trabajo_pagos').delete().eq('id', pagoId);
    await updateRow('trabajos', id!, { abono: Math.max(0, totalPagos - monto) });
    await registrarAuditoria({
      modulo: 'trabajos',
      accion: 'eliminar',
      descripcion: `Eliminó pago de ${formatCurrency(monto)} en trabajo: ${trabajo?.descripcion_trabajo || id}`,
      datos_anteriores: { pagoId, monto },
    });
    reload();
    toast({ title: 'Pago eliminado' });
  };

  const generateInvoice = async () => {
    const garantia = await getConfig('garantia_texto');
    const rnc = await getConfig('empresa_rnc');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Factura</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:40px;max-width:800px;margin:auto;color:#1a1a1a}.header{display:flex;justify-content:space-between;border-bottom:3px solid #185FA5;padding-bottom:20px;margin-bottom:30px}.brand{display:flex;align-items:center;gap:14px}.brand img{width:70px;height:70px;object-fit:contain;border-radius:8px}.brand-info h1{color:#185FA5;font-size:16px}.brand-info p{font-size:11px;color:#666}.inv-info{text-align:right}.inv-info h2{color:#EF5709;font-size:26px}.inv-info p{font-size:12px;color:#666}.section{margin-bottom:20px}.section-title{font-size:12px;font-weight:700;color:#185FA5;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}.field label{font-size:10px;color:#888}.field p{font-size:13px;font-weight:500}table.items{width:100%;border-collapse:collapse;margin:10px 0}table.items th{background:#185FA5;color:white;padding:8px 12px;font-size:11px}table.items td{padding:8px 12px;font-size:12px;border-bottom:1px solid #eee}.text-right{text-align:right}.totals{display:flex;justify-content:flex-end;margin-top:16px}.totals-table tr td{padding:4px 12px;font-size:12px}.totals-table .total td{font-weight:700;font-size:15px;border-top:2px solid #185FA5;color:#185FA5}.warranty{margin-top:24px;padding:12px;background:#f8f8f8;border-radius:6px;font-size:11px;color:#666;border-left:3px solid #185FA5}.footer{margin-top:30px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:12px}</style></head><body>
    <div class="header"><div class="brand"><img src="${window.location.origin}/icons/icon-128.png"/><div class="brand-info"><h1>Soluciones Decorativas José Luis</h1><p>Tapicería & Ebanistería</p><p>RNC: ${rnc}</p></div></div><div class="inv-info"><h2>FACTURA</h2><p>Fecha: ${formatDate(new Date().toISOString().slice(0,10))}</p><p>OT: ${trabajo.id.slice(0,8).toUpperCase()}</p></div></div>
    <div class="section"><div class="section-title">Cliente</div><div class="grid"><div class="field"><label>Nombre</label><p>${cliente?.nombre_completo||''}</p></div><div class="field"><label>Teléfono</label><p>${cliente?.telefono||''}</p></div><div class="field"><label>Dirección</label><p>${cliente?.direccion||''}</p></div><div class="field"><label>RNC</label><p>${cliente?.rnc||'—'}</p></div></div></div>
    <div class="section"><div class="section-title">Trabajo</div><div class="grid"><div class="field"><label>Descripción</label><p>${trabajo.descripcion_trabajo}</p></div><div class="field"><label>Categoría</label><p>${trabajo.categoria}</p></div><div class="field"><label>Estado</label><p>${trabajo.estado}</p></div><div class="field"><label>Inicio</label><p>${formatDate(trabajo.fecha_inicio)}</p></div></div></div>
    <div class="section"><div class="section-title">Pagos realizados</div><table class="items"><thead><tr><th>Fecha</th><th>Método</th><th class="text-right">Monto</th><th>Notas</th></tr></thead><tbody>${pagos.map((p: any) => `<tr><td>${formatDate(p.fecha)}</td><td>${p.metodo}</td><td class="text-right">${formatCurrency(p.monto)}</td><td>${p.notas||'—'}</td></tr>`).join('')}</tbody></table></div>
    <div class="totals"><table class="totals-table"><tr><td>Monto total</td><td class="text-right">${formatCurrency(montoTotal)}</td></tr><tr><td>Total pagado</td><td class="text-right">${formatCurrency(totalPagos)}</td></tr><tr class="total"><td><strong>PENDIENTE</strong></td><td class="text-right"><strong>${formatCurrency(pendiente)}</strong></td></tr></table></div>
    ${garantia ? `<div class="warranty"><strong>Garantía:</strong> ${garantia}</div>` : ''}
    <div class="footer">Soluciones Decorativas José Luis — Tapicería & Ebanistería</div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center gap-3">
        <Link to="/trabajos"><Button variant="ghost" size="icon"><ArrowLeft className="h-5 w-5" /></Button></Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">{trabajo.descripcion_trabajo}</h1>
          <p className="text-sm text-muted-foreground">{cliente?.nombre_completo}</p>
        </div>
        {isOwner && (
          <div className="flex gap-2 shrink-0">
            {trabajo.estado !== 'Finalizado' && trabajo.estado !== 'Entregado' && trabajo.estado !== 'Cancelado' && (
              <Button size="sm" variant="outline" onClick={marcarFinalizado}>Finalizar</Button>
            )}
            <Button size="sm" variant="outline" onClick={generateInvoice}>Factura</Button>
          </div>
        )}
      </div>

      {/* Resumen financiero */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <span className="text-xs text-muted-foreground">Estado</span>
              <p><Badge variant={trabajo.estado === 'Cancelado' ? 'destructive' : 'default'}>{trabajo.estado}</Badge></p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Monto total</span>
              <p className="font-semibold">{formatCurrency(montoTotal)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Total pagado</span>
              <p className="font-semibold text-green-600">{formatCurrency(totalPagos)}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Pendiente</span>
              <p className={`font-semibold ${pendiente > 0 ? 'text-destructive' : 'text-green-600'}`}>
                {pendiente > 0 ? formatCurrency(pendiente) : '✅ Saldado'}
              </p>
            </div>
          </div>
          {montoTotal > 0 && (
            <div className="mt-3">
              <div className="h-2 bg-secondary rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all"
                  style={{ width: `${Math.min(100, (totalPagos / montoTotal) * 100)}%` }} />
              </div>
              <p className="text-xs text-muted-foreground mt-1">{Math.round((totalPagos / montoTotal) * 100)}% pagado</p>
            </div>
          )}
          <div className="mt-3 pt-3 border-t grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-xs text-muted-foreground">Inicio</span><p>{formatDate(trabajo.fecha_inicio)}</p></div>
            <div><span className="text-xs text-muted-foreground">Entrega estimada</span><p>{trabajo.fecha_entrega_estimada ? formatDate(trabajo.fecha_entrega_estimada) : '—'}</p></div>
            <div><span className="text-xs text-muted-foreground">Categoría</span><p>{trabajo.categoria}</p></div>
            <div><span className="text-xs text-muted-foreground">Tipo</span><p>{trabajo.tipo_trabajo || '—'}</p></div>
            {trabajo.notas && <div className="col-span-2"><span className="text-xs text-muted-foreground">Notas</span><p>{trabajo.notas}</p></div>}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="pagos">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="pagos">
            💰 Pagos ({pagos.length})
            {pendiente > 0 && <span className="ml-1.5 w-2 h-2 rounded-full bg-destructive inline-block" />}
          </TabsTrigger>
          <TabsTrigger value="asignaciones">👷 Empleados ({asignaciones.length})</TabsTrigger>
          <TabsTrigger value="materiales">📦 Materiales ({materiales.length})</TabsTrigger>
          <TabsTrigger value="caja">🏦 Caja ({movCaja.length})</TabsTrigger>
        </TabsList>

        {/* ══ PAGOS ══ */}
        <TabsContent value="pagos" className="mt-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-sm text-muted-foreground">
                Pagado: <span className="font-semibold text-foreground">{formatCurrency(totalPagos)}</span>
                {pendiente > 0 && <> · Pendiente: <span className="font-semibold text-destructive">{formatCurrency(pendiente)}</span></>}
              </p>
            </div>
            {isOwner && pendiente > 0 && (
              <Button size="sm" onClick={() => setPagoDialog(true)} className="gap-1.5">
                <Plus className="h-4 w-4" />Registrar pago
              </Button>
            )}
          </div>

          {pagos.length === 0 ? (
            <div className="border rounded-lg py-10 text-center text-muted-foreground bg-card">
              <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">Sin pagos registrados</p>
              {isOwner && montoTotal > 0 && (
                <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => setPagoDialog(true)}>
                  <Plus className="h-3.5 w-3.5" />Agregar primer pago
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {pagos.map((p: any) => {
                const Icon = metodoIcon[p.metodo] || Banknote;
                return (
                  <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl border bg-card">
                    <div className="w-9 h-9 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold">{formatCurrency(p.monto)}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${metodoBadge[p.metodo]}`}>
                          {p.metodo}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{formatDate(p.fecha)}{p.notas ? ` · ${p.notas}` : ''}</p>
                    </div>
                    {isOwner && (
                      <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8"
                        onClick={() => deletePago(p.id, p.monto)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Barra resumen si está saldado */}
          {totalPagos > 0 && pendiente === 0 && (
            <div className="flex items-center gap-2 p-3 rounded-xl bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900">
              <span className="text-green-600 text-lg">✅</span>
              <p className="text-sm font-medium text-green-700 dark:text-green-400">Trabajo completamente saldado</p>
            </div>
          )}
        </TabsContent>

        {/* ══ EMPLEADOS ══ */}
        <TabsContent value="asignaciones" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">Total MO: <span className="font-semibold text-foreground">{formatCurrency(totalAsig)}</span></p>
            {isOwner && <Button size="sm" onClick={() => { setAsigForm({}); setAsigDialog(true); }}><Plus className="h-4 w-4 mr-1" />Asignar</Button>}
          </div>
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table><TableHeader><TableRow>
              <TableHead>Empleado</TableHead><TableHead>Descripción</TableHead>
              <TableHead className="text-right">Monto</TableHead>
              {isOwner && <TableHead className="w-[50px]" />}
            </TableRow></TableHeader>
            <TableBody>
              {asignaciones.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin asignaciones</TableCell></TableRow>}
              {asignaciones.map((a: any) => (
                <TableRow key={a.id}>
                  <TableCell className="font-medium">{empleados.find((e: any) => e.id === a.id_empleado)?.nombre || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{a.descripcion}</TableCell>
                  <TableCell className="text-right">{formatCurrency(a.monto_pagar)}</TableCell>
                  {isOwner && <TableCell><Button variant="ghost" size="icon" onClick={async () => { await deleteRow('trabajo_empleados', a.id); reload(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>

        {/* ══ MATERIALES ══ */}
        <TabsContent value="materiales" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">Total Mat: <span className="font-semibold text-foreground">{formatCurrency(totalMat)}</span></p>
            {isOwner && <Button size="sm" onClick={() => { setMatForm({ id_item: '', cantidad: 1, costo_unitario: 0 }); setMatDialog(true); }}><Plus className="h-4 w-4 mr-1" />Agregar</Button>}
          </div>
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table><TableHeader><TableRow>
              <TableHead>Material</TableHead><TableHead className="text-right">Cant.</TableHead>
              <TableHead className="text-right">Costo Unit.</TableHead><TableHead className="text-right">Total</TableHead>
              {isOwner && <TableHead className="w-[50px]" />}
            </TableRow></TableHeader>
            <TableBody>
              {materiales.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin materiales</TableCell></TableRow>}
              {materiales.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{inventario.find((i: any) => i.id === m.id_item)?.nombre_item || '—'}</TableCell>
                  <TableCell className="text-right">{m.cantidad}</TableCell>
                  <TableCell className="text-right">{formatCurrency(m.costo_unitario)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(m.costo_total || m.cantidad * m.costo_unitario)}</TableCell>
                  {isOwner && <TableCell><Button variant="ghost" size="icon" onClick={async () => { await deleteRow('trabajo_materiales', m.id); reload(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>

        {/* ══ CAJA ══ */}
        <TabsContent value="caja" className="mt-4">
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table><TableHeader><TableRow>
              <TableHead>Tipo</TableHead><TableHead>Detalle</TableHead>
              <TableHead className="text-right">Monto</TableHead><TableHead>Fecha</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {movCaja.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin movimientos</TableCell></TableRow>}
              {movCaja.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell><Badge variant={m.tipo === 'Entrada' ? 'default' : 'destructive'}>{m.tipo}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{m.detalle}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(m.monto)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{formatDate(m.fecha)}</TableCell>
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── DIALOG PAGO ── */}
      <Dialog open={pagoDialog} onOpenChange={setPagoDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pago</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="p-3 rounded-lg bg-secondary/50 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total trabajo</span>
                <span className="font-medium">{formatCurrency(montoTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ya pagado</span>
                <span className="font-medium text-green-600">{formatCurrency(totalPagos)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t mt-1 pt-1">
                <span>Pendiente</span>
                <span className="text-destructive">{formatCurrency(pendiente)}</span>
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Monto *</Label>
              <Input type="number" min={0} max={pendiente} placeholder="0.00"
                value={pagoForm.monto} onChange={e => setPagoForm({ ...pagoForm, monto: e.target.value })} />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Método de pago</Label>
              <div className="grid grid-cols-3 gap-2">
                {metodosPago.map(m => {
                  const Icon = metodoIcon[m];
                  return (
                    <button key={m} onClick={() => setPagoForm({ ...pagoForm, metodo: m })}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors
                        ${pagoForm.metodo === m ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'}`}>
                      <Icon className="h-4 w-4" />{m}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Fecha</Label>
              <Input type="date" value={pagoForm.fecha} onChange={e => setPagoForm({ ...pagoForm, fecha: e.target.value })} />
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Notas (opcional)</Label>
              <Input placeholder="Ej: segundo abono, pago final..."
                value={pagoForm.notas} onChange={e => setPagoForm({ ...pagoForm, notas: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPagoDialog(false)}>Cancelar</Button>
            <Button onClick={savePago}>Guardar pago</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG ASIGNAR EMPLEADO ── */}
      <Dialog open={asigDialog} onOpenChange={setAsigDialog}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Asignar Empleado</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Empleado *</Label>
            <Select value={asigForm.id_empleado || ''} onValueChange={v => setAsigForm({ ...asigForm, id_empleado: v })}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{empleados.filter((e: any) => e.activo).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Descripción *</Label><Input value={asigForm.descripcion || ''} onChange={e => setAsigForm({ ...asigForm, descripcion: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Monto</Label><Input type="number" value={asigForm.monto_pagar || 0} onChange={e => setAsigForm({ ...asigForm, monto_pagar: +e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAsigDialog(false)}>Cancelar</Button><Button onClick={saveAsig}>Guardar</Button></div>
        </DialogContent>
      </Dialog>

      {/* ── DIALOG MATERIAL ── */}
      <Dialog open={matDialog} onOpenChange={setMatDialog}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Agregar Material</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Material *</Label>
            <Select value={matForm.id_item} onValueChange={v => { const item = inventario.find((i: any) => i.id === v); setMatForm({ ...matForm, id_item: v, costo_unitario: item?.costo_unitario || 0 }); }}>
              <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
              <SelectContent>{inventario.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nombre_item} (stock: {i.stock_actual})</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label className="text-xs">Cantidad</Label><Input type="number" value={matForm.cantidad} onChange={e => setMatForm({ ...matForm, cantidad: +e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Costo Unit.</Label><Input type="number" value={matForm.costo_unitario} onChange={e => setMatForm({ ...matForm, costo_unitario: +e.target.value })} /></div>
          </div>
          <p className="text-sm text-right font-medium">Total: {formatCurrency(matForm.cantidad * matForm.costo_unitario)}</p>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMatDialog(false)}>Cancelar</Button><Button onClick={saveMat}>Agregar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
