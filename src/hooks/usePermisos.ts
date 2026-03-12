import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// Lista completa de módulos del sistema
export const MODULOS = [
  { key: 'clientes',     label: 'Clientes',     path: '/clientes' },
  { key: 'trabajos',     label: 'Trabajos',     path: '/trabajos' },
  { key: 'cotizaciones', label: 'Cotizaciones', path: '/cotizaciones' },
  { key: 'empleados',    label: 'Empleados',    path: '/empleados' },
  { key: 'inventario',   label: 'Inventario',   path: '/inventario' },
  { key: 'proveedores',  label: 'Proveedores',  path: '/proveedores' },
  { key: 'caja',         label: 'Caja Chica',   path: '/caja' },
  { key: 'kpis',         label: 'KPIs',         path: '/kpis' },
  { key: 'reportes',     label: 'Reportes',     path: '/reportes' },
  { key: 'calendario',   label: 'Calendario',   path: '/calendario' },
  { key: 'ofertas',      label: 'Ofertas',      path: '/ofertas' },
] as const;

export type ModuloKey = typeof MODULOS[number]['key'];

// Cache simple para no re-fetchear en cada render
let permisosCache: Record<string, Set<string>> = {};

export function usePermisos() {
  const { user, isOwner, loading: authLoading } = useAuth();
  const [permisos, setPermisos] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    // Owner siempre tiene acceso a todo
    if (isOwner) {
      setPermisos(new Set(MODULOS.map(m => m.key)));
      setLoading(false);
      return;
    }

    if (!user) {
      setPermisos(new Set());
      setLoading(false);
      return;
    }

    // Verificar cache
    if (permisosCache[user.id]) {
      setPermisos(permisosCache[user.id]);
      setLoading(false);
      return;
    }

    const fetchPermisos = async () => {
      const { data } = await supabase
        .from('user_permisos')
        .select('modulo, activo')
        .eq('user_id', user.id)
        .eq('activo', true);

      const set = new Set<string>(data?.map(p => p.modulo) ?? []);
      permisosCache[user.id] = set;
      setPermisos(set);
      setLoading(false);
    };

    fetchPermisos();
  }, [user, isOwner, authLoading]);

  const tieneAcceso = (modulo: string) => isOwner || permisos.has(modulo);

  // Limpiar cache cuando el usuario cambia (logout/login)
  const limpiarCache = () => {
    permisosCache = {};
  };

  return { permisos, loading, tieneAcceso, limpiarCache };
}