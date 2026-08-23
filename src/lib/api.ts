import { getSupabaseClient } from './supabase';

export async function authenticatedJsonHeaders(): Promise<Record<string, string>> {
  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  if (!data.session?.access_token) throw new Error('Authentication is required.');
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.session.access_token}`,
  };
}
