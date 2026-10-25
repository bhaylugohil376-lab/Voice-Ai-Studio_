import { getSupabaseAdmin } from "./supabase.js";

const FREE_LIMIT = 5;
const WINDOW_HOURS = 24;
const ALLOWED_ACTIONS = new Set(["tts","assistant","dialogue","image","stt","dubbing","voice_clone","voice_design","voice_changer","voice_isolator","captions","music","sound_effects","agents","video_voice_transfer"]);

export async function checkAndUseAI(user, action) {
  if (!user?.id) return { allowed:false, status:401, error:"Authentication required." };
  if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) return { allowed:false, status:400, error:"Invalid or unsupported AI action." };
  try {
    const admin = getSupabaseAdmin();
    const {data:profile,error:profileError}=await admin.from("profiles").select("plan").eq("id",user.id).maybeSingle();
    if(profileError){console.error("Subscription lookup failed:",profileError.message);return {allowed:false,status:503,error:"Could not verify your subscription."};}
    if(String(profile?.plan||"free").trim().toLowerCase()==="premium") return {allowed:true,premium:true,remaining:null};
    const {data,error}=await admin.rpc("check_and_use_ai",{p_user_id:user.id,p_action:action,p_limit:FREE_LIMIT,p_window_hours:WINDOW_HOURS});
    if(error){console.error("Usage enforcement failed:",error.message);return {allowed:false,status:503,error:"Usage enforcement is unavailable."};}
    const result=Array.isArray(data)?data[0]:data;
    if(!result||typeof result!=="object"||result.allowed!==true) return {allowed:false,status:429,error:"Free usage limit reached. Try again after the 24-hour window resets, or upgrade to Premium.",remaining:0};
    return {allowed:true,premium:false,remaining:typeof result.remaining==="number"?result.remaining:null};
  } catch(error) { console.error("Usage enforcement error:",error?.message||error); return {allowed:false,status:503,error:"Could not verify AI usage."}; }
}
export default checkAndUseAI;
