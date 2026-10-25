import { supabaseAdmin } from "./_lib/supabase.js";
import { requireUser } from "./_lib/auth.js";
import { requireMethod, parseJsonBody, sendError, sendSuccess } from "./_lib/response.js";
export default async function handler(req, res) {
  try {
    if (!requireMethod(req, res, ["POST"])) return;
    const user = await requireUser(req, res);
    if (!user) return;
    const body = parseJsonBody(req);
    if (!body || typeof body !== "object") return sendError(res, 400, "Valid JSON body is required.");
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const message = typeof body.message === "string" ? body.message.trim() : "";
    if (name.length < 2 || name.length > 100) return sendError(res, 400, "Name must be 2–100 characters.");
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return sendError(res, 400, "Enter a valid email address.");
    if (subject.length < 3 || subject.length > 150) return sendError(res, 400, "Subject must be 3–150 characters.");
    if (message.length < 10 || message.length > 5000) return sendError(res, 400, "Message must be 10–5000 characters.");
    const { data, error } = await supabaseAdmin.from("contact_messages").insert({ user_id: user.id, name, email, subject, message, status: "new" }).select("id, created_at").single();
    if (error) { console.error("Contact message error:", error.message); return sendError(res, 500, "Could not submit your message."); }
    return sendSuccess(res, { message: "Your message has been submitted.", ticket: data });
  } catch (error) {
    console.error("Contact API error:", error);
    return sendError(res, 500, "Unexpected server error.");
  }
}
