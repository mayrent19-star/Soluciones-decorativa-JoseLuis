import { supabase } from '@/integrations/supabase/client';

const db = supabase as any;

// Registra una acción en auditoría y crea notificación para los dueños
export async function registrarAuditoria({
  modulo,
  accion,
  descripcion,
  datos_anteriores,
  datos_nuevos,
}: {
  modulo: string;
  accion: 'crear' | 'editar' | 'eliminar';
  descripcion: string;
  datos_anteriores?: any;
  datos_nuevos?: any;
}) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Obtener nombre del usuario
    const { data: profile } = await db
      .from('profiles')
      .select('nombre, email')
      .eq('user_id', user.id)
      .maybeSingle();

    const user_nombre = profile?.nombre || profile?.email || 'Usuario';

    // Verificar si es owner — si es owner registrar igual pero marcar diferente
    const { data: rol } = await db
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .maybeSingle();

    const esOwner = rol?.role === 'owner';

    // 1. Insertar en tabla auditoría
    await db.from('auditoria').insert({
      user_id:          user.id,
      user_nombre,
      modulo,
      accion,
      descripcion,
      datos_anteriores: datos_anteriores ? JSON.stringify(datos_anteriores) : null,
      datos_nuevos:     datos_nuevos     ? JSON.stringify(datos_nuevos)     : null,
    });

    // 2. Crear notificación solo si es empleado (owner no se notifica a sí mismo)
    //    Si es owner, crear notificación de igual forma para tener registro
    const accionLabel = accion === 'crear' ? '➕ Creó' : accion === 'editar' ? '✏️ Editó' : '🗑️ Eliminó';
    const moduloLabel = modulo.charAt(0).toUpperCase() + modulo.slice(1);

    await db.from('notificaciones').insert({
      titulo:      `${esOwner ? '👑' : '👤'} ${user_nombre} ${accionLabel} en ${moduloLabel}`,
      descripcion,
      leida:       false,
      tipo:        esOwner ? 'owner' : 'auditoria',
      link:        `/${modulo}`,
    });

  } catch (err) {
    // Nunca interrumpir el flujo principal por un error de auditoría
    console.warn('Auditoría no registrada:', err);
  }
}
