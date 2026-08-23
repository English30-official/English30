// Compatibility export for older imports. The Supabase-backed implementation is
// the single production source of truth; this module must never provide mock plans.
export { subscriptionsService } from './subscriptionsServiceSupabase';
