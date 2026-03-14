import { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Plus, Calendar, Clock, Trash2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';

const db = supabase as any;

const DIAS  = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

const tiposEvento = ['Reunión','Llamada','Entrega','Compra','Pago','Otro'];
const colorTipo: Record<string,string> = {
  trabajo:'#185FA5', fijo:'#7C3AED',
  'Reunión':'#534AB7','Llamada':'#1D9E75','Entrega':'#BA7517',
  'Compra':'#0F6E56','Pago':'#A32D2D','Otro':'#5F5E5A',
};

const emptyEvento  = { titulo:'', tipo:'Reunión', fecha:'', hora:'', descripcion:'', recurrente: false, dia_del_mes: null as number|null, recurrencia_activa: true };
const emptyFijo    = { titulo:'', tipo:'Pago', hora:'', descripcion:'', dia_del_mes: 1, recurrencia_activa: true };

export default function Calendario() {
  const { isOwner } = useAuth();
  const navigate    = useNavigate();
  const { toast }   = useToast();
  const hoy         = new Date();
  const hoyStr      = `${hoy.getFullYear()}-${String(hoy.getMonth()+1).padStart(2,'0')}-${String(hoy.getDate()).padStart(2,'0')}`;

  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes,  setMes]  = useState(hoy.getMonth());
  const [trabajos,  setTrabajos]  = useState<any[]>([]);
  const [clientes,  setClientes]  = useState<any[]>([]);
  const [eventos,   setEventos]   = useState<any[]>([]);
  const [fijos,     setFijos]     = useState<any[]>([]);
  const [diaSeleccionado, setDiaSeleccionado] = useState<string|null>(null);
  const [dialogOpen,      setDialogOpen]      = useState(false);
  const [fijoDialog,      setFijoDialog]      = useState(false);
  const [deleteId,        setDeleteId]        = useState<string|null>(null);
  const [deleteFijoId,    setDeleteFijoId]    = useState<string|null>(null);
  const [form,     setForm]     = useState<any>(emptyEvento);
  const [fijoForm, setFijoForm] = useState<any>(emptyFijo);
  const [vista,    setVista]    = useState<'mes'|'hoy'>('mes');

  const reload = async () => {
    const [{ data: t }, { data: c }, { data: e }, { data: f }] = await Promise.all([
      db.from('trabajos').select('id,descripcion_trabajo,fecha_entrega_estimada,estado,id_cliente')
        .not('fecha_entrega_estimada','is',null).not('estado','in','("Entregado","Cancelado")'),
      db.from('clientes').select('id,nombre_completo'),
      db.from('eventos_calendario').select('*').eq('recurrente', false).order('fecha'),
      db.from('eventos_calendario').select('*').eq('recurrente', true).eq('recurrencia_activa', true),
    ]);
    setTrabajos(t || []); setClientes(c || []);
    setEventos(e || []); setFijos(f || []);
  };

  useEffect(() => { reload(); }, []);

  const clienteNombre  = (id: string) => clientes.find(c => c.id === id)?.nombre_completo || '';
  const diasEnMes      = new Date(anio, mes + 1, 0).getDate();
  const primerDia      = new Date(anio, mes, 1).getDay();
  const toDateStr      = (d: number) => `${anio}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  // Genera eventos fijos para una fecha específica
  const fijosDeFecha = (fecha: string) => {
    const dia = parseInt(fecha.split('-')[2]);
    return fijos
      .filter(f => f.dia_del_mes === dia)
      .map(f => ({ ...f, tipo: 'fijo', esFijo: true }));
  };

  const eventosDelDia = (fecha: string) => {
    const trabajosDia = trabajos
      .filter(t => t.fecha_entrega_estimada === fecha)
      .map(t => ({ id:`t-${t.id}`, titulo: t.descripcion_trabajo, tipo:'trabajo', subtitulo: clienteNombre(t.id_cliente), link:`/trabajos/${t.id}` }));
    const eventosDia = eventos.filter(e => e.fecha === fecha);
    const fijosDia   = fijosDeFecha(fecha);
    return [...trabajosDia, ...eventosDia, ...fijosDia];
  };

  const eventosMes = () => {
    const mesStr = `${anio}-${String(mes+1).padStart(2,'0')}`;
    const diasMes = new Date(anio, mes+1, 0).getDate();
    const fijosMes = fijos.flatMap(f => {
      if (f.dia_del_mes > diasMes) return [];
      const fecha = `${mesStr}-${String(f.dia_del_mes).padStart(2,'0')}`;
      return [{ ...f, fecha, tipo:'fijo', esFijo: true }];
    });
    return [
      ...trabajos.filter(t => t.fecha_entrega_estimada?.startsWith(mesStr))
        .map(t => ({ ...t, tipo:'trabajo', titulo: t.descripcion_trabajo, fecha: t.fecha_entrega_estimada })),
      ...eventos.filter(e => e.fecha?.startsWith(mesStr)),
      ...fijosMes,
    ].sort((a,b) => a.fecha.localeCompare(b.fecha));
  };

  const eventosHoy = () => eventosDelDia(hoyStr);

  const prev = () => { if (mes===0){setMes(11);setAnio(a=>a-1);}else setMes(m=>m-1); };
  const next = () => { if (mes===11){setMes(0);setAnio(a=>a+1);}else setMes(m=>m+1); };

  const saveEvento = async () => {
    if (!form.titulo||!form.fecha){toast({title:'Título y fecha son requeridos',variant:'destructive'});return;}
    const data = { titulo:form.titulo, tipo:form.tipo, fecha:form.fecha, hora:form.hora||null, descripcion:form.descripcion||null, recurrente:false, recurrencia_activa:true };
    if (form.id) await db.from('eventos_calendario').update(data).eq('id',form.id);
    else          await db.from('eventos_calendario').insert(data);
    reload(); setDialogOpen(false); setForm(emptyEvento);
    toast({title:'✅ Evento guardado'});
  };

  const saveFijo = async () => {
    if (!fijoForm.titulo||!fijoForm.dia_del_mes){toast({title:'Título y día del mes requeridos',variant:'destructive'});return;}
    const data = { titulo:fijoForm.titulo, tipo:fijoForm.tipo, hora:fijoForm.hora||null, descripcion:fijoForm.descripcion||null, recurrente:true, dia_del_mes:Number(fijoForm.dia_del_mes), recurrencia_activa:true, fecha: hoyStr };
    if (fijoForm.id) await db.from('eventos_calendario').update(data).eq('id',fijoForm.id);
    else              await db.from('eventos_calendario').insert(data);
    reload(); setFijoDialog(false); setFijoForm(emptyFijo);
    toast({title:'✅ Evento fijo guardado — aparecerá cada mes'});
  };

  const deleteEvento = async () => {
    if (!deleteId) return;
    await db.from('eventos_calendario').delete().eq('id',deleteId);
    reload(); setDeleteId(null); toast({title:'Evento eliminado'});
  };

  const deleteFijo = async () => {
    if (!deleteFijoId) return;
    await db.from('eventos_calendario').delete().eq('id',deleteFijoId);
    reload(); setDeleteFijoId(null); toast({title:'Evento fijo eliminado'});
  };

  const toggleFijo = async (id: string, activo: boolean) => {
    await db.from('eventos_calendario').update({ recurrencia_activa: activo }).eq('id', id);
    reload();
  };

  const listaMes  = eventosMes();
  const listaHoy  = eventosHoy();

  return (
    <div className="page-container">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6"/>Calendario</h1>
        {isOwner && (
          <div className="flex gap-2 flex-wrap justify-end">
            <Button variant="outline" onClick={() => { setFijoForm(emptyFijo); setFijoDialog(true); }}>
              <RefreshCw className="h-4 w-4 mr-1"/>Evento Fijo
            </Button>
            <Button onClick={() => { setForm({...emptyEvento, fecha:hoyStr}); setDialogOpen(true); }}>
              <Plus className="h-4 w-4 mr-1"/>Nuevo Evento
            </Button>
          </div>
        )}
      </div>

      {/* Tabs Hoy / Mes */}
      <Tabs value={vista} onValueChange={v => setVista(v as any)}>
        <TabsList>
          <TabsTrigger value="hoy">
            📅 Hoy
            {listaHoy.length > 0 && <span className="ml-1.5 bg-primary text-primary-foreground text-[10px] px-1.5 rounded-full">{listaHoy.length}</span>}
          </TabsTrigger>
          <TabsTrigger value="mes">📆 Mes</TabsTrigger>
        </TabsList>

        {/* ══ VISTA HOY ══ */}
        <TabsContent value="hoy" className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground font-medium">
            {new Date(hoyStr+'T12:00:00').toLocaleDateString('es-DO',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}
          </p>
          {listaHoy.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground border rounded-xl bg-card">
              <Calendar className="h-10 w-10 mx-auto mb-2 opacity-30"/>
              <p className="text-sm">Sin eventos hoy</p>
              {isOwner && <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => { setForm({...emptyEvento, fecha:hoyStr}); setDialogOpen(true); }}><Plus className="h-3.5 w-3.5"/>Agregar</Button>}
            </div>
          ) : (
            <div className="space-y-2">
              {listaHoy.map((ev:any, idx:number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-xl border bg-card cursor-pointer hover:bg-secondary/30"
                  onClick={() => ev.tipo==='trabajo' ? navigate(`/trabajos/${ev.id}`) : null}>
                  <div className="w-1.5 h-12 rounded-full shrink-0" style={{backgroundColor: colorTipo[ev.tipo]||colorTipo['Otro']}}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{ev.titulo}</p>
                    <p className="text-xs text-muted-foreground">
                      {ev.hora ? `🕐 ${ev.hora}` : ''}
                      {ev.esFijo ? ' 🔁 Recurrente' : ''}
                      {ev.subtitulo ? ` · ${ev.subtitulo}` : ''}
                    </p>
                    {ev.descripcion && <p className="text-xs text-muted-foreground mt-0.5">{ev.descripcion}</p>}
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0" style={{borderColor: colorTipo[ev.tipo]||''}}>
                    {ev.tipo==='trabajo'?'Entrega':ev.tipo==='fijo'?ev.tipo_original||'Fijo':ev.tipo}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ══ VISTA MES ══ */}
        <TabsContent value="mes" className="mt-4 space-y-4">
          {/* Navegación */}
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" onClick={prev}><ChevronLeft className="h-5 w-5"/></Button>
            <h2 className="text-lg font-semibold">{MESES[mes]} {anio}</h2>
            <Button variant="ghost" size="icon" onClick={next}><ChevronRight className="h-5 w-5"/></Button>
          </div>

          {/* Grilla */}
          <div className="border rounded-xl overflow-hidden bg-card">
            <div className="grid grid-cols-7 border-b">
              {DIAS.map(d => <div key={d} className="text-center text-xs font-medium text-muted-foreground py-2">{d}</div>)}
            </div>
            <div className="grid grid-cols-7">
              {Array.from({length:primerDia}).map((_,i) => <div key={`e-${i}`} className="min-h-[80px] border-b border-r bg-secondary/20"/>)}
              {Array.from({length:diasEnMes}).map((_,i) => {
                const dia   = i+1;
                const fecha = toDateStr(dia);
                const esHoy = fecha===hoyStr;
                const evs   = eventosDelDia(fecha);
                return (
                  <div key={dia} onClick={() => setDiaSeleccionado(fecha)}
                    className={`min-h-[80px] border-b border-r p-1.5 cursor-pointer transition-colors hover:bg-secondary/40 ${esHoy?'bg-primary/5':''}`}>
                    <div className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full mb-1 ${esHoy?'bg-primary text-primary-foreground':'text-foreground'}`}>{dia}</div>
                    <div className="space-y-0.5">
                      {evs.slice(0,3).map((ev:any,idx:number) => (
                        <div key={idx} className="text-[10px] px-1 py-0.5 rounded truncate text-white font-medium flex items-center gap-0.5"
                          style={{backgroundColor: colorTipo[ev.tipo]||colorTipo['Otro']}} title={ev.titulo}>
                          {ev.esFijo && <span>🔁</span>}{ev.titulo}
                        </div>
                      ))}
                      {evs.length>3 && <div className="text-[10px] text-muted-foreground pl-1">+{evs.length-3} más</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Lista del mes */}
          {listaMes.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">Eventos de {MESES[mes]}</h3>
              {listaMes.map((ev:any,idx:number) => (
                <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-card border hover:bg-secondary/30 transition-colors cursor-pointer"
                  onClick={() => ev.tipo==='trabajo' ? navigate(`/trabajos/${ev.id}`) : setDiaSeleccionado(ev.fecha)}>
                  <div className="w-1.5 h-10 rounded-full shrink-0" style={{backgroundColor: colorTipo[ev.tipo]||colorTipo['Otro']}}/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{ev.titulo}{ev.esFijo?' 🔁':''}</p>
                    <p className="text-xs text-muted-foreground">{ev.fecha}{ev.hora?` · ${ev.hora}`:''}{ev.subtitulo?` · ${ev.subtitulo}`:''}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">
                    {ev.tipo==='trabajo'?'Entrega':ev.esFijo?'Fijo':ev.tipo}
                  </Badge>
                </div>
              ))}
            </div>
          )}

          {/* Eventos fijos configurados */}
          {isOwner && fijos.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><RefreshCw className="h-3.5 w-3.5"/>Eventos fijos configurados</h3>
              {fijos.map((f:any) => (
                <div key={f.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <div className="w-1.5 h-8 rounded-full shrink-0 bg-violet-500"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{f.titulo}</p>
                    <p className="text-xs text-muted-foreground">Día {f.dia_del_mes} de cada mes · {f.tipo}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => toggleFijo(f.id, !f.recurrencia_activa)}
                      className={`w-8 h-4 rounded-full transition-colors relative ${f.recurrencia_activa?'bg-primary':'bg-secondary'}`}>
                      <span className={`absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform ${f.recurrencia_activa?'translate-x-4':'translate-x-0.5'}`}/>
                    </button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteFijoId(f.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive"/>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* ── Dialog ver día ── */}
      <Dialog open={!!diaSeleccionado} onOpenChange={() => setDiaSeleccionado(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4"/>
              {diaSeleccionado && new Date(diaSeleccionado+'T12:00:00').toLocaleDateString('es-DO',{weekday:'long',day:'numeric',month:'long'})}
            </DialogTitle>
          </DialogHeader>
          {diaSeleccionado && (() => {
            const evs = eventosDelDia(diaSeleccionado);
            return (
              <div className="space-y-3">
                {evs.length===0 && <p className="text-sm text-muted-foreground text-center py-4">Sin eventos este día.</p>}
                {evs.map((ev:any,idx:number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/40">
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{backgroundColor: colorTipo[ev.tipo]||colorTipo['Otro']}}/>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{ev.titulo}{ev.esFijo?' 🔁':''}</p>
                      {ev.subtitulo && <p className="text-xs text-muted-foreground">{ev.subtitulo}</p>}
                      {ev.hora && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3"/>{ev.hora}</p>}
                      {ev.descripcion && <p className="text-xs text-muted-foreground mt-1">{ev.descripcion}</p>}
                      {ev.esFijo && <p className="text-xs text-violet-500 mt-1">🔁 Se repite el día {ev.dia_del_mes} de cada mes</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {ev.tipo==='trabajo' && (
                        <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => {setDiaSeleccionado(null);navigate(ev.link);}}>Ver</Button>
                      )}
                      {ev.tipo!=='trabajo' && !ev.esFijo && isOwner && (
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {setDeleteId(ev.id);setDiaSeleccionado(null);}}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive"/>
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {isOwner && (
                  <Button variant="outline" className="w-full gap-2 mt-2" onClick={() => {setForm({...emptyEvento,fecha:diaSeleccionado});setDiaSeleccionado(null);setDialogOpen(true);}}>
                    <Plus className="h-4 w-4"/>Agregar evento este día
                  </Button>
                )}
              </div>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* ── Dialog evento normal ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{form.id?'Editar':'Nuevo'} Evento</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Título *</Label><Input value={form.titulo} onChange={e => setForm({...form,titulo:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={form.tipo} onValueChange={v => setForm({...form,tipo:v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{tiposEvento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Hora</Label><Input type="time" value={form.hora||''} onChange={e => setForm({...form,hora:e.target.value})}/></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Fecha *</Label><Input type="date" value={form.fecha} onChange={e => setForm({...form,fecha:e.target.value})}/></div>
            <div className="grid gap-1.5"><Label className="text-xs">Descripción</Label><Textarea value={form.descripcion||''} onChange={e => setForm({...form,descripcion:e.target.value})} rows={2}/></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={saveEvento}>Guardar</Button></div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog evento fijo ── */}
      <Dialog open={fijoDialog} onOpenChange={setFijoDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><RefreshCw className="h-4 w-4"/>Evento Fijo Mensual</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">Se repetirá automáticamente cada mes en el día que indiques.</p>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Título * (ej: Pago de luz, Pago empleados)</Label><Input placeholder="Pago de luz EDESUR" value={fijoForm.titulo} onChange={e => setFijoForm({...fijoForm,titulo:e.target.value})}/></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label className="text-xs">Tipo</Label>
                <Select value={fijoForm.tipo} onValueChange={v => setFijoForm({...fijoForm,tipo:v})}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>{tiposEvento.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label className="text-xs">Día del mes *</Label>
                <Input type="number" min={1} max={31} placeholder="1-31" value={fijoForm.dia_del_mes||''} onChange={e => setFijoForm({...fijoForm,dia_del_mes:+e.target.value})}/>
              </div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Hora (opcional)</Label><Input type="time" value={fijoForm.hora||''} onChange={e => setFijoForm({...fijoForm,hora:e.target.value})}/></div>
            <div className="grid gap-1.5"><Label className="text-xs">Descripción (opcional)</Label><Textarea value={fijoForm.descripcion||''} onChange={e => setFijoForm({...fijoForm,descripcion:e.target.value})} rows={2}/></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setFijoDialog(false)}>Cancelar</Button><Button onClick={saveFijo}>Guardar</Button></div>
        </DialogContent>
      </Dialog>

      {/* Eliminar evento normal */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar evento?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteEvento}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* Eliminar evento fijo */}
      <AlertDialog open={!!deleteFijoId} onOpenChange={() => setDeleteFijoId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar evento fijo?</AlertDialogTitle><AlertDialogDescription>Dejará de aparecer en todos los meses.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteFijo}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}