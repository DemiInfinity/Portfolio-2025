# Hyperframes Composition Brief: Demi's Portfolio

## Objective
Create a short launch-style brag video for Demi's Portfolio.

## Output
- Composition directory: `brag-output-2026-09-17-072500/composition/`
- Rendered video: `brag-output-2026-09-17-072500/brag.mp4`
- Format: landscape — 1920x1080
- Duration: 18 seconds

## Source Material
- Project root: `/Users/deminimmo/Projects/Me/Portfolio-2025`
- Primary files read: `packages/frontend/app/page.tsx`, `packages/frontend/app/globals.css`
- Product name: Demi's Portfolio
- Tagline / strongest claim: A full-stack Next.js/Express monorepo, but make it aggressively sparkly. ✨💖
- Key UI or visual moment to recreate: The pink gradient hero section with floating hearts and sparkles, and the pink gradient `.tech-tag`s.
- Copy that must appear verbatim:
  - "ARCHITECTURE: FULL-STACK MONOREPO"
  - "But make it cute."
  - "Next.js"
  - "Express.js"
  - "PostgreSQL"
  - "React CMS"
  - "Demi Taylor Nimmo"

## Creative Direction
- Tone preset: chaotic
- Creative direction: Serious full-stack engineering meets aggressively girly aesthetic
- Interpretation: Fast cuts between serious technical terms and explosive pink visuals. High energy, leaning into the absurdity of the contrast.
- Angle: The contrast between serious, heavy-duty software engineering (monorepo, PostgreSQL, Next.js, Express) and the unapologetically sparkly, floating-heart, pink-gradient visual identity. It's over-engineered and over-sparkled.
- Hook: A deadpan, serious text reveal: "ARCHITECTURE: FULL-STACK MONOREPO". Then, the background instantly explodes into pink gradients, floating hearts 💖, and sparkles ✨.
- Outro / punchline: "Demi Taylor Nimmo. Serious engineering, cute vibes."
- Avoid:
  - Generic SaaS language
  - Abstract filler visuals
  - Unrelated visual redesign

## Visual Identity
- Background: `linear-gradient(135deg, #f8f4ff 0%, #fff8f0 50%, #ffb3ba 100%)`
- Text: `#2d3436` (dark) and `#ff6b9d` (primary pink)
- Accent: `linear-gradient(45deg, #ff6b9d, #c44569)`
- Display font: Playfair Display (or a similar elegant serif)
- Body font: Poppins (or a clean sans-serif)
- Visual references from the project: The floating hearts (💖) and sparkles (✨) over the soft lavender/peach gradient.

## Storyboard
Use the storyboard in `brag-output-2026-09-17-072500/brag-plan.md` as the creative contract.

Scene summary:
1. The Setup — 3s — Black screen. White, monospace, serious text types out: "ARCHITECTURE: FULL-STACK MONOREPO".
2. The Reveal — 4s — The screen explodes into the `hero-girly` gradient (lavender/cream/peach). Floating hearts 💖 and sparkles ✨ fill the screen. The text changes to a beautiful serif font (Playfair Display) in a pink gradient: "But make it cute."
3. Tech Stack — 5s — A sleek project card (`.card-girly`) appears. Inside, serious tech terms appear one by one, but they are wrapped in cute pink `.tech-tag` pills: "Next.js", "Express.js", "PostgreSQL", "React CMS".
4. Outro — 6s — The screen clears to the soft gradient. Large serif text: "Demi Taylor Nimmo". Below it, smaller text: "Software Engineer ✨".

## Voiceover script
- Voice enabled: true
- Voice script:
  - Scene 1: "You need a full-stack monorepo..."
  - Scene 2: "...but you also need it to be absolutely adorable."
  - Scene 3: "Next.js, Express, and PostgreSQL, all wrapped up in pink gradients and floating hearts."
  - Scene 4: "Demi Taylor Nimmo. Serious engineering, cute vibes."

## Audio
- Audio role: dense rhythmic layer
- Audio arc: Starts with serious, heavy silence, then explodes into high-energy, sparkly hyper-pop with rhythmic pops for the tech reveals.
- Music: `happy-beats-business-moves-vol-10-by-ende-dot-app.mp3`
- Music treatment: hard start at Scene 2, high volume, fast fade out at the end. Music ducks to 0.12–0.15 for the duration of the voiceover.
- Music cue guidance: `assets/music/cues/happy-beats-business-moves-vol-10-by-ende-dot-app.music-cues.json`
- Audio-reactive treatment: expressive; hearts and sparkles pulse slightly to the beat
- Audio-coupled moments:
  - Scene 1 — typing
  - Scene 2 — beat reveal of the gradient and text
  - Scene 3 — card sequence (tech tags pop in one by one on the beat)
- SFX selection guidance: sparkly magic chimes for reveals, heavy bass/whoosh for the serious text, keyboard typing for the hook.
- SFX analysis guidance: `~/.agents/skills/brag/assets/sfx/sfx-analysis.md`
- Exact SFX choice: Hyperframes should choose filenames, timestamps, density, and volume based on the implemented animation.
- Audio files: copy the chosen music and any Hyperframes-selected SFX into `brag-output-2026-09-17-072500/composition/assets/`

## Hyperframes Instructions
Load the composition-building Hyperframes domain skills — `hyperframes-core` (composition contract + `data-*` timing), `hyperframes-animation` (motion), `hyperframes-creative` (design spec, beats, audio-reactive), `hyperframes-keyframes` (seek-safe keyframes), and `hyperframes-cli` (lint/check/render). /brag is its own workflow: do not enter the `hyperframes` entry-point intent interview and do not route into its generic promo / launch-video workflow. Prefer native Hyperframes conventions over anything in `/brag`.

Requirements:
- Show at least one real UI, copy, or visual element from the source project.
- Keep all text readable in the final render.
- Keep the video within 15-25 seconds.
- Include the planned music/SFX layer unless audio was explicitly disabled or documented as intentionally silent.
- Treat `/brag` audio notes as guidance, not a fixed cue sheet. Choose SFX after the visual animation exists.
- Treat music cue metadata as optional timing hints. Hyperframes decides exact animation timing and should ignore cues that hurt readability, scene pacing, or the product story.
- Major reveals may move toward nearby strong cues within about 0.15s. Smaller entrances may align to nearby beat points within about 0.10s. Use only 1-3 strong cue locks in a 15-25s video unless the edit clearly benefits from more.
- Use SFX to support motion and interaction: card sounds for card-like reveals, short announcement cues for major payoffs, key/click sounds for text or user actions, and restraint when the edit is already busy.
- Honor planned music treatment such as fade-outs, ducking, beat-aligned reveals, or letting a final SFX ring over the music, using the best Hyperframes-supported implementation.
- When music is present and the treatment is not `none`, consider Hyperframes audio-reactive workflow: extract audio data and use RMS/frequency bands for subtle, brand-specific motion. Good targets are glow, depth, background warmth, card presence, title emphasis, or other existing visual elements. Avoid waveform/equalizer visuals, musical-note graphics, generic particle systems, strobing, or heavy pulsing.
- Use local assets for audio and any required runtime/media dependencies when possible.
- Run `hyperframes check` before render — it is brag's single gate.
