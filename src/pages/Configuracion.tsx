import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Settings, Shield, CreditCard, Building2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { MODULOS } from '@/hooks/usePermisos';

const db = supabase as any;

export default function Configuracion() {
  const { toast } = useToast();
  const [config, setConfig]   = useState<Record<string, string>>({});
  const [saving, setSaving]   = useState(false);
  const [users, setUsers]     = useState<any[]>([]);
  const [roleDialog, setRoleDialog] = useState(false);
  const [newEmail, setNewEmail]     = useState('');
  const [newPass, setNewPass]       = useState('');
  const [newNombre, setNewNombre]   = useState('');
  const [newRole, setNewRole]       = useState<string>('employee');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Permisos por usuario
  const [permisosDialog, setPermisosDialog]   = useState(false);
  const [permisosUsuario, setPermisosUsuario] = useState<any>(null);
  const [permisosActivos, setPermisosActivos] = useState<Set<string>>(new Set());
  const [savingPermisos, setSavingPermisos]   = useState(false);

  // Permisos al crear nuevo usuario
  const [newPermisos, setNewPermisos] = useState<Set<string>>(
    new Set(MODULOS.map(m => m.key)) // todos activos por defecto
  );
  const [showNewPermisos, setShowNewPermisos] = useState(false);

  // Cuentas y tarjetas
  const [cuentas, setCuentas]           = useState<any[]>([]);
  const [tarjetas, setTarjetas]         = useState<any[]>([]);
  const [cuentaDialog, setCuentaDialog] = useState(false);
  const [tarjetaDialog, setTarjetaDialog] = useState(false);
  const [editCuenta, setEditCuenta]     = useState<any>(null);
  const [editTarjeta, setEditTarjeta]   = useState<any>(null);
  const [formCuenta, setFormCuenta]     = useState({ banco: '', ultimos4: '', tipo: 'Corriente' });
  const [formTarjeta, setFormTarjeta]   = useState({ nombre: '', ultimos4: '', banco: '' });

  const loadConfig = async () => {
    const { data } = await db.from('configuracion').select('clave, valor');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((d: any) => { map[d.clave] = d.valor; });
      setConfig(map);
      try { setCuentas(JSON.parse(map.cuentas_banco || '[]')); } catch { setCuentas([]); }
      try { setTarjetas(JSON.parse(map.tarjetas || '[]')); } catch { setTarjetas([]); }
    }
  };

  const loadUsers = async () => {
    const { data: roles }    = await db.from('user_roles').select('*');
    const { data: profiles } = await db.from('profiles').select('*');
    if (roles && profiles) {
      const merged = profiles.map((p: any) => ({
        ...p,
        role: roles.find((r: any) => r.user_id === p.user_id)?.role || 'sin rol',
      }));
      setUsers(merged);
    }
  };

  useEffect(() => { loadConfig(); loadUsers(); }, []);

  const updateVal = (key: string, val: string) => setConfig(prev => ({ ...prev, [key]: val }));

  const saveConfig = async () => {
    setSaving(true);
    for (const [clave, valor] of Object.entries(config)) {
      await db.from('configuracion').update({ valor }).eq('clave', clave);
    }
    setSaving(false);
    toast({ title: '✅ Configuración guardada' });
  };

  const saveCuentas = async (nuevas: any[]) => {
    await db.from('configuracion').upsert({ clave: 'cuentas_banco', valor: JSON.stringify(nuevas) }, { onConflict: 'clave' });
    setCuentas(nuevas);
  };

  const saveTarjetas = async (nuevas: any[]) => {
    await db.from('configuracion').upsert({ clave: 'tarjetas', valor: JSON.stringify(nuevas) }, { onConflict: 'clave' });
    setTarjetas(nuevas);
  };

  const handleSaveCuenta = async () => {
    if (!formCuenta.banco) { toast({ title: 'Nombre del banco requerido', variant: 'destructive' }); return; }
    const nombre = formCuenta.ultimos4 ? `${formCuenta.banco} ****${formCuenta.ultimos4}` : formCuenta.banco;
    let nuevas;
    if (editCuenta !== null) {
      nuevas = cuentas.map((c, i) => i === editCuenta ? { ...formCuenta, nombre } : c);
    } else {
      nuevas = [...cuentas, { ...formCuenta, nombre, id: Date.now().toString() }];
    }
    await saveCuentas(nuevas);
    setCuentaDialog(false); setEditCuenta(null);
    setFormCuenta({ banco: '', ultimos4: '', tipo: 'Corriente' });
    toast({ title: editCuenta !== null ? '✅ Cuenta actualizada' : '✅ Cuenta añadida' });
  };

  const handleSaveTarjeta = async () => {
    if (!formTarjeta.nombre) { toast({ title: 'Nombre requerido', variant: 'destructive' }); return; }
    const nombre = formTarjeta.ultimos4 ? `${formTarjeta.nombre} ****${formTarjeta.ultimos4}` : formTarjeta.nombre;
    let nuevas;
    if (editTarjeta !== null) {
      nuevas = tarjetas.map((t, i) => i === editTarjeta ? { ...formTarjeta, nombre } : t);
    } else {
      nuevas = [...tarjetas, { ...formTarjeta, nombre, id: Date.now().toString() }];
    }
    await saveTarjetas(nuevas);
    setTarjetaDialog(false); setEditTarjeta(null);
    setFormTarjeta({ nombre: '', ultimos4: '', banco: '' });
    toast({ title: editTarjeta !== null ? '✅ Tarjeta actualizada' : '✅ Tarjeta añadida' });
  };

  const deleteCuenta  = async (idx: number) => { await saveCuentas(cuentas.filter((_, i) => i !== idx)); toast({ title: 'Cuenta eliminada' }); };
  const deleteTarjeta = async (idx: number) => { await saveTarjetas(tarjetas.filter((_, i) => i !== idx)); toast({ title: 'Tarjeta eliminada' }); };

  // ── CREAR USUARIO ────────────────────────────────────────────
  const addUser = async () => {
    if (!newEmail || !newPass) { toast({ title: 'Email y contraseña requeridos', variant: 'destructive' }); return; }
    if (newPass.length < 6) { toast({ title: 'La contraseña debe tener al menos 6 caracteres', variant: 'destructive' }); return; }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newEmail, password: newPass,
        options: { data: { nombre: newNombre } },
      });
      if (error) throw error;
      if (!data.user) throw new Error('No se pudo crear el usuario');
      const uid = data.user.id;

      // 1. Asegurar perfil con nombre
      await db.from('profiles').upsert(
        { user_id: uid, email: newEmail, nombre: newNombre || '' },
        { onConflict: 'user_id' }
      );

      // 2. Asignar rol (owner o employee)
      await db.from('user_roles').insert({ user_id: uid, role: newRole });

      // 3. Insertar TODOS los módulos siempre
      //    owner → todos activos | employee → según checklist
      const rows = MODULOS.map(m => ({
        user_id: uid,
        modulo:  m.key,
        activo:  newRole === 'owner' ? true : newPermisos.has(m.key),
      }));
      await db.from('user_permisos').insert(rows);

      toast({ title: `✅ ${newRole === 'owner' ? 'Propietario' : 'Empleado'} creado correctamente` });
      setRoleDialog(false);
      setNewEmail(''); setNewPass(''); setNewNombre(''); setNewRole('employee');
      setNewPermisos(new Set(MODULOS.map(m => m.key)));
      setShowNewPermisos(false);
      loadUsers();
    } catch (err: any) {
      toast({ title: err.message || 'Error al crear usuario', variant: 'destructive' });
    }
  };

  // ── EDITAR PERMISOS ──────────────────────────────────────────
  const openPermisos = async (usuario: any) => {
    setPermisosUsuario(usuario);
    const { data } = await db.from('user_permisos')
      .select('modulo, activo')
      .eq('user_id', usuario.user_id);

    if (data && data.length > 0) {
      setPermisosActivos(new Set(data.filter((p: any) => p.activo).map((p: any) => p.modulo)));
    } else {
      // Si no tiene permisos aún, darle todos por defecto
      setPermisosActivos(new Set(MODULOS.map(m => m.key)));
    }
    setPermisosDialog(true);
  };

  const savePermisos = async () => {
    if (!permisosUsuario) return;
    setSavingPermisos(true);
    try {
      const rows = MODULOS.map(m => ({
        user_id: permisosUsuario.user_id,
        modulo:  m.key,
        activo:  permisosActivos.has(m.key),
      }));
      await db.from('user_permisos')
        .upsert(rows, { onConflict: 'user_id,modulo' });

      toast({ title: '✅ Permisos actualizados' });
      setPermisosDialog(false);
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' });
    } finally {
      setSavingPermisos(false);
    }
  };

  const togglePermiso = (key: string, set: Set<string>, setter: (s: Set<string>) => void) => {
    const nuevo = new Set(set);
    if (nuevo.has(key)) { nuevo.delete(key); } else { nuevo.add(key); }
    setter(nuevo);
  };

  // ── ELIMINAR USUARIO ─────────────────────────────────────────
  const deleteUser = async () => {
    if (!deleteUserId) return;
    await db.from('user_permisos').delete().eq('user_id', deleteUserId);
    await db.from('user_roles').delete().eq('user_id', deleteUserId);
    await db.from('profiles').delete().eq('user_id', deleteUserId);
    setDeleteUserId(null);
    loadUsers();
    toast({ title: 'Usuario eliminado' });
  };

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Settings className="h-6 w-6" /> Configuración</h1>

      <Tabs defaultValue="empresa">
        <TabsList className="flex-wrap">
          <TabsTrigger value="empresa">Empresa</TabsTrigger>
          <TabsTrigger value="pagos">Cuentas y Tarjetas</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios</TabsTrigger>
          <TabsTrigger value="factura">Factura</TabsTrigger>
        </TabsList>

        {/* EMPRESA */}
        <TabsContent value="empresa" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Datos de la Empresa</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="grid gap-1.5"><Label className="text-xs">Nombre</Label><Input value={config.empresa_nombre || ''} onChange={e => updateVal('empresa_nombre', e.target.value)} /></div>
                <div className="grid gap-1.5"><Label className="text-xs">RNC</Label><Input value={config.empresa_rnc || ''} onChange={e => updateVal('empresa_rnc', e.target.value)} placeholder="000-00000-0" /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Teléfono</Label><Input value={config.empresa_telefono || ''} onChange={e => updateVal('empresa_telefono', e.target.value)} /></div>
                <div className="grid gap-1.5"><Label className="text-xs">Email</Label><Input value={config.empresa_email || ''} onChange={e => updateVal('empresa_email', e.target.value)} /></div>
              </div>
              <div className="grid gap-1.5"><Label className="text-xs">Dirección</Label><Input value={config.empresa_direccion || ''} onChange={e => updateVal('empresa_direccion', e.target.value)} /></div>
              <div className="grid gap-1.5"><Label className="text-xs">WhatsApp para Alertas</Label><Input value={config.whatsapp_alertas || ''} onChange={e => updateVal('whatsapp_alertas', e.target.value)} placeholder="18095551234" /></div>
              <Button onClick={saveConfig} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* CUENTAS Y TARJETAS */}
        <TabsContent value="pagos" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4" /> Cuentas Bancarias</CardTitle>
                <Button size="sm" onClick={() => { setFormCuenta({ banco: '', ultimos4: '', tipo: 'Corriente' }); setEditCuenta(null); setCuentaDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {cuentas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay cuentas añadidas</p>
              ) : (
                <div className="space-y-2">
                  {cuentas.map((c, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div><p className="font-medium text-sm">{c.nombre}</p><p className="text-xs text-muted-foreground">{c.tipo}</p></div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setFormCuenta({ banco: c.banco, ultimos4: c.ultimos4, tipo: c.tipo }); setEditCuenta(i); setCuentaDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCuenta(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><CreditCard className="h-4 w-4" /> Tarjetas</CardTitle>
                <Button size="sm" onClick={() => { setFormTarjeta({ nombre: '', ultimos4: '', banco: '' }); setEditTarjeta(null); setTarjetaDialog(true); }}>
                  <Plus className="h-4 w-4 mr-1" /> Añadir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tarjetas.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No hay tarjetas añadidas</p>
              ) : (
                <div className="space-y-2">
                  {tarjetas.map((t, i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
                      <div><p className="font-medium text-sm">{t.nombre}</p>{t.banco && <p className="text-xs text-muted-foreground">{t.banco}</p>}</div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setFormTarjeta({ nombre: t.nombre, ultimos4: t.ultimos4, banco: t.banco }); setEditTarjeta(i); setTarjetaDialog(true); }}><Pencil className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTarjeta(i)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* USUARIOS */}
        <TabsContent value="usuarios" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4" /> Gestión de Usuarios</CardTitle>
                <Button size="sm" onClick={() => setRoleDialog(true)}><Plus className="h-4 w-4 mr-1" />Nuevo Usuario</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="w-[100px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 && (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin usuarios</TableCell></TableRow>
                  )}
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nombre || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell>
                        <Badge variant={u.role === 'owner' ? 'default' : u.role === 'sin rol' ? 'destructive' : 'outline'}>
                          {u.role === 'owner' ? '👑 Propietario' : u.role === 'sin rol' ? '⚠️ Sin rol' : '👤 Empleado'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          {u.role !== 'owner' && (
                            <Button variant="ghost" size="icon" title="Editar accesos" onClick={() => openPermisos(u)}>
                              <Shield className="h-4 w-4 text-primary" />
                            </Button>
                          )}
                          <Button variant="ghost" size="icon" onClick={() => setDeleteUserId(u.user_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FACTURA */}
        <TabsContent value="factura" className="mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Texto de Garantía</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-1.5">
                <Label className="text-xs">Este texto aparecerá al final de cada factura PDF</Label>
                <Textarea rows={4} value={config.garantia_texto || ''} onChange={e => updateVal('garantia_texto', e.target.value)} />
              </div>
              <Button onClick={saveConfig} disabled={saving}>{saving ? 'Guardando...' : 'Guardar'}</Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dialog Cuenta Bancaria ── */}
      <Dialog open={cuentaDialog} onOpenChange={setCuentaDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editCuenta !== null ? 'Editar Cuenta' : 'Nueva Cuenta Bancaria'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Banco *</Label><Input value={formCuenta.banco} onChange={e => setFormCuenta({ ...formCuenta, banco: e.target.value })} placeholder="Ej: Banreservas, BHD, Popular" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Últimos 4 dígitos (opcional)</Label><Input value={formCuenta.ultimos4} onChange={e => setFormCuenta({ ...formCuenta, ultimos4: e.target.value.slice(0, 4) })} placeholder="1234" maxLength={4} /></div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Tipo de cuenta</Label>
              <Select value={formCuenta.tipo} onValueChange={v => setFormCuenta({ ...formCuenta, tipo: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="Corriente">Corriente</SelectItem><SelectItem value="Ahorros">Ahorros</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCuentaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveCuenta}>{editCuenta !== null ? 'Actualizar' : 'Añadir'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Tarjeta ── */}
      <Dialog open={tarjetaDialog} onOpenChange={setTarjetaDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editTarjeta !== null ? 'Editar Tarjeta' : 'Nueva Tarjeta'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Nombre de la tarjeta *</Label><Input value={formTarjeta.nombre} onChange={e => setFormTarjeta({ ...formTarjeta, nombre: e.target.value })} placeholder="Ej: Visa, Master, American Express" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Banco emisor</Label><Input value={formTarjeta.banco} onChange={e => setFormTarjeta({ ...formTarjeta, banco: e.target.value })} placeholder="Ej: Popular, BHD" /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Últimos 4 dígitos (opcional)</Label><Input value={formTarjeta.ultimos4} onChange={e => setFormTarjeta({ ...formTarjeta, ultimos4: e.target.value.slice(0, 4) })} placeholder="5678" maxLength={4} /></div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setTarjetaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveTarjeta}>{editTarjeta !== null ? 'Actualizar' : 'Añadir'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Nuevo Usuario ── */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Nombre</Label><Input value={newNombre} onChange={e => setNewNombre(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Contraseña *</Label><Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} minLength={6} /></div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Rol</Label>
              <Select value={newRole} onValueChange={v => { setNewRole(v); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Propietario</SelectItem>
                  <SelectItem value="employee">Empleado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Checklist de módulos — solo visible si es empleado */}
            {newRole === 'employee' && (
              <div className="grid gap-2">
                <button
                  type="button"
                  className="flex items-center justify-between text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                  onClick={() => setShowNewPermisos(!showNewPermisos)}
                >
                  <span>Acceso a módulos ({newPermisos.size}/{MODULOS.length})</span>
                  {showNewPermisos ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
                {showNewPermisos && (
                  <div className="rounded-lg border p-3 grid grid-cols-2 gap-2">
                    {MODULOS.map(m => (
                      <label key={m.key} className="flex items-center gap-2 cursor-pointer select-none">
                        <Checkbox
                          checked={newPermisos.has(m.key)}
                          onCheckedChange={() => togglePermiso(m.key, newPermisos, setNewPermisos)}
                        />
                        <span className="text-xs">{m.label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRoleDialog(false)}>Cancelar</Button>
            <Button onClick={addUser}>Crear</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog Editar Permisos ── */}
      <Dialog open={permisosDialog} onOpenChange={setPermisosDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Accesos — {permisosUsuario?.nombre || permisosUsuario?.email}</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-2">
            Selecciona los módulos a los que este empleado puede acceder.
          </p>
          <div className="rounded-lg border p-4 grid grid-cols-2 gap-3 my-2">
            {MODULOS.map(m => (
              <label key={m.key} className="flex items-center gap-2 cursor-pointer select-none">
                <Checkbox
                  checked={permisosActivos.has(m.key)}
                  onCheckedChange={() => togglePermiso(m.key, permisosActivos, setPermisosActivos)}
                />
                <span className="text-sm">{m.label}</span>
              </label>
            ))}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPermisosDialog(false)}>Cancelar</Button>
            <Button onClick={savePermisos} disabled={savingPermisos}>
              {savingPermisos ? 'Guardando...' : 'Guardar accesos'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Confirmar eliminar usuario ── */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle>
            <AlertDialogDescription>Se removerá su acceso al sistema.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={deleteUser}>Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}