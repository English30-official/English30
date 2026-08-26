import { CmsPage } from '../types';
import { getSupabaseClient } from '../lib/supabase';

class PagesService {
  async getPublishedBySlug(slug: string): Promise<CmsPage | null> {
    const { data, error } = await getSupabaseClient().from('cms_pages').select('*').eq('slug', slug).eq('status', 'published').maybeSingle();
    if (error) throw error;
    if (!data) return null;
    return { id:data.id,slug:data.slug,pageType:data.page_type,titleAr:data.title_ar,titleEn:data.title_en??undefined,body:Array.isArray(data.body)?data.body:[],status:data.status,seoTitle:data.seo_title??undefined,seoDescription:data.seo_description??undefined,openGraphAssetId:data.open_graph_asset_id??undefined,updatedAt:data.updated_at };
  }
}
export const pagesService=new PagesService();
