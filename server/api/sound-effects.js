import { requireUser } from "./_lib/auth.js";
import { checkAndUseAI } from "./_lib/usage.js";
import { requireMethod, parseJsonBody, sendError } from "./_lib/response.js";
const MAX_PROMPT_LENGTH=1500, ELEVENLABS_SOUND_URL="https://api.elevenlabs.io/v1/sound-generation";
export default async function handler(req,res){
 if(!requireMethod(req,res,["POST"]))return;
 try{
  const user=await requireUser(req,res);if(!user)return;
  const body=parseJsonBody(req);if(!body)return sendError(res,400,"Send a valid JSON request.");
  const prompt=typeof body.prompt==="string"?body.prompt.trim():"", duration=Number(body.duration??5);
  if(!prompt||prompt.length>MAX_PROMPT_LENGTH)return sendError(res,400,"Prompt is required and must be 1–1500 characters.");
  if(!Number.isFinite(duration)||duration<1||duration>22)return sendError(res,400,"Sound effects duration must be between 1 and 22 seconds.");
  const apiKey=process.env.ELEVENLABS_API_KEY;if(!apiKey)return sendError(res,503,"Sound Effects is not configured. Add ELEVENLABS_API_KEY to the Vercel project environment.");
  const usage=await checkAndUseAI(user,"sound_effects");if(!usage.allowed)return sendError(res,usage.status||429,usage.error||"Sound Effects usage limit reached.");
  const controller=new AbortController(), timeout=setTimeout(()=>controller.abort(),55000);let response;
  try{response=await fetch(`${ELEVENLABS_SOUND_URL}?output_format=mp3_44100_128`,{method:"POST",headers:{"xi-api-key":apiKey,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({text:prompt,duration_seconds:duration,prompt_influence:0.3}),signal:controller.signal});}finally{clearTimeout(timeout);}
  if(!response.ok){const details=await response.text().catch(()=>"");console.error("ElevenLabs sound generation returned HTTP",response.status,details.slice(0,500));return sendError(res,502,"ElevenLabs could not generate the sound effect. Check API key permissions, plan limits, and available credits.");}
  const type=response.headers.get("content-type")||"";if(!type.includes("audio/")&&!type.includes("application/octet-stream")){console.error("Unexpected ElevenLabs sound response content type:",type);return sendError(res,502,"Sound Effects provider returned an unsupported audio format.");}
  const audio=Buffer.from(await response.arrayBuffer());if(!audio.length)return sendError(res,502,"Sound Effects provider returned an empty audio file.");
  const base64=audio.toString("base64"), mime=type.split(";")[0]||"audio/mpeg";
  return res.status(200).json({success:true,status:"completed",audio_url:`data:${mime};base64,${base64}`,audio_base64:base64,mime_type:mime,prompt,duration,remaining:usage.remaining});
 }catch(error){if(error.name==="AbortError")return sendError(res,504,"Sound effect generation timed out. Try a shorter effect.");console.error("Sound Effects API error:",error.message);return sendError(res,500,"Sound Effects generation failed.");}
}
