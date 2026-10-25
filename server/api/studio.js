import { supabaseAdmin } from "./_lib/supabase.js";
import { requireUser } from "./_lib/auth.js";
import { requireMethod, parseJsonBody, sendError, sendSuccess } from "./_lib/response.js";
const MAX_DATA_LENGTH = 200000;
export default async function handler(req, res) {
  try {
    const user = await requireUser(req, res); if (!user) return;
    if (!requireMethod(req, res, ["GET", "POST", "PATCH", "DELETE"])) return;
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin.from("studio_projects").select("id, title, content, created_at, updated_at").eq("user_id", user.id).order("updated_at", { ascending: false }).limit(100);
      if (error) { console.error("Studio list error:", error.message); return sendError(res, 500, "Could not load Studio projects."); }
      return sendSuccess(res, { projects: data || [], count: data?.length || 0 });
    }
    const body = parseJsonBody(req);
    if (!body || typeof body !== "object") return sendError(res, 400, "Valid JSON body is required.");
    if (req.method === "POST") {
      const title = typeof body.title === "string" ? body.title.trim() : "", content = body.content;
      if (title.length < 1 || title.length > 150) return sendError(res, 400, "Title must be 1–150 characters.");
      if (typeof content !== "string" || content.length > MAX_DATA_LENGTH) return sendError(res, 400, "Invalid Studio content.");
      const now = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("studio_projects").insert({ user_id: user.id, title, content, created_at: now, updated_at: now }).select("id, title, content, created_at, updated_at").single();
      if (error) { console.error("Studio create error:", error.message); return sendError(res, 500, "Could not save Studio project."); }
      return sendSuccess(res, { message: "Studio project saved.", project: data });
    }
    if (typeof body.id !== "string" || body.id.length < 1 || body.id.length > 100) return sendError(res, 400, "A valid project id is required.");
    if (req.method === "PATCH") {
      const updates = { updated_at: new Date().toISOString() };
      if (Object.hasOwn(body, "title")) { if (typeof body.title !== "string" || body.title.trim().length < 1 || body.title.trim().length > 150) return sendError(res, 400, "Invalid project title."); updates.title = body.title.trim(); }
      if (Object.hasOwn(body, "content")) { if (typeof body.content !== "string" || body.content.length > MAX_DATA_LENGTH) return sendError(res, 400, "Invalid Studio content."); updates.content = body.content; }
      if (Object.keys(updates).length === 1) return sendError(res, 400, "No project fields to update.");
      const { data, error } = await supabaseAdmin.from("studio_projects").update(updates).eq("id", body.id).eq("user_id", user.id).select("id, title, content, created_at, updated_at").maybeSingle();
      if (error) { console.error("Studio update error:", error.message); return sendError(res, 500, "Could not update Studio project."); }
      if (!data) return sendError(res, 404, "Studio project not found.");
      return sendSuccess(res, { message: "Studio project updated.", project: data });
    }
    const { data, error } = await supabaseAdmin.from("studio_projects").delete().eq("id", body.id).eq("user_id", user.id).select("id");
    if (error) { console.error("Studio delete error:", error.message); return sendError(res, 500, "Could not delete Studio project."); }
    if (!data?.length) return sendError(res, 404, "Studio project not found.");
    return sendSuccess(res, { message: "Studio project deleted.", id: data[0].id });
  } catch (error) { console.error("Studio API error:", error); return sendError(res, 500, "Unexpected server error."); }
}