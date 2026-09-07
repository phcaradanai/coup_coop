# Cinematic FX assets

`CyberFxOverlay` is video-first and falls back to the existing CSS effect when a video is unavailable.

Expected optional files:

- `coup.webm` / `coup.mp4`
- `challenge.webm` / `challenge.mp4`
- `assassinate.webm` / `assassinate.mp4`
- `steal.webm` / `steal.mp4`

Guidelines:

- Keep videos **silent**. Audio must remain synthesized through `src/utils/audio.ts` per project rules.
- Recommended duration: 0.7–1.5 seconds for action cinematics.
- Prefer 1920×1080 or 1280×720, 30–60 fps.
- Prefer WebM VP9 with alpha for transparent overlays on Chromium-class desktop browsers.
- MP4 is the compatibility fallback; render effects on black and let the overlay use screen blending.
- Keep individual assets small (ideally under ~2 MB) and avoid long looping clips.
- Do not encode gameplay information that is not already public to every player.

Target-aware effects such as Assassin marks, fleet movement, blocks, caravan travel, tribunal impacts, and card-loss particles are intentionally rendered by a single canvas (`GameFxLayer`) rather than separate DOM elements or videos, because their positions depend on the actual player/card layout.
