import { useState, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, TrendingUp, Users, Package, Briefcase, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { fetchAll } from '@/lib/supabase-service';
import { formatCurrency, formatDate } from '@/utils/helpers';

// ── Helpers export ────────────────────────────────────────────
function exportExcel(rows: any[], filename: string, sheetName = 'Reporte') {
  import('https://cdn.sheetjs.com/xlsx-0.20.1/package/xlsx.mjs' as any).then((XLSX: any) => {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
  }).catch(() => {
    // fallback: CSV simple
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `${filename}.csv`; a.click();
  });
}

async function exportPDF(titulo: string, subtitulo: string, headers: string[], rows: (string | number)[][], totales?: string) {
  const { jsPDF } = await import('jspdf' as any).catch(() => ({ jsPDF: null }));
  if (!jsPDF) { alert('jsPDF no disponible. Instala: npm install jspdf'); return; }

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header
  doc.setFillColor(24, 95, 165);
  doc.rect(0, 0, W, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14); doc.setFont('helvetica', 'bold');
  doc.text('Soluciones Decorativas José Luis', W / 2, 11, { align: 'center' });
  doc.setFontSize(10); doc.setFont('helvetica', 'normal');
  doc.text(titulo, W / 2, 18, { align: 'center' });
  doc.setFontSize(8);
  doc.text(subtitulo, W / 2, 24, { align: 'center' });

  y = 36;
  doc.setTextColor(0, 0, 0);

  // Tabla cabecera
  const colW = (W - 20) / headers.length;
  doc.setFillColor(240, 245, 255);
  doc.rect(10, y - 5, W - 20, 7, 'F');
  doc.setFontSize(8); doc.setFont('helvetica', 'bold');
  headers.forEach((h, i) => doc.text(h, 11 + i * colW, y, { maxWidth: colW - 2 }));
  y += 5;

  // Filas
  doc.setFont('helvetica', 'normal');
  rows.forEach((row, ri) => {
    if (y > 270) { doc.addPage(); y = 20; }
    if (ri % 2 === 0) { doc.setFillColor(250, 251, 255); doc.rect(10, y - 4, W - 20, 6, 'F'); }
    doc.setFontSize(7.5);
    row.forEach((cell, i) => doc.text(String(cell ?? ''), 11 + i * colW, y, { maxWidth: colW - 2 }));
    y += 6;
  });

  // Totales
  if (totales) {
    y += 3;
    doc.setDrawColor(24, 95, 165); doc.setLineWidth(0.3);
    doc.line(10, y, W - 10, y); y += 5;
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text(totales, W - 10, y, { align: 'right' });
  }

  // Footer
  const today = new Date().toLocaleDateString('es-DO', { day: '2-digit', month: 'long', year: 'numeric' });
  doc.setFontSize(7); doc.setFont('helvetica', 'normal'); doc.setTextColor(150);
  doc.text(`Generado el ${today}`, W / 2, 290, { align: 'center' });

  doc.save(`${titulo.replace(/\s+/g, '_')}.pdf`);
}

// ── Componente filtros de fecha ────────────────────────────────
function DateFilters({ desde, hasta, setDesde, setHasta }: any) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="grid gap-1.5">
        <Label className="text-xs font-medium">Desde</Label>
        <Input type="date" value={desde} onChange={e => setDesde(e.target.value)} className="h-9" />
      </div>
      <div className="grid gap-1.5">
        <Label className="text-xs font-medium">Hasta</Label>
        <Input type="date" value={hasta} onChange={e => setHasta(e.target.value)} className="h-9" />
      </div>
    </div>
  );
}

// ── Componente botones de exportar ─────────────────────────────
function ExportBtns({ onExcel, onPDF }: { onExcel: () => void; onPDF: () => void }) {
  return (
    <div className="flex gap-2 justify-end">
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onExcel}>
        <FileSpreadsheet className="h-3.5 w-3.5 text-green-600" />Excel
      </Button>
      <Button variant="outline" size="sm" className="gap-1.5 text-xs" onClick={onPDF}>
        <FileText className="h-3.5 w-3.5 text-red-500" />PDF
      </Button>
    </div>
  );
}

