const ALLOWED_ACTIONS = new Set(["tts","assistant","dialogue","image","stt","dubbing","voice_clone","voice_design","voice_changer","voice_isolator","captions","music","sound_effects","agents","video_voice_transfer"]);

// Voice AI Studio does not use an in-app credit balance, subscription gate, or daily usage cap.
// Provider-side authentication, quotas, and API costs still apply independently.
export async function checkAndUseAI(user, action) {
  if (typeof action !== "string" || !ALLOWED_ACTIONS.has(action)) {
    return { allowed: false, status: 400, error: "Invalid or unsupported AI action." };
  }
  return { allowed: true, premium: false, remaining: null };
}

export default checkAndUseAI;
