import { useState, useEffect } from 'react';
import { Plus, Search, Pencil, Trash2, Eye, Upload, X, ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { fetchAll, insertRow, updateRow, deleteRow } from '@/lib/supabase-service';
import { formatCurrency } from '@/utils/helpers';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

// ── Calendario ──────────────────────────────────────────────
const db = supabase as any;
const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const tiposEvento = ['Reunión','Llamada','Entrega','Compra','Pago','Otro'];
const colorEstado: Record<string, string> = {
  'Pendiente': '#888780', 'En proceso': '#185FA5', 'Finalizado': '#1D9E75',
  'Entregado': '#3B6D11', 'Cancelado': '#A32D2D',
};
const colorEvento: Record<string, string> = {
  'Reunión':'#534AB7','Llamada':'#1D9E75','Entrega':'#BA7517',
  'Compra':'#0F6E56','Pago':'#A32D2D','Otro':'#5F5E5A',
};
const emptyEvento = { titulo: '', tipo: 'Reunión', fecha: '', hora: '', descripcion: '' };

const categorias = ['Tapicería', 'Ebanistería', 'Mixto'];
const estados = ['Pendiente', 'En proceso', 'Finalizado', 'Entregado', 'Cancelado'];

const tipos = ['Reparación', 'Fabricación'] as const;

const estadoBadge: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  Pendiente: 'outline',
  'En proceso': 'default',
  Finalizado: 'secondary',
  Entregado: 'secondary',
  Cancelado: 'destructive'
};

const empty = {
  id_cliente: '',
  descripcion_trabajo: '',
  categoria: 'Tapicería',
  estado: 'Pendiente',
  fecha_inicio: new Date().toISOString().slice(0, 10),
  // dinero:
  monto_final: null as number | null, // UI: "Monto total"
  abono: null as number | null,
  // tipo:
  tipo_trabajo: 'Reparación' as (typeof tipos)[number],
  // fotos (se guardan como URLs):
  fotos_antes: [] as string[],
  fotos_despues: [] as string[],
  foto_muestra: '' as string,
  foto_final: '' as string,
  notas: ''
};

function safeNumber(n: any) {
  const v = Number(n);
  return Number.isFinite(v) ? v : null;
}

