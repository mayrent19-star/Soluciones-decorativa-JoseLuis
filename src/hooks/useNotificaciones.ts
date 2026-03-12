import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface Notificacion {
  id: string;
  tipo: 'atrasado' | 'vence_hoy' | 'vence_pronto' | 'cobro_pendiente' | 'stock_bajo';
  titulo: string;
  descripcion: string;
  link?: string;
  leida: boolean;
  fecha: string;
  prioridad: 'alta' | 'media' | 'baja';
}

const db = supabase as any;

export function useNotificaciones() {
  const [notifs, setNotifs] = useState<Notificacion[]>([]);
  const [loading, setLoading] = useState(true);

  const calcular = useCallback(async () => {
    setLoading(true);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const hoyStr = hoy.toISOString().slice(0, 10);
    const en3dias = new Date(hoy); en3dias.setDate(hoy.getDate() + 3);
    const en3Str = en3dias.toISOString().slice(0, 10);

    const [{ data: trabajos }, { data: inventario }] = await Promise.all([
      db.from('trabajos')
        .select('id, descripcion_trabajo, estado, fecha_entrega_estimada, monto_final, abono')
        .not('estado', 'in', '("Entregado","Cancelado")'),
      db.from('inventario')
        .select('id, nombre_item, stock_actual, stock_minimo')
        .not('stock_minimo', 'is', null),
    ]);

    const lista: Notificacion[] = [];

    for (const t of trabajos || []) {
      if (!t.fecha_entrega_estimada) continue;
      const fechaE = t.fecha_entrega_estimada;

      if (fechaE < hoyStr) {
        lista.push({
          id: `atrasado-${t.id}`,
          tipo: 'atrasado',
          titulo: '⚠️ Trabajo atrasado',
          descripcion: t.descripcion_trabajo,
          link: `/trabajos/${t.id}`,
          leida: false,
          fecha: fechaE,
          prioridad: 'alta',
        });
      } else if (fechaE === hoyStr) {
        lista.push({
          id: `hoy-${t.id}`,
          tipo: 'vence_hoy',
          titulo: '📅 Entrega hoy',
          descripcion: t.descripcion_trabajo,
          link: `/trabajos/${t.id}`,
          leida: false,
          fecha: fechaE,
          prioridad: 'alta',
        });
      } else if (fechaE <= en3Str) {
        lista.push({
          id: `pronto-${t.id}`,
          tipo: 'vence_pronto',
          titulo: '🔔 Entrega en 3 días',
          descripcion: t.descripcion_trabajo,
          link: `/trabajos/${t.id}`,
          leida: false,
          fecha: fechaE,
          prioridad: 'media',
        });
      }

      // Cobro pendiente: entregado con deuda
      const monto = t.monto_final || 0;
      const abono = t.abono || 0;
      if (t.estado === 'Entregado' && monto > 0 && abono < monto) {
        lista.push({
          id: `cobro-${t.id}`,
          tipo: 'cobro_pendiente',
          titulo: '💰 Cobro pendiente',
          descripcion: `${t.descripcion_trabajo} — debe RD$${(monto - abono).toLocaleString()}`,
          link: `/trabajos/${t.id}`,
          leida: false,
          fecha: hoyStr,
          prioridad: 'media',
        });
      }
    }

    // Stock bajo
    for (const item of inventario || []) {
      if (item.stock_actual <= item.stock_minimo) {
        lista.push({
          id: `stock-${item.id}`,
          tipo: 'stock_bajo',
          titulo: '📦 Stock bajo',
          descripcion: `${item.nombre_item} — ${item.stock_actual} unidades`,
          link: '/inventario',
          leida: false,
          fecha: hoyStr,
          prioridad: 'baja',
        });
      }
    }

    // Ordenar: alta → media → baja, y dentro de cada grupo por fecha
    lista.sort((a, b) => {
      const p = { alta: 0, media: 1, baja: 2 };
      return p[a.prioridad] - p[b.prioridad] || a.fecha.localeCompare(b.fecha);
    });

    // Recuperar leídas del localStorage
    const leidas = new Set<string>(JSON.parse(localStorage.getItem('notifs_leidas') || '[]'));
    setNotifs(lista.map(n => ({ ...n, leida: leidas.has(n.id) })));
    setLoading(false);
  }, []);

  useEffect(() => { calcular(); }, [calcular]);

  const marcarLeida = (id: string) => {
    const leidas = new Set<string>(JSON.parse(localStorage.getItem('notifs_leidas') || '[]'));
    leidas.add(id);
    localStorage.setItem('notifs_leidas', JSON.stringify([...leidas]));
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
  };

  const marcarTodasLeidas = () => {
    const ids = notifs.map(n => n.id);
    localStorage.setItem('notifs_leidas', JSON.stringify(ids));
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
  };

  const noLeidas = notifs.filter(n => !n.leida).length;

  return { notifs, loading, noLeidas, marcarLeida, marcarTodasLeidas, refetch: calcular };
}
