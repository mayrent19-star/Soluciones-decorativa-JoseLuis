import { useState, useEffect, useMemo } from 'react';
import { Plus, Search, Pencil, Trash2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchAll, insertRow, updateRow, deleteRow } from '@/lib/supabase-service';
import { formatCurrency, formatDate } from '@/utils/helpers';

const empty = { nombre: '', tipo: 'Ajuste', telefono: '', activo: true, pago_fijo_mensual: 0, cedula: '', fecha_ingreso: '', direccion: '', email: '' };

export default function Empleados() {
  const { isOwner } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [reportEmpleado, setReportEmpleado] = useState('');
  const [reportDesde, setReportDesde] = useState('');
  const [reportHasta, setReportHasta] = useState('');
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const { toast } = useToast();

  const reload = async () => {
    const [e, a, t] = await Promise.all([fetchAll('empleados', 'nombre', true), fetchAll('trabajo_empleados'), fetchAll('trabajos')]);
    setItems(e); setAsignaciones(a); setTrabajos(t);
  };
  useEffect(() => { reload(); }, []);

  const filtered = items.filter((i: any) => i.nombre.toLowerCase().includes(search.toLowerCase()));

  const handleSave = async () => {
    if (!form.nombre) { toast({ title: 'El nombre es requerido', variant: 'destructive' }); return; }
    const data = { ...form };
    delete data.id; delete data.created_at; delete data.updated_at;
    if (form.id) await updateRow('empleados', form.id, data);
    else await insertRow('empleados', data);
    reload(); setDialogOpen(false); setForm(empty);
    toast({ title: form.id ? 'Empleado actualizado' : 'Empleado creado' });
  };

  const handleDelete = async () => { if (deleteId) { await deleteRow('empleados', deleteId); reload(); setDeleteId(null); toast({ title: 'Empleado eliminado' }); } };

  const reportData = useMemo(() => {
    if (!reportEmpleado) return [];
    return asignaciones.filter((a: any) => {
      if (a.id_empleado !== reportEmpleado) return false;
      const t = trabajos.find((tr: any) => tr.id === a.id_trabajo);
      const fecha = t?.fecha_inicio || '';
      if (reportDesde && fecha < reportDesde) return false;
      if (reportHasta && fecha > reportHasta) return false;
      return true;
    });
  }, [reportEmpleado, reportDesde, reportHasta, asignaciones, trabajos]);

  const reportTotal = reportData.reduce((s: number, a: any) => s + (a.monto_pagar || 0), 0);

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Empleados</h1>
        {isOwner && <Button onClick={() => { setForm(empty); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Nuevo Empleado</Button>}
      </div>
      <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" /><Input placeholder="Buscar empleado..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" /></div>
      <div className="border rounded-lg overflow-x-auto bg-card">
        <Table><TableHeader><TableRow><TableHead>Nombre</TableHead><TableHead>Tipo</TableHead><TableHead className="hidden sm:table-cell">Teléfono</TableHead><TableHead className="hidden md:table-cell">Pago Fijo</TableHead><TableHead>Activo</TableHead>{isOwner && <TableHead className="w-[80px]">Acciones</TableHead>}</TableRow></TableHeader>
        <TableBody>
          {filtered.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin empleados</TableCell></TableRow>}
          {filtered.map((e: any) => (
            <TableRow key={e.id}><TableCell className="font-medium">{e.nombre}</TableCell><TableCell><Badge variant={e.tipo === 'Fijo' ? 'default' : 'outline'}>{e.tipo}</Badge></TableCell><TableCell className="hidden sm:table-cell text-muted-foreground">{e.telefono || '—'}</TableCell><TableCell className="hidden md:table-cell">{e.pago_fijo_mensual ? formatCurrency(e.pago_fijo_mensual) : '—'}</TableCell><TableCell><Badge variant={e.activo ? 'secondary' : 'destructive'}>{e.activo ? 'Sí' : 'No'}</Badge></TableCell>
            {isOwner && <TableCell><div className="flex gap-1"><Button variant="ghost" size="icon" onClick={() => { setForm({ ...e }); setDialogOpen(true); }}><Pencil className="h-4 w-4" /></Button><Button variant="ghost" size="icon" onClick={() => setDeleteId(e.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></div></TableCell>}
            </TableRow>
          ))}
        </TableBody></Table>
      </div>

      <Card><CardHeader><CardTitle className="text-base">Control de Trabajo por Empleado</CardTitle></CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Select value={reportEmpleado} onValueChange={setReportEmpleado}><SelectTrigger><SelectValue placeholder="Seleccionar empleado" /></SelectTrigger><SelectContent>{items.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent></Select>
          <Input type="date" value={reportDesde} onChange={e => setReportDesde(e.target.value)} />
          <Input type="date" value={reportHasta} onChange={e => setReportHasta(e.target.value)} />
        </div>
        {reportEmpleado && (<>
          <div className="border rounded-lg overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Trabajo</TableHead><TableHead>Descripción</TableHead><TableHead className="text-right">Monto</TableHead></TableRow></TableHeader>
          <TableBody>{reportData.length === 0 && <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-6">Sin asignaciones</TableCell></TableRow>}
          {reportData.map((a: any) => { const t = trabajos.find((tr: any) => tr.id === a.id_trabajo); return (<TableRow key={a.id}><TableCell className="font-medium">{t?.descripcion_trabajo || '—'}</TableCell><TableCell className="text-muted-foreground">{a.descripcion}</TableCell><TableCell className="text-right">{formatCurrency(a.monto_pagar)}</TableCell></TableRow>); })}
          </TableBody></Table></div>
          <p className="text-right text-sm font-semibold">Total: {formatCurrency(reportTotal)}</p>
        </>)}
      </CardContent></Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Nuevo'} Empleado</DialogTitle></DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5"><Label className="text-xs">Nombre *</Label><Input value={form.nombre || ''} onChange={e => setForm({ ...form, nombre: e.target.value })} /></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label className="text-xs">Cédula</Label><Input value={form.cedula || ''} onChange={e => setForm({ ...form, cedula: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Fecha Ingreso</Label><Input type="date" value={form.fecha_ingreso || ''} onChange={e => setForm({ ...form, fecha_ingreso: e.target.value })} /></div>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Tipo</Label><Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Fijo">Fijo</SelectItem><SelectItem value="Ajuste">Ajuste</SelectItem></SelectContent></Select></div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-1.5"><Label className="text-xs">Teléfono</Label><Input value={form.telefono || ''} onChange={e => setForm({ ...form, telefono: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Email</Label><Input value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
          </div>
          <div className="grid gap-1.5"><Label className="text-xs">Dirección</Label><Input value={form.direccion || ''} onChange={e => setForm({ ...form, direccion: e.target.value })} /></div>
          {form.tipo === 'Fijo' && <div className="grid gap-1.5"><Label className="text-xs">Pago Fijo Mensual</Label><Input type="number" value={form.pago_fijo_mensual || ''} onChange={e => setForm({ ...form, pago_fijo_mensual: +e.target.value || 0 })} /></div>}
          <div className="flex items-center gap-2"><Switch checked={form.activo ?? true} onCheckedChange={v => setForm({ ...form, activo: v })} /><Label className="text-xs">Activo</Label></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></div></DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar empleado?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
