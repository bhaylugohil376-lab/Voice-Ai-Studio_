import { supabaseAdmin } from "./_lib/supabase.js";
import { requireUser } from "./_lib/auth.js";
import { requireMethod, sendError, sendSuccess, parseJsonBody } from "./_lib/response.js";
const ALLOWED_TYPES=new Set(["tts","voice_clone","voice_changer","dubbing","music","sound_effects","captions","image","studio"]);
function parseLimit(value){const n=Number.parseInt(value,10);if(!Number.isFinite(n))return 20;return Math.min(Math.max(n,1),100);}
export default async function handler(req,res){
 if(!requireMethod(req,res,["GET","DELETE"]))return;
 try{
  const user=await requireUser(req,res);if(!user)return;
  if(req.method==="GET"){
   const limit=parseLimit(req.query?.limit), type=req.query?.type;
   if(type!==undefined&&(typeof type!=="string"||!ALLOWED_TYPES.has(type)))return sendError(res,400,"Invalid generation type.");
   let query=supabaseAdmin.from("generations").select("id, user_id, type, title, status, output_url, created_at",{count:"exact"}).eq("user_id",user.id).order("created_at",{ascending:false}).limit(limit);
   if(type)query=query.eq("type",type);
   const {data,error,count}=await query;if(error){console.error("Generation history query failed:",error.message);return sendError(res,500,"Could not load generation history.");}
   return sendSuccess(res,{generations:data||[],count:count??data?.length??0,limit});
  }
  const body=parseJsonBody(req), id=typeof body?.id==="string"?body.id.trim():"";
  if(!id||id.length>100)return sendError(res,400,"A valid generation id is required.");
  const {data,error}=await supabaseAdmin.from("generations").delete().eq("id",id).eq("user_id",user.id).select("id");
  if(error){console.error("Generation delete failed:",error.message);return sendError(res,500,"Could not delete generation.");}
  if(!data?.length)return sendError(res,404,"Generation not found.");
  return sendSuccess(res,{message:"Generation deleted.",id:data[0].id});
 }catch(error){console.error("Generations API error:",error?.message||error);return sendError(res,500,"Unexpected server error.");}
}
