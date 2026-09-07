# Cinematic Video FX Assets Catalog

`CyberFxOverlay` is video-first and dynamically falls back to procedural CSS / SVG cyber-effects when video files are unavailable.

## Supported Cinematic FX Files (15 Assets)

All files reside in `public/fx/` with `.webm` (primary, alpha transparency) and `.mp4` (fallback, additive `#000000` screen blend):

| ID | Action / Role | Files | Duration | Visual Style & Color Language |
|---|---|---|---|---|
| **01** | Assassin: Target Execution | `assassinate.webm` / `assassinate.mp4` | 0.8–1.1s | Crimson reticle lock `#EF4444`, dual diagonal purple/crimson energy slashes, white-hot flash |
| **02** | Captain: Steal Fleet Raid | `steal.webm` / `steal.mp4` | 1.0–1.2s | Cyan chevron fleet `#06B6D4`, engine trails, golden particle coin extraction `#F59E0B` |
| **03** | Steal Block: Fleet vs Fleet | `steal_block.webm` / `steal_block.mp4` | 0.9–1.2s | Attacking cyan fleet vs defensive fleet clash, EMP barrier flare, formation break |
| **04** | Duke: Foreign Aid Block | `block_foreign_aid.webm` / `block_foreign_aid.mp4` | 1.0–1.1s | Holographic fortress gate, golden amber shield `#F59E0B`, vertical pylons, access denied |
| **05** | Ambassador: Caravan Exchange | `exchange.webm` / `exchange.mp4` | 1.2–1.5s | Diplomatic convoy `#10B981` / `#14B8A6`, orbiting holographic data cards re-shuffling |
| **06** | Inquisitor: Tribunal Examination | `examine.webm` / `examine.mp4` | 1.0–1.1s | Judicial scanning pillars `#8B5CF6`, cold violet beams, holographic gavel strike shockwave |
| **07** | Inquisitor: Force Card Exchange | `force_exchange.webm` / `force_exchange.mp4` | 1.0–1.1s | Card pulled into swirling violet/cyan deck portal, shuffle vortex, new card emergence |
| **08** | Contessa: Assassination Block | `block_assassinate.webm` / `block_assassinate.mp4` | 0.8–1.0s | Elegant rose-red `#F43F5E` & gold royal aegis shield blossoming, deflecting blade attack |
| **09** | Duke: Tax Collection | `tax.webm` / `tax.mp4` | 0.8–1.0s | 3 golden spinning coins `#F59E0B` converging with particle trails, crown flare pulse |
| **10** | Foreign Aid Success | `foreign_aid.webm` / `foreign_aid.mp4` | 0.8s | 2 warm gold resource capsules escorted by small neutral drone, converting to particles |
| **11** | Challenge | `challenge.webm` / `challenge.mp4` | 0.8–1.0s | Amber scanning grid, dual opposing brackets locking together, identity interference wave |
| **12** | Coup d'État | `coup.webm` / `coup.mp4` | 1.0–1.1s | Orbital targeting convergence, colossal vertical crimson-white plasma strike & shockwave |
| **13** | Influence Lost / Card Destroyed | `lose_card.webm` / `lose_card.mp4` | 0.6–0.8s | Face-down card silhouette, fracture fissure crack, polygon shatter into red ash particles |
| **14** | Player Eliminated | `player_eliminated.webm` / `player_eliminated.mp4` | 1.0–1.3s | Faction energy circle destabilizing, inward power shutdown, collapsing red void pulse |
| **15** | Victory | `victory.webm` / `victory.mp4` | 2.0s | Golden space sunrise, unified imperial fleet formation, abstract geometric light crest |

---

## Technical Specifications & Encoding Guide

1. **Resolution & Aspect Ratio**: 1920×1080 (16:9), 30 or 60 FPS.
2. **Audio Invariant**: **MUST BE SILENT (NO AUDIO TRACK)**. Coup Co-op synthesizes all sound via Web Audio API (`src/utils/audio.ts`).
3. **Target Size**: Under ~2.0 MB per asset.
4. **First & Last Frames**: Must be completely transparent or pure black `#000000` to ensure seamless in/out transitions.
5. **No Text / UI**: Zero typography, character faces, game UI, or logos.

### Transcoding with FFmpeg

#### Transparent WebM (VP9 + Alpha):
```bash
# Convert source animation with black background into transparent WebM using luma key
ffmpeg -i input.mp4 -vf "colorkey=0x000000:0.1:0.1,format=yuva420p" -c:v libvpx-vp9 -b:v 1500k -an -auto-alt-ref 0 output.webm
```

#### Compact MP4 Screen Blend (H.264 pure black):
```bash
ffmpeg -i input.mp4 -vf "eq=contrast=1.05:brightness=-0.02,format=yuv420p" -c:v libx264 -crf 20 -preset slow -an output.mp4
```
