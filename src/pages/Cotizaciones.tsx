import { useState, useEffect } from 'react';
import { Plus, Search, Eye, FileText, Trash2, CheckCircle, XCircle, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchAll, insertRow, updateRow, deleteRow, getConfig } from '@/lib/supabase-service';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/utils/helpers';

const estadosBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  'Pendiente': 'outline', 'Aprobada': 'secondary', 'Cancelada': 'destructive',
};

const metodosPago = ['Efectivo', 'Transferencia', 'Tarjeta'];

export default function Cotizaciones() {
  const { isOwner } = useAuth();
  const { toast } = useToast();
  const [items, setItems]         = useState<any[]>([]);
  const [clientes, setClientes]   = useState<any[]>([]);
  const [search, setSearch]       = useState('');
  const [dialogOpen, setDialogOpen]     = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    id_cliente: '', estado: 'Pendiente',
    fecha: new Date().toISOString().slice(0, 10), notas: ''
  });
  const [cotItems, setCotItems] = useState<any[]>([{ descripcion: '', cantidad: 1, precio_unitario: 0 }]);

  // Abono al aprobar
  const [abonoMonto, setAbonoMonto]   = useState<string>('');
  const [abonoMetodo, setAbonoMetodo] = useState('Efectivo');

  const load = async () => {
    const [cots, cls] = await Promise.all([
      fetchAll('cotizaciones'), fetchAll('clientes', 'nombre_completo', true)
    ]);
    setItems(cots); setClientes(cls);
  };
  useEffect(() => { load(); }, []);

  const filtered = items.filter(i => {
    const cl = clientes.find((c: any) => c.id === i.id_cliente);
    return i.numero_cotizacion?.toLowerCase().includes(search.toLowerCase()) ||
      cl?.nombre_completo?.toLowerCase().includes(search.toLowerCase());
  });

  const subtotal = cotItems.reduce((s: number, i: any) => s + (i.cantidad * i.precio_unitario), 0);
  const itbis    = subtotal * 0.18;
  const total    = subtotal + itbis;

  const addItem    = () => setCotItems([...cotItems, { descripcion: '', cantidad: 1, precio_unitario: 0 }]);
  const removeItem = (idx: number) => setCotItems(cotItems.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: string, val: any) => setCotItems(cotItems.map((item, i) => i === idx ? { ...item, [key]: val } : item));

  const handleSave = async () => {
    if (!form.id_cliente) { toast({ title: 'Selecciona un cliente', variant: 'destructive' }); return; }
    const [rncEmpresa, rncCliente] = await Promise.all([
      getConfig('empresa_rnc'),
      supabase.from('clientes').select('rnc').eq('id', form.id_cliente).maybeSingle().then(r => r.data?.rnc || '')
    ]);
    const cotData = { ...form, subtotal, itbis, total, rnc_empresa: rncEmpresa, rnc_cliente: rncCliente };
    if (form.id) {
      await updateRow('cotizaciones', form.id, cotData);
      await supabase.from('cotizacion_items').delete().eq('id_cotizacion', form.id);
      for (const item of cotItems.filter(i => i.descripcion))
        await supabase.from('cotizacion_items').insert({ id_cotizacion: form.id, ...item });
    } else {
      const cot: any = await insertRow('cotizaciones', cotData);
      for (const item of cotItems.filter(i => i.descripcion))
        await supabase.from('cotizacion_items').insert({ id_cotizacion: cot.id, ...item });
    }
    load(); setDialogOpen(false);
    toast({ title: 'Cotización guardada' });
  };

  // Aprobar cotización → crea trabajo automáticamente + registra abono si hay
  const handleAprobar = async (cot: any) => {
    const db = supabase as any;
    const abono = parseFloat(abonoMonto);
    const abonoVal = !isNaN(abono) && abono > 0 ? abono : null;

    // 1. Actualizar estado cotización
    await updateRow('cotizaciones', cot.id, { estado: 'Aprobada', ...(abonoVal ? { abono: abonoVal } : {}) });

    // 2. Crear trabajo automáticamente
    const cl = clientes.find((c: any) => c.id === cot.id_cliente);
    const trabajoData: any = {
      id_cliente:           cot.id_cliente,
      descripcion_trabajo:  cot.notas || `Trabajo cotizado — ${cl?.nombre_completo || ''}`,
      categoria:            'Tapicería',
      estado:               'En proceso',
      fecha_inicio:         new Date().toISOString().slice(0, 10),
      monto_final:          cot.total,
      abono:                abonoVal,
      tipo_trabajo:         'Reparación',
      notas:                `Generado desde cotización ${cot.numero_cotizacion}`,
    };
    const nuevoTrabajo: any = await insertRow('trabajos', trabajoData);

    // 3. Registrar abono en trabajo_pagos si hubo abono
    if (abonoVal && nuevoTrabajo?.id) {
      await db.from('trabajo_pagos').insert({
        id_trabajo: nuevoTrabajo.id,
        monto:  abonoVal,
        metodo: abonoMetodo,
        fecha:  new Date().toISOString().slice(0, 10),
        notas:  'Abono inicial al aprobar cotización',
      }).catch(() => {});
    }

    setAbonoMonto(''); setAbonoMetodo('Efectivo');
    load(); setDetailDialog(null);
    toast({ title: '✅ Cotización aprobada — Trabajo creado automáticamente' });
  };

  const handleCancelar = async (cot: any) => {
    await updateRow('cotizaciones', cot.id, { estado: 'Cancelada' });
    load(); setDetailDialog(null);
    toast({ title: 'Cotización cancelada' });
  };

  const openEdit = async (cot: any) => {
    setForm(cot);
    const { data } = await supabase.from('cotizacion_items').select('*').eq('id_cotizacion', cot.id);
    setCotItems(data?.length ? data.map((d: any) => ({ descripcion: d.descripcion, cantidad: d.cantidad, precio_unitario: d.precio_unitario })) : [{ descripcion: '', cantidad: 1, precio_unitario: 0 }]);
    setDialogOpen(true);
  };

  const openNew = () => {
    setForm({ id_cliente: '', estado: 'Pendiente', fecha: new Date().toISOString().slice(0, 10), notas: '' });
    setCotItems([{ descripcion: '', cantidad: 1, precio_unitario: 0 }]);
    setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteRow('cotizaciones', deleteId); load(); setDeleteId(null); toast({ title: 'Cotización eliminada' }); }
  };

  const viewDetail = async (cot: any) => {
    const { data } = await supabase.from('cotizacion_items').select('*').eq('id_cotizacion', cot.id);
    setDetailDialog({ ...cot, items: data || [] });
    setAbonoMonto(''); setAbonoMetodo('Efectivo');
  };

  const generatePDF = async (cot: any) => {
    const { data: citems } = await supabase.from('cotizacion_items').select('*').eq('id_cotizacion', cot.id);
    const cl = clientes.find((c: any) => c.id === cot.id_cliente);
    const garantia = await getConfig('garantia_texto');
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Cotización ${cot.numero_cotizacion}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:40px;max-width:800px;margin:auto;color:#1a1a1a}.header{display:flex;justify-content:space-between;border-bottom:3px solid #185FA5;padding-bottom:20px;margin-bottom:30px}.brand{display:flex;align-items:center;gap:14px}.brand img{width:70px;height:70px;object-fit:contain;border-radius:8px}.brand-info h1{color:#185FA5;font-size:16px}.brand-info p{font-size:11px;color:#666}.inv-info{text-align:right}.inv-info h2{color:#185FA5;font-size:24px}.inv-info p{font-size:12px;color:#666}.section{margin-bottom:20px}.section-title{font-size:12px;font-weight:700;color:#185FA5;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;border-bottom:1px solid #eee;padding-bottom:4px}.grid{display:grid;grid-template-columns:1fr 1fr;gap:6px 20px}.field label{font-size:10px;color:#888}.field p{font-size:13px;font-weight:500}table.items{width:100%;border-collapse:collapse;margin:10px 0}table.items th{background:#185FA5;color:white;padding:8px 12px;font-size:11px;text-align:left}table.items td{padding:8px 12px;font-size:12px;border-bottom:1px solid #eee}.text-right{text-align:right}.totals{display:flex;justify-content:flex-end;margin-top:12px}.totals-table tr td{padding:4px 12px;font-size:12px}.totals-table .total td{font-weight:700;font-size:15px;border-top:2px solid #185FA5;color:#185FA5}.warranty{margin-top:30px;padding:12px;background:#f8f8f8;border-radius:6px;font-size:11px;color:#666;border-left:3px solid #185FA5}.footer{margin-top:30px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:12px}</style></head><body>
    <div class="header"><div class="brand"><img src="${window.location.origin}/icons/icon-128.png" /><div class="brand-info"><h1>Soluciones Decorativas José Luis</h1><p>Tapicería & Ebanistería</p><p>RNC: ${cot.rnc_empresa || ''}</p></div></div><div class="inv-info"><h2>COTIZACIÓN</h2><p>${cot.numero_cotizacion}</p><p>Fecha: ${formatDate(cot.fecha)}</p>${cot.fecha_vencimiento ? `<p>Válida hasta: ${formatDate(cot.fecha_vencimiento)}</p>` : ''}</div></div>
    <div class="section"><div class="section-title">Cliente</div><div class="grid"><div class="field"><label>Nombre</label><p>${cl?.nombre_completo || ''}</p></div><div class="field"><label>RNC</label><p>${cot.rnc_cliente || '—'}</p></div><div class="field"><label>Teléfono</label><p>${cl?.telefono || ''}</p></div><div class="field"><label>Dirección</label><p>${cl?.direccion || ''}</p></div></div></div>
    <div class="section"><div class="section-title">Detalle</div><table class="items"><thead><tr><th>Descripción</th><th class="text-right">Cant.</th><th class="text-right">P. Unit.</th><th class="text-right">Total</th></tr></thead><tbody>${(citems || []).map((i: any) => `<tr><td>${i.descripcion}</td><td class="text-right">${i.cantidad}</td><td class="text-right">${formatCurrency(i.precio_unitario)}</td><td class="text-right">${formatCurrency(i.cantidad * i.precio_unitario)}</td></tr>`).join('')}</tbody></table></div>
    <div class="totals"><table class="totals-table"><tr><td>Subtotal</td><td class="text-right">${formatCurrency(cot.subtotal)}</td></tr><tr><td>ITBIS 18%</td><td class="text-right">${formatCurrency(cot.itbis)}</td></tr><tr class="total"><td><strong>TOTAL</strong></td><td class="text-right"><strong>${formatCurrency(cot.total)}</strong></td></tr></table></div>
    ${garantia ? `<div class="warranty"><strong>Garantía:</strong> ${garantia}</div>` : ''}
    ${cot.notas ? `<div class="warranty" style="margin-top:10px"><strong>Notas:</strong> ${cot.notas}</div>` : ''}
    <div class="footer">Soluciones Decorativas José Luis — Tapicería & Ebanistería</div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Cotizaciones</h1>
        {isOwner && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nueva Cotización</Button>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-lg overflow-x-auto bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>N°</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="hidden sm:table-cell">Fecha</TableHead>
            <TableHead className="text-right hidden md:table-cell">Total</TableHead>
            <TableHead className="w-[110px]">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin cotizaciones</TableCell></TableRow>}
            {filtered.map((c: any) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium text-sm">{c.numero_cotizacion}</TableCell>
                <TableCell className="text-sm">{clientes.find((cl: any) => cl.id === c.id_cliente)?.nombre_completo || '—'}</TableCell>
                <TableCell><Badge variant={estadosBadge[c.estado] || 'outline'}>{c.estado}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{formatDate(c.fecha)}</TableCell>
                <TableCell className="hidden md:table-cell text-right">{formatCurrency(c.total)}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => viewDetail(c)}><Eye className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => generatePDF(c)}><FileText className="h-4 w-4" /></Button>
                    {isOwner && <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Form dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Nueva'} Cotización</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Cliente *</Label>
                <Select value={form.id_cliente || ''} onValueChange={v => setForm({ ...form, id_cliente: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{clientes.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.nombre_completo}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Válida hasta</Label>
              <Input type="date" value={form.fecha_vencimiento || ''} onChange={e => setForm({ ...form, fecha_vencimiento: e.target.value })} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Ítems</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
              </div>
              <div className="space-y-2">
                {cotItems.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5"><Input placeholder="Descripción" value={item.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)} /></div>
                    <div className="col-span-2"><Input type="number" placeholder="Cant" value={item.cantidad === 0 ? '' : item.cantidad} onChange={e => updateItem(idx, 'cantidad', e.target.value === '' ? 0 : +e.target.value)} /></div>
                    <div className="col-span-3"><Input type="number" placeholder="Precio" value={item.precio_unitario === 0 ? '' : item.precio_unitario} onChange={e => updateItem(idx, 'precio_unitario', e.target.value === '' ? 0 : +e.target.value)} /></div>
                    <div className="col-span-2 text-right text-sm font-medium">
                      {formatCurrency(item.cantidad * item.precio_unitario)}
                      {cotItems.length > 1 && <Button variant="ghost" size="icon" className="h-6 w-6 ml-1" onClick={() => removeItem(idx)}><Trash2 className="h-3 w-3 text-destructive" /></Button>}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-3 text-right space-y-1">
                <p className="text-sm">Subtotal: <span className="font-medium">{formatCurrency(subtotal)}</span></p>
                <p className="text-sm">ITBIS 18%: <span className="font-medium">{formatCurrency(itbis)}</span></p>
                <p className="text-base font-bold text-primary">Total: {formatCurrency(total)}</p>
              </div>
            </div>

            <div className="grid gap-1.5"><Label className="text-xs">Notas</Label><Textarea value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Detail dialog — ver + aprobar/cancelar */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Cotización {detailDialog?.numero_cotizacion}</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground text-xs">Cliente</span><p className="font-medium">{clientes.find((c: any) => c.id === detailDialog.id_cliente)?.nombre_completo}</p></div>
                <div><span className="text-muted-foreground text-xs">Estado</span><p><Badge variant={estadosBadge[detailDialog.estado] || 'outline'}>{detailDialog.estado}</Badge></p></div>
                <div><span className="text-muted-foreground text-xs">Fecha</span><p>{formatDate(detailDialog.fecha)}</p></div>
                <div><span className="text-muted-foreground text-xs">Total</span><p className="font-bold text-primary">{formatCurrency(detailDialog.total)}</p></div>
              </div>

              <Table>
                <TableHeader><TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="text-right">P.Unit</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {detailDialog.items?.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.descripcion}</TableCell>
                      <TableCell className="text-right">{i.cantidad}</TableCell>
                      <TableCell className="text-right">{formatCurrency(i.precio_unitario)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(i.total || i.cantidad * i.precio_unitario)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Acciones — solo si está Pendiente y es owner */}
              {isOwner && detailDialog.estado === 'Pendiente' && (
                <div className="border rounded-xl p-4 space-y-3 bg-secondary/30">
                  <p className="text-sm font-semibold">Acción</p>

                  {/* Abono opcional al aprobar */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Abono inicial (opcional)</Label>
                      <Input type="number" min={0} placeholder="0.00"
                        value={abonoMonto} onChange={e => setAbonoMonto(e.target.value)} />
                    </div>
                    <div className="grid gap-1.5">
                      <Label className="text-xs">Método de pago</Label>
                      <Select value={abonoMetodo} onValueChange={setAbonoMetodo}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{metodosPago.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={() => handleAprobar(detailDialog)}>
                      <CheckCircle className="h-4 w-4" />Aprobar
                    </Button>
                    <Button variant="destructive" className="flex-1 gap-2" onClick={() => handleCancelar(detailDialog)}>
                      <XCircle className="h-4 w-4" />Cancelar
                    </Button>
                  </div>
                </div>
              )}

              {/* Si ya fue aprobada, mostrar abono registrado */}
              {detailDialog.estado === 'Aprobada' && detailDialog.abono > 0 && (
                <div className="border rounded-xl p-3 bg-green-50 dark:bg-green-950/20 space-y-1">
                  <p className="text-xs font-semibold text-green-700 dark:text-green-400">Abono registrado</p>
                  <p className="text-sm">{formatCurrency(detailDialog.abono)}</p>
                  <p className="text-xs text-muted-foreground">Pendiente: {formatCurrency(detailDialog.total - detailDialog.abono)}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar cotización?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}