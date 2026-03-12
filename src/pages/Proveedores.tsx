import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, ShoppingCart } from 'lucide-react';
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
import { fetchAll, insertRow, updateRow, deleteRow } from '@/lib/supabase-service';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/utils/helpers';

const emptyProv = { nombre: '', contacto: '', telefono: '', email: '', direccion: '', rnc: '', productos: '', notas: '' };
const emptyCompra = { id_proveedor: '', fecha: new Date().toISOString().slice(0, 10), numero_factura: '', subtotal: 0, itbis: 0, total: 0, notas: '' };

export default function ProveedoresPage() {
  const { isOwner } = useAuth();
  const { toast } = useToast();
  const [proveedores, setProveedores] = useState<any[]>([]);
  const [compras, setCompras] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [provDialog, setProvDialog] = useState(false);
  const [compraDialog, setCompraDialog] = useState(false);
  const [provForm, setProvForm] = useState<any>(emptyProv);
  const [compraForm, setCompraForm] = useState<any>(emptyCompra);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [compraItems, setCompraItems] = useState<any[]>([{ descripcion: '', cantidad: 1, precio_unitario: 0 }]);
  const [inventario, setInventario] = useState<any[]>([]);

  const load = async () => {
    const [p, c, inv] = await Promise.all([
      fetchAll('proveedores', 'nombre', true),
      fetchAll('compras'),
      fetchAll('inventario', 'nombre_item', true)
    ]);
    setProveedores(p);
    setCompras(c);
    setInventario(inv);
  };
  useEffect(() => { load(); }, []);

  const filteredProv = proveedores.filter((p: any) => p.nombre.toLowerCase().includes(search.toLowerCase()));

  const saveProv = async () => {
    if (!provForm.nombre) { toast({ title: 'Nombre requerido', variant: 'destructive' }); return; }
    if (provForm.id) await updateRow('proveedores', provForm.id, provForm);
    else await insertRow('proveedores', provForm);
    load(); setProvDialog(false); setProvForm(emptyProv);
    toast({ title: 'Proveedor guardado' });
  };

  const deleteProv = async () => {
    if (deleteId) { await deleteRow('proveedores', deleteId); load(); setDeleteId(null); toast({ title: 'Proveedor eliminado' }); }
  };

  const compraSubtotal = compraItems.reduce((s: number, i: any) => s + (i.cantidad * i.precio_unitario), 0);
  const compraItbis = compraSubtotal * 0.18;
  const compraTotal = compraSubtotal + compraItbis;

  const saveCompra = async () => {
    if (!compraForm.id_proveedor) { toast({ title: 'Selecciona un proveedor', variant: 'destructive' }); return; }
    const data = { ...compraForm, subtotal: compraSubtotal, itbis: compraItbis, total: compraTotal };
    const compra: any = await insertRow('compras', data);
    for (const item of compraItems.filter(i => i.descripcion)) {
      await supabase.from('compra_items').insert({ id_compra: compra.id, ...item });
    }
    load(); setCompraDialog(false); setCompraForm(emptyCompra);
    setCompraItems([{ descripcion: '', cantidad: 1, precio_unitario: 0 }]);
    toast({ title: 'Compra registrada' });
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Proveedores & Compras</h1>
        {isOwner && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => { setCompraForm(emptyCompra); setCompraItems([{ descripcion: '', cantidad: 1, precio_unitario: 0 }]); setCompraDialog(true); }}>
              <ShoppingCart className="h-4 w-4 mr-1" />Nueva Compra
            </Button>
            <Button onClick={() => { setProvForm(emptyProv); setProvDialog(true); }}><Plus className="h-4 w-4 mr-1" />Nuevo Proveedor</Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="proveedores">
        <TabsList><TabsTrigger value="proveedores">Proveedores</TabsTrigger><TabsTrigger value="compras">Compras ({compras.length})</TabsTrigger></TabsList>

        <TabsContent value="proveedores" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar proveedor..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead className="hidden sm:table-cell">Contacto</TableHead><TableHead>Teléfono</TableHead><TableHead className="hidden md:table-cell">Productos</TableHead><TableHead className="w-[80px]">Acciones</TableHead></TableRow></TableHeader>
              <TableBody>
                {filteredProv.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin proveedores</TableCell></TableRow>}
                {filteredProv.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nombre}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{p.contacto || '—'}</TableCell>
                    <TableCell>{p.telefono || '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground max-w-[200px] truncate">{p.productos || '—'}</TableCell>
                    <TableCell>
                      {isOwner && (
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => { setProvForm(p); setProvDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="compras" className="mt-4">
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table>
              <TableHeader><TableRow><TableHead>Proveedor</TableHead><TableHead># Factura</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Fecha</TableHead></TableRow></TableHeader>
              <TableBody>
                {compras.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Sin compras</TableCell></TableRow>}
                {compras.map((c: any) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{proveedores.find((p: any) => p.id === c.id_proveedor)?.nombre || '—'}</TableCell>
                    <TableCell className="text-muted-foreground">{c.numero_factura || '—'}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(c.total)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(c.fecha)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* Proveedor dialog */}
      <Dialog open={provDialog} onOpenChange={setProvDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{provForm.id ? 'Editar' : 'Nuevo'} Proveedor</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Nombre *</Label><Input value={provForm.nombre} onChange={e => setProvForm({ ...provForm, nombre: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label className="text-xs">Contacto</Label><Input value={provForm.contacto} onChange={e => setProvForm({ ...provForm, contacto: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Teléfono</Label><Input value={provForm.telefono} onChange={e => setProvForm({ ...provForm, telefono: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label className="text-xs">Email</Label><Input value={provForm.email} onChange={e => setProvForm({ ...provForm, email: e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">RNC</Label><Input value={provForm.rnc} onChange={e => setProvForm({ ...provForm, rnc: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Productos que vende</Label><Input value={provForm.productos} onChange={e => setProvForm({ ...provForm, productos: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Notas</Label><Textarea value={provForm.notas} onChange={e => setProvForm({ ...provForm, notas: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setProvDialog(false)}>Cancelar</Button><Button onClick={saveProv}>Guardar</Button></div>
        </DialogContent>
      </Dialog>

      {/* Compra dialog */}
      <Dialog open={compraDialog} onOpenChange={setCompraDialog}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Nueva Compra</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Proveedor *</Label>
                <Select value={compraForm.id_proveedor} onValueChange={v => setCompraForm({ ...compraForm, id_proveedor: v })}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                  <SelectContent>{proveedores.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs"># Factura</Label><Input value={compraForm.numero_factura} onChange={e => setCompraForm({ ...compraForm, numero_factura: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Fecha</Label><Input type="date" value={compraForm.fecha} onChange={e => setCompraForm({ ...compraForm, fecha: e.target.value })} /></div>
            <div>
              <div className="flex items-center justify-between mb-2"><Label className="text-xs font-semibold">Ítems</Label><Button size="sm" variant="outline" onClick={() => setCompraItems([...compraItems, { descripcion: '', cantidad: 1, precio_unitario: 0 }])}><Plus className="h-3 w-3 mr-1" />Agregar</Button></div>
              {compraItems.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-end mb-2">
                  <div className="col-span-5"><Input placeholder="Descripción" value={item.descripcion} onChange={e => { const u = [...compraItems]; u[idx].descripcion = e.target.value; setCompraItems(u); }} /></div>
                  <div className="col-span-2"><Input type="number" value={item.cantidad} onChange={e => { const u = [...compraItems]; u[idx].cantidad = +e.target.value; setCompraItems(u); }} /></div>
                  <div className="col-span-3"><Input type="number" value={item.precio_unitario} onChange={e => { const u = [...compraItems]; u[idx].precio_unitario = +e.target.value; setCompraItems(u); }} /></div>
                  <div className="col-span-2 text-right text-sm font-medium">{formatCurrency(item.cantidad * item.precio_unitario)}</div>
                </div>
              ))}
              <div className="mt-3 text-right space-y-1">
                <p className="text-sm">Subtotal: {formatCurrency(compraSubtotal)}</p>
                <p className="text-sm">ITBIS 18%: {formatCurrency(compraItbis)}</p>
                <p className="font-bold text-primary">Total: {formatCurrency(compraTotal)}</p>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setCompraDialog(false)}>Cancelar</Button><Button onClick={saveCompra}>Registrar</Button></div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar proveedor?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteProv}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
