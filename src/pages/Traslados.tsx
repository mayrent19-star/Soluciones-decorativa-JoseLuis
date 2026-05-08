import { useState, useEffect } from 'react';
import { Plus, Search, Eye, Trash2, Truck, ArrowRight, Package, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { insertRow, deleteRow, fetchAll } from '@/lib/supabase-service';
import { formatDate } from '@/utils/helpers';

const db = supabase as any;

const locales = ['Taller', 'Local Mercedes', 'Local Calle 8', 'Almacén Casa'];
const unidades = ['unidad', 'yarda', 'metro', 'pie', 'plancha', 'caja', 'rollo', 'libra', 'lata', 'galón'];
const estadoColor: Record<string, string> = {
  'En camino':  'bg-blue-100 text-blue-800 dark:bg-blue-900/30',
  'Recibido':   'bg-green-100 text-green-800 dark:bg-green-900/30',
};

const emptyItem = { id_item: '', descripcion: '', cantidad: 1, unidad: 'unidad' };

export default function Traslados() {
  const { isOwner } = useAuth();
  const { toast } = useToast();

  const [traslados,  setTraslados]  = useState<any[]>([]);
  const [inventario, setInventario] = useState<any[]>([]);
  const [trabajos,   setTrabajos]   = useState<any[]>([]);
  const [search,     setSearch]     = useState('');
  const [invSearch,  setInvSearch]  = useState('');
  const [trabSearch, setTrabSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailDialog, setDetailDialog] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<any>({
    tipo: 'materiales', origen: 'Taller', destino: 'Local Mercedes',
    responsable: '', id_trabajo: '', notas: '',
    fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' }),
    descuenta_stock: false,
  });
  const [items, setItems] = useState<any[]>([{ ...emptyItem }]);

  const reload = async () => {
    const { data: t } = await db.from('traslados').select('*, trabajos(descripcion_trabajo)').order('created_at', { ascending: false });
    setTraslados(t || []);
    const inv = await fetchAll('inventario', 'nombre_item', true);
    setInventario(inv);
    const trabs = await fetchAll('trabajos', 'descripcion_trabajo', true);
    setTrabajos(trabs.filter((t: any) => !['Entregado', 'Cancelado'].includes(t.estado)));
  };

  useEffect(() => { reload(); }, []);

  const filtered = traslados.filter(t =>
    t.numero?.toLowerCase().includes(search.toLowerCase()) ||
    t.origen?.toLowerCase().includes(search.toLowerCase()) ||
    t.destino?.toLowerCase().includes(search.toLowerCase()) ||
    t.responsable?.toLowerCase().includes(search.toLowerCase())
  );

  const addItem = () => setItems([...items, { ...emptyItem }]);
  const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));
  const updateItem = (idx: number, key: string, val: any) =>
    setItems(items.map((item, i) => i === idx ? { ...item, [key]: val } : item));

  const seleccionarInventario = (idx: number, id: string) => {
    const inv = inventario.find((i: any) => i.id === id);
    if (inv) setItems(prev => prev.map((item, i) => i === idx ? {
      ...item, id_item: id,
      descripcion: inv.nombre_item,
      unidad: inv.unidad || 'unidad',
    } : item));
  };

  const handleSave = async () => {
    if (!form.origen || !form.destino) { toast({ title: 'Selecciona origen y destino', variant: 'destructive' }); return; }
    if (form.origen === form.destino) { toast({ title: 'Origen y destino no pueden ser iguales', variant: 'destructive' }); return; }
    if (!items.some(i => i.descripcion)) { toast({ title: 'Agrega al menos un ítem', variant: 'destructive' }); return; }
    setSaving(true);
    try {
      const traslado: any = await insertRow('traslados', {
        tipo:        form.tipo,
        origen:      form.origen,
        destino:     form.destino,
        responsable: form.responsable || null,
        id_trabajo:  form.id_trabajo || null,
        notas:       form.notas || null,
        fecha:       form.fecha,
        estado:      'En camino',
      });

      for (const item of items.filter(i => i.descripcion)) {
        await db.from('traslado_items').insert({
          id_traslado:  traslado.id,
          id_item:      item.id_item || null,
          descripcion:  item.descripcion,
          cantidad:     Number(item.cantidad),
          unidad:       item.unidad,
        });
        // Solo descuenta si el usuario marcó que se consumió (no solo se movió)
        if (item.id_item && form.tipo === 'materiales' && form.descuenta_stock) {
          const { data: invFresh } = await db.from('inventario').select('stock_actual, unidad').eq('id', item.id_item).single();
          if (invFresh) {
            const stockAntes = invFresh.stock_actual || 0;
            const stockDespues = Math.max(0, stockAntes - Number(item.cantidad));
            await db.from('inventario').update({ stock_actual: stockDespues }).eq('id', item.id_item);
            await db.from('inventario_movimientos').insert({
              id_item:         item.id_item,
              tipo_movimiento: 'Salida',
              cantidad:        Number(item.cantidad),
              motivo:          `Traslado ${form.origen} → ${form.destino}`,
              fecha:           form.fecha,
              stock_antes:     stockAntes,
              stock_despues:   stockDespues,
            });
          }
        }
      }

      // Si es pieza y tiene trabajo vinculado, actualizar local del trabajo
      if (form.tipo === 'pieza' && form.id_trabajo) {
        await db.from('trabajos').update({ local_trabajo: form.destino }).eq('id', form.id_trabajo);
      }

      reload(); setDialogOpen(false);
      setForm({ tipo: 'materiales', origen: 'Taller', destino: 'Local Mercedes', responsable: '', id_trabajo: '', notas: '', fecha: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Santo_Domingo' }), descuenta_stock: false });
      setItems([{ ...emptyItem }]);
      const msg = form.tipo === 'pieza'
        ? '✅ Pieza movida — ubicación actualizada en el trabajo'
        : '✅ Traslado de materiales registrado';
      toast({ title: msg });
    } catch (e: any) {
      toast({ title: 'Error guardando', description: e?.message, variant: 'destructive' });
    } finally { setSaving(false); }
  };

  const cambiarEstado = async (id: string, estado: string) => {
    await db.from('traslados').update({ estado }).eq('id', id);
    reload(); toast({ title: `✅ Marcado como "${estado}"` });
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteRow('traslados', deleteId); reload(); setDeleteId(null); toast({ title: 'Traslado eliminado' }); }
  };

  const viewDetail = async (t: any) => {
    const { data: itms } = await db.from('traslado_items').select('*').eq('id_traslado', t.id);
    setDetailDialog({ ...t, items: itms || [] });
  };

  const imprimirConduce = (t: any, itms: any[]) => {
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Conduce ${t.numero}</title>
    <style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',sans-serif;padding:30px;max-width:700px;margin:auto;color:#1a1a1a}
    .header{border-bottom:3px solid #185FA5;padding-bottom:14px;margin-bottom:18px;display:flex;justify-content:space-between;align-items:flex-start}
    .brand h1{color:#185FA5;font-size:16px;font-weight:700}.brand p{font-size:11px;color:#666}
    .num{text-align:right}.num h2{color:#185FA5;font-size:22px;font-weight:700}.num p{font-size:11px;color:#666}
    .info{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:18px;padding:12px;background:#f8f8f8;border-radius:6px}
    .field label{font-size:10px;color:#888;display:block}.field p{font-size:13px;font-weight:600}
    .flecha{font-size:18px;text-align:center;color:#185FA5}
    table{width:100%;border-collapse:collapse;margin:12px 0}th{background:#185FA5;color:#fff;padding:8px 10px;font-size:11px;text-align:left}
    td{padding:8px 10px;border-bottom:1px solid #eee;font-size:12px}.tr{text-align:right}
    .espacio{color:#ccc}.notas{margin:14px 0;padding:10px;background:#f8f8f8;border-radius:6px;font-size:11px}
    .firmas{display:grid;grid-template-columns:1fr 1fr;gap:40px;margin-top:40px}
    .firma-box{border-top:1px solid #333;padding-top:8px;text-align:center;font-size:10px;color:#666}
    .footer{margin-top:24px;text-align:center;font-size:10px;color:#999;border-top:1px solid #eee;padding-top:10px}</style></head><body>
    <div class="header">
      <div class="brand"><h1>Soluciones Decorativas José Luis</h1><p>Tapicería &amp; Ebanistería</p></div>
      <div class="num"><h2>CONDUCE</h2><p>${t.numero}</p><p>${formatDate(t.fecha)}</p></div>
    </div>
    <div class="info">
      <div class="field"><label>Tipo</label><p>${t.tipo === 'materiales' ? '📦 Materiales' : '🪑 Pieza/Trabajo'}</p></div>
      <div class="field"><label>Responsable</label><p>${t.responsable || '—'}</p></div>
      <div class="field"><label>Origen</label><p>${t.origen}</p></div>
      <div class="flecha">→</div>
      <div class="field"><label>Destino</label><p>${t.destino}</p></div>
      <div class="field"><label>Trabajo vinculado</label><p>${t.trabajos?.descripcion_trabajo || '—'}</p></div>
    </div>
    <table>
      <thead><tr><th>Descripción</th><th class="tr">Cantidad</th><th>Unidad</th><th class="tr">Recibido</th></tr></thead>
      <tbody>
        ${itms.map(i => `<tr><td>${i.descripcion}</td><td class="tr">${i.cantidad}</td><td>${i.unidad}</td><td class="tr espacio">_______</td></tr>`).join('')}
      </tbody>
    </table>
    ${t.notas ? `<div class="notas"><strong>Notas:</strong> ${t.notas}</div>` : ''}
    <div style="margin-top:14px;padding:10px;border:1px solid #ddd;border-radius:6px">
      <p style="font-size:10px;color:#888;margin-bottom:6px">Observaciones:</p>
      <div style="min-height:35px"></div>
    </div>
    <div class="firmas">
      <div class="firma-box">Entregado por</div>
      <div class="firma-box">Recibido por</div>
    </div>
    <div class="footer">Soluciones Decorativas José Luis — Tapicería &amp; Ebanistería</div>
    </body></html>`;
    const w = window.open('', '_blank', 'width=800,height=600');
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Traslados</h1>
        </div>
        {isOwner && <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" />Nuevo Traslado</Button>}
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-3">
        {['En camino','Recibido'].map(est => (
          <Card key={est}>
            <CardContent className="p-3 text-center">
              <p className="text-xl font-bold">{traslados.filter(t => t.estado === est).length}</p>
              <p className="text-xs text-muted-foreground">{est}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar conduce, origen, destino..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      {/* Lista */}
      <div className="space-y-2">
        {filtered.length === 0 && (
          <div className="text-center py-12 border rounded-xl bg-card text-muted-foreground">
            <Truck className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Sin traslados registrados</p>
          </div>
        )}
        {filtered.map((t: any) => (
          <div key={t.id} className="border rounded-xl bg-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-bold text-primary">{t.numero}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor[t.estado]}`}>{t.estado}</span>
                  <span className="text-xs text-muted-foreground">{t.tipo === 'materiales' ? '📦 Materiales' : '🪑 Pieza'}</span>
                </div>
                <div className="flex items-center gap-2 mt-1 text-sm">
                  <span className="font-medium">{t.origen}</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                  <span className="font-medium">{t.destino}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDate(t.fecha)}{t.responsable ? ` · ${t.responsable}` : ''}{t.trabajos ? ` · ${t.trabajos.descripcion_trabajo}` : ''}
                </p>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button variant="ghost" size="icon" onClick={() => viewDetail(t)}><Eye className="h-4 w-4" /></Button>
                {isOwner && <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>}
              </div>
            </div>
            {/* Botón marcar recibido */}
            {isOwner && t.estado === 'En camino' && (
              <div className="flex gap-2 mt-3 pt-3 border-t">
                <Button size="sm" className="gap-1.5 text-xs bg-green-600 hover:bg-green-700" onClick={() => cambiarEstado(t.id, 'Recibido')}>
                  <CheckCircle className="h-3 w-3" />Marcar recibido
                </Button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ── FORM DIALOG ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nuevo Traslado / Conduce</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            {/* Tipo */}
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setForm({...form, tipo: 'materiales'})}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${form.tipo === 'materiales' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'}`}>
                📦 Traslado de materiales
              </button>
              <button onClick={() => setForm({...form, tipo: 'pieza'})}
                className={`p-3 rounded-lg border text-sm font-medium transition-colors ${form.tipo === 'pieza' ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-secondary'}`}>
                🪑 Traslado de pieza/trabajo
              </button>
            </div>

            {/* Toggle solo para materiales */}
            {form.tipo === 'materiales' && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-muted-foreground">Que paso con estos materiales?</p>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setForm({...form, descuenta_stock: false})}
                    className={`p-3 rounded-lg border text-xs font-medium transition-colors text-left ${!form.descuenta_stock ? 'border-blue-400 bg-blue-50 dark:bg-blue-950/20 text-blue-700' : 'border-border hover:bg-secondary'}`}>
                    Movido entre almacenes
                    <p className="font-normal mt-0.5 text-muted-foreground">No descuenta del stock</p>
                  </button>
                  <button type="button" onClick={() => setForm({...form, descuenta_stock: true})}
                    className={`p-3 rounded-lg border text-xs font-medium transition-colors text-left ${form.descuenta_stock ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/20 text-amber-700' : 'border-border hover:bg-secondary'}`}>
                    Consumido / Entregado
                    <p className="font-normal mt-0.5 text-muted-foreground">Descuenta del stock</p>
                  </button>
                </div>
              </div>
            )}
            {form.tipo === 'pieza' && (
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 text-sm text-blue-700">
                Solo cambia la ubicacion del trabajo, no toca el stock.
              </div>
            )}

            {/* Origen a Destino */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Origen *</Label>
                <Select value={form.origen} onValueChange={v => setForm({...form, origen: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{locales.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Destino *</Label>
                <Select value={form.destino} onValueChange={v => setForm({...form, destino: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{locales.filter(l => l !== form.origen).map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Fecha</Label>
                <Input type="date" value={form.fecha} onChange={e => setForm({...form, fecha: e.target.value})} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Responsable</Label>
                <Input placeholder="Quien lleva el traslado" value={form.responsable} onChange={e => setForm({...form, responsable: e.target.value})} />
              </div>
            </div>

            {/* Trabajo vinculado */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Trabajo vinculado (opcional)</Label>
              <Select value={form.id_trabajo || 'ninguno'} onValueChange={v => setForm({...form, id_trabajo: v === 'ninguno' ? '' : v})}>
                <SelectTrigger><SelectValue placeholder="Seleccionar trabajo..." /></SelectTrigger>
                <SelectContent>
                  <div className="px-2 py-1 sticky top-0 bg-popover z-10">
                    <Input placeholder="Buscar..." value={trabSearch} onChange={e => setTrabSearch(e.target.value)} className="h-7 text-xs" onClick={e => e.stopPropagation()} />
                  </div>
                  <SelectItem value="ninguno">Ninguno</SelectItem>
                  {trabajos.filter((t: any) => t.descripcion_trabajo?.toLowerCase().includes(trabSearch.toLowerCase()))
                    .map((t: any) => <SelectItem key={t.id} value={t.id}>{t.descripcion_trabajo}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Ítems */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold">Ítems del traslado *</Label>
                <Button size="sm" variant="outline" onClick={addItem}><Plus className="h-3 w-3 mr-1" />Agregar</Button>
              </div>
              <div className="space-y-3">
                {items.map((item, idx) => (
                  <div key={idx} className="border rounded-xl p-3 space-y-2 bg-secondary/20">
                    {/* Selector del inventario */}
                    {form.tipo === 'materiales' && (
                      <Select value={item.id_item || 'libre'} onValueChange={v => v === 'libre' ? updateItem(idx, 'id_item', '') : seleccionarInventario(idx, v)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Del inventario o libre..." /></SelectTrigger>
                        <SelectContent>
                          <div className="px-2 py-1 sticky top-0 bg-popover z-10">
                            <Input placeholder="Buscar..." value={invSearch} onChange={e => setInvSearch(e.target.value)} className="h-7 text-xs" onClick={e => e.stopPropagation()} />
                          </div>
                          <SelectItem value="libre">✏️ Artículo libre</SelectItem>
                          {inventario.filter((i: any) => i.nombre_item?.toLowerCase().includes(invSearch.toLowerCase()))
                            .map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nombre_item} · stock: {i.stock_actual ?? 0} {i.unidad}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    )}
                    <div className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-6">
                        <Input placeholder="Descripción *" value={item.descripcion} onChange={e => updateItem(idx, 'descripcion', e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-2">
                        <Input type="number" min={0.1} step={0.1} placeholder="Cant." value={item.cantidad === 0 ? '' : item.cantidad} onChange={e => updateItem(idx, 'cantidad', +e.target.value)} className="h-8 text-sm" />
                      </div>
                      <div className="col-span-3">
                        <Select value={item.unidad} onValueChange={v => updateItem(idx, 'unidad', v)}>
                          <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-1">
                        {items.length > 1 && <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem(idx)}><Trash2 className="h-3.5 w-3.5 text-destructive" /></Button>}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea value={form.notas} onChange={e => setForm({...form, notas: e.target.value})} rows={2} placeholder="Instrucciones especiales..." />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Crear conduce'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── DETAIL DIALOG ── */}
      <Dialog open={!!detailDialog} onOpenChange={() => setDetailDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Conduce {detailDialog?.numero}</DialogTitle></DialogHeader>
          {detailDialog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-xs text-muted-foreground">Tipo</span><p>{detailDialog.tipo === 'materiales' ? '📦 Materiales' : '🪑 Pieza'}</p></div>
                <div><span className="text-xs text-muted-foreground">Estado</span><p><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColor[detailDialog.estado]}`}>{detailDialog.estado}</span></p></div>
                <div><span className="text-xs text-muted-foreground">Origen</span><p className="font-medium">{detailDialog.origen}</p></div>
                <div><span className="text-xs text-muted-foreground">Destino</span><p className="font-medium">{detailDialog.destino}</p></div>
                <div><span className="text-xs text-muted-foreground">Fecha</span><p>{formatDate(detailDialog.fecha)}</p></div>
                <div><span className="text-xs text-muted-foreground">Responsable</span><p>{detailDialog.responsable || '—'}</p></div>
                {detailDialog.trabajos && <div className="col-span-2"><span className="text-xs text-muted-foreground">Trabajo</span><p>{detailDialog.trabajos.descripcion_trabajo}</p></div>}
              </div>

              <Table>
                <TableHeader><TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="text-right">Cantidad</TableHead>
                  <TableHead>Unidad</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {detailDialog.items?.map((i: any) => (
                    <TableRow key={i.id}>
                      <TableCell>{i.descripcion}</TableCell>
                      <TableCell className="text-right">{i.cantidad}</TableCell>
                      <TableCell>{i.unidad}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {detailDialog.notas && <p className="text-sm text-muted-foreground border-l-2 border-primary pl-3">{detailDialog.notas}</p>}

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 gap-2" onClick={() => imprimirConduce(detailDialog, detailDialog.items || [])}>
                  🖨️ Imprimir conduce
                </Button>
                {isOwner && detailDialog.estado !== 'Recibido' && (
                  <Button className="flex-1 gap-2 bg-green-600 hover:bg-green-700" onClick={() => { cambiarEstado(detailDialog.id, 'Recibido'); setDetailDialog(null); }}>
                    <CheckCircle className="h-4 w-4" />Marcar recibido
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar traslado?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}