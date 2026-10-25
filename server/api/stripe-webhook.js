import { requireMethod, sendError } from "./_lib/response.js";
export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  return sendError(res, 503, "Stripe webhook signature verification is not configured yet.");
}
