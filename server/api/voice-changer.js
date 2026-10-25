import { requireUser } from "./_lib/auth.js";
import { requireMethod, sendError } from "./_lib/response.js";
export default async function handler(req, res) {
 if (!requireMethod(req, res, ["POST"])) return;
 const user = await requireUser(req, res);
 if (!user) return;
 return sendError(res, 503, "Voice changer integration is not configured yet.");
}
