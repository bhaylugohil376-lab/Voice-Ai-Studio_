export default async function handler(req,res) {
 res.setHeader("Cache-Control","no-store"); res.setHeader("X-Content-Type-Options","nosniff");
 if(req.method!=="GET"){res.setHeader("Allow","GET");return res.status(405).json({success:false,error:"Method not allowed."});}
 const configuration={
  supabaseUrl:Boolean(process.env.SUPABASE_URL),supabaseAnonKey:Boolean(process.env.SUPABASE_ANON_KEY),
  supabaseServiceRoleKey:Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),elevenLabsApiKey:Boolean(process.env.ELEVENLABS_API_KEY),
  geminiApiKey:Boolean(process.env.GEMINI_API_KEY),openaiApiKey:Boolean(process.env.OPENAI_API_KEY)
 };
 const supabaseReady=configuration.supabaseUrl&&configuration.supabaseAnonKey&&configuration.supabaseServiceRoleKey;
 const voiceAiReady=supabaseReady&&configuration.elevenLabsApiKey;
 return res.status(200).json({success:true,status:"running",readiness:voiceAiReady?"ready":"degraded",timestamp:new Date().toISOString(),
 environment:process.env.VERCEL_ENV==="production"?"production":"non-production",
 features:{authenticationAndUsage:supabaseReady?"configured":"needs_configuration",textToSpeech:configuration.elevenLabsApiKey?"configured":"needs_configuration",
 geminiTextGeneration:configuration.geminiApiKey?"configured":"optional_not_configured",openaiIntegration:configuration.openaiApiKey?"configured":"optional_not_configured"},
 configuration,message:voiceAiReady?"VoiceAI core configuration is present. Provider generation still requires a live end-to-end test.":"VoiceAI API is running, but Supabase server configuration and/or the ElevenLabs key is missing."});
}
