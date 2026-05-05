import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Briefcase, Sunrise, Sunset, AlertTriangle, ShoppingBag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency, formatDate } from '@/utils/helpers';
import { useAuth } from '@/hooks/useAuth';
import StockAlerts from '@/components/StockAlerts';

const db = supabase as any;

export default function Dashboard() {
  const hoy = new Date().toISOString().slice(0, 10);
  const { isOwner } = useAuth();
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [allCaja, setAllCaja] = useState<any[]>([]);
  const [cajaAbierta, setCajaAbierta] = useState(false);

  const [pagos, setPagos]     = useState<any[]>([]);
  const [invCasa, setInvCasa] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);

  const load = async () => {
    const [{ data: t }, { data: c }, { data: estado }, { data: p }, { data: ic }, { data: cl }] = await Promise.all([
      db.from('trabajos').select('*, clientes(nombre_completo)'),
      db.from('caja_movimientos').select('*'),
      db.from('caja_estado').select('*').limit(1).single(),
      db.from('trabajo_pagos').select('*'),
      db.from('inventario_casa').select('*').eq('estado', 'Listo para vender'),
      db.from('clientes').select('id, nombre_completo'),
    ]);
    setTrabajos(t || []);
    setAllCaja(c || []);
    setCajaAbierta(estado?.abierta === true);
    setPagos(p || []);
    setInvCasa(ic || []);
    setClientes(cl || []);
  };

  useEffect(() => { load(); }, []);

  const cajaHoy = allCaja.filter((m: any) => m.fecha === hoy);
  const ingresosHoy = cajaHoy.filter((m: any) => m.tipo === 'Entrada').reduce((s: number, m: any) => s + m.monto, 0);
  const gastosHoy = cajaHoy.filter((m: any) => m.tipo === 'Salida').reduce((s: number, m: any) => s + m.monto, 0);
  const balanceHoy = ingresosHoy - gastosHoy;
  const enProceso = trabajos.filter((t: any) => t.estado === 'En proceso' || t.estado === 'Sin iniciar').length;

  // Por cobrar — trabajos con saldo pendiente
  const porCobrar = trabajos.filter((t: any) => !['Cancelado'].includes(t.estado)).reduce((s: number, t: any) => {
    const monto = t.monto_final || t.monto_cotizado || 0;
    const totalPagado = pagos.filter((p: any) => p.id_trabajo === t.id).reduce((ps: number, p: any) => ps + p.monto, 0);
    const abono = t.abono || 0;
    const pagado = Math.max(totalPagado, abono);
    return s + Math.max(0, monto - pagado);
  }, 0);

  // Trabajos atrasados
  const hoyDate = new Date(hoy);
  const atrasados = trabajos.filter((t: any) => {
    if (!t.fecha_entrega_estimada) return false;
    if (['Entregado','Cancelado'].includes(t.estado)) return false;
    return new Date(t.fecha_entrega_estimada) < hoyDate;
  });

  // Por local
  const porLocal = {
    taller:   trabajos.filter((t: any) => !['Entregado','Cancelado'].includes(t.estado) && (t.local_trabajo === 'Taller' || t.local_trabajo === 'Almacén Taller' || !t.local_trabajo)).length,
    mercedes: trabajos.filter((t: any) => !['Entregado','Cancelado'].includes(t.estado) && (t.local_trabajo === 'Local Mercedes' || t.local_trabajo === 'Almacén Mercedes')).length,
    calle8:   trabajos.filter((t: any) => !['Entregado','Cancelado'].includes(t.estado) && t.local_trabajo === 'Local Calle 8').length,
  };


  // Trabajos del día
  const enProcesoHoy   = trabajos.filter((t: any) => t.estado === 'En proceso'  && t.updated_at?.slice(0,10) === hoy);
  const finalizadosHoy = trabajos.filter((t: any) => t.estado === 'Finalizado'  && t.fecha_finalizado === hoy);
  const entregadosHoy  = trabajos.filter((t: any) => t.estado === 'Entregado'   && t.updated_at?.slice(0,10) === hoy);

  const clienteNombre = (t: any) => t.clientes?.nombre_completo || t.nombre_libre || 'Sin cliente';

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
          <Badge variant={cajaAbierta ? 'default' : 'secondary'} className={cajaAbierta ? 'bg-green-600 text-white' : ''}>
            {cajaAbierta ? '🟢 Caja abierta' : '🔴 Caja cerrada'}
          </Badge>
          <Badge variant="outline" className="text-xs">{formatDate(hoy)}</Badge>
        </div>
      </div>

      {/* Alertas urgentes */}
      {(atrasados.length > 0 || porCobrar > 0) && (
        <div className="space-y-2">
          {atrasados.length > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-destructive/50 bg-destructive/5">
              <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-destructive">{atrasados.length} trabajo{atrasados.length > 1 ? 's' : ''} atrasado{atrasados.length > 1 ? 's' : ''}</p>
                <p className="text-xs text-muted-foreground">{atrasados.map((t: any) => t.clientes?.nombre_completo || t.nombre_libre || 'Sin cliente').join(', ')}</p>
              </div>
            </div>
          )}
          {porCobrar > 0 && (
            <div className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/50 bg-amber-50/50 dark:bg-amber-950/20">
              <DollarSign className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">Por cobrar: {formatCurrency(porCobrar)}</p>
                <p className="text-xs text-muted-foreground">En trabajos activos y finalizados</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats principales */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="stat-card"><CardContent className="p-0"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground font-medium">Ingresos Hoy</p><p className="text-xl lg:text-2xl font-bold text-success mt-1">{formatCurrency(ingresosHoy)}</p></div><Sunrise className="h-5 w-5 text-success shrink-0" /></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground font-medium">Gastos Hoy</p><p className="text-xl lg:text-2xl font-bold text-accent mt-1">{formatCurrency(gastosHoy)}</p></div><Sunset className="h-5 w-5 text-accent shrink-0" /></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground font-medium">Balance Hoy</p><p className={`text-xl lg:text-2xl font-bold mt-1 ${balanceHoy >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(balanceHoy)}</p></div><DollarSign className="h-5 w-5 text-primary shrink-0" /></div></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><div className="flex items-start justify-between"><div><p className="text-xs text-muted-foreground font-medium">Trabajos Activos</p><p className="text-xl lg:text-2xl font-bold mt-1">{enProceso}</p></div><Briefcase className="h-5 w-5 text-primary shrink-0" /></div></CardContent></Card>
      </div>

      {/* Trabajos del día + por local */}
      <div className="grid lg:grid-cols-2 gap-4">
        {/* Actividad del día */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">📅 Actividad de hoy</h3>

            {/* En proceso hoy */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                <p className="text-xs font-medium text-muted-foreground">En proceso hoy ({enProcesoHoy.length})</p>
              </div>
              {enProcesoHoy.length === 0
                ? <p className="text-xs text-muted-foreground pl-4">Ninguno iniciado hoy</p>
                : <div className="space-y-1 pl-4">
                    {enProcesoHoy.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                        <span className="font-medium truncate">{t.descripcion_trabajo}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{clienteNombre(t)}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Finalizados hoy */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                <p className="text-xs font-medium text-muted-foreground">Finalizados hoy ({finalizadosHoy.length})</p>
              </div>
              {finalizadosHoy.length === 0
                ? <p className="text-xs text-muted-foreground pl-4">Ninguno finalizado hoy</p>
                : <div className="space-y-1 pl-4">
                    {finalizadosHoy.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-green-50 dark:bg-green-950/20">
                        <span className="font-medium truncate">{t.descripcion_trabajo}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{clienteNombre(t)}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>

            {/* Entregados hoy */}
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
                <p className="text-xs font-medium text-muted-foreground">Entregados hoy ({entregadosHoy.length})</p>
              </div>
              {entregadosHoy.length === 0
                ? <p className="text-xs text-muted-foreground pl-4">Ninguno entregado hoy</p>
                : <div className="space-y-1 pl-4">
                    {entregadosHoy.map((t: any) => (
                      <div key={t.id} className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20">
                        <span className="font-medium truncate">{t.descripcion_trabajo}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{clienteNombre(t)}</span>
                      </div>
                    ))}
                  </div>
              }
            </div>
          </CardContent>
        </Card>

        {/* Por local */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <h3 className="text-sm font-semibold">📍 Trabajos activos por local</h3>
            {[
              { label: 'Taller', count: porLocal.taller, color: 'bg-blue-500' },
              { label: 'Local Mercedes', count: porLocal.mercedes, color: 'bg-purple-500' },
              { label: 'Local Calle 8', count: porLocal.calle8, color: 'bg-orange-500' },
            ].map(({ label, count, color }) => (
              <div key={label} className="flex items-center gap-3">
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${color}`} />
                <span className="text-sm flex-1">{label}</span>
                <div className="flex items-center gap-2">
                  <div className="h-2 bg-secondary rounded-full w-24 overflow-hidden">
                    <div className={`h-full rounded-full ${color}`}
                      style={{ width: `${enProceso > 0 ? Math.min(100, (count / enProceso) * 100) : 0}%` }} />
                  </div>
                  <span className="text-sm font-bold w-4 text-right">{count}</span>
                </div>
              </div>
            ))}
            <div className="pt-2 border-t text-xs text-muted-foreground flex justify-between">
              <span>Total activos</span>
              <span className="font-semibold text-foreground">{enProceso}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventario casa listo para vender */}
      {invCasa.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <ShoppingBag className="h-4 w-4 text-green-600" />
              <h3 className="text-sm font-semibold">{invCasa.length} pieza{invCasa.length > 1 ? 's' : ''} lista{invCasa.length > 1 ? 's' : ''} para vender</h3>
            </div>
            <div className="flex gap-2 flex-wrap">
              {invCasa.map((p: any) => (
                <span key={p.id} className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-medium">
                  {p.nombre}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
          <span className="text-sm font-medium text-muted-foreground">Balance del día</span>
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
    </div>
  );
}