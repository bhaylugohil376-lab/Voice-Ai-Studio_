import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const ignored = new Set(["node_modules", ".git", ".vercel"]);
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!ignored.has(entry.name)) walk(join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      files.push(join(dir, entry.name));
    }
  }
}
walk(process.cwd());
let failed = false;

// Validate deployment configuration and required runtime files.
for (const configPath of ["package.json", "vercel.json"]) {
  try {
    JSON.parse(readFileSync(configPath, "utf8"));
  } catch (error) {
    failed = true;
    process.stderr.write("FAIL " + configPath + ": invalid JSON (" + error.message + ")\n");
  }
}

for (const requiredPath of [
  "server/api/health.js",
  "server/api/tts.js",
  "server/api/voices.js",
  "server/api/_lib/auth.js",
  "server/api/_lib/supabase.js",
  "supabase/usage_limits.sql",
  ".env.example"
]) {
  if (!existsSync(requiredPath)) {
    failed = true;
    process.stderr.write("FAIL missing required project file: " + requiredPath + "\n");
  }
}

const envTemplate = readFileSync(".env.example", "utf8");
for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY", "GEMINI_API_KEY", "ELEVENLABS_API_KEY"]) {
  if (!new RegExp("^" + key + "=", "m").test(envTemplate)) {
    failed = true;
    process.stderr.write("FAIL .env.example is missing " + key + "\n");
  }
}
for (const file of files.sort()) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write("FAIL " + relative(process.cwd(), file) + "\n");
    process.stderr.write(result.stderr || result.stdout || "Syntax check failed.\n");
  }
}
if (failed) process.exit(1);
console.log("Syntax check passed for " + files.length + " JavaScript files.");
