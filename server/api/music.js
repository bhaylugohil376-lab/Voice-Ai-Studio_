import { requireUser } from "./_lib/auth.js";
import { checkAndUseAI } from "./_lib/usage.js";
import { requireMethod, parseJsonBody, sendError } from "./_lib/response.js";
const MAX_PROMPT_LENGTH=1500;
const ELEVENLABS_MUSIC_URL="https://api.elevenlabs.io/v1/music";
export default async function handler(req,res){
 if(!requireMethod(req,res,["POST"]))return;
 try{
  const user=await requireUser(req,res);if(!user)return;
  const body=parseJsonBody(req);if(!body)return sendError(res,400,"Send a valid JSON request.");
  const prompt=typeof body.prompt==="string"?body.prompt.trim():"";
  const style=typeof body.style==="string"?body.style.trim():"cinematic";
  const duration=Number(body.duration??30);
  if(!prompt||prompt.length>MAX_PROMPT_LENGTH)return sendError(res,400,"Prompt is required and must be 1–1500 characters.");
  if(!/^[a-zA-Z0-9 _-]{1,60}$/.test(style))return sendError(res,400,"Invalid music style.");
  if(!Number.isFinite(duration)||duration<5||duration>180)return sendError(res,400,"Duration must be between 5 and 180 seconds.");
  const apiKey=process.env.ELEVENLABS_API_KEY;if(!apiKey)return sendError(res,503,"Music generation is not configured. Add ELEVENLABS_API_KEY to the Vercel project environment.");
  const usage=await checkAndUseAI(user,"music");if(!usage.allowed)return sendError(res,usage.status||429,usage.error||"Music generation limit reached.");
  const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),55000);let response;
  try{response=await fetch(`${ELEVENLABS_MUSIC_URL}?output_format=mp3_44100_128`,{method:"POST",headers:{"xi-api-key":apiKey,"Content-Type":"application/json","Accept":"audio/mpeg"},body:JSON.stringify({prompt:`Create ${style} music. ${prompt}`,music_length_ms:duration*1000,model_id:process.env.ELEVENLABS_MUSIC_MODEL||"music_v2_5",force_instrumental:body.instrumental!==false}),signal:controller.signal});}finally{clearTimeout(timeout);}
  if(!response.ok){const message=await response.text().catch(()=>"");console.error("ElevenLabs music API returned HTTP",response.status,message.slice(0,500));return sendError(res,502,"ElevenLabs could not generate music. Check API key permissions, plan limits, and available credits.");}
  const type=response.headers.get("content-type")||"";if(!type.includes("audio/")&&!type.includes("application/octet-stream")){console.error("Unexpected ElevenLabs music response content type:",type);return sendError(res,502,"Music provider returned an unsupported audio format.");}
  const audio=Buffer.from(await response.arrayBuffer());if(!audio.length)return sendError(res,502,"Music provider returned an empty audio file.");
  return res.status(200).json({success:true,status:"completed",audio_base64:audio.toString("base64"),mime_type:type.split(";")[0]||"audio/mpeg",prompt,style,duration,remaining:usage.remaining});
 }catch(error){if(error.name==="AbortError")return sendError(res,504,"Music generation timed out. Try a shorter track.");console.error("Music API error:",error.message);return sendError(res,500,"Music generation request failed.");}
}