async function uploadImagesToStorage(files: File[], folder: string) {
  // Bucket requerido: "trabajos"
  const bucket = 'trabajos';

  const urls: string[] = [];
  for (const file of files) {
    const ext = file.name.split('.').pop() || 'jpg';
    const name =
      (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`)
        .toString()
        .replace(/\./g, '');
    const path = `${folder}/${name}.${ext}`;

    const { error: upErr } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: true,
      contentType: file.type || 'image/jpeg'
    });
    if (upErr) throw upErr;

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    if (!data?.publicUrl) throw new Error('No se pudo obtener la URL pública de la imagen.');
    urls.push(data.publicUrl);
  }
  return urls;
}

export default function Trabajos() {
  const { isOwner } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<any>(empty);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [originalEstado, setOriginalEstado] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // ── Calendario state ──
  const hoy = new Date();
  const [calAnio, setCalAnio] = useState(hoy.getFullYear());
  const [calMes, setCalMes]   = useState(hoy.getMonth());
  const [eventos, setEventos] = useState<any[]>([]);
  const [diaVer, setDiaVer]   = useState<string | null>(null);
  const [evForm, setEvForm]   = useState<any>(emptyEvento);
  const [evDialog, setEvDialog] = useState(false);
  const [evDeleteId, setEvDeleteId] = useState<string | null>(null);

  const { toast } = useToast();

  const reload = async () => {
    const [t, c] = await Promise.all([fetchAll('trabajos'), fetchAll('clientes', 'nombre_completo', true)]);
    setItems(t);
    setClientes(c);
  };

  const reloadEventos = async () => {
    const { data } = await db.from('eventos_calendario').select('*').order('fecha');
    setEventos(data || []);
  };

  useEffect(() => {
    reload();
    reloadEventos();
  }, []);

  const clienteNombre = (id: string) => clientes.find((c: any) => c.id === id)?.nombre_completo || '—';

  // ── Helpers calendario ──
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;
  const toDateStr = (d: number) => `${calAnio}-${String(calMes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const diasEnMes = new Date(calAnio, calMes+1, 0).getDate();
  const primerDia = new Date(calAnio, calMes, 1).getDay();
  const prevMes = () => { if (calMes===0){setCalMes(11);setCalAnio(a=>a-1);}else setCalMes(m=>m-1); };
  const nextMes = () => { if (calMes===11){setCalMes(0);setCalAnio(a=>a+1);}else setCalMes(m=>m+1); };

  const trabajosDelDia = (fecha: string) =>
    items.filter(t => t.fecha_entrega_estimada === fecha && !['Entregado','Cancelado'].includes(t.estado));
  const eventosDelDia  = (fecha: string) => eventos.filter(e => e.fecha === fecha);

  const saveEvento = async () => {
    if (!evForm.titulo || !evForm.fecha) { toast({ title: 'Título y fecha requeridos', variant: 'destructive' }); return; }
    if (evForm.id) await db.from('eventos_calendario').update(evForm).eq('id', evForm.id);
    else await db.from('eventos_calendario').insert(evForm);
    reloadEventos(); setEvDialog(false); setEvForm(emptyEvento);
    toast({ title: '✅ Evento guardado' });
  };
  const deleteEvento = async () => {
    if (!evDeleteId) return;
    await db.from('eventos_calendario').delete().eq('id', evDeleteId);
    reloadEventos(); setEvDeleteId(null);
  };

  const filtered = items.filter((i: any) => {
    const ms =
      i.descripcion_trabajo?.toLowerCase().includes(search.toLowerCase()) ||
      clienteNombre(i.id_cliente).toLowerCase().includes(search.toLowerCase());
    const me = estadoFilter === 'todos' || i.estado === estadoFilter;
    return ms && me;
  });

  const openNew = () => {
    setOriginalEstado(null);
    setForm({ ...empty });
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setOriginalEstado(t?.estado ?? null);
    setForm({
      ...empty,
      ...t,
      // asegurar arrays/strings:
      fotos_antes: Array.isArray(t?.fotos_antes) ? t.fotos_antes : [],
      fotos_despues: Array.isArray(t?.fotos_despues) ? t.fotos_despues : [],
      foto_muestra: t?.foto_muestra ?? '',
      foto_final: t?.foto_final ?? '',
      tipo_trabajo: t?.tipo_trabajo ?? 'Reparación'
    });
    setDialogOpen(true);
  };

  const blockEntregado = (estadoSeleccionado: string) => {
    // Regla: no se puede poner "Entregado" sin haber estado "Finalizado".
    // - Nuevo: originalEstado = null => bloqueado.
    // - Editar: solo permitido si estado original era "Finalizado" (o si ya era "Entregado").
    if (estadoSeleccionado !== 'Entregado') return false;
    if (originalEstado === 'Entregado') return false;
    return originalEstado !== 'Finalizado';
  };

  const handleSave = async () => {
    if (!form.id_cliente || !form.descripcion_trabajo) {
      toast({ title: 'Completa los campos requeridos', variant: 'destructive' });
      return;
    }

    // Validación: Entregado solo si antes estaba Finalizado (en edición), o si ya era Entregado.
    if (blockEntregado(form.estado)) {
      toast({ title: 'No puedes poner "Entregado" sin antes estar en "Finalizado".', variant: 'destructive' });
      return;
    }

    // Validación dinero:
    const montoTotal = safeNumber(form.monto_final);
    const abono = safeNumber(form.abono);

    if (montoTotal !== null && montoTotal < 0) {
      toast({ title: 'El monto total no puede ser negativo', variant: 'destructive' });
      return;
    }
    if (abono !== null && abono < 0) {
      toast({ title: 'El abono no puede ser negativo', variant: 'destructive' });
      return;
    }
    if (montoTotal !== null && abono !== null && abono > montoTotal) {
      toast({ title: 'El abono no puede ser mayor que el monto total', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      // Subidas de fotos (si el usuario pegó URLs manuales, también se guardan)
      // En esta implementación: el upload se hace cuando el usuario selecciona los archivos (handlers abajo),
      // aquí solo guardamos el form.
      const payload = {
        ...form,
        monto_final: montoTotal,
        abono: abono
      };

      if (form.id) await updateRow('trabajos', form.id, payload);
      else await insertRow('trabajos', payload);

      await reload();
      setDialogOpen(false);
      setForm({ ...empty });
      setOriginalEstado(null);
      toast({ title: form.id ? 'Trabajo actualizado' : 'Trabajo creado' });
    } catch (e: any) {
      toast({ title: 'Error guardando el trabajo', description: e?.message ?? 'Intenta de nuevo', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (deleteId) {
      await deleteRow('trabajos', deleteId);
      reload();
      setDeleteId(null);
      toast({ title: 'Trabajo eliminado' });
    }
  };

  const onUploadAntes = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setSaving(true);
      const urls = await uploadImagesToStorage(Array.from(files), `reparacion/antes`);
      setForm((prev: any) => ({ ...prev, fotos_antes: [...(prev.fotos_antes || []), ...urls] }));
      toast({ title: 'Fotos "Antes" subidas' });
    } catch (e: any) {
      toast({ title: 'Error subiendo fotos "Antes"', description: e?.message ?? 'Revisa tu bucket/policies', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const onUploadDespues = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setSaving(true);
      const urls = await uploadImagesToStorage(Array.from(files), `reparacion/despues`);
      setForm((prev: any) => ({ ...prev, fotos_despues: [...(prev.fotos_despues || []), ...urls] }));
      toast({ title: 'Fotos "Después" subidas' });
    } catch (e: any) {
      toast({ title: 'Error subiendo fotos "Después"', description: e?.message ?? 'Revisa tu bucket/policies', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const onUploadMuestra = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setSaving(true);
      const urls = await uploadImagesToStorage([files[0]], `fabricacion/muestra`);
      setForm((prev: any) => ({ ...prev, foto_muestra: urls[0] }));
      toast({ title: 'Foto de muestra subida' });
    } catch (e: any) {
      toast({ title: 'Error subiendo foto de muestra', description: e?.message ?? 'Revisa tu bucket/policies', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const onUploadFinal = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      setSaving(true);
      const urls = await uploadImagesToStorage([files[0]], `fabricacion/final`);
      setForm((prev: any) => ({ ...prev, foto_final: urls[0] }));
      toast({ title: 'Foto final subida' });
    } catch (e: any) {
      toast({ title: 'Error subiendo foto final', description: e?.message ?? 'Revisa tu bucket/policies', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const removeUrlFromArray = (key: 'fotos_antes' | 'fotos_despues', url: string) => {
    setForm((prev: any) => ({ ...prev, [key]: (prev[key] || []).filter((x: string) => x !== url) }));
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Trabajos</h1>
        {isOwner && (
          <Button onClick={openNew}>
            <Plus className="h-4 w-4 mr-1" />
            Nuevo Trabajo
          </Button>
        )}
      </div>

      <Tabs defaultValue="lista">
        <TabsList className="mb-2">
          <TabsTrigger value="lista">📋 Lista</TabsTrigger>
          <TabsTrigger value="calendario">📅 Calendario</TabsTrigger>
        </TabsList>

        {/* ══ PESTAÑA LISTA ══ */}
        <TabsContent value="lista" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={estadoFilter} onValueChange={setEstadoFilter}>
              <SelectTrigger className="w-full sm:w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                {estados.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="hidden md:table-cell">Categoría</TableHead>
                  <TableHead className="hidden lg:table-cell text-right">Monto total</TableHead>
                  <TableHead className="w-[120px]">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">Sin trabajos</TableCell>
                  </TableRow>
                )}
                {filtered.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <span className="font-medium">{t.descripcion_trabajo}</span>
                      <span className="block sm:hidden text-xs text-muted-foreground">{clienteNombre(t.id_cliente)}</span>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{clienteNombre(t.id_cliente)}</TableCell>
                    <TableCell><Badge variant={estadoBadge[t.estado]}>{t.estado}</Badge></TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{t.categoria}</TableCell>
                    <TableCell className="hidden lg:table-cell text-right">{formatCurrency(t.monto_final ?? 0)}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Link to={`/trabajos/${t.id}`}>
                          <Button variant="ghost" size="icon"><Eye className="h-4 w-4" /></Button>
                        </Link>
                        {isOwner && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                            <Button variant="ghost" size="icon" onClick={() => setDeleteId(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ══ PESTAÑA CALENDARIO ══ */}
        <TabsContent value="calendario" className="space-y-4">
          {/* Cabecera mes */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prevMes}><ChevronLeft className="h-5 w-5" /></Button>
            <h2 className="text-base font-semibold">{MESES[calMes]} {calAnio}</h2>
            <Button variant="ghost" size="icon" onClick={nextMes}><ChevronRight className="h-5 w-5" /></Button>
          </div>

          {/* Leyenda */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            {Object.entries(colorEstado).map(([estado, color]) => (
              <span key={estado} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: color }} />
                {estado}
              </span>
            ))}
            <span className="flex items-center gap-1 ml-2 font-medium text-foreground/70">
              <span className="w-2.5 h-2.5 rounded-full inline-block bg-purple-500" />Eventos
            </span>
          </div>

          {/* Grilla */}
          <div className="border rounded-xl overflow-hidden bg-card">
            <div className="grid grid-cols-7 border-b bg-secondary/30">
              {DIAS.map(d => (
                <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({ length: primerDia }).map((_, i) => (
                <div key={`e-${i}`} className="min-h-[80px] border-b border-r bg-secondary/10" />
              ))}
              {Array.from({ length: diasEnMes }).map((_, i) => {
                const dia = i + 1;
                const fecha = toDateStr(dia);
                const esHoy = fecha === hoyStr;
                const tsDia = trabajosDelDia(fecha);
                const evsDia = eventosDelDia(fecha);
                const total = tsDia.length + evsDia.length;
                return (
                  <div
                    key={dia}
                    onClick={() => setDiaVer(fecha)}
                    className={`min-h-[80px] border-b border-r p-1 cursor-pointer hover:bg-secondary/40 transition-colors ${esHoy ? 'bg-primary/5' : ''}`}
                  >
                    <div className={`text-xs font-semibold w-5 h-5 flex items-center justify-center rounded-full mb-1 ${esHoy ? 'bg-primary text-primary-foreground' : ''}`}>
                      {dia}
                    </div>
                    <div className="space-y-0.5">
                      {tsDia.slice(0,2).map((t: any) => (
                        <div key={t.id} className="text-[10px] px-1 py-0.5 rounded truncate text-white font-medium leading-tight"
                          style={{ backgroundColor: colorEstado[t.estado] || '#888' }}
                          title={`${t.descripcion_trabajo} · ${clienteNombre(t.id_cliente)}`}>
                          {t.descripcion_trabajo}
                        </div>
                      ))}
                      {evsDia.slice(0, 2 - Math.min(tsDia.length, 2)).map((e: any) => (
                        <div key={e.id} className="text-[10px] px-1 py-0.5 rounded truncate text-white font-medium leading-tight"
                          style={{ backgroundColor: colorEvento[e.tipo] || '#5F5E5A' }}
                          title={e.titulo}>
                          {e.titulo}
                        </div>
                      ))}
                      {total > 2 && <div className="text-[10px] text-muted-foreground pl-1">+{total - 2} más</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista del mes */}
          {(() => {
            const mesStr = `${calAnio}-${String(calMes+1).padStart(2,'0')}`;
            const tsMes = items.filter(t => t.fecha_entrega_estimada?.startsWith(mesStr) && !['Entregado','Cancelado'].includes(t.estado));
            const evsMes = eventos.filter(e => e.fecha?.startsWith(mesStr));
            const todo = [
              ...tsMes.map(t => ({ tipo: 'trabajo', fecha: t.fecha_entrega_estimada, titulo: t.descripcion_trabajo, sub: clienteNombre(t.id_cliente), estado: t.estado, id: t.id })),
              ...evsMes.map(e => ({ tipo: 'evento', fecha: e.fecha, titulo: e.titulo, sub: e.hora || '', tipoEvento: e.tipo, id: e.id })),
            ].sort((a,b) => a.fecha.localeCompare(b.fecha));
            if (!todo.length) return null;
            return (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground">Pendientes de {MESES[calMes]}</h3>
                  {isOwner && (
                    <Button size="sm" variant="outline" className="gap-1 text-xs"
                      onClick={() => { setEvForm({ ...emptyEvento, fecha: hoyStr }); setEvDialog(true); }}>
                      <Plus className="h-3.5 w-3.5" />Evento
                    </Button>
                  )}
                </div>
                {todo.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:bg-secondary/30 transition-colors cursor-pointer"
                    onClick={() => item.tipo === 'trabajo' ? window.location.href = `/trabajos/${item.id}` : setDiaVer(item.fecha)}>
                    <div className="w-1.5 h-8 rounded-full shrink-0"
                      style={{ backgroundColor: item.tipo === 'trabajo' ? colorEstado[item.estado!] : colorEvento[item.tipoEvento!] || '#5F5E5A' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.titulo}</p>
                      <p className="text-xs text-muted-foreground">{item.fecha}{item.sub ? ` · ${item.sub}` : ''}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px] shrink-0">
                      {item.tipo === 'trabajo' ? item.estado : item.tipoEvento}
                    </Badge>
                  </div>
                ))}
              </div>
            );
          })()}

          {isOwner && (
            <Button variant="outline" className="w-full gap-2" onClick={() => { setEvForm({ ...emptyEvento, fecha: hoyStr }); setEvDialog(true); }}>
              <Plus className="h-4 w-4" />Agregar evento al calendario
            </Button>
          )}
        </TabsContent>
      </Tabs>

      {/* FORM DIALOG */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form.id ? 'Editar' : 'Nuevo'} Trabajo</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Cliente *</Label>
              <Select value={form.id_cliente || ''} onValueChange={(v) => setForm({ ...form, id_cliente: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  {clientes.map((c: any) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre_completo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-1.5">
              <Label className="text-xs">Descripción *</Label>
              <Textarea
                value={form.descripcion_trabajo || ''}
                onChange={(e) => setForm({ ...form, descripcion_trabajo: e.target.value })}
                rows={2}
              />
            </div>

            {/* NUEVO: Tipo (Reparación / Fabricación) */}
            <div className="grid gap-1.5">
              <Label className="text-xs">Tipo</Label>
              <Select value={form.tipo_trabajo} onValueChange={(v) => setForm({ ...form, tipo_trabajo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tipos.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Categoría</Label>
                <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categorias.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-1.5">
                <Label className="text-xs">Estado</Label>
                <Select
                  value={form.estado}
                  onValueChange={(v) => {
                    if (blockEntregado(v)) {
                      toast({
                        title: 'Bloqueado',
                        description: 'No puedes poner "Entregado" sin antes estar en "Finalizado".',
                        variant: 'destructive'
                      });
                      return;
                    }
                    setForm({ ...form, estado: v });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {estados.map((e) => (
                      <SelectItem key={e} value={e} disabled={blockEntregado(e)}>
                        {e}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Fecha Inicio</Label>
                <Input type="date" value={form.fecha_inicio || ''} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Entrega Estimada</Label>
                <Input
                  type="date"
                  value={form.fecha_entrega_estimada || ''}
                  onChange={(e) => setForm({ ...form, fecha_entrega_estimada: e.target.value })}
                />
              </div>
            </div>

            {/* DINERO: Quité Cotizado, cambié Final a Monto total */}
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Monto total</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.monto_final ?? ''}
                  onChange={(e) => setForm({ ...form, monto_final: e.target.value === '' ? null : +e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Abono</Label>
                <Input
                  type="number"
                  min={0}
                  value={form.abono ?? ''}
                  onChange={(e) => setForm({ ...form, abono: e.target.value === '' ? null : +e.target.value })}
                />
              </div>
            </div>

            {/* FOTOS (condicional por tipo) */}
            {form.tipo_trabajo === 'Reparación' ? (
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Fotos - Antes</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" multiple onChange={(e) => onUploadAntes(e.target.files)} />
                    <Button type="button" variant="outline" size="icon" title="Subir">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  {Array.isArray(form.fotos_antes) && form.fotos_antes.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {form.fotos_antes.map((url: string) => (
                        <div key={url} className="relative border rounded-md overflow-hidden">
                          <img src={url} alt="Antes" className="h-24 w-full object-cover" />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-background/80 rounded-full p-1"
                            onClick={() => removeUrlFromArray('fotos_antes', url)}
                            title="Quitar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">Fotos - Después</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" multiple onChange={(e) => onUploadDespues(e.target.files)} />
                    <Button type="button" variant="outline" size="icon" title="Subir">
                      <Upload className="h-4 w-4" />
                    </Button>
                  </div>
                  {Array.isArray(form.fotos_despues) && form.fotos_despues.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {form.fotos_despues.map((url: string) => (
                        <div key={url} className="relative border rounded-md overflow-hidden">
                          <img src={url} alt="Después" className="h-24 w-full object-cover" />
                          <button
                            type="button"
                            className="absolute top-1 right-1 bg-background/80 rounded-full p-1"
                            onClick={() => removeUrlFromArray('fotos_despues', url)}
                            title="Quitar"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="grid gap-4">
                <div className="grid gap-1.5">
                  <Label className="text-xs">Foto de muestra (si el cliente quiere algo similar)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" onChange={(e) => onUploadMuestra(e.target.files)} />
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Input
                      placeholder="O pega un link (opcional)"
                      value={form.foto_muestra || ''}
                      onChange={(e) => setForm({ ...form, foto_muestra: e.target.value })}
                    />
                    {form.foto_muestra ? (
                      <div className="border rounded-md overflow-hidden">
                        <img src={form.foto_muestra} alt="Muestra" className="h-32 w-full object-cover" />
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label className="text-xs">Foto del mueble final (hecho)</Label>
                  <div className="flex items-center gap-2">
                    <Input type="file" accept="image/*" onChange={(e) => onUploadFinal(e.target.files)} />
                  </div>
                  <div className="grid gap-2 mt-2">
                    <Input
                      placeholder="O pega un link (opcional)"
                      value={form.foto_final || ''}
                      onChange={(e) => setForm({ ...form, foto_final: e.target.value })}
                    />
                    {form.foto_final ? (
                      <div className="border rounded-md overflow-hidden">
                        <img src={form.foto_final} alt="Final" className="h-32 w-full object-cover" />
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )}

            <div className="grid gap-1.5">
              <Label className="text-xs">Notas</Label>
              <Textarea value={form.notas || ''} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Guardando...' : 'Guardar'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => { if (!open) setDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar trabajo?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán las asignaciones asociadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── DIALOGS CALENDARIO ── */}
      {/* Ver día */}
      <Dialog open={!!diaVer} onOpenChange={() => setDiaVer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {diaVer && new Date(diaVer + 'T12:00:00').toLocaleDateString('es-DO', { weekday:'long', day:'numeric', month:'long' })}
            </DialogTitle>
          </DialogHeader>
          {diaVer && (() => {
            const tsDia  = trabajosDelDia(diaVer);
            const evsDia = eventosDelDia(diaVer);
            const total  = tsDia.length + evsDia.length;
            return (
              <div className="space-y-3">
                {total === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin eventos este día.</p>}
                {tsDia.map((t: any) => (
                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: colorEstado[t.estado] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{t.descripcion_trabajo}</p>
                      <p className="text-xs text-muted-foreground">{clienteNombre(t.id_cliente)}</p>
                      <Badge variant="outline" className="text-[10px] mt-1">{t.estado}</Badge>
                    </div>
                    <Link to={`/trabajos/${t.id}`} onClick={() => setDiaVer(null)}>
                      <Button variant="ghost" size="sm" className="text-xs h-7">Ver</Button>
                    </Link>
                  </div>
                ))}
                {evsDia.map((e: any) => (
                  <div key={e.id} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: colorEvento[e.tipo] || '#5F5E5A' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{e.titulo}</p>
                      {e.hora && <p className="text-xs text-muted-foreground">{e.hora}</p>}
                      {e.descripcion && <p className="text-xs text-muted-foreground mt-1">{e.descripcion}</p>}
                      <Badge variant="outline" className="text-[10px] mt-1">{e.tipo}</Badge>
                    </div>
                    {isOwner && (
                      <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0"
                        onClick={() => { setEvDeleteId(e.id); setDiaVer(null); }}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                ))}
                {isOwner && (
                  <Button variant="outline" className="w-full gap-2 mt-1"
                    onClick={() => { setEvForm({ ...emptyEvento, fecha: diaVer }); setDiaVer(null); setEvDialog(true); }}>
                    <Plus className="h-4 w-4" />Agregar evento este día
                  </Button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Crear evento */}
      <Dialog open={evDialog} onOpenChange={setEvDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{evForm.id ? 'Editar' : 'Nuevo'} Evento</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Título *</Label><Input value={evForm.titulo} onChange={e => setEvForm({ ...evForm, titulo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={evForm.tipo} onValueChange={v => setEvForm({ ...evForm, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tiposEvento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Hora</Label><Input type="time" value={evForm.hora || ''} onChange={e => setEvForm({ ...evForm, hora: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Fecha *</Label><Input type="date" value={evForm.fecha} onChange={e => setEvForm({ ...evForm, fecha: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Descripción</Label><Textarea value={evForm.descripcion || ''} onChange={e => setEvForm({ ...evForm, descripcion: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEvDialog(false)}>Cancelar</Button>
            <Button onClick={saveEvento}>Guardar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Eliminar evento */}
      <AlertDialog open={!!evDeleteId} onOpenChange={() => setEvDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteEvento}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}