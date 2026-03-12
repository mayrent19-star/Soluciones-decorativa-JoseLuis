import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, MessageCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { formatDate, formatCurrency } from '@/utils/helpers';

const db = supabase as any;
const empty = { nombre_completo: '', telefono: '', direccion: '', empresa: '', email: '', rnc: '', notas: '' };

export default function Clientes() {
  const { isOwner } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [verDialog, setVerDialog] = useState(false);
  const [clienteVer, setClienteVer] = useState<any>(null);
  const [form, setForm] = useState<any>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const { toast } = useToast();

  const reload = async () => {
    const [{ data: c }, { data: t }] = await Promise.all([
      db.from('clientes').select('*').order('nombre_completo'),
      db.from('trabajos').select('*'),
    ]);
    setItems(c || []);
    setTrabajos(t || []);
  };
  useEffect(() => { reload(); }, []);

  const filtered = items.filter((i: any) =>
    i.nombre_completo?.toLowerCase().includes(search.toLowerCase()) ||
    i.telefono?.includes(search) ||
    (i.empresa || '').toLowerCase().includes(search.toLowerCase())
  );

  const handleSave = async () => {
    if (!form.nombre_completo || !form.telefono) { toast({ title: 'Completa los campos requeridos', variant: 'destructive' }); return; }
    if (form.id) await db.from('clientes').update(form).eq('id', form.id);
    else await db.from('clientes').insert(form);
    reload(); setDialogOpen(false); setForm(empty);
    toast({ title: form.id ? '✅ Cliente actualizado' : '✅ Cliente creado' });
  };

  const handleDelete = async () => {
    if (deleteId) {
      await db.from('clientes').delete().eq('id', deleteId);
      reload(); setDeleteId(null);
      toast({ title: 'Cliente eliminado' });
    }
  };

  const openWhatsApp = (telefono: string, nombre: string) => {
    const num = telefono.replace(/\D/g, '');
    const msg = encodeURIComponent(`Hola ${nombre}, le contactamos de Soluciones Decorativas JL.`);
    window.open(`https://wa.me/1${num}?text=${msg}`, '_blank');
  };

  const getTrabajosByCliente = (clienteId: string) => trabajos.filter((t: any) => t.id_cliente === clienteId);

  const getDeudaCliente = (clienteId: string) => {
    const ts = getTrabajosByCliente(clienteId);
    return ts.reduce((total: number, t: any) => {
      const monto = t.monto_final || t.monto_cotizado || 0;
      const abono = t.abono || 0;
      if (t.estado !== 'Entregado' && t.estado !== 'Cancelado') return total;
      return total + Math.max(0, monto - abono);
    }, 0);
  };

  const verCliente = (c: any) => {
    setClienteVer(c);
    setVerDialog(true);
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Clientes</h1>
        {isOwner && <Button onClick={() => { setForm(empty); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Nuevo Cliente</Button>}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Buscar por nombre, teléfono o empresa..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-lg overflow-x-auto bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead className="hidden sm:table-cell">Empresa</TableHead>
              <TableHead>Teléfono</TableHead>
              <TableHead className="hidden md:table-cell">Trabajos</TableHead>
              <TableHead className="hidden md:table-cell">Deuda</TableHead>
              <TableHead className="w-[120px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No se encontraron clientes</TableCell></TableRow>}
            {filtered.map((c: any) => {
              const deuda = getDeudaCliente(c.id);
              const totalTrabajos = getTrabajosByCliente(c.id).length;
              return (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.nombre_completo}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{c.empresa || '—'}</TableCell>
                  <TableCell>{c.telefono}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant="outline">{totalTrabajos} trabajo{totalTrabajos !== 1 ? 's' : ''}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {deuda > 0
                      ? <Badge variant="destructive">{formatCurrency(deuda)}</Badge>
                      : <span className="text-xs text-muted-foreground">Al día</span>
                    }
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" title="Ver historial" onClick={() => verCliente(c)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="WhatsApp" onClick={() => openWhatsApp(c.telefono, c.nombre_completo)}>
                        <MessageCircle className="h-4 w-4 text-green-600" />
                      </Button>
                      {isOwner && <>
                        <Button variant="ghost" size="icon" onClick={() => { setForm({ ...c }); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => setDeleteId(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </>}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Dialog Ver Cliente */}
      <Dialog open={verDialog} onOpenChange={setVerDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>👤 {clienteVer?.nombre_completo}</DialogTitle></DialogHeader>
          {clienteVer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Teléfono:</span> <span className="font-medium">{clienteVer.telefono}</span></div>
                {clienteVer.empresa && <div><span className="text-muted-foreground">Empresa:</span> <span className="font-medium">{clienteVer.empresa}</span></div>}
                {clienteVer.email && <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{clienteVer.email}</span></div>}
                {clienteVer.rnc && <div><span className="text-muted-foreground">RNC:</span> <span className="font-medium">{clienteVer.rnc}</span></div>}
                {clienteVer.direccion && <div className="col-span-2"><span className="text-muted-foreground">Dirección:</span> <span className="font-medium">{clienteVer.direccion}</span></div>}
                {clienteVer.notas && <div className="col-span-2"><span className="text-muted-foreground">Notas:</span> <span className="font-medium">{clienteVer.notas}</span></div>}
              </div>

              <div>
                <h3 className="text-sm font-semibold mb-2">Historial de Trabajos</h3>
                {getTrabajosByCliente(clienteVer.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">Sin trabajos registrados</p>
                ) : (
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                    {getTrabajosByCliente(clienteVer.id).map((t: any) => {
                      const monto = t.monto_final || t.monto_cotizado || 0;
                      const abono = t.abono || 0;
                      const pendiente = Math.max(0, monto - abono);
                      return (
                        <div key={t.id} className="p-2.5 rounded-lg bg-secondary/50 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{t.descripcion_trabajo}</span>
                            <Badge variant={
                              t.estado === 'Entregado' ? 'default' :
                              t.estado === 'Finalizado' ? 'secondary' :
                              t.estado === 'Cancelado' ? 'destructive' : 'outline'
                            }>{t.estado}</Badge>
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
                            <span>{formatDate(t.fecha_inicio)}</span>
                            <span>Monto: {formatCurrency(monto)}</span>
                            {abono > 0 && <span>Abono: {formatCurrency(abono)}</span>}
                            {pendiente > 0 && t.estado === 'Entregado' && <span className="text-destructive font-medium">Debe: {formatCurrency(pendiente)}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <Button className="w-full gap-2" variant="outline" onClick={() => openWhatsApp(clienteVer.telefono, clienteVer.nombre_completo)}>
                <MessageCircle className="h-4 w-4 text-green-600" /> Contactar por WhatsApp
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog Editar/Crear */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Nuevo'} Cliente</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Nombre Completo *</Label><Input value={form.nombre_completo || ''} onChange={e => setForm({ ...form, nombre_completo: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Teléfono *</Label><Input value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Empresa</Label><Input value={form.empresa || ''} onChange={e => setForm({ ...form, empresa: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">RNC</Label><Input value={form.rnc || ''} onChange={e => setForm({ ...form, rnc: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Dirección</Label><Input value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Email</Label><Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Notas</Label><Textarea value={form.notas || ''} onChange={e => setForm({ ...form, notas: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar cliente?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}