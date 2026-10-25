import { requireUser } from "./_lib/auth.js";
import { requireMethod, parseJsonBody, sendError, sendSuccess } from "./_lib/response.js";
import { supabaseAdmin } from "./_lib/supabase.js";
const VALID_ID=/^[A-Za-z0-9_-]{1,150}$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
async function resolveVoiceId(value){
 const {data:providerVoice,error:providerError}=await supabaseAdmin.from("voices").select("id, provider_voice_id").eq("provider_voice_id",value).maybeSingle();
 if(providerError)throw providerError;if(providerVoice?.id)return providerVoice.id;
 if(UUID.test(value)){const {data,error}=await supabaseAdmin.from("voices").select("id").eq("id",value).maybeSingle();if(error)throw error;if(data?.id)return data.id;}
 return null;
}
export default async function handler(req,res){
 if(!requireMethod(req,res,["GET","POST","DELETE"]))return;
 try{
  const user=await requireUser(req,res);if(!user)return;if(!supabaseAdmin)return sendError(res,503,"Favorites database is not configured.");
  if(req.method==="GET"){
   const {data,error}=await supabaseAdmin.from("favorite_voices").select("voice_id, created_at, voices(id, provider_voice_id, name, gender, description, language, category, preview_url)").eq("user_id",user.id).order("created_at",{ascending:false});
   if(error){console.error("Favorites list error:",error.message);return sendError(res,500,"Could not load favorite voices.");}
   return sendSuccess(res,{favorites:(data||[]).map(item=>({voice_id:item.voice_id,created_at:item.created_at,voice:item.voices||null}))});
  }
  const body=parseJsonBody(req);if(!body||typeof body!=="object"||Array.isArray(body))return sendError(res,400,"Invalid request body.");
  const requested=typeof body.voice_id==="string"?body.voice_id.trim():"";if(!VALID_ID.test(requested))return sendError(res,400,"A valid voice ID is required.");
  const internal=await resolveVoiceId(requested);if(!internal)return sendError(res,404,"This real voice is not in the synced voice catalogue yet.");
  if(req.method==="POST"){
   const {data,error}=await supabaseAdmin.from("favorite_voices").upsert({user_id:user.id,voice_id:internal},{onConflict:"user_id,voice_id"}).select("user_id, voice_id, created_at").single();
   if(error){console.error("Favorite save error:",error.message);return sendError(res,500,"Could not add this voice to favorites.");}
   return res.status(201).json({success:true,favorite:data});
  }
  const {data,error}=await supabaseAdmin.from("favorite_voices").delete().eq("user_id",user.id).eq("voice_id",internal).select("voice_id");
  if(error){console.error("Favorite removal error:",error.message);return sendError(res,500,"Could not remove this favorite.");}
  return sendSuccess(res,{removed:(data||[]).length>0,voice_id:internal});
 }catch(error){console.error("Favorites API error:",error?.message||error);return sendError(res,500,"Internal server error.");}
}
