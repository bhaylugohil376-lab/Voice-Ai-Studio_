import { getSupabaseAdmin } from "./_lib/supabase.js";
import { sendError, sendSuccess, requireMethod, parseJsonBody } from "./_lib/response.js";
const PAGE_SIZE=100, MAX_VOICES=10000;
export default async function handler(req,res){
 if(!requireMethod(req,res,["POST"]))return;
 const expected=process.env.VOICE_SYNC_SECRET, authorization=String(req.headers?.authorization||""), supplied=authorization.startsWith("Bearer ")?authorization.slice(7).trim():"";
 if(!expected||!supplied||supplied!==expected)return sendError(res,401,"Voice library sync is not authorized.");
 const apiKey=process.env.ELEVENLABS_API_KEY;if(!apiKey)return sendError(res,503,"ElevenLabs is not configured.");
 let admin;try{admin=getSupabaseAdmin();}catch{return sendError(res,503,"Supabase service role is not configured.");}
 const body=parseJsonBody(req)||{}, requested=Number(body.max_voices??MAX_VOICES), maxVoices=Number.isInteger(requested)?Math.max(1,Math.min(requested,MAX_VOICES)):MAX_VOICES;
 let token="",synced=0,pages=0;
 try{
  while(synced<maxVoices){
   const params=new URLSearchParams({page_size:String(Math.min(PAGE_SIZE,maxVoices-synced)),include_total_count:"true"});if(token)params.set("next_page_token",token);
   const response=await fetch("https://api.elevenlabs.io/v2/voices?"+params.toString(),{headers:{"xi-api-key":apiKey,Accept:"application/json"},signal:AbortSignal.timeout(25000)});
   if(!response.ok){const details=await response.text().catch(()=>"");console.error("Voice sync provider error:",response.status,details.slice(0,400));return sendError(res,502,"ElevenLabs could not provide the voice catalogue.");}
   const payload=await response.json(), voices=Array.isArray(payload.voices)?payload.voices:[];
   if(!voices.length)break;
   const rows=voices.filter(v=>typeof v.voice_id==="string"&&v.voice_id&&typeof v.name==="string"&&v.name).map(v=>({provider:"elevenlabs",voice_id:v.voice_id,name:v.name,category:v.category||null,description:v.description||null,preview_url:v.preview_url||null,labels:v.labels&&typeof v.labels==="object"?v.labels:{},available_for_tts:true}));
   if(rows.length){const {error}=await admin.from("voices_library").upsert(rows,{onConflict:"provider,voice_id"});if(error){console.error("Voice sync database error:",error.message);return sendError(res,503,"Could not save the voice catalogue to Supabase.");}synced+=rows.length;}
   pages++;token=typeof payload.next_page_token==="string"?payload.next_page_token:"";if(!payload.has_more||!token||pages>=Math.ceil(MAX_VOICES/PAGE_SIZE))break;
  }
  return sendSuccess(res,{synced,pages,max_voices:maxVoices,message:"Real ElevenLabs voice metadata synced to Supabase."});
 }catch(error){if(error?.name==="TimeoutError"||error?.name==="AbortError")return sendError(res,504,"Voice catalogue sync timed out. Try again.");console.error("Voice sync error:",error?.message||error);return sendError(res,500,"Voice catalogue sync failed.");}
}
