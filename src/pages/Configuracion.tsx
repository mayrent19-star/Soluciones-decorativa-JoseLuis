import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Trash2, Settings, Shield, CreditCard, Building2, Pencil } from 'lucide-react';

const db = supabase as any;

export default function Configuracion() {
  const { toast } = useToast();
  const [config, setConfig] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [roleDialog, setRoleDialog] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newPass, setNewPass] = useState('');
  const [newNombre, setNewNombre] = useState('');
  const [newRole, setNewRole] = useState<string>('employee');
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);

  // Cuentas y tarjetas
  const [cuentas, setCuentas] = useState<any[]>([]);
  const [tarjetas, setTarjetas] = useState<any[]>([]);
  const [cuentaDialog, setCuentaDialog] = useState(false);
  const [tarjetaDialog, setTarjetaDialog] = useState(false);
  const [editCuenta, setEditCuenta] = useState<any>(null);
  const [editTarjeta, setEditTarjeta] = useState<any>(null);
  const [formCuenta, setFormCuenta] = useState({ banco: '', ultimos4: '', tipo: 'Corriente' });
  const [formTarjeta, setFormTarjeta] = useState({ nombre: '', ultimos4: '', banco: '' });

  const loadConfig = async () => {
    const { data } = await db.from('configuracion').select('clave, valor');
    if (data) {
      const map: Record<string, string> = {};
      data.forEach((d: any) => { map[d.clave] = d.valor; });
      setConfig(map);
      // Cargar cuentas y tarjetas desde config
      try { setCuentas(JSON.parse(map.cuentas_banco || '[]')); } catch { setCuentas([]); }
      try { setTarjetas(JSON.parse(map.tarjetas || '[]')); } catch { setTarjetas([]); }
    }
  };

  const loadUsers = async () => {
    const { data: roles } = await db.from('user_roles').select('*');
    const { data: profiles } = await db.from('profiles').select('*');
    if (roles && profiles) {
      const merged = profiles.map((p: any) => ({
        ...p,
        role: roles.find((r: any) => r.user_id === p.user_id)?.role || 'sin rol'
      }));
      setUsers(merged);
    }
  };

  useEffect(() => { loadConfig(); loadUsers(); }, []);

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
    setCuentaDialog(false);
    setEditCuenta(null);
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
    setTarjetaDialog(false);
    setEditTarjeta(null);
    setFormTarjeta({ nombre: '', ultimos4: '', banco: '' });
    toast({ title: editTarjeta !== null ? '✅ Tarjeta actualizada' : '✅ Tarjeta añadida' });
  };

  const deleteCuenta = async (idx: number) => {
    const nuevas = cuentas.filter((_, i) => i !== idx);
    await saveCuentas(nuevas);
    toast({ title: 'Cuenta eliminada' });
  };

  const deleteTarjeta = async (idx: number) => {
    const nuevas = tarjetas.filter((_, i) => i !== idx);
    await saveTarjetas(nuevas);
    toast({ title: 'Tarjeta eliminada' });
  };

  const addUser = async () => {
    if (!newEmail || !newPass) { toast({ title: 'Email y contraseña requeridos', variant: 'destructive' }); return; }
    try {
      const { data, error } = await supabase.auth.signUp({
        email: newEmail, password: newPass,
        options: { data: { nombre: newNombre } }
      });
      if (error) throw error;
      if (data.user) {
        await db.from('user_roles').insert({ user_id: data.user.id, role: newRole });
      }
      toast({ title: '✅ Usuario creado' });
      setRoleDialog(false);
      setNewEmail(''); setNewPass(''); setNewNombre('');
      loadUsers();
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' });
    }
  };

  const deleteUser = async () => {
    if (!deleteUserId) return;
    await db.from('user_roles').delete().eq('user_id', deleteUserId);
    await db.from('profiles').delete().eq('user_id', deleteUserId);
    setDeleteUserId(null);
    loadUsers();
    toast({ title: 'Usuario eliminado' });
  };

  const updateVal = (key: string, val: string) => setConfig(prev => ({ ...prev, [key]: val }));

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
          {/* Cuentas bancarias */}
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
                      <div>
                        <p className="font-medium text-sm">{c.nombre}</p>
                        <p className="text-xs text-muted-foreground">{c.tipo}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setFormCuenta({ banco: c.banco, ultimos4: c.ultimos4, tipo: c.tipo }); setEditCuenta(i); setCuentaDialog(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteCuenta(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tarjetas */}
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
                      <div>
                        <p className="font-medium text-sm">{t.nombre}</p>
                        {t.banco && <p className="text-xs text-muted-foreground">{t.banco}</p>}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" onClick={() => { setFormTarjeta({ nombre: t.nombre, ultimos4: t.ultimos4, banco: t.banco }); setEditTarjeta(i); setTarjetaDialog(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTarjeta(i)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
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
                    <TableHead className="w-[60px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin usuarios</TableCell></TableRow>}
                  {users.map(u => (
                    <TableRow key={u.id}>
                      <TableCell className="font-medium">{u.nombre || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                      <TableCell><Badge variant={u.role === 'owner' ? 'default' : 'outline'}>{u.role === 'owner' ? 'Propietario' : 'Empleado'}</Badge></TableCell>
                      <TableCell>
                        {u.role !== 'owner' && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteUserId(u.user_id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
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

      {/* Dialog Cuenta Bancaria */}
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
                <SelectContent>
                  <SelectItem value="Corriente">Corriente</SelectItem>
                  <SelectItem value="Ahorros">Ahorros</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setCuentaDialog(false)}>Cancelar</Button>
            <Button onClick={handleSaveCuenta}>{editCuenta !== null ? 'Actualizar' : 'Añadir'}</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Tarjeta */}
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

      {/* Dialog Nuevo Usuario */}
      <Dialog open={roleDialog} onOpenChange={setRoleDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Nuevo Usuario</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-1.5"><Label className="text-xs">Nombre</Label><Input value={newNombre} onChange={e => setNewNombre(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Email *</Label><Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label className="text-xs">Contraseña *</Label><Input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} minLength={6} /></div>
            <div className="grid gap-1.5">
              <Label className="text-xs">Rol</Label>
              <Select value={newRole} onValueChange={setNewRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="owner">Propietario</SelectItem>
                  <SelectItem value="employee">Empleado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRoleDialog(false)}>Cancelar</Button>
            <Button onClick={addUser}>Crear</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmar eliminar usuario */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>¿Eliminar usuario?</AlertDialogTitle><AlertDialogDescription>Se removerá su acceso al sistema.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={deleteUser}>Eliminar</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}