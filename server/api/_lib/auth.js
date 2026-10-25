import { getSupabasePublic } from "./supabase.js";
export async function requireAuth(req, res) {
  const authorization = req.headers?.authorization || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  if (!match) { res.status(401).json({ success: false, error: "Authentication required. Provide a Bearer token." }); return null; }
  const token = match[1].trim();
  if (!token) { res.status(401).json({ success: false, error: "Authentication token is missing." }); return null; }
  try {
    const supabase = getSupabasePublic();
    const { data, error } = await supabase.auth.getUser(token);
    if (error || !data?.user) { res.status(401).json({ success: false, error: "Invalid or expired authentication token." }); return null; }
    return data.user;
  } catch (error) {
    console.error("Authentication error:", error?.message || error);
    res.status(503).json({ success: false, error: "Authentication service is unavailable." });
    return null;
  }
}
export const requireUser = requireAuth;
export default requireAuth;
