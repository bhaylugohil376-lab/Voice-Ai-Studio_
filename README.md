# Voice AI Studio

Voice AI Studio source files are being assembled from the supplied VoiceAI project archive.

## Files currently added
- `server.js` — Express server and API handler router
- `vercel.json` — deployment and security-header configuration
- `package.json` — existing Node.js package configuration

## Required configuration
Set private API credentials only in the backend host's environment or Supabase Edge Function Secrets. Never commit `ELEVENLABS_API_KEY`, OpenAI keys, or Supabase service-role keys to GitHub.

## Important
A successful source upload does not prove the live site works. Voice listing and TTS generation require valid server-side provider credentials and a deployed backend. The full 91-file archive has not yet been fully expanded into this repository.
