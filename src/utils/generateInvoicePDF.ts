import { Trabajo, Cliente } from '@/types';
import { formatCurrency, formatDate } from './helpers';

export function generateInvoicePDF(
  trabajo: Trabajo,
  cliente: Cliente | undefined
) {
  const saldo = (trabajo.montoFinal || trabajo.montoCotizado) - (trabajo.abono || 0);

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<title>Factura - ${trabajo.descripcionTrabajo}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; color: #1a1a1a; padding: 40px; max-width: 800px; margin: auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0C717F; padding-bottom: 20px; margin-bottom: 30px; }
  .brand { display: flex; align-items: center; gap: 14px; }
  .brand img { width: 80px; height: 80px; object-fit: contain; border-radius: 8px; }
  .brand-info h1 { color: #0C717F; font-size: 18px; margin-bottom: 2px; }
  .brand-info p { font-size: 11px; color: #666; line-height: 1.5; }
  .invoice-info { text-align: right; }
  .invoice-info h2 { color: #EF5709; font-size: 28px; margin-bottom: 8px; }
  .invoice-info p { font-size: 12px; color: #666; }
  .section { margin-bottom: 24px; }
  .section-title { font-size: 13px; font-weight: 700; color: #0C717F; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border-bottom: 1px solid #e5e5e5; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; }
  .field label { font-size: 11px; color: #888; display: block; }
  .field p { font-size: 14px; font-weight: 500; }
  .text-right { text-align: right; }
  .totals { margin-top: 20px; display: flex; justify-content: flex-end; }
  .totals-table { width: 280px; }
  .totals-table tr td { padding: 6px 12px; font-size: 13px; }
  .totals-table tr.total td { font-weight: 700; font-size: 16px; border-top: 2px solid #0C717F; color: #0C717F; }
  .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">
      <img src="${window.location.origin}/logo-joseluis.jpg" alt="Logo" />
      <div class="brand-info">
        <h1>Soluciones Decorativas José Luis</h1>
        <p>Tapicería & Ebanistería</p>
        <p>Av. México 160, Buenos Aires de Herrera, Santo Domingo</p>
        <p>Tel: 809-537-2374 | RNC: 130-269858</p>
        <p>solucionesdecorativa00@gmail.com</p>
      </div>
    </div>
    <div class="invoice-info">
      <h2>FACTURA</h2>
      <p>Fecha: ${formatDate(new Date().toISOString().slice(0, 10))}</p>
      <p>Ref: ${trabajo.id.slice(0, 8).toUpperCase()}</p>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Datos del Cliente</div>
    <div class="grid">
      <div class="field"><label>Nombre</label><p>${cliente?.nombreCompleto || '—'}</p></div>
      <div class="field"><label>Teléfono</label><p>${cliente?.telefono || '—'}</p></div>
      <div class="field"><label>Dirección</label><p>${cliente?.direccion || '—'}</p></div>
      <div class="field"><label>Email</label><p>${cliente?.email || '—'}</p></div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Detalles del Trabajo</div>
    <div class="grid">
      <div class="field"><label>Descripción</label><p>${trabajo.descripcionTrabajo}</p></div>
      <div class="field"><label>Categoría</label><p>${trabajo.categoria}</p></div>
      <div class="field"><label>Estado</label><p>${trabajo.estado}</p></div>
      <div class="field"><label>Fecha Inicio</label><p>${formatDate(trabajo.fechaInicio)}</p></div>
      ${trabajo.fechaEntregaEstimada ? `<div class="field"><label>Entrega Estimada</label><p>${formatDate(trabajo.fechaEntregaEstimada)}</p></div>` : ''}
      ${trabajo.fechaFinalizado ? `<div class="field"><label>Finalizado</label><p>${formatDate(trabajo.fechaFinalizado)}</p></div>` : ''}
    </div>
  </div>

  <div class="totals">
    <table class="totals-table">
      <tr><td>Cotizado</td><td class="text-right">${formatCurrency(trabajo.montoCotizado)}</td></tr>
      ${trabajo.montoFinal ? `<tr><td>Monto Final</td><td class="text-right">${formatCurrency(trabajo.montoFinal)}</td></tr>` : ''}
      ${trabajo.abono ? `<tr><td>Abono</td><td class="text-right">- ${formatCurrency(trabajo.abono)}</td></tr>` : ''}
      <tr class="total"><td>Balance Pendiente</td><td class="text-right">${formatCurrency(saldo)}</td></tr>
    </table>
  </div>

  ${trabajo.notas ? `<div class="section" style="margin-top:24px"><div class="section-title">Notas</div><p style="font-size:13px;color:#555">${trabajo.notas}</p></div>` : ''}

  <div class="footer">
    <p>Soluciones Decorativas José Luis — Gracias por su preferencia</p>
    <p>Av. México 160, Buenos Aires de Herrera, Santo Domingo | Tel: 809-537-2374</p>
  </div>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => printWindow.print(), 500);
  }
}
