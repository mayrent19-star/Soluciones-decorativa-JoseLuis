import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, CheckCircle2, FileText } from 'lucide-react';
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

export default function TrabajoDetalle() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const { isOwner } = useAuth();
  const [trabajo, setTrabajo] = useState<any>(null);
  const [cliente, setCliente] = useState<any>(null);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [movCaja, setMovCaja] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [asigDialog, setAsigDialog] = useState(false);
  const [matDialog, setMatDialog] = useState(false);
  const [asigForm, setAsigForm] = useState<any>({});
  const [matForm, setMatForm] = useState<any>({ id_item: '', cantidad: 1, costo_unitario: 0 });

  const reload = async () => {
    if (!id) return;
    const [t, asigs, mats, caja, emps, inv] = await Promise.all([
      fetchById('trabajos', id),
      fetchWhere('trabajo_empleados', 'id_trabajo', id),
      fetchWhere('trabajo_materiales', 'id_trabajo', id),
      fetchWhere('caja_movimientos', 'id_trabajo', id),
      fetchAll('empleados', 'nombre', true),
      fetchAll('inventario', 'nombre_item', true),
    ]);
    setTrabajo(t); setAsignaciones(asigs); setMateriales(mats); setMovCaja(caja); setEmpleados(emps); setInventario(inv);
    if ((t as any)?.id_cliente) setCliente(await fetchById('clientes', (t as any).id_cliente));
  };
  useEffect(() => { reload(); }, [id]);

  if (!trabajo) return <div className="page-container"><p className="text-muted-foreground">Cargando...</p><Link to="/trabajos"><Button variant="outline" className="mt-4"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button></Link></div>;

  const totalAsig = asignaciones.reduce((s: number, a: any) => s + (a.monto_pagar || 0), 0);
  const totalMat = materiales.reduce((s: number, m: any) => s + (m.costo_total || m.cantidad * m.costo_unitario || 0), 0);

  const marcarFinalizado = async () => {
    await updateRow('trabajos', trabajo.id, { estado: 'Finalizado', fecha_finalizado: new Date().toISOString().slice(0, 10) });
    reload(); toast({ title: 'Trabajo finalizado' });
  };

  const saveAsig = async () => {
    if (!asigForm.id_empleado || !asigForm.descripcion) { toast({ title: 'Completa los campos', variant: 'destructive' }); return; }
    await insertRow('trabajo_empleados', { ...asigForm, id_trabajo: id });
    reload(); setAsigDialog(false); setAsigForm({}); toast({ title: 'Asignación guardada' });
  };

  const saveMat = async () => {
    if (!matForm.id_item) { toast({ title: 'Selecciona un material', variant: 'destructive' }); return; }
    await insertRow('trabajo_materiales', { ...matForm, id_trabajo: id });
    reload(); setMatDialog(false); setMatForm({ id_item: '', cantidad: 1, costo_unitario: 0 }); toast({ title: 'Material agregado' });
  };

  const generateInvoice = async () => {
    const garantia = await getConfig('garantia_texto');
    const rnc = await getConfig('empresa_rnc');
    const saldo = (trabajo.monto_final || trabajo.monto_cotizado) - (trabajo.abono || 0);
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Factura</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:40px;max-width:800px;margin:auto;color:#1a1a1a}.header{display:flex;justify-content:space-between;border-bottom:3px solid #0C717F;padding-bottom:20px;margin-bottom:30px}.brand{display:flex;align-items:center;gap:14px}.brand img{width:70px;height:70px;object-fit:contain;border-radius:8px}.brand-info h1{color:#0C717F;font-size:16px}.brand-info p{font-size:11px;color:#666}.inv-info{text-align:right}.inv-info h2{color:#EF5709;font-size:26px}.inv-info p{font-size:12px;color:#666}.section{margin-bottom:20px}.section-title{font-size:12px;font-weight:700;color:#0C717F;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}.field label{font-size:10px;color:#888}.field p{font-size:13px;font-weight:500}.text-right{text-align:right}.totals{display:flex;justify-content:flex-end;margin-top:16px}.totals-table tr td{padding:4px 12px;font-size:12px}.totals-table .total td{font-weight:700;font-size:15px;border-top:2px solid #0C717F;color:#0C717F}.warranty{margin-top:30px;padding:12px;background:#f8f8f8;border-radius:6px;font-size:11px;color:#666;border-left:3px solid #0C717F}.footer{margin-top:30px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:12px}</style></head><body>
    <div class="header"><div class="brand"><img src="${window.location.origin}/logo-joseluis.jpg"/><div class="brand-info"><h1>Soluciones Decorativas José Luis</h1><p>Tapicería & Ebanistería</p><p>RNC: ${rnc}</p></div></div><div class="inv-info"><h2>FACTURA</h2><p>Fecha: ${formatDate(new Date().toISOString().slice(0, 10))}</p><p>OT: ${trabajo.id.slice(0, 8).toUpperCase()}</p></div></div>
    <div class="section"><div class="section-title">Cliente</div><div class="grid"><div class="field"><label>Nombre</label><p>${cliente?.nombre_completo || ''}</p></div><div class="field"><label>Teléfono</label><p>${cliente?.telefono || ''}</p></div><div class="field"><label>Dirección</label><p>${cliente?.direccion || ''}</p></div><div class="field"><label>RNC</label><p>${cliente?.rnc || '—'}</p></div></div></div>
    <div class="section"><div class="section-title">Trabajo</div><div class="grid"><div class="field"><label>Descripción</label><p>${trabajo.descripcion_trabajo}</p></div><div class="field"><label>Categoría</label><p>${trabajo.categoria}</p></div><div class="field"><label>Estado</label><p>${trabajo.estado}</p></div><div class="field"><label>Inicio</label><p>${formatDate(trabajo.fecha_inicio)}</p></div></div></div>
    <div class="totals"><table class="totals-table"><tr><td>Cotizado</td><td class="text-right">${formatCurrency(trabajo.monto_cotizado)}</td></tr>${trabajo.monto_final ? `<tr><td>Final</td><td class="text-right">${formatCurrency(trabajo.monto_final)}</td></tr>` : ''}${trabajo.abono ? `<tr><td>Abono</td><td class="text-right">- ${formatCurrency(trabajo.abono)}</td></tr>` : ''}<tr class="total"><td>Balance</td><td class="text-right">${formatCurrency(saldo)}</td></tr></table></div>
    ${garantia ? `<div class="warranty"><strong>Garantía:</strong> ${garantia}</div>` : ''}
    <div class="footer"><p>Soluciones Decorativas José Luis — Gracias por su preferencia</p></div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 flex-wrap">
        <Link to="/trabajos"><Button variant="outline" size="sm"><ArrowLeft className="h-4 w-4 mr-1" />Volver</Button></Link>
        <h1 className="text-xl font-bold flex-1">Detalle del Trabajo</h1>
        {isOwner && (trabajo.estado === 'En proceso' || trabajo.estado === 'Pendiente') && (
          <Button onClick={marcarFinalizado} variant="outline" className="text-success border-success"><CheckCircle2 className="h-4 w-4 mr-1" />Finalizar</Button>
        )}
        <Button variant="outline" onClick={generateInvoice}><FileText className="h-4 w-4 mr-1" />Factura</Button>
      </div>

      <Card><CardContent className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div><span className="text-xs text-muted-foreground">Cliente</span><p className="font-medium">{cliente?.nombre_completo || '—'}</p></div>
        <div><span className="text-xs text-muted-foreground">Descripción</span><p className="font-medium">{trabajo.descripcion_trabajo}</p></div>
        <div><span className="text-xs text-muted-foreground">Estado</span><p><Badge variant={trabajo.estado === 'Cancelado' ? 'destructive' : 'default'}>{trabajo.estado}</Badge></p></div>
        <div><span className="text-xs text-muted-foreground">Cotizado</span><p className="font-semibold">{formatCurrency(trabajo.monto_cotizado)}</p></div>
        <div><span className="text-xs text-muted-foreground">Abono</span><p>{trabajo.abono ? formatCurrency(trabajo.abono) : '—'}</p></div>
        <div><span className="text-xs text-muted-foreground">Costo total (MO + Mat)</span><p className="font-semibold text-accent">{formatCurrency(totalAsig + totalMat)}</p></div>
      </CardContent></Card>

      <Tabs defaultValue="asignaciones">
        <TabsList><TabsTrigger value="asignaciones">Empleados ({asignaciones.length})</TabsTrigger><TabsTrigger value="materiales">BOM ({materiales.length})</TabsTrigger><TabsTrigger value="caja">Caja ({movCaja.length})</TabsTrigger></TabsList>
        <TabsContent value="asignaciones" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">Total MO: <span className="font-semibold text-foreground">{formatCurrency(totalAsig)}</span></p>
            {isOwner && <Button size="sm" onClick={() => { setAsigForm({}); setAsigDialog(true); }}><Plus className="h-4 w-4 mr-1" />Asignar</Button>}
          </div>
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table><TableHeader><TableRow><TableHead>Empleado</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead>{isOwner && <TableHead className="w-[50px]"></TableHead>}</TableRow></TableHeader>
            <TableBody>
              {asignaciones.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin asignaciones</TableCell></TableRow>}
              {asignaciones.map((a: any) => (
                <TableRow key={a.id}><TableCell className="font-medium">{empleados.find((e: any) => e.id === a.id_empleado)?.nombre || '—'}</TableCell><TableCell className="text-muted-foreground">{a.descripcion}</TableCell><TableCell className="text-right">{formatCurrency(a.monto_pagar)}</TableCell>
                {isOwner && <TableCell><Button variant="ghost" size="icon" onClick={async () => { await deleteRow('trabajo_empleados', a.id); reload(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}</TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>
        <TabsContent value="materiales" className="mt-4">
          <div className="flex justify-between items-center mb-3">
            <p className="text-sm text-muted-foreground">Total Materiales: <span className="font-semibold text-foreground">{formatCurrency(totalMat)}</span></p>
            {isOwner && <Button size="sm" onClick={() => { setMatForm({ id_item: '', cantidad: 1, costo_unitario: 0 }); setMatDialog(true); }}><Plus className="h-4 w-4 mr-1" />Agregar Material</Button>}
          </div>
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table><TableHeader><TableRow><TableHead>Material</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="text-right">Costo Unit.</TableHead><TableHead className="text-right">Total</TableHead>{isOwner && <TableHead className="w-[50px]"></TableHead>}</TableRow></TableHeader>
            <TableBody>
              {materiales.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin materiales</TableCell></TableRow>}
              {materiales.map((m: any) => (
                <TableRow key={m.id}><TableCell className="font-medium">{inventario.find((i: any) => i.id === m.id_item)?.nombre_item || '—'}</TableCell><TableCell className="text-right">{m.cantidad}</TableCell><TableCell className="text-right">{formatCurrency(m.costo_unitario)}</TableCell><TableCell className="text-right font-medium">{formatCurrency(m.costo_total || m.cantidad * m.costo_unitario)}</TableCell>
                {isOwner && <TableCell><Button variant="ghost" size="icon" onClick={async () => { await deleteRow('trabajo_materiales', m.id); reload(); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>}</TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>
        <TabsContent value="caja" className="mt-4">
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table><TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Detalle</TableHead><TableHead className="text-right">Monto</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
            <TableBody>
              {movCaja.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin movimientos</TableCell></TableRow>}
              {movCaja.map((m: any) => (
                <TableRow key={m.id}><TableCell><Badge variant={m.tipo === 'Entrada' ? 'default' : 'destructive'}>{m.tipo}</Badge></TableCell><TableCell className="text-muted-foreground">{m.detalle}</TableCell><TableCell className="text-right font-medium">{formatCurrency(m.monto)}</TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(m.fecha)}</TableCell></TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={asigDialog} onOpenChange={setAsigDialog}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Asignar Empleado</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Empleado *</Label><Select value={asigForm.id_empleado || ''} onValueChange={v => setAsigForm({ ...asigForm, id_empleado: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{empleados.filter((e: any) => e.activo).map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent></Select></div>
          <div className="grid gap-1.5"><Label className="text-xs">Descripción *</Label><Input value={asigForm.descripcion || ''} onChange={e => setAsigForm({ ...asigForm, descripcion: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Monto</Label><Input type="number" value={asigForm.monto_pagar || 0} onChange={e => setAsigForm({ ...asigForm, monto_pagar: +e.target.value })} /></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setAsigDialog(false)}>Cancelar</Button><Button onClick={saveAsig}>Guardar</Button></div></DialogContent>
      </Dialog>

      <Dialog open={matDialog} onOpenChange={setMatDialog}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>Agregar Material (BOM)</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Material *</Label><Select value={matForm.id_item} onValueChange={v => { const item = inventario.find((i: any) => i.id === v); setMatForm({ ...matForm, id_item: v, costo_unitario: item?.costo_unitario || 0 }); }}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{inventario.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nombre_item} (stock: {i.stock_actual})</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label className="text-xs">Cantidad</Label><Input type="number" value={matForm.cantidad} onChange={e => setMatForm({ ...matForm, cantidad: +e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Costo Unit.</Label><Input type="number" value={matForm.costo_unitario} onChange={e => setMatForm({ ...matForm, costo_unitario: +e.target.value })} /></div>
          </div>
          <p className="text-sm text-right font-medium">Total: {formatCurrency(matForm.cantidad * matForm.costo_unitario)}</p>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMatDialog(false)}>Cancelar</Button><Button onClick={saveMat}>Agregar</Button></div></DialogContent>
      </Dialog>
    </div>
  );
}
