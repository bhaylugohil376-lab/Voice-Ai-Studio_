import { requireUser } from "./_lib/auth.js";
import { requireMethod, sendError, sendSuccess } from "./_lib/response.js";
export default async function handler(req, res) {
  if (!requireMethod(req, res, ["GET"])) return;
  const user = await requireUser(req, res);
  if (!user) return;
  return sendSuccess(res, { available: Boolean(process.env.GEMINI_API_KEY), message: "Assistant route is available." });
}
