import { supabase } from '@/lib/supabase';
import type { Tables } from '@/types/database.types';

export type WaterLog = Tables<'water_logs'>;

/** Everything needed to insert a log, generated on the device so it can be queued offline. */
export type AddWaterVars = Pick<
  WaterLog,
  'id' | 'user_id' | 'amount_ml' | 'logged_at' | 'logged_on'
>;

/** The whole row, so an optimistic delete can be put back if the server rejects it. */
export type DeleteWaterVars = { log: WaterLog };

export async function fetchDayWaterLogs(date: string): Promise<WaterLog[]> {
  const { data, error } = await supabase
    .from('water_logs')
    .select('*')
    .eq('logged_on', date)
    .order('logged_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function addWaterLog(vars: AddWaterVars): Promise<void> {
  // A replayed write hits the primary key and is skipped (ON CONFLICT DO NOTHING).
  const { error } = await supabase
    .from('water_logs')
    .upsert(vars, { onConflict: 'id', ignoreDuplicates: true });
  if (error) throw error;
}

export async function deleteWaterLog({ log }: DeleteWaterVars): Promise<void> {
  // Deleting an already-deleted row affects 0 rows and succeeds, so replays are safe too.
  const { error } = await supabase.from('water_logs').delete().eq('id', log.id);
  if (error) throw error;
}
