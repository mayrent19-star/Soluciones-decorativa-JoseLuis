import { useState, useEffect, useRef } from 'react';
import { Plus, Send, CheckCircle2, ImagePlus, Trash2, Megaphone, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

export default function Ofertas() {
  const [ofertas, setOfertas]             = useState<any[]>([]);
  const [etiquetas, setEtiquetas]         = useState<any[]>([]);
  const [dialogOpen, setDialogOpen]       = useState(false);
  const [deleteId, setDeleteId]           = useState<string | null>(null);
  const [ofertaAbierta, setOfertaAbierta] = useState<string | null>(null);
  const [detalles, setDetalles]           = useState<Record<string, { clientes: any[]; envios: Set<string> }>>({});
  const [form, setForm]       = useState({ titulo: '', mensaje: '', id_etiqueta: '' });
  const [fotoFile, setFotoFile]     = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [saving, setSaving]   = useState(false);
  const fileRef               = useRef<HTMLInputElement>(null);
  const { toast }             = useToast();

  const reload = async () => {
    const [{ data: o }, { data: e }] = await Promise.all([
      db.from('ofertas').select('*, cliente_etiquetas(nombre, color)').order('created_at', { ascending: false }),
      db.from('cliente_etiquetas').select('*').order('nombre'),
    ]);
    setOfertas(o || []);
    setEtiquetas(e || []);
  };

  useEffect(() => { reload(); }, []);

  const cargarDetalle = async (oferta: any) => {
    if (!oferta.id_etiqueta) return;
    const [{ data: rels }, { data: envios }] = await Promise.all([
      db.from('cliente_etiqueta_rel')
        .select('id_cliente, clientes(id, nombre_completo, telefono)')
        .eq('id_etiqueta', oferta.id_etiqueta),
      db.from('oferta_envios').select('id_cliente').eq('id_oferta', oferta.id),
    ]);
    const clientes = (rels || []).map((r: any) => r.clientes).filter(Boolean);
    const enviados = new Set<string>((envios || []).map((e: any) => e.id_cliente));
    setDetalles(prev => ({ ...prev, [oferta.id]: { clientes, envios: enviados } }));
  };

  const toggleOferta = async (oferta: any) => {
    if (ofertaAbierta === oferta.id) { setOfertaAbierta(null); return; }
    setOfertaAbierta(oferta.id);
    if (!detalles[oferta.id]) await cargarDetalle(oferta);
  };

  const enviar = async (oferta: any, cliente: any) => {
    const num = cliente.telefono.replace(/\D/g, '');
    // Incluir link de foto si existe
    const fotoTexto = oferta.foto_url
      ? `\n\n🖼️ Ver imagen de la oferta:\n${oferta.foto_url}`
      : '';
    const msg = encodeURIComponent(`${oferta.mensaje}${fotoTexto}`);
    window.open(`https://api.whatsapp.com/send?phone=1${num}&text=${msg}`, '_blank');
    await db.from('oferta_envios')
      .upsert({ id_oferta: oferta.id, id_cliente: cliente.id }, { onConflict: 'id_oferta,id_cliente' });
    setDetalles(prev => {
      const d = prev[oferta.id];
      if (!d) return prev;
      const nuevos = new Set(d.envios);
      nuevos.add(cliente.id);
      return { ...prev, [oferta.id]: { ...d, envios: nuevos } };
    });
  };

  const subirFoto = async (): Promise<string | null> => {
    if (!fotoFile) return null;
    const ext = fotoFile.name.split('.').pop();
    const path = `oferta-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('ofertas').upload(path, fotoFile, { upsert: true });
    if (error) return null;
    const { data } = supabase.storage.from('ofertas').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSave = async () => {
    if (!form.titulo || !form.mensaje || !form.id_etiqueta) {
      toast({ title: 'Completa todos los campos', variant: 'destructive' }); return;
    }
    setSaving(true);
    try {
      const foto_url = await subirFoto();
      await db.from('ofertas').insert({ titulo: form.titulo, mensaje: form.mensaje, id_etiqueta: form.id_etiqueta, foto_url });
      toast({ title: '✅ Oferta creada' });
      setDialogOpen(false);
      setForm({ titulo: '', mensaje: '', id_etiqueta: '' });
      setFotoFile(null); setFotoPreview(null);
      reload();
    } catch { toast({ title: 'Error al crear oferta', variant: 'destructive' }); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    await db.from('ofertas').delete().eq('id', deleteId);
    setDeleteId(null);
    if (ofertaAbierta === deleteId) setOfertaAbierta(null);
    reload();
    toast({ title: 'Oferta eliminada' });
  };

  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2"><Megaphone className="h-6 w-6" /> Ofertas</h1>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nueva Oferta</Button>
      </div>

      {ofertas.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <Megaphone className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">No hay ofertas creadas aún.</p>
          <p className="text-xs mt-1">Crea una oferta y envíala a un grupo de clientes por WhatsApp.</p>
        </div>
      )}

      <div className="space-y-3">
        {ofertas.map((o: any) => {
          const abierta  = ofertaAbierta === o.id;
          const detalle  = detalles[o.id];
          const tag      = o.cliente_etiquetas;
          const total    = detalle?.clientes.length ?? 0;
          const enviados = detalle?.envios.size ?? 0;

          return (
            <Card key={o.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base">{o.titulo}</CardTitle>
                      {tag && (
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                          style={{ backgroundColor: tag.color }}>{tag.nombre}</span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{o.mensaje}</p>
                  </div>
                  {o.foto_url && (
                    <img src={o.foto_url} alt="oferta" className="w-16 h-16 rounded-lg object-cover shrink-0 border" />
                  )}
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="flex items-center gap-3">
                    {detalle && (
                      <span className="text-xs text-muted-foreground">
                        <span className="text-green-600 font-semibold">{enviados}</span>/{total} enviados
                      </span>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setDeleteId(o.id)}>
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                  <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => toggleOferta(o)}>
                    {abierta ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    {abierta ? 'Cerrar' : 'Ver clientes'}
                  </Button>
                </div>
              </CardHeader>

              {abierta && (
                <CardContent className="pt-0 border-t">
                  {!detalle ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">Cargando...</p>
                  ) : detalle.clientes.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">
                      No hay clientes con la etiqueta <strong>{tag?.nombre}</strong> todavía.
                    </p>
                  ) : (
                    <div className="space-y-2 mt-3">
                      {detalle.clientes.map((c: any) => {
                        const yaEnviado = detalle.envios.has(c.id);
                        return (
                          <div key={c.id} className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/40">
                            <div>
                              <p className="text-sm font-medium">{c.nombre_completo}</p>
                              <p className="text-xs text-muted-foreground">{c.telefono}</p>
                            </div>
                            {yaEnviado ? (
                              <div className="flex items-center gap-1.5 text-green-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs font-medium">Enviado</span>
                              </div>
                            ) : (
                              <Button size="sm" className="gap-1.5 bg-green-600 hover:bg-green-700 text-white text-xs"
                                onClick={() => enviar(o, c)}>
                                <Send className="h-3.5 w-3.5" /> Enviar
                              </Button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>

      {/* Dialog Nueva Oferta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Nueva Oferta</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5">
              <Label className="text-xs">Título *</Label>
              <Input placeholder="Ej: Promoción de verano" value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Grupo de clientes *</Label>
              <Select value={form.id_etiqueta} onValueChange={v => setForm({ ...form, id_etiqueta: v })}>
                <SelectTrigger><SelectValue placeholder="Selecciona una etiqueta" /></SelectTrigger>
                <SelectContent>
                  {etiquetas.map(e => (
                    <SelectItem key={e.id} value={e.id}>
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: e.color }} />
                        {e.nombre}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Mensaje para WhatsApp *</Label>
              <Textarea placeholder="Escribe el mensaje que recibirán los clientes..."
                value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })} rows={4} />
              <p className="text-xs text-muted-foreground">Este texto se abrirá listo en WhatsApp para cada cliente.</p>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Foto de la oferta (opcional)</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
                const file = e.target.files?.[0];
                if (!file) return;
                setFotoFile(file);
                setFotoPreview(URL.createObjectURL(file));
              }} />
              {fotoPreview ? (
                <div className="relative">
                  <img src={fotoPreview} alt="preview" className="rounded-lg w-full h-40 object-cover border" />
                  <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-background/80"
                    onClick={() => { setFotoFile(null); setFotoPreview(null); }}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="gap-2 h-20 border-dashed w-full" onClick={() => fileRef.current?.click()}>
                  <ImagePlus className="h-5 w-5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Agregar foto</span>
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving}>{saving ? 'Guardando...' : 'Crear Oferta'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar oferta?</AlertDialogTitle>
            <AlertDialogDescription>Se eliminarán también todos los registros de envío.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}