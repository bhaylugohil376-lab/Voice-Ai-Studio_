import { requireUser } from "./_lib/auth.js";
import { supabaseAdmin } from "./_lib/supabase.js";
import { sendError } from "./_lib/response.js";
const FREE_LIMIT=5,WINDOW_HOURS=24;
const ALLOWED_ACTIONS=new Set(["tts","assistant","dialogue","image","stt","dubbing","voice_clone","voice_design","voice_changer","voice_isolator","captions","music","sound_effects","agents","video_voice_transfer"]);
export default async function handler(req,res){
 if(req.method!=="GET"){res.setHeader("Allow","GET");return sendError(res,405,"Method not allowed.");}
 try{
  const user=await requireUser(req,res); if(!user?.id)return;
  const rawAction=req.query?.action; const action=Array.isArray(rawAction)?rawAction[0]:rawAction;
  if(action&&!ALLOWED_ACTIONS.has(action))return sendError(res,400,"Invalid or unsupported AI action.");
  const {data:profile,error:profileError}=await supabaseAdmin.from("profiles").select("plan").eq("id",user.id).maybeSingle();
  if(profileError){console.error("Usage profile lookup failed:",profileError.message);return sendError(res,500,"Could not verify subscription.");}
  const plan=String(profile?.plan||"free").trim().toLowerCase();
  if(plan==="premium")return res.status(200).json({success:true,plan:"premium",premium:true,limit:null,used:null,remaining:null,windowHours:WINDOW_HOURS});
  const since=new Date(Date.now()-WINDOW_HOURS*60*60*1000).toISOString();
  let query=supabaseAdmin.from("usage_logs").select("id",{count:"exact",head:true}).eq("user_id",user.id).gte("created_at",since);
  if(action)query=query.eq("action",action);
  const {count,error}=await query;
  if(error){console.error("Usage count lookup failed:",error.message);return sendError(res,500,"Could not retrieve usage information.");}
  const used=count??0;
  return res.status(200).json({success:true,plan:"free",premium:false,action:action||null,limit:FREE_LIMIT,used,remaining:Math.max(0,FREE_LIMIT-used),windowHours:WINDOW_HOURS});
 }catch(error){console.error("Usage endpoint error:",error?.message||error);return sendError(res,500,"Could not retrieve usage information.");}
}
