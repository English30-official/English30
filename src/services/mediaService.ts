import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase';

export const PUBLIC_SITE_ASSETS_BUCKET = 'site-assets';
export const PRIVATE_LESSON_MEDIA_BUCKET = 'lesson-media';
export const MAX_SITE_IMAGE_BYTES = 5 * 1024 * 1024;

export interface MediaAsset {
  id: string; bucketId: string; storagePath: string; fileName: string; mimeType?: string; sizeBytes?: number;
  altText?: string; kind: 'image' | 'video' | 'audio' | 'document' | 'other'; provider: string;
  providerAssetId?: string; metadata: Record<string, unknown>; createdAt: string; archivedAt?: string; resolvedUrl?: string;
}
export interface SiteImageUploadOptions { folder?: 'branding' | 'courses' | 'certificates' | 'library'; altText?: string; allowFavicon?: boolean; }

const SAFE_IMAGE_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp']);
const FAVICON_MIMES = new Set(['image/x-icon', 'image/vnd.microsoft.icon']);
const EXTENSION_MIME: Record<string, string> = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', ico: 'image/x-icon' };
const mapRow = (row: any): MediaAsset => ({ id: row.id, bucketId: row.bucket_id, storagePath: row.storage_path, fileName: row.file_name, mimeType: row.mime_type ?? undefined, sizeBytes: row.size_bytes ?? undefined, altText: row.alt_text ?? undefined, kind: row.kind, provider: row.provider ?? 'supabase_storage', providerAssetId: row.provider_asset_id ?? undefined, metadata: row.metadata ?? {}, createdAt: row.created_at, archivedAt: row.archived_at ?? undefined });
const kindOf = (mime: string): MediaAsset['kind'] => mime.startsWith('image/') ? 'image' : mime.startsWith('video/') ? 'video' : mime.startsWith('audio/') ? 'audio' : mime === 'application/pdf' ? 'document' : 'other';
const extensionOf = (name: string) => name.toLowerCase().split('.').pop() ?? '';
const hasValidImageSignature = (bytes: Uint8Array, extension: string) => {
  if (extension === 'png') return bytes.length >= 8 && [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a].every((value, index) => bytes[index] === value);
  if (extension === 'jpg' || extension === 'jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (extension === 'webp') return bytes.length >= 12 && String.fromCharCode(...bytes.slice(0, 4)) === 'RIFF' && String.fromCharCode(...bytes.slice(8, 12)) === 'WEBP';
  if (extension === 'ico') return bytes.length >= 4 && bytes[0] === 0 && bytes[1] === 0 && bytes[2] === 1 && bytes[3] === 0;
  return false;
};
const readDimensions = async (file: Blob): Promise<{ width?: number; height?: number }> => {
  if (typeof createImageBitmap === 'function') { try { const bitmap = await createImageBitmap(file); const result = { width: bitmap.width, height: bitmap.height }; bitmap.close(); return result; } catch { /* ICO support varies. */ } }
  return {};
};

class MediaService {
  async list(bucketId = PRIVATE_LESSON_MEDIA_BUCKET, includeArchived = false): Promise<MediaAsset[]> {
    if (!isSupabaseConfigured) return [];
    let query = getSupabaseClient().from('media_assets').select('*').eq('bucket_id', bucketId).order('created_at', { ascending: false });
    if (!includeArchived) query = query.is('archived_at', null);
    const { data, error } = await query; if (error) throw error; return (data ?? []).map(mapRow);
  }
  async listImages(bucketId = PUBLIC_SITE_ASSETS_BUCKET, includeArchived = false): Promise<MediaAsset[]> { return (await this.list(bucketId, includeArchived)).filter((asset) => asset.kind === 'image'); }
  async listWithUrls(bucketId = PUBLIC_SITE_ASSETS_BUCKET, includeArchived = false): Promise<MediaAsset[]> { const assets = await this.list(bucketId, includeArchived); return Promise.all(assets.map(async (asset) => ({ ...asset, resolvedUrl: await this.resolveAssetUrl(asset) }))); }

  async uploadSiteImage(file: File, options: SiteImageUploadOptions = {}): Promise<MediaAsset> {
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    if (!file.size || file.size > MAX_SITE_IMAGE_BYTES) throw new Error('حجم الصورة يجب ألا يتجاوز 5 ميجابايت.');
    const extension = extensionOf(file.name);
    const expectedMime = EXTENSION_MIME[extension];
    const normalizedMime = file.type || expectedMime;
    const allowedMimes = options.allowFavicon ? new Set([...SAFE_IMAGE_MIMES, ...FAVICON_MIMES]) : SAFE_IMAGE_MIMES;
    if (!expectedMime || !allowedMimes.has(normalizedMime) || (file.type && expectedMime !== file.type && !(extension === 'ico' && FAVICON_MIMES.has(file.type)))) throw new Error(options.allowFavicon ? 'الأنواع المسموحة: PNG وJPEG وWebP وICO.' : 'الأنواع المسموحة: PNG وJPEG وWebP فقط.');
    if (extension === 'svg' || normalizedMime === 'image/svg+xml') throw new Error('رفع SVG غير متاح لعدم وجود تعقيم آمن له.');

    // Fast UX validation only. The Edge Function repeats signature validation
    // authoritatively before Storage or media_assets are written.
    const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
    if (!hasValidImageSignature(head, extension)) throw new Error('محتوى الملف لا يطابق امتداد الصورة المعلن.');

    const contentType = extension === 'ico' ? 'image/x-icon' : expectedMime;
    const payload = file.type === contentType ? file : new Blob([file], { type: contentType });
    const dimensions = await readDimensions(payload);
    const { data, error } = await getSupabaseClient().functions.invoke('upload-public-site-asset', {
      body: payload,
      headers: {
        'Content-Type': contentType,
        'x-file-name': encodeURIComponent(file.name),
        'x-folder': options.folder ?? 'library',
        'x-alt-text': encodeURIComponent(options.altText?.trim() || ''),
        'x-allow-favicon': options.allowFavicon ? '1' : '0',
        ...(dimensions.width ? { 'x-image-width': String(dimensions.width) } : {}),
        ...(dimensions.height ? { 'x-image-height': String(dimensions.height) } : {}),
      },
    });
    if (error) throw new Error(error.message || 'تعذر رفع الصورة عبر مسار التحقق الآمن.');
    if (!data?.ok || !data.asset) throw new Error(data?.error || 'تعذر تسجيل الصورة بعد التحقق منها.');
    return mapRow(data.asset);
  }

  async upload(file: File, bucketId = PRIVATE_LESSON_MEDIA_BUCKET, folder = 'library', altText = ''): Promise<MediaAsset> {
    if (bucketId === PUBLIC_SITE_ASSETS_BUCKET) return this.uploadSiteImage(file, { folder: folder as SiteImageUploadOptions['folder'], altText });
    if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
    const client = getSupabaseClient(); const user = (await client.auth.getUser()).data.user; if (!user) throw new Error('يجب تسجيل الدخول.');
    const extension = extensionOf(file.name).replace(/[^a-z0-9]/g, ''); if (!extension) throw new Error('امتداد الملف غير صالح.'); const path = `${folder}/${crypto.randomUUID()}.${extension}`;
    const { error } = await client.storage.from(bucketId).upload(path, file, { contentType: file.type, upsert: false }); if (error) throw error;
    const { data, error: insertError } = await client.from('media_assets').insert({ uploaded_by: user.id, bucket_id: bucketId, storage_path: path, file_name: file.name, mime_type: file.type, size_bytes: file.size, alt_text: altText || null, kind: kindOf(file.type), provider: 'supabase_storage', metadata: {} }).select('*').single();
    if (insertError) { await client.storage.from(bucketId).remove([path]); throw insertError; } return mapRow(data);
  }

  getPublicUrl(asset: Pick<MediaAsset, 'bucketId' | 'storagePath'>): string { if (!isSupabaseConfigured) return ''; return getSupabaseClient().storage.from(asset.bucketId).getPublicUrl(asset.storagePath).data.publicUrl; }
  async createSignedUrl(asset: Pick<MediaAsset, 'bucketId' | 'storagePath'>, expiresIn = 3600): Promise<string> { if (!isSupabaseConfigured) throw new Error('Supabase is not configured.'); const { data, error } = await getSupabaseClient().storage.from(asset.bucketId).createSignedUrl(asset.storagePath, expiresIn); if (error) throw error; return data.signedUrl; }
  async resolveAssetUrl(asset: Pick<MediaAsset, 'bucketId' | 'storagePath'>): Promise<string> { return asset.bucketId === PUBLIC_SITE_ASSETS_BUCKET ? this.getPublicUrl(asset) : this.createSignedUrl(asset); }
  async updateAltText(assetId: string, altText: string): Promise<void> { if (!isSupabaseConfigured) throw new Error('Supabase is not configured.'); const { error } = await getSupabaseClient().from('media_assets').update({ alt_text: altText.trim() || null }).eq('id', assetId); if (error) throw error; }
  async archive(asset: MediaAsset): Promise<void> { if (!isSupabaseConfigured) throw new Error('Supabase is not configured.'); const { error } = await getSupabaseClient().from('media_assets').update({ archived_at: new Date().toISOString() }).eq('id', asset.id); if (error) throw error; }
  async restore(asset: MediaAsset): Promise<void> { if (!isSupabaseConfigured) throw new Error('Supabase is not configured.'); const { error } = await getSupabaseClient().from('media_assets').update({ archived_at: null }).eq('id', asset.id); if (error) throw error; }
  async remove(asset: MediaAsset): Promise<void> { return this.archive(asset); }
}
export const mediaService = new MediaService();
