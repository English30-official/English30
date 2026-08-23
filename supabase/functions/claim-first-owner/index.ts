import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
  if (request.method !== 'GET' && request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const bootstrapEmail = Deno.env.get('OWNER_BOOTSTRAP_EMAIL')?.trim().toLowerCase();
  const authorization = request.headers.get('Authorization') ?? '';

  if (!supabaseUrl || !publishableKey || !serviceRoleKey || !bootstrapEmail) {
    return jsonResponse({ error: 'Owner bootstrap is disabled.' }, 503);
  }
  if (!authorization.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Authentication required.' }, 401);
  }

  const token = authorization.slice(7).trim();
  const authClient = createClient(supabaseUrl, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: authData, error: authError } = await authClient.auth.getUser(token);
  const user = authData.user;

  if (authError || !user) {
    return jsonResponse({ error: 'Invalid or expired access token.' }, 401);
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: profile, error: profileError } = await adminClient
    .from('profiles')
    .select('is_active,is_suspended')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError) return jsonResponse({ error: 'Unable to verify account status.' }, 500);
  if (!profile || profile.is_active === false || profile.is_suspended === true) {
    return jsonResponse({ error: 'Suspended accounts cannot claim the owner role.' }, 403);
  }

  const eligible = Boolean(
    user.email_confirmed_at
    && user.email?.trim().toLowerCase() === bootstrapEmail
  );

  if (request.method === 'GET') {
    if (!eligible) return jsonResponse({ open: false, eligible: false });

    const { data: existingStaff, error: staffError } = await adminClient
      .from('user_roles')
      .select('user_id')
      .in('role', ['owner', 'admin'])
      .limit(1)
      .maybeSingle();

    if (staffError) return jsonResponse({ error: 'Unable to verify owner bootstrap status.' }, 500);
    return jsonResponse({ open: !existingStaff, eligible: true });
  }

  if (!eligible) {
    return jsonResponse({ error: 'This account is not authorized for owner bootstrap.' }, 403);
  }

  const { error: insertError } = await adminClient
    .from('user_roles')
    .insert({ user_id: user.id, role: 'owner' });

  if (insertError) {
    const alreadyClosed = insertError.code === '23505' || insertError.code === '42501';
    return jsonResponse(
      { error: alreadyClosed ? 'Owner bootstrap is already closed.' : 'Unable to claim owner role.' },
      alreadyClosed ? 409 : 500,
    );
  }

  return jsonResponse({ claimed: true }, 201);
});
