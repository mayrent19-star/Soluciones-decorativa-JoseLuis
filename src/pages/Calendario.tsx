import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const db = supabase as any;

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const tiposEvento = ['Reunión', 'Llamada', 'Entrega', 'Compra', 'Pago', 'Otro'];
const colorTipo: Record<string, string> = {
  trabajo: '#185FA5',
  'Reunión': '#534AB7',
  'Llamada': '#1D9E75',
  'Entrega': '#BA7517',
  'Compra': '#0F6E56',
  'Pago': '#A32D2D',
  'Otro': '#5F5E5A',
};

const emptyEvento = { titulo: '', tipo: 'Reunión', fecha: '', hora: '', descripcion: '' };

export default function Calendario() {
  const { isOwner } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hoy = new Date();

  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [eventos, setEventos] = useState<any[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(emptyEvento);

  const reload = async () => {
    const [{ data: t }, { data: c }, { data: e }] = await Promise.all([
      db.from('trabajos').select('id, descripcion_trabajo, fecha_entrega_estimada, estado, id_cliente').not('fecha_entrega_estimada', 'is', null).not('estado', 'in', '("Entregado","Cancelado")'),
      db.from('clientes').select('id, nombre_completo'),
      db.from('eventos_calendario').select('*').order('fecha'),
    ]);
    setTrabajos(t || []);
    setClientes(c || []);
    setEventos(e || []);
  };

  useEffect(() => { reload(); }, []);

  // ── Helpers ──
  const clienteNombre = (id: string) => clientes.find(c => c.id === id)?.nombre_completo || '';

  const diasEnMes = new Date(anio, mes + 1, 0).getDate();
  const primerDia = new Date(anio, mes, 1).getDay();

  const toDateStr = (d: number) => `${anio}-${String(mes + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  const eventosDelDia = (fecha: string) => {
    const trabajosDia = trabajos
      .filter(t => t.fecha_entrega_estimada === fecha)
      .map(t => ({ id: `t-${t.id}`, titulo: t.descripcion_trabajo, tipo: 'trabajo', subtitulo: clienteNombre(t.id_cliente), link: `/trabajos/${t.id}` }));
    const eventosDia = eventos.filter(e => e.fecha === fecha);
    return [...trabajosDia, ...eventosDia];
  };

  const eventosMes = () => {
    const mesStr = `${anio}-${String(mes + 1).padStart(2,'0')}`;
    return [
      ...trabajos.filter(t => t.fecha_entrega_estimada?.startsWith(mesStr))
        .map(t => ({ ...t, tipo: 'trabajo', titulo: t.descripcion_trabajo, fecha: t.fecha_entrega_estimada })),
      ...eventos.filter(e => e.fecha?.startsWith(mesStr)),
    ].sort((a, b) => a.fecha.localeCompare(b.fecha));
  };

  const prev = () => { if (mes === 0) { setMes(11); setAnio(a => a - 1); } else setMes(m => m - 1); };
  const next = () => { if (mes === 11) { setMes(0); setAnio(a => a + 1); } else setMes(m => m + 1); };

  const abrirDia = (fecha: string) => { setDiaSeleccionado(fecha); };

  const saveEvento = async () => {
    if (!form.titulo || !form.fecha) { toast({ title: 'Título y fecha son requeridos', variant: 'destructive' }); return; }
    if (form.id) await db.from('eventos_calendario').update(form).eq('id', form.id);
    else await db.from('eventos_calendario').insert(form);
    reload(); setDialogOpen(false); setForm(emptyEvento);
    toast({ title: '✅ Evento guardado' });
  };

  const deleteEvento = async () => {
    if (!deleteId) return;
    await db.from('eventos_calendario').delete().eq('id', deleteId);
    reload(); setDeleteId(null);
    toast({ title: 'Evento eliminado' });
  };

  const listaMes = eventosMes();
  const hoyStr = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" />Calendario</h1>
        {isOwner && (
          <Button onClick={() => { setForm({ ...emptyEvento, fecha: hoyStr }); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-1" />Nuevo Evento
          </Button>
        )}
      </div>

      {/* Navegación mes */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="h-5 w-5" /></Button>
        <h2 className="text-lg font-semibold">{MESES[mes]} {anio}</h2>
        <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="h-5 w-5" /></Button>
      </div>

      {/* Grilla del calendario */}
      <div className="border rounded-xl overflow-hidden bg-card">
        {/* Cabecera días */}
        <div className="grid grid-cols-7 border-b">
          {DIAS.map(d => (
            <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7">
          {/* Celdas vacías al inicio */}
          {Array.from({ length: primerDia }).map((_, i) => (
            <div key={`empty-${i}`} className="min-h-[80px] border-b border-r bg-secondary/20" />
          ))}

          {Array.from({ length: diasEnMes }).map((_, i) => {
            const dia = i + 1;
            const fecha = toDateStr(dia);
            const esHoy = fecha === hoyStr;
            const evs = eventosDelDia(fecha);
            const tieneTrabajos = evs.some(e => e.tipo === 'trabajo');

            return (
              <div
                key={dia}
                onClick={() => abrirDia(fecha)}
                className={`min-h-[80px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-secondary/40 ${esHoy ? 'bg-primary/5' : ''}`}
              >
                <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${esHoy ? 'bg-primary text-primary-foreground' : 'text-foreground'}`}>
                  {dia}
                </div>
                <div className="space-y-0.5">
                  {evs.slice(0, 3).map((ev: any, idx: number) => (
                    <div
                      key={idx}
                      className="text-[10px] px-1 py-0.5 rounded truncate text-white font-medium"
                      style={{ backgroundColor: colorTipo[ev.tipo] || colorTipo['Otro'] }}
                      title={ev.titulo}
                    >
                      {ev.titulo}
                    </div>
                  ))}
                  {evs.length > 3 && (
                    <div className="text-[10px] text-muted-foreground pl-1">+{evs.length - 3} más</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Lista eventos del mes */}
      {listaMes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-muted-foreground">Eventos de {MESES[mes]}</h3>
          {listaMes.map((ev: any, idx: number) => (
            <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:bg-secondary/30 transition-colors cursor-pointer"
              onClick={() => ev.tipo === 'trabajo' ? navigate(`/trabajos/${ev.id}`) : abrirDia(ev.fecha)}>
              <div className="w-1.5 h-10 rounded-full shrink-0" style={{ backgroundColor: colorTipo[ev.tipo] || colorTipo['Otro'] }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{ev.titulo}</p>
                <p className="text-xs text-muted-foreground">{ev.fecha}{ev.hora ? ` · ${ev.hora}` : ''}{ev.subtitulo ? ` · ${ev.subtitulo}` : ''}</p>
              </div>
              <Badge variant="outline" className="text-xs shrink-0">
                {ev.tipo === 'trabajo' ? 'Entrega' : ev.tipo}
              </Badge>
            </div>
          ))}
        </div>
      )}

      {/* Dialog ver día */}
      <Dialog open={!!diaSeleccionado} onOpenChange={() => setDiaSeleccionado(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {diaSeleccionado && new Date(diaSeleccionado + 'T12:00:00').toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </DialogTitle>
          </DialogHeader>
          {diaSeleccionado && (() => {
            const evs = eventosDelDia(diaSeleccionado);
            return (
              <div className="space-y-3">
                {evs.length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Sin eventos este día.</p>}
                {evs.map((ev: any, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: colorTipo[ev.tipo] || colorTipo['Otro'] }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{ev.titulo}</p>
                      {ev.subtitulo && <p className="text-xs text-muted-foreground">{ev.subtitulo}</p>}
                      {ev.hora && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{ev.hora}</p>}
                      {ev.descripcion && <p className="text-xs text-muted-foreground mt-1">{ev.descripcion}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {ev.tipo === 'trabajo' && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => { setDiaSeleccionado(null); navigate(ev.link); }}>Ver</Button>
                      )}
                      {ev.tipo !== 'trabajo' && isOwner && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setDeleteId(ev.id); setDiaSeleccionado(null); }}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {isOwner && (
                  <Button variant="outline" className="w-full gap-2 mt-2" onClick={() => {
                    setForm({ ...emptyEvento, fecha: diaSeleccionado });
                    setDiaSeleccionado(null);
                    setDialogOpen(true);
                  }}>
                    <Plus className="h-4 w-4" /> Agregar evento este día
                  </Button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Dialog crear evento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Nuevo'} Evento</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Título *</Label><Input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({ ...form, tipo: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{tiposEvento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Hora</Label><Input type="time" value={form.hora || ''} onChange={e => setForm({ ...form, hora: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Fecha *</Label><Input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Descripción</Label><Textarea value={form.descripcion || ''} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={saveEvento}>Guardar</Button></div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteEvento}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
