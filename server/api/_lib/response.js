export function methodNotAllowed(res, allowed = ["POST"]) {
  res.setHeader("Allow", allowed.join(", "));
  return res.status(405).json({ error: `Method not allowed. Use ${allowed.join(" or ")}.` });
}
export function sendError(res, status, message) {
  return res.status(status).json({ success: false, error: message });
}
export function sendSuccess(res, data = {}, status = 200) {
  return res.status(status).json({ success: true, ...data });
}
export function parseJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") { try { return JSON.parse(req.body); } catch { return null; } }
  return null;
}
export function requireMethod(req, res, allowed = ["POST"]) {
  if (!allowed.includes(req.method)) { methodNotAllowed(res, allowed); return false; }
  return true;
}
