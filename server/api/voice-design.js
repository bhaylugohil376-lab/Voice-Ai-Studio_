import { requireUser } from "./_lib/auth.js";
import { checkAndUseAI } from "./_lib/usage.js";
import { requireMethod, sendError } from "./_lib/response.js";
const ELEVENLABS_API_URL="https://api.elevenlabs.io/v1";
export default async function handler(req,res){
 if(!requireMethod(req,res,["POST"]))return;
 try{
  const user=await requireUser(req,res);if(!user)return;
  const apiKey=process.env.ELEVENLABS_API_KEY;if(!apiKey)return sendError(res,503,"Voice Design provider is not configured.");
  const body=req.body&&typeof req.body==="object"?req.body:{};
  const description=typeof body.description==="string"?body.description.trim():typeof body.prompt==="string"?body.prompt.trim():"";
  const previewText=typeof body.preview_text==="string"?body.preview_text.trim():"Hello! This is a preview of the voice I have designed for you.";
  if(!description||description.length>1000)return sendError(res,400,"Voice description is required and must be 1000 characters or fewer.");
  if(!previewText||previewText.length>1000)return sendError(res,400,"Preview text must be between 1 and 1000 characters.");
  const usage=await checkAndUseAI(user,"voice_design");if(!usage.allowed)return sendError(res,usage.status||429,usage.error||"Voice Design usage limit reached.");
  const response=await fetch(`${ELEVENLABS_API_URL}/text-to-voice/design`,{method:"POST",headers:{"xi-api-key":apiKey,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({voice_description:description,text:previewText}),signal:AbortSignal.timeout(60000)});
  if(!response.ok){const details=await response.text();console.error("Voice Design provider error:",response.status,details.slice(0,400));if(response.status===429)return sendError(res,429,"Voice provider quota or rate limit reached.");return sendError(res,502,"Voice Design request failed at the provider.");}
  const result=await response.json();const previews=(result.previews||[]).map(p=>({generated_voice_id:p.generated_voice_id||null,audio_base64:p.audio_base64||null,media_type:p.media_type||"audio/mpeg",duration_secs:p.duration_secs??null}));
  if(!previews.length)return sendError(res,502,"The provider returned no voice previews.");
  return res.status(200).json({success:true,previews,message:"Voice description processed. Preview the generated voice samples below; save a voice from a preview to use it for synthesis.",remaining:usage.remaining});
 }catch(error){console.error("Voice Design API error:",error.message);return sendError(res,500,"Unexpected Voice Design error.");}
}
