import { supabase } from '@/lib/supabase';
import type { Tables, TablesUpdate } from '@/types/database.types';

export type Profile = Tables<'profiles'>;
export type ProfileUpdate = Omit<TablesUpdate<'profiles'>, 'id' | 'created_at' | 'updated_at'>;

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, patch: ProfileUpdate): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(patch)
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data;
}
