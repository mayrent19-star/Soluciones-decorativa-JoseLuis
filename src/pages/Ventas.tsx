import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Eye, FileText, Trash2, ShoppingBag, ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { fetchAll, insertRow, updateRow, deleteRow, getConfig } from '@/lib/supabase-service';
import { formatCurrency, formatDate } from '@/utils/helpers';
import ClienteSelector from '@/components/ClienteSelector';

const db = supabase as any;
const metodosPago = ['Efectivo', 'Transferencia', 'Tarjeta'];

const emptyItem = { id_mueble: '', descripcion: '', cantidad: 1, precio_unitario: 0, foto_url: '', fotoFile: null as File | null, fotoPreview: '' };

async function subirFoto(file: File): Promise<string> {
  const ext  = file.name.split('.').pop() || 'jpg';
  const path = `venta-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const { error } = await supabase.storage.from('ventas-fotos').upload(path, file, { upsert: true });
  if (error) throw error;
  return supabase.storage.from('ventas-fotos').getPublicUrl(path).data.publicUrl;
}

export default function Ventas() {
  const { isOwner } = useAuth();
  const { toast }   = useToast();

  const [ventas,   setVentas]   = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [muebles,  setMuebles]  = useState<any[]>([]);
  const [search,   setSearch]   = useState('');

  const [dialogOpen,   setDialogOpen]   = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [deleteId,     setDeleteId]     = useState<string | null>(null);
  const [saving,       setSaving]       = useState(false);

  const [form, setForm] = useState<any>({
    id_cliente: '', nombre_libre: '', rnc_libre: '',
    fecha: new Date().toISOString().slice(0, 10),
    metodo_pago: 'Efectivo', notas: '', abono: '',
    aplicar_itbis: false, ncf: ''
  });
  const [items, setItems] = useState<any[]>([{ ...emptyItem }]);

  const fileRefs = useRef<(HTMLInputElement | null)[]>([]);

  const reload = async () => {
    const [v, c] = await Promise.all([
      fetchAll('ventas'),
      fetchAll('clientes', 'nombre_completo', true),
    ]);
    const { data: m } = await db.from('catalogo_muebles').select('*').order('nombre');
    setVentas(v); setClientes(c); setMuebles(m || []);
  };
  useEffect(() => { reload(); }, []);

  const filtered = ventas.filter(v => {
    const cl = clientes.find((c: any) => c.id === v.id_cliente);
    return v.numero_venta?.toLowerCase().includes(search.toLowerCase()) ||
      cl?.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
      v.nombre_libre?.toLowerCase().includes(search.toLowerCase());
  });

  // Totales
  const subtotal = items.reduce((s, i) => s + (Number(i.cantidad) * Number(i.precio_unitario)), 0);
  const itbis    = form.aplicar_itbis ? subtotal * 0.18 : 0;
  const total    = subtotal + itbis;

  const addItem    = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: string, val: any) =>
    setItems(items.map((item, i) => i === idx ? { ...item, [key]: val } : item));

  const seleccionarMueble = (idx: number, id_mueble: string) => {
    const m = muebles.find((m: any) => m.id === id_mueble);
    if (m) updateItem(idx, 'id_mueble', id_mueble);
    if (m) setItems(prev => prev.map((item, i) => i === idx ? {
      ...item, id_mueble,
      descripcion:    m.nombre,
      precio_unitario: m.precio || 0,
      foto_url:       m.foto_url || '',
      fotoPreview:    m.foto_url || '',
    } : item));
  };

  const handleFotoItem = async (idx: number, file: File) => {
    const preview = URL.createObjectURL(file);
    setItems(prev => prev.map((item, i) => i === idx ? { ...item, fotoFile: file, fotoPreview: preview } : item));
  };

  const openNew = () => {
    setForm({ id_cliente: '', nombre_libre: '', rnc_libre: '', fecha: new Date().toISOString().slice(0, 10), metodo_pago: 'Efectivo', notas: '', abono: '' });
    setItems([{ ...emptyItem }]);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.id_cliente && !form.nombre_libre) {
      toast({ title: 'Selecciona o escribe un cliente', variant: 'destructive' }); return;
    }
    if (!items.some(i => i.descripcion)) {
      toast({ title: 'Agrega al menos un artículo', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const ventaData: any = {
        id_cliente:  form.id_cliente || null,
        nombre_libre: form.nombre_libre || null,
        rnc_libre:   form.rnc_libre   || null,
        fecha:       form.fecha,
        metodo_pago: form.metodo_pago,
        subtotal, itbis, total,
        abono:       form.abono ? Number(form.abono) : 0,
        notas:       form.notas || null,
        ncf:         form.ncf || null,
      };
      const venta: any = await insertRow('ventas', ventaData);

      for (const item of items.filter(i => i.descripcion)) {
        let foto_url = item.foto_url || null;
        if (item.fotoFile) foto_url = await subirFoto(item.fotoFile);
        await db.from('venta_items').insert({
          id_venta:       venta.id,
          id_mueble:      item.id_mueble || null,
          descripcion:    item.descripcion,
          cantidad:       Number(item.cantidad),
          precio_unitario: Number(item.precio_unitario),
          total:          Number(item.cantidad) * Number(item.precio_unitario),
          foto_url,
        });
        // Restar stock del catálogo si es mueble
        if (item.id_mueble) {
          const m = muebles.find((m: any) => m.id === item.id_mueble);
          if (m && m.stock > 0) {
            await db.from('catalogo_muebles').update({ stock: Math.max(0, m.stock - Number(item.cantidad)) }).eq('id', item.id_mueble);
          }
        }
      }
      reload(); setDialogOpen(false);
      toast({ title: '✅ Venta registrada' });
    } catch (e: any) {
      toast({ title: 'Error guardando', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteRow('ventas', deleteId); reload(); setDeleteId(null); toast({ title: 'Venta eliminada' }); }
  };

  const viewDetail = async (v: any) => {
    const { data: vitems } = await db.from('venta_items').select('*').eq('id_venta', v.id);
    setDetailDialog({ ...v, items: vitems || [] });
  };

  const generateFactura = async (v: any, conFoto = false) => {
    const { data: vitems } = await db.from('venta_items').select('*').eq('id_venta', v.id);
    const cl  = clientes.find((c: any) => c.id === v.id_cliente);
    const nombre = cl?.nombre_completo || v.nombre_libre || 'Cliente';
    const [empNombre, empRnc, empTel, garantia] = await Promise.all([
      getConfig('empresa_nombre'), getConfig('empresa_rnc'),
      getConfig('empresa_telefono'), getConfig('garantia_texto'),
    ]);
    const saldo = v.total - (v.abono || 0);

    const fotosHtml = conFoto
      ? (vitems || []).filter((i: any) => i.foto_url).map((i: any) =>
          `<div style="margin:8px 0"><img src="${i.foto_url}" style="max-height:180px;max-width:100%;border-radius:8px;border:1px solid #eee" alt="${i.descripcion}"/><p style="font-size:10px;color:#888;margin-top:3px">${i.descripcion}</p></div>`
        ).join('') : '';

    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Venta ${v.numero_venta}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:40px;max-width:800px;margin:auto;color:#1a1a1a}.header{display:flex;justify-content:space-between;border-bottom:3px solid #185FA5;padding-bottom:20px;margin-bottom:24px}.brand img{width:64px;height:64px;object-fit:contain;border-radius:8px}.brand-info h1{color:#185FA5;font-size:15px;margin-bottom:2px}.brand-info p{font-size:11px;color:#666}.inv-info{text-align:right}.inv-info h2{color:#EF5709;font-size:24px}.inv-info p{font-size:12px;color:#666}.section{margin-bottom:18px}.section-title{font-size:11px;font-weight:700;color:#185FA5;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;border-bottom:1px solid #eee;padding-bottom:3px}table.items{width:100%;border-collapse:collapse}table.items th{background:#185FA5;color:#fff;padding:7px 10px;font-size:11px;text-align:left}table.items td{padding:7px 10px;font-size:12px;border-bottom:1px solid #eee}.tr{text-align:right}.totals{display:flex;justify-content:flex-end;margin-top:12px}.tt tr td{padding:3px 10px;font-size:12px}.tt .bold td{font-weight:700;font-size:15px;border-top:2px solid #185FA5;color:#185FA5}.saldo{color:${saldo > 0 ? '#dc2626' : '#16a34a'}}.warranty{margin-top:20px;padding:10px;background:#f8f8f8;border-radius:6px;font-size:11px;color:#666;border-left:3px solid #185FA5}.footer{margin-top:24px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px}</style></head><body>
    <div class="header"><div class="brand" style="display:flex;align-items:center;gap:12px"><img src="${window.location.origin}/icons/icon-128.png"/><div class="brand-info"><h1>${empNombre || 'Soluciones Decorativas José Luis'}</h1><p>Tapicería & Ebanistería</p><p>RNC: ${empRnc || ''}</p>${empTel ? `<p>Tel: ${empTel}</p>` : ''}</div></div><div class="inv-info"><h2>VENTA</h2><p>${v.numero_venta}</p><p>Fecha: ${formatDate(v.fecha)}</p><p>Método: ${v.metodo_pago}</p>${v.ncf ? `<p style='margin-top:4px;font-weight:600;color:#185FA5'>NCF: ${v.ncf}</p>` : ''}</div></div>
    <div class="section"><div class="section-title">Cliente</div><p style="font-size:13px;font-weight:600">${nombre}</p>${(cl?.telefono || '') ? `<p style="font-size:11px;color:#666">${cl.telefono}</p>` : ''}${(v.rnc_libre || cl?.rnc) ? `<p style="font-size:11px;color:#666">RNC: ${v.rnc_libre || cl?.rnc}</p>` : ''}</div>
    <div class="section"><div class="section-title">Artículos</div><table class="items"><thead><tr><th>Descripción</th><th class="tr">Cant.</th><th class="tr">P. Unit.</th><th class="tr">Total</th></tr></thead><tbody>${(vitems || []).map((i: any) => `<tr><td>${i.descripcion}</td><td class="tr">${i.cantidad}</td><td class="tr">${formatCurrency(i.precio_unitario)}</td><td class="tr">${formatCurrency(i.total)}</td></tr>`).join('')}</tbody></table></div>
    ${fotosHtml ? `<div class="section"><div class="section-title">Fotos</div>${fotosHtml}</div>` : ''}
    <div class="totals"><table class="tt"><tr><td>Subtotal</td><td class="tr">${formatCurrency(v.subtotal)}</td></tr><tr><td>ITBIS 18%</td><td class="tr">${formatCurrency(v.itbis)}</td></tr><tr><td>Total</td><td class="tr">${formatCurrency(v.total)}</td></tr><tr><td>Abono</td><td class="tr">${formatCurrency(v.abono||0)}</td></tr><tr class="bold"><td>Saldo</td><td class="tr saldo">${formatCurrency(saldo)}</td></tr></table></div>
    ${garantia ? `<div class="warranty"><strong>Garantía:</strong> ${garantia}</div>` : ''}
    ${v.notas ? `<div class="warranty" style="margin-top:8px"><strong>Notas:</strong> ${v.notas}</div>` : ''}
    <div class="footer">${empNombre || 'Soluciones Decorativas José Luis'} — Tapicería & Ebanistería</div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 600); }
  };

  const nombreCliente = (v: any) => {
    const cl = clientes.find((c: any) => c.id === v.id_cliente);
    return cl?.nombre_completo || v.nombre_libre || '—';
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Ventas</h1>
        {isOwner && <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" />Nueva Venta</Button>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar venta o cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Resumen rápido */}
      {ventas.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Total ventas</p>
            <p className="text-lg font-bold text-primary">{ventas.length}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center">
            <p className="text-xs text-muted-foreground">Ingresos</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(ventas.reduce((s, v) => s + (v.total || 0), 0))}</p>
          </div>
          <div className="rounded-xl border bg-card p-3 text-center col-span-2 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Por cobrar</p>
            <p className="text-lg font-bold text-destructive">{formatCurrency(ventas.reduce((s, v) => s + Math.max(0, (v.total||0) - (v.abono||0)), 0))}</p>
          </div>
        </div>
      )}

      <div className="border rounded-lg overflow-x-auto bg-card">
        <Table>
          <TableHeader><TableRow>
            <TableHead>N°</TableHead>
            <TableHead>Cliente</TableHead>
            <TableHead className="hidden sm:table-cell">Fecha</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead className="text-right hidden md:table-cell">Saldo</TableHead>
            <TableHead className="w-[100px]">Acciones</TableHead>
          </TableRow></TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin ventas</TableCell></TableRow>}
            {filtered.map((v: any) => {
              const saldo = (v.total || 0) - (v.abono || 0);
              return (
                <TableRow key={v.id}>
                  <TableCell className="font-medium text-sm">{v.numero_venta}</TableCell>
                  <TableCell className="text-sm">{nombreCliente(v)}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{formatDate(v.fecha)}</TableCell>
                  <TableCell className="text-right font-medium">{formatCurrency(v.total)}</TableCell>
                  <TableCell className="hidden md:table-cell text-right">
                    <span className={saldo > 0 ? 'text-destructive font-medium' : 'text-green-600'}>{saldo > 0 ? formatCurrency(saldo) : '✅ Saldado'}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => viewDetail(v)}><Eye className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => generateFactura(v, false)}><FileText className="h-4 w-4" /></Button>
                      {isOwner && <Button variant="ghost" size="icon" onClick={() => setDeleteId(v.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* ── FORM DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Venta</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <ClienteSelector
              clientes={clientes}
              value={form.id_cliente || ''}
              onChange={v => setForm({ ...form, id_cliente: v })}
              nombreLibre={form.nombre_libre || ''}
              rncLibre={form.rnc_libre || ''}
              onNombreLibre={v => setForm({ ...form, nombre_libre: v })}
              onRncLibre={v => setForm({ ...form, rnc_libre: v })}
            />

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Método de pago</Label>
                <Select value={form.metodo_pago} onValueChange={v => setForm({ ...form, metodo_pago: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{metodosPago.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Ítems */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Artículos</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border rounded-xl p-3 space-y-2 bg-secondary/20">
                    <div className="flex items-center gap-2">
                      {/* Selector catálogo o libre */}
                      <div className="flex-1">
                        <Select value={item.id_mueble || 'libre'} onValueChange={v => v === 'libre' ? updateItem(idx, 'id_mueble', '') : seleccionarMueble(idx, v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Del catálogo o artículo libre" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="libre">✏️ Artículo libre</SelectItem>
                            {muebles.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nombre} — {formatCurrency(m.precio)}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {items.length > 1 && <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => removeItem(idx)}><X className="h-3.5 w-3.5 text-destructive" /></Button>}
                    </div>
                    <Input placeholder="Descripción del artículo *" value={item.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)} className="h-8 text-sm" />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <Label className="text-xs">Cantidad</Label>
                        <Input type="number" min={1} value={item.cantidad === 0 ? '' : item.cantidad} onChange={e => updateItem(idx, 'cantidad', e.target.value === '' ? 0 : +e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Precio</Label>
                        <Input type="number" min={0} value={item.precio_unitario === 0 ? '' : item.precio_unitario} onChange={e => updateItem(idx, 'precio_unitario', e.target.value === '' ? 0 : +e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div>
                        <Label className="text-xs">Total</Label>
                        <p className="h-8 flex items-center text-sm font-semibold text-primary">{formatCurrency(item.cantidad * item.precio_unitario)}</p>
                      </div>
                    </div>
                    {/* Foto del artículo */}
                    <div>
                      <input ref={el => fileRefs.current[idx] = el} type="file" accept="image/*" className="hidden"
                        onChange={e => { const f = e.target.files?.[0]; if (f) handleFotoItem(idx, f); }} />
                      {item.fotoPreview
                        ? <div className="relative inline-block">
                            <img src={item.fotoPreview} className="h-20 w-20 object-cover rounded-lg border" />
                            <button onClick={() => updateItem(idx, 'fotoPreview', '')}
                              className="absolute -top-1.5 -right-1.5 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">×</button>
                          </div>
                        : <Button variant="outline" size="sm" className="gap-1.5 text-xs border-dashed h-8"
                            onClick={() => fileRefs.current[idx]?.click()}>
                            <ImagePlus className="h-3.5 w-3.5" />Foto (opcional)
                          </Button>
                      }
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

            {/* ITBIS y NCF opcionales */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-3 rounded-lg border cursor-pointer select-none"
                onClick={() => setForm({ ...form, aplicar_itbis: !form.aplicar_itbis })}>
                <div className={`w-9 h-5 rounded-full transition-colors relative ${form.aplicar_itbis ? 'bg-primary' : 'bg-secondary'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.aplicar_itbis ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <div>
                  <p className="text-xs font-medium">ITBIS 18%</p>
                  <p className="text-xs text-muted-foreground">{form.aplicar_itbis ? formatCurrency(itbis) : 'No aplica'}</p>
                </div>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">NCF (opcional)</Label>
                <Input placeholder="Ej: B0100000001" value={form.ncf || ''} onChange={e => setForm({ ...form, ncf: e.target.value })} className="h-9" />
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Abono inicial (opcional)</Label>
              <Input type="number" min={0} placeholder="0.00" value={form.abono} onChange={e => setForm({ ...form, abono: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Guardar Venta'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL DIALOG ── */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Venta {detailDialog?.numero_venta}</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Cliente</span><p className="font-medium">{nombreCliente(detailDialog)}</p></div>
                <div><span className="text-xs text-muted-foreground">Fecha</span><p>{formatDate(detailDialog.fecha)}</p></div>
                <div><span className="text-xs text-muted-foreground">Método</span><p>{detailDialog.metodo_pago}</p></div>
                {detailDialog.ncf && <div className="col-span-2"><span className="text-xs text-muted-foreground">NCF</span><p className="font-mono font-medium">{detailDialog.ncf}</p></div>}
                <div><span className="text-xs text-muted-foreground">Total</span><p className="font-bold text-primary">{formatCurrency(detailDialog.total)}</p></div>
                <div><span className="text-xs text-muted-foreground">Abono</span><p className="text-green-600 font-medium">{formatCurrency(detailDialog.abono || 0)}</p></div>
                <div><span className="text-xs text-muted-foreground">Saldo</span>
                  <p className={`font-bold ${(detailDialog.total - detailDialog.abono) > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {(detailDialog.total - detailDialog.abono) > 0 ? formatCurrency(detailDialog.total - detailDialog.abono) : '✅ Saldado'}
                  </p>
                </div>
              </div>

              {/* Artículos con fotos */}
              <div className="space-y-2">
                {detailDialog.items?.map((i: any) => (
                  <div key={i.id} className="flex gap-3 p-2.5 rounded-lg border bg-secondary/20">
                    {i.foto_url && <img src={i.foto_url} alt={i.descripcion} className="w-16 h-16 object-cover rounded-lg border shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{i.descripcion}</p>
                      <p className="text-xs text-muted-foreground">{i.cantidad} × {formatCurrency(i.precio_unitario)}</p>
                      <p className="text-sm font-semibold text-primary">{formatCurrency(i.total)}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Botones factura */}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => generateFactura(detailDialog, false)}>
                  <FileText className="h-4 w-4" />Factura sin foto
                </Button>
                {detailDialog.items?.some((i: any) => i.foto_url) && (
                  <Button className="flex-1 gap-2" onClick={() => generateFactura(detailDialog, true)}>
                    <ImagePlus className="h-4 w-4" />Factura con foto
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar venta?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
