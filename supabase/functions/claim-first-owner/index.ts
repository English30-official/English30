import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const jsonHeaders = { 'Content-Type': 'application/json' };

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed.' }), { status: 405, headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const bootstrapEmail = Deno.env.get('OWNER_BOOTSTRAP_EMAIL')?.trim().toLowerCase();
  const authorization = request.headers.get('Authorization') ?? '';

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !bootstrapEmail) {
    return new Response(JSON.stringify({ error: 'Owner bootstrap is disabled.' }), { status: 503, headers: jsonHeaders });
  }
  if (!authorization.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), { status: 401, headers: jsonHeaders });
  }

  const token = authorization.slice(7).trim();
  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData.user;

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Invalid or expired access token.' }), { status: 401, headers: jsonHeaders });
  }
  if (!user.email_confirmed_at || user.email?.trim().toLowerCase() !== bootstrapEmail) {
    return new Response(JSON.stringify({ error: 'This account is not authorized for owner bootstrap.' }), { status: 403, headers: jsonHeaders });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error: insertError } = await adminClient
    .from('user_roles')
    .insert({ user_id: user.id, role: 'owner' });

  if (insertError) {
    const alreadyClosed = insertError.code === '23505' || insertError.code === '42501';
    return new Response(
      JSON.stringify({ error: alreadyClosed ? 'Owner bootstrap is already closed.' : 'Unable to claim owner role.' }),
      { status: alreadyClosed ? 409 : 500, headers: jsonHeaders },
    );
  }

  return new Response(JSON.stringify({ claimed: true }), { status: 201, headers: jsonHeaders });
});
