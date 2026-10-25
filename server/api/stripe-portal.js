import Stripe from "stripe";
import { supabaseAdmin } from "./_lib/supabase.js";
import { requireUser } from "./_lib/auth.js";
import { requireMethod, sendError } from "./_lib/response.js";
export default async function handler(req, res) {
  if (!requireMethod(req, res, ["POST"])) return;
  try {
    const user = await requireUser(req, res);
    if (!user) return;
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const appUrl = process.env.APP_URL;
    if (!secretKey || !appUrl) return sendError(res, 503, "Stripe billing portal is not configured.");
    let baseUrl;
    try { baseUrl = new URL(appUrl); } catch { return sendError(res, 500, "APP_URL is invalid."); }
    if (process.env.NODE_ENV === "production" && baseUrl.protocol !== "https:") return sendError(res, 500, "Production APP_URL must use HTTPS.");
    const { data: profile, error } = await supabaseAdmin.from("profiles").select("stripe_customer_id, plan").eq("id", user.id).maybeSingle();
    if (error) { console.error("Billing profile lookup failed:", error.message); return sendError(res, 500, "Could not load your billing details."); }
    if (String(profile?.plan || "").trim().toLowerCase() !== "premium" || !profile?.stripe_customer_id) return sendError(res, 404, "No active Premium billing customer was found for this account.");
    const stripe = new Stripe(secretKey);
    const portalSession = await stripe.billingPortal.sessions.create({ customer: profile.stripe_customer_id, return_url: new URL("/pricing.html", baseUrl).toString() });
    return res.status(200).json({ success: true, portal_url: portalSession.url });
  } catch (error) {
    console.error("Stripe portal error:", error.message);
    return sendError(res, 500, "Could not open the billing portal.");
  }
}
