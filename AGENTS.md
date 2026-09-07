# Coup Co-op Project Rules & Architecture Guidelines

## 1. Security & State Masking (Strict Invariant)
- Never broadcast unmasked `GameState` directly to sockets.
- Always filter state via `getMaskedStateForPlayer(room.state, playerId)` before emitting `gameStateUpdate`.
- Rules for masking:
  - Private influences of other players must have `role: "Unknown"`.
  - The court deck must have all upcoming cards masked as `role: "Unknown"`.
  - Inquisitor secret examination (`currentAction.examinedCard`) must ONLY be visible to the Inquisitor (`recipientUid === currentAction.playerId`). Everyone else receives `role: "Unknown"`.

## 2. Audio Engine Invariant
- Never introduce external binary audio assets (`.mp3`, `.wav`, etc.).
- All sound effects and background music must be synthesized dynamically using the native **Web Audio API** in `src/utils/audio.ts`.
- Master mute and volume preferences must be synced to `localStorage`.

## 3. Official Coup Rules Constraints
- **Assassination**: 3 coins are paid to the court treasury immediately upon declaring the action (before challenge or block phases). If challenged successfully, coins remain spent.
- **Steal**: A player cannot be targeted for Steal if they have 0 coins.
- **Targeted Blocks**: Only the target player can block or pass on targeted actions (Assassinate, Steal).
- **Challenge Loss**: Players with >1 live card must manually select which card to lose (`RESOLVING_CHALLENGE_LOSS`). Players with 1 card lose it automatically.
- **Eliminated Players**: Dead players cannot perform actions, block, challenge, or pass.

## 4. Verification Standard
- Any code changes must compile cleanly with `npm run lint` and `npm run build` with 0 errors.
