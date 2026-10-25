-- VoiceAI 24-section integration inventory. Status does not guarantee provider features work.
create table if not exists public.voiceai_feature_registry (
 slug text primary key,title text not null,endpoint text not null,provider text not null default 'internal',
 implementation_status text not null default 'planned' check(implementation_status in ('planned','partial','ready','needs_api_key')),
 notes text,updated_at timestamptz not null default now()
);
alter table public.voiceai_feature_registry enable row level security;
drop policy if exists "Feature registry readable by everyone" on public.voiceai_feature_registry;
create policy "Feature registry readable by everyone" on public.voiceai_feature_registry for select to anon,authenticated using(true);
insert into public.voiceai_feature_registry(slug,title,endpoint,provider,implementation_status,notes) values
('tts','Text-to-Speech','/api/tts','ElevenLabs','partial','Existing function; live request needs testing'),
('voices','Voice Library','/api/voices','ElevenLabs','partial','Existing function; live request needs testing'),
('voice-clone','Voice Cloning','/api/voice-clone','ElevenLabs','needs_api_key','Migrate and test provider call'),
('voice-design','Voice Design','/api/voice-design','ElevenLabs','needs_api_key','Migrate and test provider call'),
('voice-changer','Voice Changer','/api/voice-changer','ElevenLabs','needs_api_key','Configure key and test'),
('voice-isolator','Voice Isolator','/api/voice-isolator','ElevenLabs','needs_api_key','Configure key and test'),
('video-voice-transfer','Video Voice Transfer','/api/video-voice-transfer','Provider adapter','needs_api_key','Configure provider and test'),
('dubbing','Video Dubbing','/api/dubbing','Dubbing provider','needs_api_key','Configure provider and test'),
('stt','Speech-to-Text','/api/stt','OpenAI','needs_api_key','Configure key and test'),
('captions','Captions','/api/captions','OpenAI','needs_api_key','Configure key and test'),
('music','Music Generation','/api/music','Music provider','needs_api_key','Configure provider and test'),
('sound-effects','Sound Effects','/api/sound-effects','Sound effects provider','needs_api_key','Configure provider and test'),
('image-generation','Image Generation','/api/image/generate','Image provider','needs_api_key','Configure provider and test'),
('assistant','AI Assistant','/api/assistant','Gemini/OpenAI','needs_api_key','Configure provider and test'),
('dialogue','Dialogue','/api/assistant','Gemini/OpenAI','needs_api_key','Confirm UI mapping and test'),
('agents','AI Agents','/api/agents','Gemini/OpenAI','needs_api_key','Configure provider and test'),
('studio','Studio','/api/studio','Internal','partial','Verify persistence/export'),
('projects','Projects','/api/projects','Supabase','partial','Verify authenticated CRUD and RLS'),
('favorites','Favorites','/api/favorites','Supabase','partial','Verify authenticated CRUD and RLS'),
('profile','Profile','/api/profile','Supabase Auth','partial','Verify profile CRUD and RLS'),
('usage','Usage Limits','/api/usage','Supabase','partial','Enforce limits server-side'),
('billing','Subscription & Billing','/api/stripe-checkout','Stripe','needs_api_key','Configure secrets and test webhook'),
('contact','Contact','/api/contact','Supabase','partial','Verify insert policy and spam protection'),
('auth','Login & Signup','/api/health','Supabase Auth','partial','Test sign-up, sign-in, reset and session')
on conflict(slug) do update set title=excluded.title,endpoint=excluded.endpoint,provider=excluded.provider,notes=excluded.notes,updated_at=now();
comment on table public.voiceai_feature_registry is 'VoiceAI 24-section integration inventory; status labels do not prove live functionality.';
