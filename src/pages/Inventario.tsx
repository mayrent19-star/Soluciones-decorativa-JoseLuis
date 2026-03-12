import { useState, useEffect, useRef } from 'react';
import { Plus, Search, Pencil, Trash2, ArrowDownToLine, ArrowUpFromLine, ImagePlus, X, Camera, Tag, ZoomIn } from 'lucide-react';
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
import { fetchAll, insertRow, updateRow, deleteRow } from '@/lib/supabase-service';
import { formatCurrency, formatDate } from '@/utils/helpers';

const db = supabase as any;

// ── Materia prima ──────────────────────────────────────────────
const categorias = ['Tela', 'Madera', 'Espuma', 'Pegamento', 'Herramienta', 'Acabado', 'Otro'];
const unidades   = ['unidad', 'yarda', 'metro', 'pie', 'galón', 'plancha', 'caja', 'rollo'];
const emptyItem  = { nombre_item: '', categoria: 'Tela', unidad: 'unidad', stock_actual: 0, stock_minimo: 0, costo_unitario: 0, ubicacion: '' };
const emptyMov   = { id_item: '', tipo_movimiento: 'Entrada', cantidad: 0, motivo: '', fecha: new Date().toISOString().slice(0, 10), id_trabajo: '' };

// ── Muebles / Productos terminados ────────────────────────────
const emptyMueble = { nombre: '', descripcion: '', precio: 0, stock: 1, disponible: true };

// ── Galería de trabajos ───────────────────────────────────────
const emptyFotoGaleria = { titulo: '', descripcion: '', id_trabajo: '' };

