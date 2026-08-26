import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const MAX_BYTES = 5 * 1024 * 1024;
const BUCKET = 'site-assets';
const FOLDERS = new Set(['branding', 'courses', 'certificates', 'library']);
const MIME_BY_EXTENSION: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  ico: 'image/x-icon',
};
const ALLOWED_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/x-icon', 'image/vnd.microsoft.icon']);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-file-name, x-folder, x-alt-text, x-allow-favicon, x-image-width, x-image-height',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' };
const respond = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: jsonHeaders });

const decodeHeader = (value: string | null, maxLength: number) => {
  if (!value) return '';
  try { return decodeURIComponent(value).trim().slice(0, maxLength); }
  catch { return value.trim().slice(0, maxLength); }
};

const extensionOf = (name: string) => name.toLowerCase().split('.').pop() ?? '';
const hasValidSignature = (bytes: Uint8Array, extension: string) => {
  if (extension === 'png') return bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value);
  if (extension === 'jpg' || extension === 'jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === 'webp') return bytes.length >= 12 && new TextDecoder('ascii').decode(bytes.slice(0, 4)) === 'RIFF' && new TextDecoder('ascii').decode(bytes.slice(8, 12)) === 'WEBP';
  if (extension === 'ico') return bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0;
  return false;
};
const toHex = (buffer: ArrayBuffer) => Array.from(new Uint8Array(buffer), (value) => value.toString(16).padStart(2, '0')).join('');
const optionalDimension = (value: string | null) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 20000 ? parsed : undefined;
};

Deno.serve(async (request: Request) => {
  const requestId = crypto.randomUUID();
  try {
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });
    if (request.method !== 'POST') return respond({ ok: false, error: 'Method not allowed.', requestId }, 405);

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const publishableKey = Deno.env.get('SUPABASE_ANON_KEY');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const authorization = request.headers.get('Authorization') ?? '';
    if (!supabaseUrl || !publishableKey || !serviceRoleKey) {
      console.error('[upload-public-site-asset]', JSON.stringify({ requestId, stage: 'configuration' }));
      return respond({ ok: false, error: 'Media upload service is not configured.', requestId }, 503);
    }
    if (!authorization.startsWith('Bearer ')) return respond({ ok: false, error: 'Authentication required.', requestId }, 401);

    const token = authorization.slice(7).trim();
    const authClient = createClient(supabaseUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: authData, error: authError } = await authClient.auth.getUser(token);
    if (authError || !authData.user) return respond({ ok: false, error: 'Invalid or expired access token.', requestId }, 401);

    const userClient = createClient(supabaseUrl, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: profile, error: profileError } = await userClient.from('profiles').select('is_active,is_suspended').eq('id', authData.user.id).maybeSingle();
    if (profileError) return respond({ ok: false, error: 'Unable to verify account status.', requestId }, 503);
    if (!profile || profile.is_active === false || profile.is_suspended === true) return respond({ ok: false, error: 'Account is inactive or suspended.', requestId }, 403);

    const { data: permitted, error: permissionError } = await userClient.rpc('check_permission', { p_permission: 'media.manage' });
    if (permissionError) return respond({ ok: false, error: 'Unable to verify media permission.', requestId }, 503);
    if (permitted !== true) return respond({ ok: false, error: 'media.manage permission required.', requestId }, 403);

    const fileName = decodeHeader(request.headers.get('x-file-name'), 240);
    const folder = (request.headers.get('x-folder') ?? 'library').trim().toLowerCase();
    const altText = decodeHeader(request.headers.get('x-alt-text'), 1000);
    const allowFavicon = request.headers.get('x-allow-favicon') === '1';
    const extension = extensionOf(fileName);
    const expectedMime = MIME_BY_EXTENSION[extension];
    const declaredMime = (request.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase();
    if (!fileName || !FOLDERS.has(folder) || !expectedMime || !ALLOWED_MIMES.has(declaredMime)) {
      return respond({ ok: false, error: 'Unsupported public image upload.', requestId }, 400);
    }
    if (extension === 'ico' && !allowFavicon) return respond({ ok: false, error: 'ICO is allowed only for favicon uploads.', requestId }, 400);
    const mimeMatches = extension === 'ico'
      ? (declaredMime === 'image/x-icon' || declaredMime === 'image/vnd.microsoft.icon')
      : declaredMime === expectedMime;
    if (!mimeMatches) return respond({ ok: false, error: 'File extension and MIME type do not match.', requestId }, 400);

    const contentLength = Number(request.headers.get('content-length') ?? 0);
    if (contentLength > MAX_BYTES) return respond({ ok: false, error: 'Image must not exceed 5 MB.', requestId }, 413);
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return respond({ ok: false, error: 'Image must be between 1 byte and 5 MB.', requestId }, 413);
    if (!hasValidSignature(bytes, extension)) return respond({ ok: false, error: 'Binary content does not match the declared image type.', requestId }, 415);

    const sha256 = toHex(await crypto.subtle.digest('SHA-256', bytes));
    const adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: duplicate, error: duplicateError } = await adminClient
      .from('media_assets').select('*').eq('bucket_id', BUCKET).eq('kind', 'image').is('archived_at', null)
      .contains('metadata', { sha256 }).limit(1).maybeSingle();
    if (duplicateError) throw duplicateError;
    if (duplicate) return respond({ ok: true, asset: duplicate, deduplicated: true, requestId });

    const pathExtension = extension === 'jpeg' ? 'jpg' : extension;
    const storagePath = `${folder}/${crypto.randomUUID()}.${pathExtension}`;
    const canonicalMime = extension === 'ico' ? 'image/x-icon' : expectedMime;
    const payload = new Blob([bytes], { type: canonicalMime });
    const { error: uploadError } = await adminClient.storage.from(BUCKET).upload(storagePath, payload, {
      contentType: canonicalMime,
      upsert: false,
      cacheControl: '31536000',
    });
    if (uploadError) throw uploadError;

    const width = optionalDimension(request.headers.get('x-image-width'));
    const height = optionalDimension(request.headers.get('x-image-height'));
    const metadata: Record<string, unknown> = { sha256, extension: pathExtension, binaryValidated: true };
    if (width) metadata.width = width;
    if (height) metadata.height = height;

    const { data: asset, error: insertError } = await adminClient.from('media_assets').insert({
      uploaded_by: authData.user.id,
      bucket_id: BUCKET,
      storage_path: storagePath,
      file_name: fileName,
      mime_type: canonicalMime,
      size_bytes: bytes.length,
      alt_text: altText || null,
      kind: 'image',
      provider: 'supabase_storage',
      metadata,
    }).select('*').single();
    if (insertError) {
      await adminClient.storage.from(BUCKET).remove([storagePath]);
      throw insertError;
    }

    return respond({ ok: true, asset, deduplicated: false, requestId }, 201);
  } catch (error) {
    console.error('[upload-public-site-asset]', JSON.stringify({ requestId, stage: 'unhandled', error: error instanceof Error ? error.message.slice(0, 240) : 'unknown' }));
    return respond({ ok: false, error: 'Unable to upload public site image.', requestId }, 503);
  }
});
