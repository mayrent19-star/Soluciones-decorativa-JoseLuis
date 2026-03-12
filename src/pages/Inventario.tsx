import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchAll, insertRow, updateRow, deleteRow } from '@/lib/supabase-service';
import { formatCurrency, formatDate } from '@/utils/helpers';

const categorias = ['Tela', 'Madera', 'Espuma', 'Pegamento', 'Herramienta', 'Acabado', 'Otro'];
const unidades = ['unidad', 'yarda', 'metro', 'pie', 'galón', 'plancha', 'caja', 'rollo'];
const emptyItem = { nombre_item: '', categoria: 'Tela', unidad: 'unidad', stock_actual: 0, stock_minimo: 0, costo_unitario: 0, ubicacion: '' };
const emptyMov = { id_item: '', tipo_movimiento: 'Entrada', cantidad: 0, motivo: '', fecha: new Date().toISOString().slice(0, 10), id_trabajo: '' };

export default function Inventario() {
  const { isOwner } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [movs, setMovs] = useState<any[]>([]);
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(emptyItem);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [movDialog, setMovDialog] = useState(false);
  const [movForm, setMovForm] = useState<any>(emptyMov);
  const { toast } = useToast();

  const reload = async () => {
    const [inv, m, t] = await Promise.all([fetchAll('inventario', 'nombre_item', true), fetchAll('inventario_movimientos'), fetchAll('trabajos')]);
    setItems(inv); setMovs(m); setTrabajos(t);
  };
  useEffect(() => { reload(); }, []);

  const filtered = items.filter((i: any) => i.nombre_item?.toLowerCase().includes(search.toLowerCase()) || i.categoria?.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!form.nombre_item) { toast({ title: 'Nombre requerido', variant: 'destructive' }); return; }
    const data = { ...form }; delete data.id; delete data.created_at; delete data.updated_at;
    if (form.id) await updateRow('inventario', form.id, data);
    else await insertRow('inventario', data);
    reload(); setDialogOpen(false); setForm(emptyItem);
    toast({ title: form.id ? 'Artículo actualizado' : 'Artículo creado' });
  };

  const handleDelete = async () => { if (deleteId) { await deleteRow('inventario', deleteId); reload(); setDeleteId(null); toast({ title: 'Artículo eliminado' }); } };

  const saveMov = async () => {
    if (!movForm.id_item || !movForm.cantidad || movForm.cantidad <= 0) { toast({ title: 'Completa los campos', variant: 'destructive' }); return; }
    const item = items.find((i: any) => i.id === movForm.id_item);
    if (!item) return;
    if (movForm.tipo_movimiento === 'Salida' && item.stock_actual < movForm.cantidad) {
      toast({ title: `Stock insuficiente. Disponible: ${item.stock_actual}`, variant: 'destructive' }); return;
    }
    const newStock = movForm.tipo_movimiento === 'Entrada' ? item.stock_actual + movForm.cantidad : item.stock_actual - movForm.cantidad;
    await updateRow('inventario', item.id, { stock_actual: newStock });
    await insertRow('inventario_movimientos', movForm);
    reload(); setMovDialog(false); setMovForm(emptyMov);
    toast({ title: `${movForm.tipo_movimiento} registrada` });
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Inventario</h1>
        {isOwner && <div className="flex gap-2 flex-wrap">
          <Button variant="outline" onClick={() => { setMovForm({ ...emptyMov, tipo_movimiento: 'Entrada' }); setMovDialog(true); }}><ArrowDownToLine className="h-4 w-4 mr-1" />Entrada</Button>
          <Button variant="outline" onClick={() => { setMovForm({ ...emptyMov, tipo_movimiento: 'Salida' }); setMovDialog(true); }}><ArrowUpFromLine className="h-4 w-4 mr-1" />Salida</Button>
          <Button onClick={() => { setForm(emptyItem); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
        </div>}
      </div>
      <Tabs defaultValue="articulos">
        <TabsList><TabsTrigger value="articulos">Artículos</TabsTrigger><TabsTrigger value="movimientos">Movimientos ({movs.length})</TabsTrigger></TabsList>
        <TabsContent value="articulos" className="mt-4 space-y-4">
          <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table><TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead className="hidden sm:table-cell">Categoría</TableHead><TableHead className="text-right">Stock</TableHead><TableHead className="hidden sm:table-cell text-right">Mín</TableHead><TableHead className="hidden md:table-cell text-right">Costo</TableHead>{isOwner && <TableHead className="w-[100px]">Acciones</TableHead>}</TableRow></TableHeader>
            <TableBody>
              {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin artículos</TableCell></TableRow>}
              {filtered.map((i: any) => (
                <TableRow key={i.id}><TableCell className="font-medium">{i.nombre_item}</TableCell><TableCell className="hidden sm:table-cell text-muted-foreground">{i.categoria}</TableCell>
                <TableCell className="text-right"><Badge variant={i.stock_actual <= i.stock_minimo ? 'destructive' : 'secondary'}>{i.stock_actual} {i.unidad}</Badge></TableCell>
                <TableCell className="hidden sm:table-cell text-right text-muted-foreground">{i.stock_minimo}</TableCell>
                <TableCell className="hidden md:table-cell text-right">{i.costo_unitario ? formatCurrency(i.costo_unitario) : '—'}</TableCell>
                {isOwner && <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setForm({ ...i }); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>}
                </TableRow>
              ))}
            </TableBody></Table>
          </div>
        </TabsContent>
        <TabsContent value="movimientos" className="mt-4">
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table><TableHeader><TableRow><TableHead>Artículo</TableHead><TableHead>Tipo</TableHead><TableHead className="text-right">Cant.</TableHead><TableHead className="hidden sm:table-cell">Motivo</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
            <TableBody>{movs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>}
            {movs.map((m: any) => (<TableRow key={m.id}><TableCell className="font-medium">{items.find((i: any) => i.id === m.id_item)?.nombre_item || '—'}</TableCell><TableCell><Badge variant={m.tipo_movimiento === 'Entrada' ? 'default' : 'destructive'}>{m.tipo_movimiento}</Badge></TableCell><TableCell className="text-right">{m.cantidad}</TableCell><TableCell className="hidden sm:table-cell text-muted-foreground">{m.motivo}</TableCell><TableCell className="text-xs text-muted-foreground">{formatDate(m.fecha)}</TableCell></TableRow>))}
            </TableBody></Table>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Nuevo'} Artículo</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Nombre *</Label><Input value={form.nombre_item || ''} onChange={e => setForm({ ...form, nombre_item: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label className="text-xs">Categoría</Label><Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-1.5"><Label className="text-xs">Unidad</Label><Select value={form.unidad} onValueChange={v => setForm({ ...form, unidad: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent></Select></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label className="text-xs">Stock Actual</Label><Input type="number" value={form.stock_actual || 0} onChange={e => setForm({ ...form, stock_actual: +e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Stock Mínimo</Label><Input type="number" value={form.stock_minimo || 0} onChange={e => setForm({ ...form, stock_minimo: +e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label className="text-xs">Costo Unit.</Label><Input type="number" value={form.costo_unitario || ''} onChange={e => setForm({ ...form, costo_unitario: +e.target.value || 0 })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Ubicación</Label><Input value={form.ubicacion || ''} onChange={e => setForm({ ...form, ubicacion: e.target.value })} /></div>
          </div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></div></DialogContent>
      </Dialog>

      <Dialog open={movDialog} onOpenChange={setMovDialog}>
        <DialogContent className="max-w-md"><DialogHeader><DialogTitle>{movForm.tipo_movimiento === 'Entrada' ? '📥 Entrada' : '📤 Salida'}</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Artículo *</Label><Select value={movForm.id_item} onValueChange={v => setMovForm({ ...movForm, id_item: v })}><SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger><SelectContent>{items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nombre_item} (stock: {i.stock_actual})</SelectItem>)}</SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label className="text-xs">Cantidad *</Label><Input type="number" value={movForm.cantidad || ''} onChange={e => setMovForm({ ...movForm, cantidad: +e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Fecha</Label><Input type="date" value={movForm.fecha} onChange={e => setMovForm({ ...movForm, fecha: e.target.value })} /></div>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Motivo</Label><Input value={movForm.motivo || ''} onChange={e => setMovForm({ ...movForm, motivo: e.target.value })} /></div>
          <div className="grid gap-1.5"><Label className="text-xs">Trabajo (opcional)</Label><Select value={movForm.id_trabajo || 'ninguno'} onValueChange={v => setMovForm({ ...movForm, id_trabajo: v === 'ninguno' ? null : v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{trabajos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.descripcion_trabajo}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMovDialog(false)}>Cancelar</Button><Button onClick={saveMov}>Registrar</Button></div></DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
