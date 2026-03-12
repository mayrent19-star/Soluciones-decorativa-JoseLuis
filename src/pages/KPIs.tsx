import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, DollarSign, Users, Briefcase } from 'lucide-react';
import { fetchAll } from '@/lib/supabase-service';
import { formatCurrency } from '@/utils/helpers';

const COLORS = ['hsl(189,83%,27%)', 'hsl(39,93%,47%)', 'hsl(152,60%,40%)', 'hsl(20,93%,49%)', 'hsl(189,40%,60%)'];

export default function KPIs() {
  const [trabajos, setTrabajos] = useState<any[]>([]);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [materiales, setMateriales] = useState<any[]>([]);
  const [caja, setCaja] = useState<any[]>([]);
  const [empleados, setEmpleados] = useState<any[]>([]);
  const [desde, setDesde] = useState(() => {
    const d = new Date(); d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [hasta, setHasta] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    Promise.all([
      fetchAll('trabajos'), fetchAll('trabajo_empleados'),
      fetchAll('trabajo_materiales'), fetchAll('caja_movimientos'),
      fetchAll('empleados')
    ]).then(([t, a, m, c, e]) => {
      setTrabajos(t); setAsignaciones(a); setMateriales(m); setCaja(c); setEmpleados(e);
    });
  }, []);

  const inRange = (fecha: string) => (!desde || fecha >= desde) && (!hasta || fecha <= hasta);

  // KPI 1: Rentabilidad por trabajo
  const rentabilidad = useMemo(() => {
    return trabajos.filter(t => inRange(t.fecha_inicio)).map(t => {
      const costoMO = asignaciones.filter(a => a.id_trabajo === t.id).reduce((s: number, a: any) => s + (a.monto_pagar || 0), 0);
      const costoMat = materiales.filter(m => m.id_trabajo === t.id).reduce((s: number, m: any) => s + (m.costo_total || m.cantidad * m.costo_unitario || 0), 0);
      const ingreso = t.monto_final || t.monto_cotizado || 0;
      const costo = costoMO + costoMat;
      const utilidad = ingreso - costo;
      const margen = ingreso > 0 ? (utilidad / ingreso) * 100 : 0;
      return { nombre: t.descripcion_trabajo?.slice(0, 30), ingreso, costo, utilidad, margen: Math.round(margen) };
    }).filter(r => r.ingreso > 0);
  }, [trabajos, asignaciones, materiales, desde, hasta]);

  // KPI 2: Productividad por empleado
  const productividad = useMemo(() => {
    return empleados.filter(e => e.activo).map(e => {
      const asigs = asignaciones.filter(a => a.id_empleado === e.id);
      const trabsIds = [...new Set(asigs.map(a => a.id_trabajo))];
      const totalGanado = asigs.reduce((s: number, a: any) => s + (a.monto_pagar || 0), 0);
      return { nombre: e.nombre, trabajos: trabsIds.length, ganado: totalGanado };
    });
  }, [empleados, asignaciones]);

  // KPI 3: Tendencias mensuales
  const tendencias = useMemo(() => {
    const meses: Record<string, { ingresos: number; gastos: number }> = {};
    caja.filter(m => inRange(m.fecha)).forEach((m: any) => {
      const mes = m.fecha?.slice(0, 7);
      if (!mes) return;
      if (!meses[mes]) meses[mes] = { ingresos: 0, gastos: 0 };
      if (m.tipo === 'Entrada') meses[mes].ingresos += m.monto;
      else meses[mes].gastos += m.monto;
    });
    return Object.entries(meses).sort().map(([mes, vals]) => ({
      mes, ...vals, beneficio: vals.ingresos - vals.gastos
    }));
  }, [caja, desde, hasta]);

  // Totals
  const totalIngresos = tendencias.reduce((s, t) => s + t.ingresos, 0);
  const totalGastos = tendencias.reduce((s, t) => s + t.gastos, 0);
  const margenPromedio = rentabilidad.length > 0 ? Math.round(rentabilidad.reduce((s, r) => s + r.margen, 0) / rentabilidad.length) : 0;

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold flex items-center gap-2"><TrendingUp className="h-6 w-6" /> KPIs</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="grid gap-1.5 flex-1"><Label className="text-xs">Desde</Label><Input type="date" value={desde} onChange={e => setDesde(e.target.value)} /></div>
        <div className="grid gap-1.5 flex-1"><Label className="text-xs">Hasta</Label><Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} /></div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Ingresos</p><p className="text-xl font-bold text-success">{formatCurrency(totalIngresos)}</p></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Gastos</p><p className="text-xl font-bold text-accent">{formatCurrency(totalGastos)}</p></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Beneficio</p><p className={`text-xl font-bold ${totalIngresos - totalGastos >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(totalIngresos - totalGastos)}</p></CardContent></Card>
        <Card className="stat-card"><CardContent className="p-0"><p className="text-xs text-muted-foreground">Margen Promedio</p><p className="text-xl font-bold">{margenPromedio}%</p></CardContent></Card>
      </div>

      {/* Tendencias mensuales */}
      <Card>
        <CardHeader><CardTitle className="text-sm">📈 Tendencias Mensuales</CardTitle></CardHeader>
        <CardContent>
          {tendencias.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sin datos en este rango</p> : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={tendencias}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(189,15%,85%)" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v: number) => formatCurrency(v)} />
                <Bar dataKey="ingresos" name="Ingresos" fill="hsl(152,60%,40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="hsl(20,93%,49%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Rentabilidad por trabajo */}
        <Card>
          <CardHeader><CardTitle className="text-sm">💰 Rentabilidad por Trabajo</CardTitle></CardHeader>
          <CardContent>
            {rentabilidad.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p> : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {rentabilidad.map((r, i) => (
                  <div key={i} className="p-2.5 rounded-lg bg-secondary/50 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">{r.nombre}</p>
                      <p className="text-xs text-muted-foreground">Costo: {formatCurrency(r.costo)} | Ingreso: {formatCurrency(r.ingreso)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`font-bold ${r.utilidad >= 0 ? 'text-success' : 'text-destructive'}`}>{formatCurrency(r.utilidad)}</p>
                      <p className="text-xs text-muted-foreground">{r.margen}%</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Productividad por empleado */}
        <Card>
          <CardHeader><CardTitle className="text-sm">👷 Productividad por Empleado</CardTitle></CardHeader>
          <CardContent>
            {productividad.length === 0 ? <p className="text-sm text-muted-foreground text-center py-6">Sin datos</p> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productividad} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(189,15%,85%)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis dataKey="nombre" type="category" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip formatter={(v: number) => formatCurrency(v)} />
                  <Bar dataKey="ganado" name="Ganado" fill="hsl(189,83%,27%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
