import { supabase } from '@/integrations/supabase/client';

// The types file hasn't been regenerated yet, so we cast to any
const db = supabase as any;

export async function fetchAll<T>(table: string, orderBy = 'created_at', ascending = false): Promise<T[]> {
  const { data, error } = await db.from(table).select('*').order(orderBy, { ascending });
  if (error) throw error;
  return (data || []) as T[];
}

export async function fetchById<T>(table: string, id: string): Promise<T | null> {
  const { data, error } = await db.from(table).select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data as T | null;
}

export async function fetchWhere<T>(table: string, column: string, value: string): Promise<T[]> {
  const { data, error } = await db.from(table).select('*').eq(column, value);
  if (error) throw error;
  return (data || []) as T[];
}

export async function insertRow<T>(table: string, row: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.from(table).insert(row).select().single();
  if (error) throw error;
  return data as T;
}

export async function updateRow<T>(table: string, id: string, updates: Record<string, unknown>): Promise<T> {
  const { data, error } = await db.from(table).update(updates).eq('id', id).select().single();
  if (error) throw error;
  return data as T;
}

export async function deleteRow(table: string, id: string): Promise<void> {
  const { error } = await db.from(table).delete().eq('id', id);
  if (error) throw error;
}

export async function getConfig(clave: string): Promise<string> {
  const { data } = await db.from('configuracion').select('valor').eq('clave', clave).maybeSingle();
  return data?.valor || '';
}

export async function setConfig(clave: string, valor: string): Promise<void> {
  await db.from('configuracion').update({ valor }).eq('clave', clave);
}
