import { createClient } from "@supabase/supabase-js";
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const authOptions = { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false };
let supabase = null;
let supabaseAdmin = null;
if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey, { auth: { ...authOptions } });
if (supabaseUrl && supabaseServiceRoleKey) supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, { auth: { ...authOptions } });
export function getSupabasePublic() {
  if (!supabase) throw new Error("Supabase public client is not configured. Check SUPABASE_URL and SUPABASE_ANON_KEY.");
  return supabase;
}
export function getSupabaseAdmin() {
  if (!supabaseAdmin) throw new Error("Supabase admin client is not configured. Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  return supabaseAdmin;
}
export { supabase, supabaseAdmin };
export default supabaseAdmin;