// ── Subir imagen a un bucket ──────────────────────────────────
async function subirImagen(bucket: string, file: File): Promise<string | null> {
  const ext  = file.name.split('.').pop();
  const path = `${bucket}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) return null;
  return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

export default function Inventario() {
  const { isOwner } = useAuth();
  const { toast }   = useToast();

  // ── Estado: materia prima ──
  const [items, setItems]     = useState<any[]>([]);
  const [movs, setMovs]       = useState<any[]>([]);
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [search, setSearch]   = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm]       = useState<any>(emptyItem);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [movDialog, setMovDialog] = useState(false);
  const [movForm, setMovForm] = useState<any>(emptyMov);
  const [fotoFile, setFotoFile]     = useState<File | null>(null);
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoDialog, setFotoDialog] = useState<any>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Estado: muebles ──
  const [muebles, setMuebles]           = useState<any[]>([]);
  const [muebleDialog, setMuebleDialog] = useState(false);
  const [muebleForm, setMuebleForm]     = useState<any>(emptyMueble);
  const [muebleFotoFile, setMuebleFotoFile]     = useState<File | null>(null);
  const [muebleFotoPreview, setMuebleFotoPreview] = useState<string | null>(null);
  const [deleteMuebleId, setDeleteMuebleId] = useState<string | null>(null);
  const [muebleVer, setMuebleVer]       = useState<any>(null);
  const [searchMueble, setSearchMueble] = useState('');
  const muebleFileRef = useRef<HTMLInputElement>(null);

  // ── Estado: galería ──
  const [galeria, setGaleria]           = useState<any[]>([]);
  const [galeriaDialog, setGaleriaDialog] = useState(false);
  const [galeriaForm, setGaleriaForm]   = useState<any>(emptyFotoGaleria);
  const [galeriaFiles, setGaleriaFiles] = useState<File[]>([]);
  const [galeriaPreviews, setGaleriaPreviews] = useState<string[]>([]);
  const [galeriaVer, setGaleriaVer]     = useState<any>(null);
  const [uploadingGaleria, setUploadingGaleria] = useState(false);
  const galeriaFileRef = useRef<HTMLInputElement>(null);

  // ── Carga inicial ──
  const reload = async () => {
    const [inv, m, t] = await Promise.all([
      fetchAll('inventario', 'nombre_item', true),
      fetchAll('inventario_movimientos'),
      fetchAll('trabajos'),
    ]);
    setItems(inv); setMovs(m); setTrabajos(t);
  };

  const reloadMuebles = async () => {
    const { data } = await db.from('catalogo_muebles').select('*').order('nombre');
    setMuebles(data || []);
  };

  const reloadGaleria = async () => {
    const { data } = await db.from('galeria_trabajos')
      .select('*, trabajos(descripcion_trabajo)')
      .order('created_at', { ascending: false });
    setGaleria(data || []);
  };

  useEffect(() => { reload(); reloadMuebles(); reloadGaleria(); }, []);

  // ════════════════════════════════════════════════
  // MATERIA PRIMA
  // ════════════════════════════════════════════════
  const filtered = items.filter((i: any) =>
    i.nombre_item?.toLowerCase().includes(search.toLowerCase()) ||
    i.categoria?.toLowerCase().includes(search.toLowerCase())
  );

  const subirFotoItem = async (): Promise<string | null> => fotoFile ? subirImagen('inventario-fotos', fotoFile) : null;

  const handleSave = async () => {
    if (!form.nombre_item) { toast({ title: 'Nombre requerido', variant: 'destructive' }); return; }
    const fotoUrl = await subirFotoItem();
    const data    = { ...form };
    delete data.id; delete data.created_at; delete data.updated_at;
    if (fotoUrl) data.foto_url = fotoUrl;
    if (form.id) await updateRow('inventario', form.id, data);
    else          await insertRow('inventario', data);
    reload(); setDialogOpen(false); setForm(emptyItem);
    setFotoFile(null); setFotoPreview(null);
    toast({ title: form.id ? 'Artículo actualizado' : 'Artículo creado' });
  };

  const openEditItem = (i: any) => {
    setForm({ ...i }); setFotoFile(null); setFotoPreview(i.foto_url || null); setDialogOpen(true);
  };

  const handleDelete = async () => {
    if (deleteId) { await deleteRow('inventario', deleteId); reload(); setDeleteId(null); toast({ title: 'Artículo eliminado' }); }
  };

  const saveMov = async () => {
    if (!movForm.id_item || !movForm.cantidad || movForm.cantidad <= 0) {
      toast({ title: 'Completa los campos', variant: 'destructive' }); return;
    }
    const item = items.find((i: any) => i.id === movForm.id_item);
    if (!item) return;
    if (movForm.tipo_movimiento === 'Salida' && item.stock_actual < movForm.cantidad) {
      toast({ title: `Stock insuficiente. Disponible: ${item.stock_actual}`, variant: 'destructive' }); return;
    }
    const newStock = movForm.tipo_movimiento === 'Entrada'
      ? item.stock_actual + movForm.cantidad
      : item.stock_actual - movForm.cantidad;
    await updateRow('inventario', item.id, { stock_actual: newStock });
    await insertRow('inventario_movimientos', movForm);
    reload(); setMovDialog(false); setMovForm(emptyMov);
    toast({ title: `${movForm.tipo_movimiento} registrada` });
  };

  // ════════════════════════════════════════════════
  // MUEBLES / CATÁLOGO
  // ════════════════════════════════════════════════
  const filteredMuebles = muebles.filter((m: any) =>
    m.nombre?.toLowerCase().includes(searchMueble.toLowerCase())
  );

  const saveMueble = async () => {
    if (!muebleForm.nombre) { toast({ title: 'Nombre requerido', variant: 'destructive' }); return; }
    let foto_url = muebleForm.foto_url || null;
    if (muebleFotoFile) foto_url = await subirImagen('catalogo-muebles', muebleFotoFile);
    const data = { ...muebleForm, foto_url };
    delete data.id; delete data.created_at; delete data.updated_at;
    if (muebleForm.id) await db.from('catalogo_muebles').update(data).eq('id', muebleForm.id);
    else               await db.from('catalogo_muebles').insert(data);
    reloadMuebles(); setMuebleDialog(false); setMuebleForm(emptyMueble);
    setMuebleFotoFile(null); setMuebleFotoPreview(null);
    toast({ title: muebleForm.id ? 'Mueble actualizado' : 'Mueble agregado al catálogo' });
  };

  const openEditMueble = (m: any) => {
    setMuebleForm({ ...m }); setMuebleFotoFile(null); setMuebleFotoPreview(m.foto_url || null); setMuebleDialog(true);
  };

  const deleteMueble = async () => {
    if (deleteMuebleId) {
      await db.from('catalogo_muebles').delete().eq('id', deleteMuebleId);
      reloadMuebles(); setDeleteMuebleId(null); toast({ title: 'Mueble eliminado' });
    }
  };

  // ════════════════════════════════════════════════
  // GALERÍA
  // ════════════════════════════════════════════════
  const handleGaleriaFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setGaleriaFiles(prev => [...prev, ...files]);
    setGaleriaPreviews(prev => [...prev, ...files.map(f => URL.createObjectURL(f))]);
  };

  const removeGaleriaPreview = (idx: number) => {
    setGaleriaFiles(prev => prev.filter((_, i) => i !== idx));
    setGaleriaPreviews(prev => prev.filter((_, i) => i !== idx));
  };

  const saveGaleria = async () => {
    if (!galeriaFiles.length) { toast({ title: 'Agrega al menos una foto', variant: 'destructive' }); return; }
    setUploadingGaleria(true);
    try {
      for (const file of galeriaFiles) {
        const foto_url = await subirImagen('galeria-trabajos', file);
        if (foto_url) {
          await db.from('galeria_trabajos').insert({
            foto_url,
            titulo:      galeriaForm.titulo || null,
            descripcion: galeriaForm.descripcion || null,
            id_trabajo:  galeriaForm.id_trabajo || null,
          });
        }
      }
      reloadGaleria(); setGaleriaDialog(false);
      setGaleriaForm(emptyFotoGaleria); setGaleriaFiles([]); setGaleriaPreviews([]);
      toast({ title: `✅ ${galeriaFiles.length} foto(s) agregada(s)` });
    } finally { setUploadingGaleria(false); }
  };

  // ════════════════════════════════════════════════
  // RENDER
  // ════════════════════════════════════════════════
  return (
    <div className="page-container">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Inventario</h1>
        {/* Botones contextuales por pestaña se manejan dentro de cada TabsContent */}
      </div>

      <Tabs defaultValue="articulos">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="articulos">Materia Prima</TabsTrigger>
          <TabsTrigger value="muebles">Catálogo 🛋️</TabsTrigger>
          <TabsTrigger value="galeria">Galería 📸</TabsTrigger>
          <TabsTrigger value="movimientos">Movimientos ({movs.length})</TabsTrigger>
        </TabsList>

        {/* ══════════════ MATERIA PRIMA ══════════════ */}
        <TabsContent value="articulos" className="mt-4 space-y-4">
          {isOwner && (
            <div className="flex gap-2 flex-wrap justify-end">
              <Button variant="outline" onClick={() => { setMovForm({ ...emptyMov, tipo_movimiento: 'Entrada' }); setMovDialog(true); }}><ArrowDownToLine className="h-4 w-4 mr-1" />Entrada</Button>
              <Button variant="outline" onClick={() => { setMovForm({ ...emptyMov, tipo_movimiento: 'Salida' }); setMovDialog(true); }}><ArrowUpFromLine className="h-4 w-4 mr-1" />Salida</Button>
              <Button onClick={() => { setForm(emptyItem); setFotoFile(null); setFotoPreview(null); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Nuevo</Button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar artículo o categoría..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[52px]">Foto</TableHead>
                  <TableHead>Artículo</TableHead>
                  <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                  <TableHead className="text-right">Stock</TableHead>
                  <TableHead className="hidden sm:table-cell text-right">Mín</TableHead>
                  <TableHead className="hidden md:table-cell text-right">Costo</TableHead>
                  {isOwner && <TableHead className="w-[100px]">Acciones</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">Sin artículos</TableCell></TableRow>}
                {filtered.map((i: any) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      {i.foto_url
                        ? <img src={i.foto_url} alt={i.nombre_item}
                            className="w-9 h-9 rounded-md object-cover border cursor-pointer hover:opacity-80"
                            onClick={() => setFotoDialog(i)} />
                        : <div className="w-9 h-9 rounded-md bg-secondary flex items-center justify-center cursor-pointer hover:bg-secondary/70"
                            onClick={() => openEditItem(i)}>
                            <ImagePlus className="h-4 w-4 text-muted-foreground" />
                          </div>
                      }
                    </TableCell>
                    <TableCell className="font-medium">{i.nombre_item}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{i.categoria}</TableCell>
                    <TableCell className="text-right">
                      <Badge variant={i.stock_actual <= i.stock_minimo ? 'destructive' : 'secondary'}>
                        {i.stock_actual} {i.unidad}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell text-right text-muted-foreground">{i.stock_minimo}</TableCell>
                    <TableCell className="hidden md:table-cell text-right">{i.costo_unitario ? formatCurrency(i.costo_unitario) : '—'}</TableCell>
                    {isOwner && (
                      <TableCell>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" onClick={() => openEditItem(i)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(i.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ══════════════ CATÁLOGO MUEBLES ══════════════ */}
        <TabsContent value="muebles" className="mt-4 space-y-4">
          {isOwner && (
            <div className="flex justify-end">
              <Button onClick={() => { setMuebleForm(emptyMueble); setMuebleFotoFile(null); setMuebleFotoPreview(null); setMuebleDialog(true); }}>
                <Plus className="h-4 w-4 mr-1" />Agregar Mueble
              </Button>
            </div>
          )}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar mueble..." value={searchMueble} onChange={e => setSearchMueble(e.target.value)} className="pl-9" />
          </div>

          {filteredMuebles.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Tag className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay muebles en el catálogo.</p>
              <p className="text-xs mt-1">Agrega comedores, salas, sillas y más.</p>
            </div>
          )}

          {/* Grid tipo galería para muebles */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredMuebles.map((m: any) => (
              <div key={m.id}
                className="border rounded-xl overflow-hidden bg-card hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => setMuebleVer(m)}
              >
                {m.foto_url
                  ? <img src={m.foto_url} alt={m.nombre} className="w-full h-40 object-cover group-hover:opacity-95 transition-opacity" />
                  : <div className="w-full h-40 bg-secondary/50 flex items-center justify-center">
                      <ImagePlus className="h-8 w-8 text-muted-foreground/40" />
                    </div>
                }
                <div className="p-2.5">
                  <p className="font-semibold text-sm truncate">{m.nombre}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs font-bold text-primary">{m.precio ? formatCurrency(m.precio) : '—'}</span>
                    <Badge variant={m.disponible ? 'default' : 'secondary'} className="text-xs">
                      {m.disponible ? 'Disponible' : 'Vendido'}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ══════════════ GALERÍA ══════════════ */}
        <TabsContent value="galeria" className="mt-4 space-y-4">
          {isOwner && (
            <div className="flex justify-end">
              <Button onClick={() => { setGaleriaForm(emptyFotoGaleria); setGaleriaFiles([]); setGaleriaPreviews([]); setGaleriaDialog(true); }}>
                <Camera className="h-4 w-4 mr-1" />Agregar Fotos
              </Button>
            </div>
          )}

          {galeria.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Camera className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">La galería está vacía.</p>
              <p className="text-xs mt-1">Sube fotos de trabajos terminados para tener un portafolio visual.</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {galeria.map((g: any) => (
              <div key={g.id}
                className="relative rounded-xl overflow-hidden border aspect-square cursor-pointer group"
                onClick={() => setGaleriaVer(g)}
              >
                <img src={g.foto_url} alt={g.titulo || 'Trabajo'} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-end">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity p-2 w-full">
                    {g.titulo && <p className="text-white text-xs font-semibold truncate">{g.titulo}</p>}
                  </div>
                </div>
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <ZoomIn className="h-5 w-5 text-white drop-shadow" />
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* ══════════════ MOVIMIENTOS ══════════════ */}
        <TabsContent value="movimientos" className="mt-4">
          <div className="border rounded-lg overflow-x-auto bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Artículo</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movs.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Sin movimientos</TableCell></TableRow>}
                {movs.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{items.find((i: any) => i.id === m.id_item)?.nombre_item || '—'}</TableCell>
                    <TableCell><Badge variant={m.tipo_movimiento === 'Entrada' ? 'default' : 'destructive'}>{m.tipo_movimiento}</Badge></TableCell>
                    <TableCell className="text-right">{m.cantidad}</TableCell>
                    <TableCell className="hidden sm:table-cell text-muted-foreground">{m.motivo}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(m.fecha)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════ DIALOGS MATERIA PRIMA ════════ */}

      {/* Dialog crear/editar artículo */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{form.id ? 'Editar' : 'Nuevo'} Artículo</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid gap-1.5"><Label className="text-xs">Nombre *</Label><Input value={form.nombre_item || ''} onChange={e => setForm({ ...form, nombre_item: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label className="text-xs">Categoría</Label>
                <Select value={form.categoria} onValueChange={v => setForm({ ...form, categoria: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categorias.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Unidad</Label>
                <Select value={form.unidad} onValueChange={v => setForm({ ...form, unidad: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label className="text-xs">Stock Actual</Label><Input type="number" value={form.stock_actual || 0} onChange={e => setForm({ ...form, stock_actual: +e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Stock Mínimo</Label><Input type="number" value={form.stock_minimo || 0} onChange={e => setForm({ ...form, stock_minimo: +e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label className="text-xs">Costo Unit.</Label><Input type="number" value={form.costo_unitario || ''} onChange={e => setForm({ ...form, costo_unitario: +e.target.value || 0 })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Ubicación</Label><Input value={form.ubicacion || ''} onChange={e => setForm({ ...form, ubicacion: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Foto (opcional)</Label>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; setFotoFile(f); setFotoPreview(URL.createObjectURL(f)); }} />
              {fotoPreview
                ? <div className="relative"><img src={fotoPreview} alt="preview" className="rounded-lg w-full h-36 object-cover border" />
                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-background/80" onClick={() => { setFotoFile(null); setFotoPreview(null); setForm({ ...form, foto_url: null }); }}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                : <Button variant="outline" className="gap-2 h-16 border-dashed w-full" onClick={() => fileRef.current?.click()}><ImagePlus className="h-5 w-5 text-muted-foreground" /><span className="text-sm text-muted-foreground">Agregar foto</span></Button>
              }
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleSave}>Guardar</Button></div>
        </DialogContent>
      </Dialog>

      {/* Dialog movimiento */}
      <Dialog open={movDialog} onOpenChange={setMovDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{movForm.tipo_movimiento === 'Entrada' ? '📥 Entrada' : '📤 Salida'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Artículo *</Label>
              <Select value={movForm.id_item} onValueChange={v => setMovForm({ ...movForm, id_item: v })}>
                <SelectTrigger><SelectValue placeholder="Seleccionar" /></SelectTrigger>
                <SelectContent>{items.map((i: any) => <SelectItem key={i.id} value={i.id}>{i.nombre_item} (stock: {i.stock_actual})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label className="text-xs">Cantidad *</Label><Input type="number" value={movForm.cantidad || ''} onChange={e => setMovForm({ ...movForm, cantidad: +e.target.value })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Fecha</Label><Input type="date" value={movForm.fecha} onChange={e => setMovForm({ ...movForm, fecha: e.target.value })} /></div>
            </div>
            <div className="grid gap-1.5"><Label className="text-xs">Motivo</Label><Input value={movForm.motivo || ''} onChange={e => setMovForm({ ...movForm, motivo: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Trabajo (opcional)</Label>
              <Select value={movForm.id_trabajo || 'ninguno'} onValueChange={v => setMovForm({ ...movForm, id_trabajo: v === 'ninguno' ? null : v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{trabajos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.descripcion_trabajo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMovDialog(false)}>Cancelar</Button><Button onClick={saveMov}>Registrar</Button></div>
        </DialogContent>
      </Dialog>

      {/* Dialog ver foto artículo ampliada */}
      <Dialog open={!!fotoDialog} onOpenChange={() => setFotoDialog(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              {fotoDialog?.nombre_item}
              <Badge variant="outline" className="font-normal">{fotoDialog?.categoria}</Badge>
            </DialogTitle>
          </DialogHeader>
          {fotoDialog?.foto_url && (
            <div className="space-y-3">
              <img src={fotoDialog.foto_url} alt={fotoDialog.nombre_item} className="w-full rounded-lg object-contain max-h-80 border bg-secondary/20" />
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Stock:</span> <span className="font-semibold">{fotoDialog.stock_actual} {fotoDialog.unidad}</span></div>
                <div><span className="text-muted-foreground">Mínimo:</span> <span className="font-semibold">{fotoDialog.stock_minimo}</span></div>
                {fotoDialog.costo_unitario > 0 && <div><span className="text-muted-foreground">Costo:</span> <span className="font-semibold">{formatCurrency(fotoDialog.costo_unitario)}</span></div>}
                {fotoDialog.ubicacion && <div><span className="text-muted-foreground">Ubicación:</span> <span className="font-semibold">{fotoDialog.ubicacion}</span></div>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ════════ DIALOGS MUEBLES ════════ */}

      {/* Dialog crear/editar mueble */}
      <Dialog open={muebleDialog} onOpenChange={setMuebleDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{muebleForm.id ? 'Editar' : 'Agregar'} Mueble</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 max-h-[70vh] overflow-y-auto pr-1">
            <div className="grid gap-1.5"><Label className="text-xs">Nombre *</Label><Input placeholder="Ej: Comedor 6 puestos" value={muebleForm.nombre || ''} onChange={e => setMuebleForm({ ...muebleForm, nombre: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Descripción</Label><Textarea placeholder="Materiales, dimensiones, acabados..." value={muebleForm.descripcion || ''} onChange={e => setMuebleForm({ ...muebleForm, descripcion: e.target.value })} rows={3} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-1.5"><Label className="text-xs">Precio</Label><Input type="number" value={muebleForm.precio || ''} onChange={e => setMuebleForm({ ...muebleForm, precio: +e.target.value || 0 })} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">Cantidad disponible</Label><Input type="number" value={muebleForm.stock || 1} onChange={e => setMuebleForm({ ...muebleForm, stock: +e.target.value })} /></div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs">Disponible para venta</Label>
              <button type="button"
                onClick={() => setMuebleForm({ ...muebleForm, disponible: !muebleForm.disponible })}
                className={`w-10 h-5 rounded-full transition-colors ${muebleForm.disponible ? 'bg-primary' : 'bg-secondary'} relative`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform shadow ${muebleForm.disponible ? 'translate-x-5' : 'translate-x-0.5'}`} />
              </button>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Foto del mueble</Label>
              <input ref={muebleFileRef} type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; setMuebleFotoFile(f); setMuebleFotoPreview(URL.createObjectURL(f)); }} />
              {muebleFotoPreview
                ? <div className="relative"><img src={muebleFotoPreview} alt="preview" className="rounded-lg w-full h-48 object-cover border" />
                    <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-7 w-7 bg-background/80" onClick={() => { setMuebleFotoFile(null); setMuebleFotoPreview(null); setMuebleForm({ ...muebleForm, foto_url: null }); }}><X className="h-3.5 w-3.5 text-destructive" /></Button>
                  </div>
                : <Button variant="outline" className="gap-2 h-24 border-dashed w-full" onClick={() => muebleFileRef.current?.click()}><ImagePlus className="h-6 w-6 text-muted-foreground" /><span className="text-sm text-muted-foreground">Agregar foto</span></Button>
              }
            </div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setMuebleDialog(false)}>Cancelar</Button><Button onClick={saveMueble}>Guardar</Button></div>
        </DialogContent>
      </Dialog>

      {/* Dialog ver mueble detalle */}
      <Dialog open={!!muebleVer} onOpenChange={() => setMuebleVer(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{muebleVer?.nombre}</DialogTitle></DialogHeader>
          {muebleVer && (
            <div className="space-y-3">
              {muebleVer.foto_url && <img src={muebleVer.foto_url} alt={muebleVer.nombre} className="w-full rounded-lg object-cover max-h-64 border" />}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div><span className="text-muted-foreground">Precio:</span> <span className="font-bold text-primary">{muebleVer.precio ? formatCurrency(muebleVer.precio) : '—'}</span></div>
                <div><span className="text-muted-foreground">Stock:</span> <span className="font-semibold">{muebleVer.stock} unidad(es)</span></div>
                <div className="col-span-2">
                  <Badge variant={muebleVer.disponible ? 'default' : 'secondary'}>{muebleVer.disponible ? '✅ Disponible' : 'No disponible'}</Badge>
                </div>
                {muebleVer.descripcion && <div className="col-span-2"><span className="text-muted-foreground">Descripción:</span><p className="font-medium mt-0.5">{muebleVer.descripcion}</p></div>}
              </div>
              {isOwner && (
                <div className="flex gap-2 pt-2">
                  <Button variant="outline" className="flex-1" onClick={() => { openEditMueble(muebleVer); setMuebleVer(null); }}>
                    <Pencil className="h-4 w-4 mr-1" /> Editar
                  </Button>
                  <Button variant="destructive" size="icon" onClick={() => { setDeleteMuebleId(muebleVer.id); setMuebleVer(null); }}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog eliminar mueble */}
      <AlertDialog open={!!deleteMuebleId} onOpenChange={() => setDeleteMuebleId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar mueble?</AlertDialogTitle><AlertDialogDescription>Se eliminará del catálogo permanentemente.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteMueble}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>

      {/* ════════ DIALOGS GALERÍA ════════ */}

      {/* Dialog subir fotos a galería */}
      <Dialog open={galeriaDialog} onOpenChange={setGaleriaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>📸 Agregar fotos a la galería</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Título (opcional)</Label><Input placeholder="Ej: Sala tapizada en lino" value={galeriaForm.titulo} onChange={e => setGaleriaForm({ ...galeriaForm, titulo: e.target.value })} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Descripción (opcional)</Label><Textarea placeholder="Materiales usados, cliente, etc." value={galeriaForm.descripcion} onChange={e => setGaleriaForm({ ...galeriaForm, descripcion: e.target.value })} rows={2} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Trabajo relacionado (opcional)</Label>
              <Select value={galeriaForm.id_trabajo || 'ninguno'} onValueChange={v => setGaleriaForm({ ...galeriaForm, id_trabajo: v === 'ninguno' ? '' : v })}>
                <SelectTrigger><SelectValue placeholder="Ninguno" /></SelectTrigger>
                <SelectContent><SelectItem value="ninguno">Ninguno</SelectItem>{trabajos.map((t: any) => <SelectItem key={t.id} value={t.id}>{t.descripcion_trabajo}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Fotos * (puedes seleccionar varias)</Label>
              <input ref={galeriaFileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleGaleriaFiles} />
              {galeriaPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2">
                  {galeriaPreviews.map((src, idx) => (
                    <div key={idx} className="relative aspect-square">
                      <img src={src} className="w-full h-full object-cover rounded-lg border" />
                      <button onClick={() => removeGaleriaPreview(idx)}
                        className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold shadow">×</button>
                    </div>
                  ))}
                  <button onClick={() => galeriaFileRef.current?.click()}
                    className="aspect-square border-2 border-dashed rounded-lg flex items-center justify-center hover:bg-secondary/50 transition-colors">
                    <Plus className="h-6 w-6 text-muted-foreground" />
                  </button>
                </div>
              )}
              {galeriaPreviews.length === 0 && (
                <Button variant="outline" className="gap-2 h-20 border-dashed w-full" onClick={() => galeriaFileRef.current?.click()}>
                  <Camera className="h-6 w-6 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Seleccionar fotos</span>
                </Button>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setGaleriaDialog(false)}>Cancelar</Button>
            <Button onClick={saveGaleria} disabled={uploadingGaleria}>{uploadingGaleria ? 'Subiendo...' : `Subir ${galeriaFiles.length || ''} foto${galeriaFiles.length !== 1 ? 's' : ''}`}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog ver foto galería ampliada */}
      <Dialog open={!!galeriaVer} onOpenChange={() => setGaleriaVer(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{galeriaVer?.titulo || 'Trabajo realizado'}</DialogTitle></DialogHeader>
          {galeriaVer && (
            <div className="space-y-3">
              <img src={galeriaVer.foto_url} alt={galeriaVer.titulo || 'foto'} className="w-full rounded-lg object-contain max-h-80 border bg-secondary/10" />
              {galeriaVer.descripcion && <p className="text-sm text-muted-foreground">{galeriaVer.descripcion}</p>}
              {galeriaVer.trabajos?.descripcion_trabajo && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Trabajo: {galeriaVer.trabajos.descripcion_trabajo}</Badge>
                </div>
              )}
              <p className="text-xs text-muted-foreground">{formatDate(galeriaVer.created_at)}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Alert eliminar artículo */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>¿Eliminar artículo?</AlertDialogTitle><AlertDialogDescription>Esta acción no se puede deshacer.</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={handleDelete}>Eliminar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
