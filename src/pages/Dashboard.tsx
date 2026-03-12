import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Briefcase, Sunrise, Sunset, PlusCircle, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import StockAlerts from '@/components/StockAlerts';

const db = supabase as any;

export default function Dashboard() {
  const hoy = new Date().toISOString().slice(0, 10);
  const { toast } = useToast();
  const { isOwner } = useAuth();
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [allCaja, setAllCaja] = useState<any[]>([]);
  const [montoInicial, setMontoInicial] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogCierre, setDialogCierre] = useState(false);
  const [cajaAbierta, setCajaAbierta] = useState(false);
  const [cajaCerrada, setCajaCerrada] = useState(false);

  const load = async () => {
    const [{ data: t }, { data: c }] = await Promise.all([
      db.from('trabajos').select('*'),
      db.from('caja_movimientos').select('*'),
    ]);
    setTrabajos(t || []);
    setAllCaja(c || []);
    const hoyData = (c || []).filter((m: any) => m.fecha === hoy);
    setCajaAbierta(hoyData.some((m: any) => m.categoria_gasto === 'Apertura'));
    setCajaCerrada(hoyData.some((m: any) => m.categoria_gasto === 'Cierre'));
  };

  useEffect(() => { load(); }, []);

  const cajaHoy = allCaja.filter((m: any) => m.fecha === hoy);
  const ingresosHoy = cajaHoy.filter((m: any) => m.tipo === 'Entrada').reduce((s: number, m: any) => s + m.monto, 0);
  const gastosHoy = cajaHoy.filter((m: any) => m.tipo === 'Salida').reduce((s: number, m: any) => s + m.monto, 0);
  const balanceHoy = ingresosHoy - gastosHoy;
  const enProceso = trabajos.filter((t: any) => t.estado === 'En proceso' || t.estado === 'Pendiente').length;

  const handleRegistrarInicio = async () => {
    if (!montoInicial || montoInicial <= 0) { toast({ title: 'Ingresa un monto válido', variant: 'destructive' }); return; }
    const { error } = await db.from('caja_movimientos').insert({
      tipo: 'Entrada', fecha: hoy, monto: montoInicial,
      detalle: 'Inicio de caja del día', categoria_gasto: 'Apertura'
    });
    if (error) { toast({ title: 'Error al guardar', variant: 'destructive' }); return; }
    load(); setDialogOpen(false); setMontoInicial(0);
    toast({ title: `✅ Caja iniciada con ${formatCurrency(montoInicial)}` });
  };

  const handleCerrarCaja = async () => {
    const { error } = await db.from('caja_movimientos').insert({
      tipo: 'Salida', fecha: hoy, monto: 0,
      detalle: `Cierre de caja. Balance: ${formatCurrency(balanceHoy)}`,
      categoria_gasto: 'Cierre'
    });
    if (error) { toast({ title: 'Error al cerrar caja', variant: 'destructive' }); return; }
    load(); setDialogCierre(false);
    toast({ title: `🔒 Caja cerrada. Balance final: ${formatCurrency(balanceHoy)}` });
  };

  const estadoData = [
    { name: 'Pendiente', value: trabajos.filter((t: any) => t.estado === 'Pendiente').length },
    { name: 'En proceso', value: trabajos.filter((t: any) => t.estado === 'En proceso').length },
    { name: 'Finalizado', value: trabajos.filter((t: any) => t.estado === 'Finalizado').length },
    { name: 'Entregado', value: trabajos.filter((t: any) => t.estado === 'Entregado').length },
  ].filter(d => d.value > 0);
  const COLORS = ['hsl(39,93%,47%)', 'hsl(189,83%,27%)', 'hsl(152,60%,40%)', 'hsl(189,40%,60%)'];
  const cajaData = [{ name: 'Ingresos', valor: ingresosHoy }, { name: 'Gastos', valor: gastosHoy }];

  return (
    <div className="page-container">
      <StockAlerts />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <div className="flex items-center gap-2 flex-wrap">
          {isOwner && !cajaAbierta && (
            <Button size="sm" onClick={() => setDialogOpen(true)} className="gap-1.5">
              <PlusCircle className="h-4 w-4" /> Iniciar Caja
            </Button>
          )}
          {isOwner && cajaAbierta && !cajaCerrada && (
            <Button size="sm" variant="destructive" onClick={() => setDialogCierre(true)} className="gap-1.5">
              <Lock className="h-4 w-4" /> Cerrar Caja
            </Button>
          )}
          {cajaCerrada && (
            <Badge variant="outline" className="text-xs text-muted-foreground">🔒 Caja cerrada hoy</Badge>
          )}
          <Badge variant="outline" className="text-xs">{formatDate(hoy)}</Badge>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card"><CardContent className="p-0"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground font-medium">Ingresos Hoy</p><p className="text-xl lg:text-2xl font-bold text-success mt-1">{formatCurrency(ingresosHoy)}</p></div><Sunrise className="h-5 w-5 text-success shrink-0" /></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground font-medium">Gastos Hoy</p><p className="text-xl lg:text-2xl font-bold text-accent mt-1">{formatCurrency(gastosHoy)}</p></div><Sunset className="h-5 w-5 text-accent shrink-0" /></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground font-medium">Balance Hoy</p><p className={`text-xl lg:text-2xl font-bold mt-1 ${balanceHoy >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(balanceHoy)}</p></div><DollarSign className="h-5 w-5 text-primary shrink-0" /></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground font-medium">Trabajos Activos</p><p className="text-xl lg:text-2xl font-bold mt-1">{enProceso}</p></div><Briefcase className="h-5 w-5 text-primary shrink-0" /></div></CardContent></Card>
      </div>

      <Card><CardContent className="p-5">
        <h3 className="text-sm font-semibold mb-4">📋 Flujo de Caja del Día</h3>
        {cajaHoy.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sin movimientos hoy.</p> : (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {cajaHoy.map((m: any) => (
              <div key={m.id} className="flex items-center justify-between text-sm p-2.5 rounded-lg bg-secondary/50">
                <div className="flex items-center gap-2"><Badge variant={m.tipo === 'Entrada' ? 'default' : 'destructive'} className="text-[10px]">{m.tipo}</Badge><span>{m.detalle}</span></div>
                <span className={`font-semibold ${m.tipo === 'Entrada' ? 'text-success' : 'text-accent'}`}>{m.tipo === 'Entrada' ? '+' : '-'}{formatCurrency(m.monto)}</span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-3 border-t flex justify-between items-center">
          <span className="text-sm font-medium text-muted-foreground">Cierre del día</span>
          <span className={`text-lg font-bold ${balanceHoy >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(balanceHoy)}</span>
        </div>
      </CardContent></Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card><CardContent className="p-5"><h3 className="text-sm font-semibold mb-4">Caja Hoy</h3>
          <ResponsiveContainer width="100%" height={220}><BarChart data={cajaData}><CartesianGrid strokeDasharray="3 3" stroke="hsl(189,15%,85%)" /><XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip formatter={(v: number) => formatCurrency(v)} /><Bar dataKey="valor" radius={[6, 6, 0, 0]}><Cell fill="hsl(152,60%,40%)" /><Cell fill="hsl(20,93%,49%)" /></Bar></BarChart></ResponsiveContainer>
        </CardContent></Card>
        <Card><CardContent className="p-5"><h3 className="text-sm font-semibold mb-4">Trabajos por Estado</h3>
          <ResponsiveContainer width="100%" height={220}><PieChart><Pie data={estadoData} cx="50%" cy="50%" outerRadius={80} innerRadius={40} dataKey="value" label={({ name, value }) => `${name}: ${value}`} labelLine={false}>{estadoData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer>
        </CardContent></Card>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>💰 Iniciar Caja</DialogTitle></DialogHeader>
        <p className="text-sm text-muted-foreground">¿Con cuánto dinero inicias hoy?</p>
        <div className="grid gap-3 py-2"><div className="grid gap-1.5"><Label className="text-xs">Monto Inicial (RD$)</Label><Input type="number" placeholder="Ej: 15000" value={montoInicial || ''} onChange={e => setMontoInicial(+e.target.value)} /></div></div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button onClick={handleRegistrarInicio}>Registrar</Button></div>
      </DialogContent></Dialog>

      <Dialog open={dialogCierre} onOpenChange={setDialogCierre}><DialogContent className="max-w-sm"><DialogHeader><DialogTitle>🔒 Cerrar Caja del Día</DialogTitle></DialogHeader>
        <div className="py-2 space-y-2">
          <p className="text-sm text-muted-foreground">Resumen del día:</p>
          <div className="flex justify-between text-sm"><span>Ingresos:</span><span className="font-semibold text-success">{formatCurrency(ingresosHoy)}</span></div>
          <div className="flex justify-between text-sm"><span>Gastos:</span><span className="font-semibold text-accent">{formatCurrency(gastosHoy)}</span></div>
          <div className="flex justify-between text-sm font-bold border-t pt-2"><span>Balance Final:</span><span className={balanceHoy >= 0 ? 'text-success' : 'text-destructive'}>{formatCurrency(balanceHoy)}</span></div>
        </div>
        <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setDialogCierre(false)}>Cancelar</Button><Button variant="destructive" onClick={handleCerrarCaja}>Cerrar Caja</Button></div>
      </DialogContent></Dialog>
    </div>
  );
}