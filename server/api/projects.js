import { requireUser } from "./_lib/auth.js";
import { requireMethod, parseJsonBody, sendError, sendSuccess } from "./_lib/response.js";
import { supabaseAdmin } from "./_lib/supabase.js";
const MAX_TITLE_LENGTH = 150, MAX_CONTENT_LENGTH = 100000, ALLOWED_STATUSES = ["draft", "in_progress", "completed"];
export default async function handler(req, res) {
  if (!requireMethod(req, res, ["GET", "POST", "PATCH", "DELETE"])) return;
  try {
    const user = await requireUser(req, res); if (!user) return;
    if (req.method === "GET") {
      const { data, error } = await supabaseAdmin.from("projects").select("*").eq("user_id", user.id).order("updated_at", { ascending: false });
      if (error) { console.error("Projects list error:", error.message); return sendError(res, 500, "Could not load projects."); }
      return sendSuccess(res, { projects: data || [] });
    }
    const body = parseJsonBody(req);
    if (!body || typeof body !== "object" || Array.isArray(body)) return sendError(res, 400, "Invalid request body.");
    if (req.method === "POST") {
      const title = typeof body.title === "string" ? body.title.trim() : "";
      if (!title || title.length > MAX_TITLE_LENGTH) return sendError(res, 400, `Title is required and must be at most ${MAX_TITLE_LENGTH} characters.`);
      const record = { user_id: user.id, title };
      if (typeof body.content === "string") { if (body.content.length > MAX_CONTENT_LENGTH) return sendError(res, 400, "Project content is too large."); record.content = body.content; }
      if (typeof body.description === "string") record.description = body.description.slice(0, 2000);
      if (typeof body.status === "string") { if (!ALLOWED_STATUSES.includes(body.status)) return sendError(res, 400, "Invalid project status."); record.status = body.status; }
      const { data, error } = await supabaseAdmin.from("projects").insert(record).select("*").single();
      if (error) { console.error("Project create error:", error.message); return sendError(res, 500, "Could not create project."); }
      return res.status(201).json({ success: true, project: data });
    }
    const projectId = typeof body.id === "string" || typeof body.id === "number" ? String(body.id).trim() : "";
    if (!projectId || projectId.length > 100) return sendError(res, 400, "A valid project ID is required.");
    if (req.method === "PATCH") {
      const updates = {};
      if (Object.prototype.hasOwnProperty.call(body, "title")) { if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > MAX_TITLE_LENGTH) return sendError(res, 400, "Invalid project title."); updates.title = body.title.trim(); }
      if (Object.prototype.hasOwnProperty.call(body, "content")) { if (typeof body.content !== "string" || body.content.length > MAX_CONTENT_LENGTH) return sendError(res, 400, "Invalid project content."); updates.content = body.content; }
      if (Object.prototype.hasOwnProperty.call(body, "description")) { if (typeof body.description !== "string") return sendError(res, 400, "Invalid project description."); updates.description = body.description.slice(0, 2000); }
      if (Object.prototype.hasOwnProperty.call(body, "status")) { if (typeof body.status !== "string" || !ALLOWED_STATUSES.includes(body.status)) return sendError(res, 400, "Invalid project status."); updates.status = body.status; }
      if (Object.keys(updates).length === 0) return sendError(res, 400, "No valid project changes provided.");
      updates.updated_at = new Date().toISOString();
      const { data, error } = await supabaseAdmin.from("projects").update(updates).eq("id", projectId).eq("user_id", user.id).select("*").maybeSingle();
      if (error) { console.error("Project update error:", error.message); return sendError(res, 500, "Could not update project."); }
      if (!data) return sendError(res, 404, "Project not found.");
      return sendSuccess(res, { project: data });
    }
    const { data, error } = await supabaseAdmin.from("projects").delete().eq("id", projectId).eq("user_id", user.id).select("id").maybeSingle();
    if (error) { console.error("Project delete error:", error.message); return sendError(res, 500, "Could not delete project."); }
    if (!data) return sendError(res, 404, "Project not found.");
    return sendSuccess(res, { deleted: true, id: data.id });
  } catch (error) { console.error("Projects API error:", error?.message || error); return sendError(res, 500, "Internal server error."); }
}