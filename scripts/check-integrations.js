import { readFileSync } from "node:fs";

const tts = readFileSync("server/api/tts.js", "utf8");
const env = readFileSync(".env.example", "utf8");
const readme = readFileSync("README.md", "utf8");
const vercel = readFileSync("vercel.json", "utf8");
const server = readFileSync("server.js", "utf8");

const checks = [
  ["TTS PCM output uses audio/pcm", /outputFormat\.startsWith\("pcm_"\)\s*\?\s*"audio\/pcm"\s*:\s*"audio\/mpeg"/.test(tts)],
  ["Music provider URL placeholder exists", /^MUSIC_API_URL=/m.test(env)],
  ["Sound Effects provider URL placeholder exists", /^SOUND_EFFECTS_API_URL=/m.test(env)],
  ["Dubbing provider URL placeholder exists", /^DUBBING_API_URL=/m.test(env)],
  ["Live API verification limits documented", readme.includes("do not prove provider credentials are valid")],
  ["Vercel permits same-origin microphone access", /microphone=\(self\)/.test(vercel) && !/microphone=\(\)/.test(vercel)],
  ["Vercel permits same-origin camera access", /camera=\(self\)/.test(vercel) && !/camera=\(\)/.test(vercel)],
  ["Local server media permissions match Vercel", /camera=\(self\), microphone=\(self\), geolocation=\(\)/.test(server)]
];

let failed = false;
for (const [name, passed] of checks) {
  process.stdout.write((passed ? "PASS " : "FAIL ") + name + "\n");
  if (!passed) failed = true;
}
if (failed) process.exitCode = 1;
