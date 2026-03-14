import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { formatDate } from '@/utils/helpers';

const db = supabase as any;

export interface Notificacion {
  id: string;
  titulo: string;
  descripcion: string;
  leida: boolean;
  tipo: string;
  link?: string;
  fecha: string;
  prioridad: 'alta' | 'media' | 'baja';
}

export function useNotificaciones() {
  const [notifs,    setNotifs]    = useState<Notificacion[]>([]);
  const [noLeidas,  setNoLeidas]  = useState(0);

  const load = useCallback(async () => {
    try {
      const { data } = await db
        .from('notificaciones')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (!data) return;

      const mapped: Notificacion[] = data.map((n: any) => ({
        id:          n.id,
        titulo:      n.titulo,
        descripcion: n.descripcion || '',
        leida:       n.leida,
        tipo:        n.tipo || 'auditoria',
        link:        n.link || null,
        fecha:       formatDate(n.created_at?.slice(0, 10) || ''),
        prioridad:   n.tipo === 'auditoria' ? 'media' : 'baja',
      }));

      setNotifs(mapped);
      setNoLeidas(mapped.filter(n => !n.leida).length);
    } catch (err) {
      console.warn('Error cargando notificaciones:', err);
    }
  }, []);

  useEffect(() => {
    load();
    // Recargar cada 30 segundos para notificaciones en tiempo casi real
    const interval = setInterval(load, 30000);
    return () => clearInterval(interval);
  }, [load]);

  const marcarLeida = async (id: string) => {
    await db.from('notificaciones').update({ leida: true }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, leida: true } : n));
    setNoLeidas(prev => Math.max(0, prev - 1));
  };

  const marcarTodasLeidas = async () => {
    await db.from('notificaciones').update({ leida: true }).eq('leida', false);
    setNotifs(prev => prev.map(n => ({ ...n, leida: true })));
    setNoLeidas(0);
  };

  return { notifs, noLeidas, marcarLeida, marcarTodasLeidas, reload: load };
}
