// Generates the ad voiceover with ElevenLabs, one MP3 per scene, into public/voiceover/.
//
// 1. Put your key in video/.env (git-ignored):   ELEVENLABS_API_KEY=sk_...
// 2. Run:                                         node voiceover.mjs
// 3. Render with voice:                           npx remotion render Ad out/folioseen-ad.mp4 --props='{"voiceover":true}'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from "node:fs";

const env = existsSync(".env") ? readFileSync(".env", "utf8") : "";
const key = process.env.ELEVENLABS_API_KEY || env.match(/^ELEVENLABS_API_KEY=(.+)$/m)?.[1]?.trim();
if (!key) {
  console.error("Missing ELEVENLABS_API_KEY (set it in video/.env).");
  process.exit(1);
}

// "Brian - Deep, Resonant and Comforting" (ElevenLabs premade, made for ads and narration).
const VOICE_ID = "nPczCjzI2devNBz1zQrb";

// One line per scene, in order. Keep each under ~4 seconds of speech.
export const LINES = [
  "You sent your portfolio. Then... silence.",
  "With Folioseen, every client gets their own link.",
  "See which case studies they opened, and for how long.",
  "Get a Telegram ping the moment they open it.",
  "And collect testimonials your clients write themselves.",
  "Folioseen. Know who read your portfolio. Start free.",
];

mkdirSync("public/voiceover", { recursive: true });
for (const [i, text] of LINES.entries()) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`, {
    method: "POST",
    headers: { "xi-api-key": key, "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: { stability: 0.45, similarity_boost: 0.8, style: 0.35 },
    }),
  });
  if (!res.ok) {
    console.error(`Line ${i + 1}: HTTP ${res.status} ${await res.text()}`);
    process.exit(1);
  }
  writeFileSync(`public/voiceover/${i + 1}.mp3`, Buffer.from(await res.arrayBuffer()));
  console.log(`✓ ${i + 1}.mp3  ${text}`);
}
