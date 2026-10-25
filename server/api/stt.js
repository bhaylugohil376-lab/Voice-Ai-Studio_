import formidable from "formidable";
import { readFile, unlink } from "node:fs/promises";
import OpenAI, { toFile } from "openai";
import { requireUser } from "./_lib/auth.js";
import { checkAndUseAI } from "./_lib/usage.js";
import { requireMethod, sendError } from "./_lib/response.js";
export const config={api:{bodyParser:false}};
const MAX_FILE_SIZE=25*1024*1024;
export default async function handler(req,res){
 if(!requireMethod(req,res,["POST"]))return;let uploadedFile;
 try{
  const user=await requireUser(req,res);if(!user)return;
  if(!process.env.OPENAI_API_KEY)return sendError(res,503,"Speech-to-Text provider is not configured.");
  const form=formidable({maxFiles:1,maxFileSize:MAX_FILE_SIZE,allowEmptyFiles:false,multiples:false});
  const [fields,files]=await new Promise((resolve,reject)=>form.parse(req,(e,f,fs)=>e?reject(e):resolve([f,fs])));
  const audioUpload=files.audio??files.file;uploadedFile=Array.isArray(audioUpload)?audioUpload[0]:audioUpload;
  if(!uploadedFile)return sendError(res,400,"Please upload an audio file in the audio field.");
  const allowed=new Set(["audio/mpeg","audio/mp3","audio/mp4","audio/m4a","audio/wav","audio/x-wav","audio/webm","audio/ogg","audio/flac","audio/mpga"]);
  if(!allowed.has(uploadedFile.mimetype||""))return sendError(res,400,"Unsupported audio format. Upload MP3, WAV, M4A, WebM, OGG or FLAC.");
  if(uploadedFile.size>MAX_FILE_SIZE)return sendError(res,413,"Audio file must be 25 MB or smaller.");
  const usage=await checkAndUseAI(user,"stt");if(!usage.allowed)return sendError(res,usage.status||429,usage.error||"Speech-to-Text usage limit reached.");
  const buffer=await readFile(uploadedFile.filepath), audio=await toFile(buffer,uploadedFile.originalFilename||"audio-upload",{type:uploadedFile.mimetype});
  const openai=new OpenAI({apiKey:process.env.OPENAI_API_KEY});
  const lang=Array.isArray(fields.language)?fields.language[0]:fields.language, model=process.env.OPENAI_STT_MODEL||"gpt-4o-mini-transcribe";
  const options={file:audio,model,response_format:"json"};if(typeof lang==="string"&&/^[a-z]{2,3}$/.test(lang.trim()))options.language=lang.trim();
  const transcription=await openai.audio.transcriptions.create(options);
  return res.status(200).json({success:true,text:transcription.text||"",model,remaining:usage.remaining});
 }catch(error){console.error("STT API error:",error.message);if(error.code==="LIMIT_FILE_SIZE")return sendError(res,413,"Audio file must be 25 MB or smaller.");return sendError(res,500,"Speech transcription failed. Please try again.");}
 finally{if(uploadedFile?.filepath)await unlink(uploadedFile.filepath).catch(()=>{});}
}
