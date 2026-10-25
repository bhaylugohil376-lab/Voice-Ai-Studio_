import { requireUser } from "./_lib/auth.js";
import { requireMethod, parseJsonBody, sendError, sendSuccess } from "./_lib/response.js";
import { supabaseAdmin } from "./_lib/supabase.js";
const MAX_NAME_LENGTH = 100, MAX_AVATAR_URL_LENGTH = 2048;
export default async function handler(req, res) {
  if (!requireMethod(req, res, ["GET", "PATCH"])) return;
  try {
    const user = await requireUser(req, res); if (!user) return;
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin.from("profiles").select("*").eq("id", user.id).maybeSingle();
      if (error) { console.error("Profile fetch error:", error.message); return sendError(res, 500, "Could not load your profile."); }
      return sendSuccess(res, { profile: data, account: { id: user.id, email: user.email } });
    }
    const body = parseJsonBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) return sendError(res, 400, "Invalid request body.");
    const updates = {};
    if (Object.prototype.hasOwnProperty.call(body, "full_name")) {
      if (typeof body.full_name !== "string" || body.full_name.trim().length > MAX_NAME_LENGTH) return sendError(res, 400, `Name must be ${MAX_NAME_LENGTH} characters or fewer.`);
      updates.full_name = body.full_name.trim();
    }
    if (Object.prototype.hasOwnProperty.call(body, "avatar_url")) {
      const avatarUrl = typeof body.avatar_url === "string" ? body.avatar_url.trim() : "";
      if (avatarUrl.length > MAX_AVATAR_URL_LENGTH) return sendError(res, 400, "Avatar URL is too long.");
      if (avatarUrl) { let parsedUrl; try { parsedUrl = new URL(avatarUrl); } catch { return sendError(res, 400, "Invalid avatar URL."); } if (parsedUrl.protocol !== "https:") return sendError(res, 400, "Avatar URL must use HTTPS."); updates.avatar_url = parsedUrl.toString(); }
      else updates.avatar_url = null;
    }
    if (Object.keys(updates).length === 0) return sendError(res, 400, "No valid profile changes provided.");
    updates.updated_at = new Date().toISOString();
    const { data, error } = await supabaseAdmin.from("profiles").upsert({ id: user.id, ...updates }, { onConflict: "id" }).select("*").single();
    if (error) { console.error("Profile update error:", error.message); return sendError(res, 500, "Could not update your profile."); }
    return sendSuccess(res, { profile: data });
  } catch (error) { console.error("Profile API error:", error?.message || error); return sendError(res, 500, "Internal server error."); }
}