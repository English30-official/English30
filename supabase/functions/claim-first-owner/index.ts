import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };

type ErrorLike = {
  code?: unknown;
  message?: unknown;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const safeErrorSummary = (error: unknown) => {
  const value = error && typeof error === 'object' ? error as ErrorLike : {};
  const code = typeof value.code === 'string' ? value.code.slice(0, 64) : 'UNEXPECTED_ERROR';
  const message = typeof value.message === 'string'
    ? value.message.replace(/[\r\n]+/g, ' ').slice(0, 240)
    : 'Unexpected server-side failure.';

  return { code, message };
};

const logFailure = (
  requestId: string,
  method: string,
  stage: string,
  error: unknown,
) => {
  const summary = safeErrorSummary(error);
  console.error('[claim-first-owner]', JSON.stringify({
    requestId,
    method,
    stage,
    errorCode: summary.code,
    errorMessage: summary.message,
  }));
};

const failureResponse = (
  requestId: string,
  code: string,
  error: string,
  status: number,
) => jsonResponse({
  ok: false,
  open: false,
  eligible: false,
  code,
  error,
  requestId,
}, status);

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();

  try {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }
    if (request.method !== 'GET' && request.method !== 'POST') {
      return failureResponse(requestId, 'METHOD_NOT_ALLOWED', 'Method not allowed.', 405);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const bootstrapEmail = Deno.env.get('OWNER_BOOTSTRAP_EMAIL')?.trim().toLowerCase();
    const authorization = request.headers.get('Authorization') ?? '';
    const missingConfiguration = [
      !supabaseUrl && 'SUPABASE_URL',
      !publishableKey && 'SUPABASE_ANON_KEY',
      !serviceRoleKey && 'SUPABASE_SERVICE_ROLE_KEY',
      !bootstrapEmail && 'OWNER_BOOTSTRAP_EMAIL',
    ].filter(Boolean);

    if (!supabaseUrl || !publishableKey || !serviceRoleKey || !bootstrapEmail) {
      logFailure(requestId, request.method, 'configuration', {
        code: 'MISSING_CONFIGURATION',
        message: `Missing environment variables: ${missingConfiguration.join(', ')}`,
      });
      return failureResponse(
        requestId,
        'BOOTSTRAP_DISABLED',
        'Owner bootstrap is disabled.',
        503,
      );
    }
    if (!authorization.startsWith('Bearer ')) {
      return failureResponse(requestId, 'AUTH_REQUIRED', 'Authentication required.', 401);
    }

    const token = authorization.slice(7).trim();
    const authClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    const user = authData.user;

    if (authError || !user) {
      return failureResponse(
        requestId,
        'INVALID_ACCESS_TOKEN',
        'Invalid or expired access token.',
        401,
      );
    }

    // Read the caller's own profile through the authenticated role so RLS remains
    // authoritative for account state. The service role is reserved for the two
    // bootstrap-only operations that require a database-wide view.
    const userClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('is_active,is_suspended')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      logFailure(requestId, request.method, 'profile_status', profileError);
      return failureResponse(
        requestId,
        'PROFILE_STATUS_UNAVAILABLE',
        'Unable to verify account status.',
        503,
      );
    }
    if (!profile || profile.is_active === false || profile.is_suspended === true) {
      return failureResponse(
        requestId,
        'ACCOUNT_INELIGIBLE',
        'Suspended or inactive accounts cannot claim the owner role.',
        403,
      );
    }

    const eligible = Boolean(
      user.email_confirmed_at
      && user.email?.trim().toLowerCase() === bootstrapEmail
    );

    if (request.method === 'GET' && !eligible) {
      return jsonResponse({ ok: true, open: false, eligible: false, requestId });
    }
    if (!eligible) {
      return failureResponse(
        requestId,
        'BOOTSTRAP_NOT_AUTHORIZED',
        'This account is not authorized for owner bootstrap.',
        403,
      );
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (request.method === 'GET') {
      const { data: existingStaff, error: staffError } = await adminClient
        .from('user_roles')
        .select('user_id')
        .in('role', ['owner', 'admin'])
        .limit(1)
        .maybeSingle();

      if (staffError) {
        logFailure(requestId, request.method, 'bootstrap_status', staffError);
        return failureResponse(
          requestId,
          'BOOTSTRAP_STATUS_UNAVAILABLE',
          'Unable to verify owner bootstrap status.',
          503,
        );
      }

      return jsonResponse({
        ok: true,
        open: !existingStaff,
        eligible: true,
        requestId,
      });
    }

    const { error: insertError } = await adminClient
      .from('user_roles')
      .insert({ user_id: user.id, role: 'owner' });

    if (insertError) {
      const alreadyClosed = insertError.code === '23505' || insertError.code === '42501';
      if (!alreadyClosed) {
        logFailure(requestId, request.method, 'owner_claim', insertError);
      }
      return failureResponse(
        requestId,
        alreadyClosed ? 'BOOTSTRAP_CLOSED' : 'OWNER_CLAIM_FAILED',
        alreadyClosed ? 'Owner bootstrap is already closed.' : 'Unable to claim owner role.',
        alreadyClosed ? 409 : 503,
      );
    }

    return jsonResponse({ ok: true, claimed: true, requestId }, 201);
  } catch (error) {
    logFailure(requestId, request.method, 'unhandled', error);
    return failureResponse(
      requestId,
      'INTERNAL_ERROR',
      'Owner bootstrap is temporarily unavailable.',
      503,
    );
  }
});
