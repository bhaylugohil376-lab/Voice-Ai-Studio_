import { requireUser } from "../_lib/auth.js";
import { requireMethod, parseJsonBody, sendError } from "../_lib/response.js";
import { supabaseAdmin } from "../_lib/supabase.js";
const MAX_TITLE_LENGTH=150, MAX_PROVIDER_LENGTH=50;
export default async function handler(req,res){
 if(!requireMethod(req,res,["POST"]))return;
 try{
  const user=await requireUser(req,res);if(!user)return;
  const body=parseJsonBody(req);if(!body||typeof body!=="object")return sendError(res,400,"Invalid request body.");
  const {title,audioUrl,duration,provider}=body;
  if(typeof title!=="string"||!title.trim()||typeof audioUrl!=="string"||!audioUrl.trim())return sendError(res,400,"Music title and audio URL are required.");
  if(title.trim().length>MAX_TITLE_LENGTH)return sendError(res,400,`Title must be ${MAX_TITLE_LENGTH} characters or fewer.`);
  let parsedUrl;try{parsedUrl=new URL(audioUrl.trim());}catch{return sendError(res,400,"Please provide a valid audio URL.");}
  if(parsedUrl.protocol!=="https:"||!parsedUrl.hostname||parsedUrl.username||parsedUrl.password)return sendError(res,400,"Audio URL must be a valid HTTPS URL.");
  let safeDuration=null;if(duration!==undefined&&duration!==null&&duration!==""){const n=Number(duration);if(!Number.isFinite(n)||n<=0||n>3600)return sendError(res,400,"Duration must be between 1 and 3600 seconds.");safeDuration=Math.round(n);}
  let safeProvider=null;if(provider!==undefined&&provider!==null&&provider!==""){if(typeof provider!=="string"||provider.trim().length>MAX_PROVIDER_LENGTH)return sendError(res,400,"Invalid music provider.");safeProvider=provider.trim();}
  const {data,error}=await supabaseAdmin.from("generated_music").insert({user_id:user.id,title:title.trim(),audio_url:parsedUrl.toString(),duration:safeDuration,provider:safeProvider}).select("id, title, audio_url, duration, provider, created_at").single();
  if(error){console.error("Music save database error:",error.message);return sendError(res,500,"Could not save your music.");}
  return res.status(201).json({success:true,music:data});
 }catch(error){console.error("Music save route error:",error?.message||error);return sendError(res,500,"Internal server error.");}
}