// ── KPI Card ───────────────────────────────────────────────────
function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-secondary/40 rounded-xl p-4 text-center space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold">{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function Reportes() {
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');
  const [empId, setEmpId] = useState('todos');
  const [estadoFilter, setEstadoFilter] = useState('todos');
  const [ubicacionFilter, setUbicacionFilter] = useState('todas');
  const ubicaciones = ['Almacén Casa', 'Local Mercede', 'Local Calle 8', 'Telas', 'Almacén Taller'];

  const [empleados,    setEmpleados]    = useState<any[]>([]);
  const [asignaciones, setAsignaciones] = useState<any[]>([]);
  const [trabajos,     setTrabajos]     = useState<any[]>([]);
  const [caja,         setCaja]         = useState<any[]>([]);
  const [inventario,   setInventario]   = useState<any[]>([]);
  const [movInv,       setMovInv]       = useState<any[]>([]);
  const [clientes,     setClientes]     = useState<any[]>([]);

  useEffect(() => {
    Promise.all([
      fetchAll('empleados'), fetchAll('trabajo_empleados'), fetchAll('trabajos'),
      fetchAll('caja_movimientos'), fetchAll('inventario'), fetchAll('inventario_movimientos'),
      fetchAll('clientes'),
    ]).then(([e, a, t, c, inv, m, cl]) => {
      setEmpleados(e); setAsignaciones(a); setTrabajos(t);
      setCaja(c); setInventario(inv); setMovInv(m); setClientes(cl);
    });
  }, []);

  const inRange = (fecha: string) => {
    if (!fecha) return true;
    if (desde && fecha < desde) return false;
    if (hasta && fecha > hasta) return false;
    return true;
  };

  const subtituloRango = desde || hasta
    ? `Período: ${desde || '—'} al ${hasta || '—'}`
    : 'Todos los períodos';

  // ── Empleados ──
  const empAsig = asignaciones.filter((a: any) => {
    if (empId !== 'todos' && a.id_empleado !== empId) return false;
    const t = trabajos.find((tr: any) => tr.id === a.id_trabajo);
    return inRange(t?.fecha_inicio || '');
  });
  const empTotal = empAsig.reduce((s: number, a: any) => s + (a.monto_pagar || 0), 0);

  // ── Caja ──
  const cajaFilt = caja.filter((m: any) => inRange(m.fecha));
  const cajaIng  = cajaFilt.filter((m: any) => m.tipo === 'Entrada').reduce((s: number, m: any) => s + m.monto, 0);
  const cajaGas  = cajaFilt.filter((m: any) => m.tipo === 'Salida').reduce((s: number, m: any) => s + m.monto, 0);

  // ── Inventario ──
  const invFilt = movInv.filter((m: any) => inRange(m.fecha));

  // ── Trabajos ──
  const trabFilt = trabajos.filter((t: any) => {
    if (!inRange(t.fecha_inicio)) return false;
    if (estadoFilter !== 'todos' && t.estado !== estadoFilter) return false;
    return true;
  });
  const trabMonto  = trabFilt.reduce((s: number, t: any) => s + (t.monto_final || 0), 0);
  const trabAbonos = trabFilt.reduce((s: number, t: any) => s + (t.abono || 0), 0);

  // ── Clientes ──
  const clienteStats = clientes.map((c: any) => {
    const tsCli = trabajos.filter((t: any) => t.id_cliente === c.id && inRange(t.fecha_inicio));
    const total  = tsCli.reduce((s: number, t: any) => s + (t.monto_final || 0), 0);
    const deuda  = tsCli.reduce((s: number, t: any) => s + Math.max(0, (t.monto_final || 0) - (t.abono || 0)), 0);
    return { ...c, trabajos: tsCli.length, total, deuda };
  }).filter(c => c.trabajos > 0).sort((a, b) => b.total - a.total);

  // ══ EXPORT HANDLERS ══

  // Empleados
  const handleEmpExcel = () => {
    exportExcel(empAsig.map((a: any) => ({
      Empleado: empleados.find((e: any) => e.id === a.id_empleado)?.nombre || '—',
      Trabajo: trabajos.find((t: any) => t.id === a.id_trabajo)?.descripcion_trabajo || '—',
      Descripcion: a.descripcion || '',
      'Monto RD$': a.monto_pagar || 0,
    })), 'reporte_empleados');
  };
  const handleEmpPDF = () => exportPDF(
    'Reporte de Empleados', subtituloRango,
    ['Empleado', 'Trabajo', 'Descripción', 'Monto'],
    empAsig.map((a: any) => [
      empleados.find((e: any) => e.id === a.id_empleado)?.nombre || '—',
      trabajos.find((t: any) => t.id === a.id_trabajo)?.descripcion_trabajo || '—',
      a.descripcion || '',
      formatCurrency(a.monto_pagar),
    ]),
    `Total mano de obra: ${formatCurrency(empTotal)}`
  );

  // Caja
  const handleCajaExcel = () => {
    exportExcel(cajaFilt.map((m: any) => ({
      Fecha: m.fecha, Tipo: m.tipo, Concepto: m.concepto || '',
      'Monto RD$': m.monto,
    })), 'reporte_caja');
  };
  const handleCajaPDF = () => exportPDF(
    'Reporte Caja Chica', subtituloRango,
    ['Fecha', 'Tipo', 'Concepto', 'Monto'],
    cajaFilt.map((m: any) => [formatDate(m.fecha), m.tipo, m.concepto || '', formatCurrency(m.monto)]),
    `Ingresos: ${formatCurrency(cajaIng)}  |  Gastos: ${formatCurrency(cajaGas)}  |  Balance: ${formatCurrency(cajaIng - cajaGas)}`
  );

  // Inventario
  const handleInvExcel = () => {
    exportExcel(invFilt.map((m: any) => ({
      Articulo: inventario.find((i: any) => i.id === m.id_item)?.nombre_item || '—',
      Tipo: m.tipo_movimiento, Cantidad: m.cantidad,
      Motivo: m.motivo || '', Fecha: m.fecha,
    })), 'reporte_inventario');
  };
  const handleInvPDF = () => exportPDF(
    'Reporte Inventario', subtituloRango,
    ['Artículo', 'Tipo', 'Cant.', 'Motivo', 'Fecha'],
    invFilt.map((m: any) => [
      inventario.find((i: any) => i.id === m.id_item)?.nombre_item || '—',
      m.tipo_movimiento, m.cantidad, m.motivo || '', formatDate(m.fecha),
    ])
  );

  // Trabajos
  const handleTrabExcel = () => {
    exportExcel(trabFilt.map((t: any) => ({
      Descripcion: t.descripcion_trabajo,
      Cliente: clientes.find((c: any) => c.id === t.id_cliente)?.nombre_completo || '—',
      Estado: t.estado, Categoria: t.categoria,
      'Monto Total RD$': t.monto_final || 0,
      'Abono RD$': t.abono || 0,
      'Pendiente RD$': Math.max(0, (t.monto_final || 0) - (t.abono || 0)),
      'Fecha Inicio': t.fecha_inicio || '',
    })), 'reporte_trabajos');
  };
  const handleTrabPDF = () => exportPDF(
    'Reporte de Trabajos', subtituloRango,
    ['Descripción', 'Cliente', 'Estado', 'Monto', 'Abono', 'Pendiente'],
    trabFilt.map((t: any) => [
      t.descripcion_trabajo,
      clientes.find((c: any) => c.id === t.id_cliente)?.nombre_completo || '—',
      t.estado,
      formatCurrency(t.monto_final),
      formatCurrency(t.abono),
      formatCurrency(Math.max(0, (t.monto_final || 0) - (t.abono || 0))),
    ]),
    `Total: ${formatCurrency(trabMonto)}  |  Cobrado: ${formatCurrency(trabAbonos)}  |  Pendiente: ${formatCurrency(trabMonto - trabAbonos)}`
  );

  // Clientes
  const handleCliExcel = () => {
    exportExcel(clienteStats.map((c: any) => ({
      Cliente: c.nombre_completo, Telefono: c.telefono || '',
      Trabajos: c.trabajos, 'Total RD$': c.total, 'Deuda RD$': c.deuda,
    })), 'reporte_clientes');
  };
  const handleCliPDF = () => exportPDF(
    'Reporte de Clientes', subtituloRango,
    ['Cliente', 'Teléfono', 'Trabajos', 'Total', 'Deuda'],
    clienteStats.map((c: any) => [
      c.nombre_completo, c.telefono || '—', c.trabajos,
      formatCurrency(c.total), formatCurrency(c.deuda),
    ]),
    `Total clientes activos: ${clienteStats.length}`
  );

  return (
    <div className="page-container">
      <h1 className="text-2xl font-bold">Reportes</h1>

      <Tabs defaultValue="trabajos">
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="trabajos"  className="gap-1"><Briefcase className="h-3.5 w-3.5" />Trabajos</TabsTrigger>
          <TabsTrigger value="clientes"  className="gap-1"><Users     className="h-3.5 w-3.5" />Clientes</TabsTrigger>
          <TabsTrigger value="empleados" className="gap-1"><TrendingUp className="h-3.5 w-3.5"/>Empleados</TabsTrigger>
          <TabsTrigger value="caja"      className="gap-1"><Wallet    className="h-3.5 w-3.5" />Caja</TabsTrigger>
          <TabsTrigger value="inventario" className="gap-1"><Package  className="h-3.5 w-3.5" />Inventario</TabsTrigger>
          <TabsTrigger value="almacen" className="gap-1"><Package className="h-3.5 w-3.5" />Por Almacén</TabsTrigger>
        </TabsList>

        {/* ══ TRABAJOS ══ */}
        <TabsContent value="trabajos" className="mt-4">
          <Card><CardContent className="p-5 space-y-4">
            <DateFilters desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
            <div className="flex items-center gap-3">
              <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                <SelectTrigger className="flex-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los estados</SelectItem>
                  {['Pendiente','En proceso','Finalizado','Entregado','Cancelado'].map(e =>
                    <SelectItem key={e} value={e}>{e}</SelectItem>)}
                </SelectContent>
              </Select>
              <ExportBtns onExcel={handleTrabExcel} onPDF={handleTrabPDF} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <KpiCard label="Trabajos"  value={String(trabFilt.length)} />
              <KpiCard label="Total"     value={formatCurrency(trabMonto)} />
              <KpiCard label="Cobrado"   value={formatCurrency(trabAbonos)} />
              <KpiCard label="Pendiente" value={formatCurrency(trabMonto - trabAbonos)} />
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Descripción</TableHead>
                  <TableHead className="hidden sm:table-cell">Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right hidden md:table-cell">Pendiente</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {trabFilt.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin datos en este rango</TableCell></TableRow>}
                  {trabFilt.map((t: any) => (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.descripcion_trabajo}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{clientes.find((c: any) => c.id === t.id_cliente)?.nombre_completo || '—'}</TableCell>
                      <TableCell><Badge variant={t.estado === 'Cancelado' ? 'destructive' : t.estado === 'Entregado' ? 'secondary' : 'outline'}>{t.estado}</Badge></TableCell>
                      <TableCell className="text-right">{formatCurrency(t.monto_final)}</TableCell>
                      <TableCell className="text-right hidden md:table-cell text-destructive">{formatCurrency(Math.max(0,(t.monto_final||0)-(t.abono||0)))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ══ CLIENTES ══ */}
        <TabsContent value="clientes" className="mt-4">
          <Card><CardContent className="p-5 space-y-4">
            <DateFilters desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
            <ExportBtns onExcel={handleCliExcel} onPDF={handleCliPDF} />

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <KpiCard label="Clientes activos" value={String(clienteStats.length)} />
              <KpiCard label="Total facturado"  value={formatCurrency(clienteStats.reduce((s,c)=>s+c.total,0))} />
              <KpiCard label="Deuda total"      value={formatCurrency(clienteStats.reduce((s,c)=>s+c.deuda,0))} />
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden sm:table-cell">Teléfono</TableHead>
                  <TableHead className="text-center">Trabajos</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Deuda</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {clienteStats.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
                  {clienteStats.map((c: any) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nombre_completo}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{c.telefono || '—'}</TableCell>
                      <TableCell className="text-center">{c.trabajos}</TableCell>
                      <TableCell className="text-right">{formatCurrency(c.total)}</TableCell>
                      <TableCell className="text-right">
                        {c.deuda > 0 ? <span className="text-destructive font-medium">{formatCurrency(c.deuda)}</span> : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ══ EMPLEADOS ══ */}
        <TabsContent value="empleados" className="mt-4">
          <Card><CardContent className="p-5 space-y-4">
            <DateFilters desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
            <div className="flex items-center gap-3">
              <Select value={empId} onValueChange={setEmpId}>
                <SelectTrigger className="flex-1"><SelectValue placeholder="Todos los empleados" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos los empleados</SelectItem>
                  {empleados.map((e: any) => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <ExportBtns onExcel={handleEmpExcel} onPDF={handleEmpPDF} />
            </div>

            <KpiCard label="Total mano de obra" value={formatCurrency(empTotal)} sub={`${empAsig.length} asignaciones`} />

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Empleado</TableHead>
                  <TableHead>Trabajo</TableHead>
                  <TableHead className="hidden sm:table-cell">Descripción</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {empAsig.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
                  {empAsig.map((a: any) => (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{empleados.find((e: any) => e.id === a.id_empleado)?.nombre || '—'}</TableCell>
                      <TableCell className="text-sm">{trabajos.find((t: any) => t.id === a.id_trabajo)?.descripcion_trabajo || '—'}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{a.descripcion || '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(a.monto_pagar)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ══ CAJA ══ */}
        <TabsContent value="caja" className="mt-4">
          <Card><CardContent className="p-5 space-y-4">
            <DateFilters desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
            <ExportBtns onExcel={handleCajaExcel} onPDF={handleCajaPDF} />

            <div className="grid grid-cols-3 gap-3">
              <KpiCard label="Ingresos"  value={formatCurrency(cajaIng)} />
              <KpiCard label="Gastos"    value={formatCurrency(cajaGas)} />
              <KpiCard label="Balance"   value={formatCurrency(cajaIng - cajaGas)} />
            </div>

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Fecha</TableHead><TableHead>Tipo</TableHead>
                  <TableHead>Concepto</TableHead><TableHead className="text-right">Monto</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {cajaFilt.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
                  {cajaFilt.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="text-sm">{formatDate(m.fecha)}</TableCell>
                      <TableCell><Badge variant={m.tipo === 'Entrada' ? 'default' : 'destructive'}>{m.tipo}</Badge></TableCell>
                      <TableCell className="text-muted-foreground text-sm">{m.concepto || '—'}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.monto)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ══ INVENTARIO ══ */}
        <TabsContent value="inventario" className="mt-4">
          <Card><CardContent className="p-5 space-y-4">
            <DateFilters desde={desde} hasta={hasta} setDesde={setDesde} setHasta={setHasta} />
            <ExportBtns onExcel={handleInvExcel} onPDF={handleInvPDF} />

            <div className="border rounded-lg overflow-x-auto">
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Artículo</TableHead><TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Cant.</TableHead>
                  <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                  <TableHead>Fecha</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invFilt.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-6">Sin datos</TableCell></TableRow>}
                  {invFilt.map((m: any) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{inventario.find((i: any) => i.id === m.id_item)?.nombre_item || '—'}</TableCell>
                      <TableCell><Badge variant={m.tipo_movimiento === 'Entrada' ? 'default' : 'destructive'}>{m.tipo_movimiento}</Badge></TableCell>
                      <TableCell className="text-right">{m.cantidad}</TableCell>
                      <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{m.motivo || '—'}</TableCell>
                      <TableCell className="text-sm">{formatDate(m.fecha)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent></Card>
        </TabsContent>

        {/* ══ POR ALMACÉN ══ */}
        <TabsContent value="almacen" className="mt-4">
          <Card><CardContent className="p-5 space-y-4">
            <div className="grid gap-1.5">
              <Label className="text-xs font-medium">Seleccionar Almacén / Ubicación</Label>
              <Select value={ubicacionFilter} onValueChange={setUbicacionFilter}>
                <SelectTrigger><SelectValue placeholder="Seleccionar ubicación" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="todas">Todas las ubicaciones</SelectItem>
                  {ubicaciones.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {(() => {
              const itemsUbic = ubicacionFilter === 'todas'
                ? inventario
                : inventario.filter((i: any) => i.ubicacion === ubicacionFilter);
              const movUbic = movInv.filter((m: any) =>
                itemsUbic.some((i: any) => i.id === m.id_item) &&
                m.tipo_movimiento === 'Salida'
              );

              const imprimirHoja = () => {
                const filas = itemsUbic.map((i: any) => `
                  <tr style="border-bottom:1px solid #eee">
                    <td style="padding:8px 12px;font-size:11px;color:#888">${i.sku || '—'}</td>
                    <td style="padding:8px 12px">${i.nombre_item}</td>
                    <td style="padding:8px 12px;text-align:center">${i.categoria}</td>
                    <td style="padding:8px 12px;text-align:center">${i.unidad}</td>
                    <td style="padding:8px 12px;text-align:center;font-weight:bold">${i.stock_actual ?? 0}</td>
                    <td style="padding:8px 12px;text-align:right">${i.costo_unitario ? 'RD$'+i.costo_unitario.toLocaleString('es-DO') : '—'}</td>
                    <td style="padding:8px 12px;text-align:right;font-weight:bold">${i.costo_unitario && i.stock_actual ? 'RD$'+(i.costo_unitario*i.stock_actual).toLocaleString('es-DO') : '—'}</td>
                  </tr>`).join('');
                const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
                  <title>Inventario ${ubicacionFilter}</title>
                  <style>body{font-family:Arial,sans-serif;padding:32px;max-width:800px;margin:auto}
                  h1{color:#185FA5;font-size:18px}h2{color:#64748B;font-size:13px;font-weight:normal}
                  table{width:100%;border-collapse:collapse}
                  th{background:#185FA5;color:white;padding:8px 12px;text-align:left;font-size:12px}
                  td{font-size:12px}.footer{margin-top:24px;font-size:11px;color:#94A3B8;border-top:1px solid #eee;padding-top:12px;display:flex;justify-content:space-between}
                  .firma{margin-top:40px;display:grid;grid-template-columns:1fr 1fr;gap:32px}
                  .linea{border-bottom:1px solid #000;height:40px;margin-bottom:6px}p{font-size:11px;color:#64748B;margin:0}
                  </style></head><body>
                  <h1>Inventario — ${ubicacionFilter === 'todas' ? 'Todas las Ubicaciones' : ubicacionFilter}</h1>
                  <h2>Soluciones Decorativas José Luis &nbsp;|&nbsp; Fecha: ${new Date().toLocaleDateString('es-DO')}</h2>
                  <table><thead><tr><th>SKU</th><th>Artículo</th><th>Categoría</th><th>Unidad</th><th>Stock</th><th>Costo Unit.</th><th>Valor Est.</th></tr></thead>
                  <tbody>${filas}</tbody></table>
                  <div class="firma">
                    <div><div class="linea"></div><p>Encargado de almacén</p></div>
                    <div><div class="linea"></div><p>Gerencia</p></div>
                  </div>
                  <div class="footer"><span>Total artículos: ${itemsUbic.length}</span><span>Imprimir y plastificar — Soluciones Decorativas JL</span></div>
                  </body></html>`;
                const w = window.open('', '_blank');
                if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 400); }
              };

              return (
                <>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="text-sm text-muted-foreground">
                      <span className="font-semibold text-foreground text-base">{itemsUbic.length}</span> artículos
                      {ubicacionFilter !== 'todas' && ` en ${ubicacionFilter}`}
                    </div>
                    <Button size="sm" variant="outline" className="gap-2" onClick={imprimirHoja}>
                      🖨️ Imprimir hoja de almacén
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="bg-secondary/40 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">Total artículos</p>
                      <p className="text-xl font-bold">{itemsUbic.length}</p>
                    </div>
                    <div className="bg-secondary/40 rounded-xl p-3 text-center">
                      <p className="text-xs text-muted-foreground">Con precio definido</p>
                      <p className="text-xl font-bold">{itemsUbic.filter((i: any) => i.costo_unitario > 0).length}</p>
                    </div>
                    <div className="bg-blue-50 dark:bg-blue-950/20 rounded-xl p-3 text-center col-span-2 sm:col-span-1">
                      <p className="text-xs text-muted-foreground">Valor estimado total</p>
                      <p className="text-xl font-bold text-blue-700 dark:text-blue-400">
                        {formatCurrency(itemsUbic.reduce((s: number, i: any) => s + ((i.costo_unitario || 0) * (i.stock_actual || 0)), 0))}
                      </p>
                    </div>
                  </div>

                  {/* Stock por ubicación */}
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader><TableRow>
                        <TableHead>Artículo</TableHead>
                        <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                        <TableHead className="hidden sm:table-cell">Ubicación</TableHead>
                        <TableHead className="text-center">Stock</TableHead>
                        <TableHead className="hidden sm:table-cell text-center">Mín.</TableHead>
                        <TableHead className="hidden sm:table-cell text-right">Costo Unit.</TableHead>
                        <TableHead className="text-right">Valor Est.</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {itemsUbic.length === 0 && <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">Sin artículos</TableCell></TableRow>}
                        {itemsUbic.map((i: any) => (
                          <TableRow key={i.id}>
                            <TableCell className="font-medium">
                              {i.nombre_item}
                              {i.sku && <span className="block text-xs text-muted-foreground font-mono">{i.sku}</span>}
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{i.categoria}</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{i.ubicacion || '—'}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={i.stock_actual <= i.stock_minimo ? 'destructive' : 'secondary'}>
                                {i.stock_actual ?? 0} {i.unidad}
                              </Badge>
                            </TableCell>
                            <TableCell className="hidden sm:table-cell text-center text-muted-foreground">{i.stock_minimo ?? 0}</TableCell>
                            <TableCell className="hidden sm:table-cell text-right text-muted-foreground text-sm">{i.costo_unitario ? formatCurrency(i.costo_unitario) : '—'}</TableCell>
                            <TableCell className="text-right font-medium">
                              {i.costo_unitario && i.stock_actual ? formatCurrency(i.costo_unitario * i.stock_actual) : '—'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Salidas de ese almacén */}
                  {movUbic.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-muted-foreground pt-2">Salidas registradas</p>
                      <div className="border rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader><TableRow>
                            <TableHead>Artículo</TableHead>
                            <TableHead className="text-right">Cant.</TableHead>
                            <TableHead className="hidden sm:table-cell">Asignado a</TableHead>
                            <TableHead className="hidden sm:table-cell">Motivo</TableHead>
                            <TableHead>Fecha</TableHead>
                          </TableRow></TableHeader>
                          <TableBody>
                            {movUbic.map((m: any) => (
                              <TableRow key={m.id}>
                                <TableCell className="font-medium">{inventario.find((i: any) => i.id === m.id_item)?.nombre_item || '—'}</TableCell>
                                <TableCell className="text-right text-destructive font-medium">-{m.cantidad}</TableCell>
                                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{m.asignado_a || '—'}</TableCell>
                                <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{m.motivo || '—'}</TableCell>
                                <TableCell className="text-sm">{formatDate(m.fecha)}</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </CardContent></Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}