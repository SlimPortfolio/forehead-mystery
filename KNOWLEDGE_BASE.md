# Forehead Mystery — Knowledge Base

This is a living document for implementation details, architecture decisions, known gaps, and gotchas that aren't appropriate for [REQUIREMENTS.md](./REQUIREMENTS.md) (which describes intended behavior, not how it's built). Update this as the codebase evolves — it's meant to save the next person (or agent) from re-discovering things the hard way.

---

## Architecture Reality Check

### Sync is polling, not WebSockets

`src/app/page.tsx` polls `GET /api/rooms?roomCode=...` on an interval (currently **2000ms**) to keep clients in sync, rather than using a persistent connection.

- **Why:** the app deploys to Vercel's serverless model, where each API route invocation is a separate, billed function call and there's no built-in support for long-lived WebSocket connections without extra infrastructure (e.g., a separate socket server, Pusher, Ably, Vercel's own real-time products).
- There **is** a Socket.IO implementation in the repo (`src/app/socket.ts`, `src/app/server.ts`), but it is **not wired into the actual run scripts** (`package.json` scripts use plain `next dev` / `next start`, not `server.ts`). It's dead code as of this writing — don't assume it's active without checking `package.json` first.
- Polling is paused entirely via the Page Visibility API while a tab is hidden/backgrounded, and does one immediate fetch on becoming visible again.

### Vercel request cost is a real constraint

Every poll = one serverless function invocation = one billed request. This has already caused a real production incident (32,000 requests/day from a 300ms polling interval left running in background tabs). If you're tempted to poll faster "for responsiveness," weigh it against request volume first. Current interval (2000ms) and visibility-pausing were a deliberate tradeoff — don't casually revert either without re-checking the cost math.

### The server doesn't actually validate actions

Despite what `REQUIREMENTS.md`'s Security section describes as the target, the current implementation is **not** server-authoritative in practice:

- `PATCH /api/rooms/[roomCode]` blindly `$set`s whatever JSON body the client sends — no validation that the action came from the correct player, that it's their turn, that cards weren't tampered with, etc.
- All game logic (turn order, card assignment, win detection) runs client-side in `page.tsx`, and the "authoritative" room state is just whatever the client last PATCHed.
- This is a known gap, not a recent regression — it predates this document. If server-side validation is ever prioritized, it's a nontrivial rework of the API routes, not a quick patch.

---

## Game Flow Internals

### Round semantics (changed — single pass, not a repeating cycle)

`room.round` is `1` during the Ranking Phase and becomes `2` the moment the last player finishes ranking and the Guessing Phase begins. The game ends as soon as everyone has taken their guessing turn — there is **no** second Ranking Phase. This replaced an earlier design that looped through two full ranking+guessing cycles before ending (which is also why `round` used to say "1" during what users perceived as "round 2" — the old code only incremented `round` between full cycles, not between phases).

`round` is set in three places that all need to stay in sync if this logic changes again:
- `submitRanking` (human-triggered ranking submission, including its trailing auto-play loop for consecutive test players)
- The ranking-phase `useEffect` that auto-plays a test player when they're at the front of `turnOrder` (see below)
- The confirmation-phase `useEffect` no longer needs to touch `round` itself, since it never loops back to ranking — but if that changes, revisit this.

### Two separate test-player auto-play paths exist, and they must stay consistent

There are two code paths that make "Test Player N" (added via "Start with test players") act automatically:

1. `submitRanking`'s trailing `while` loop — handles consecutive test players immediately after a **human** submits their ranking.
2. A standalone `useEffect` gated on `room.phase === "ranking"` — handles the case where a test player is sitting at the **front** of `turnOrder` with no human action to kick off path 1 (this became reachable once first-player rotation was added — previously the host, a human, was always first).

These used to diverge: path 2 would jump straight from one test player's ranking to the guessing phase, skipping every other player who hadn't ranked yet. It's since been fixed to advance one turn at a time (relying on the effect re-firing for the next player), matching path 1's behavior. **If you touch ranking-phase logic, check both paths.** The equivalent pattern exists for guessing (a third effect auto-submits test player guesses), but that one only ever handles one player at a time by design, so it didn't have the same bug.

### First-player rotation

Implemented in `startNextGame`: the new turn order is the old one with its first player moved to the back (`[...rest, previousFirstPlayer]`). This is intentionally simple — it doesn't try to detect who "should" go first based on scores or anything else, just a straight round-robin across however many games are played in that room session. It resets to original join order only if a **brand-new room** is created (not via "Next game").

### Scratchpad state gotcha (fixed, but worth remembering)

The scratchpad toggle cycle (`possible → impossible → most-likely → possible`) used to check `current[card] === "possible"` to decide the next state — but an untouched card's value is `undefined`, not the string `"possible"`, even though the UI *displays* it as "Possible" via a `?? "possible"` fallback. This meant the very first click on any never-touched card was a silent no-op (advanced from `undefined` to `"possible"`, which is what it already looked like), and it took a second click to see any visible change. Fixed by normalizing `undefined → "possible"` before computing the next state. If you ever refactor this cycle, keep the normalization — it's easy to reintroduce this exact bug by "simplifying" it back out.

Cards auto-disabled because another player visibly holds them are labeled **"That's not possible"** (distinct wording) rather than "Impossible", to differentiate system-inferred impossibility from a player's own manual marking.

### Scratchpad / new-game reset

Scratchpad clearing is driven by detecting a **phase transition into** `ranking` at `round === 1` (compared against the *previous* phase via a ref), not just by checking those two field values in isolation — matching on the raw values alone is fragile because a "new game" and "still mid-lobby" state can look identical on those two fields alone (see git history around this if it regresses).

---

## Known Races Fixed (and why they mattered)

Three related races were found and fixed in the polling effect — worth understanding as a set, since they can look like unrelated bugs when they resurface:

1. **Stale closure comparing against frozen data.** The poll interval's callback originally captured `room` from the render at effect-creation time and never saw updates, since `room` wasn't in the effect's dependency list. Fixed by reading the latest room via a `roomRef` ref instead of the closed-over variable.
2. **Optimistic update vs. poll race.** When the host performs an action (e.g., "Next game"), local state updates immediately and a PATCH fires in the background. If a poll's GET request completed *before* that PATCH had persisted server-side, it could silently revert the fresh local state to stale server data. Fixed with `suppressPollUntilRef` — a short (1.5s) window after any local `submitRoomState` call during which poll responses are ignored.
3. **Incomplete diffing.** The poll's "did anything change" comparison didn't check `turnOrder`, only `phase`/`round`/`currentTurnIndex`/`players`. In practice this rarely mattered because `phase`/`round` usually change at the same time `turnOrder` does — but it's a latent gap if that ever stops being true. `turnOrder` is now included in the comparison.

If "the game state randomly reverts to something older" ever gets reported again, start by checking whether these three protections are all still intact — that class of bug is easy to reintroduce piecemeal.

---

## Winners / Hall of Fame Feature

- Trigger: on the finished screen, if `room.players.every(p => p.isCorrectlyIdentified)`, a "Perfect game" banner shows.
- Only the **host** sees the save form (team name, date, time, location — date/time default to "now" but are editable). Other players see a note to ask the host.
- Card data in the saved record is read directly from `room.players` (name + card), not re-entered by hand.
- `POST /api/winners` validates and inserts one document per game into the `winners` MongoDB collection.
- `/winners` (`src/app/winners/page.tsx`) is a **Server Component** that queries MongoDB directly at render time — deliberately not a client-side fetch to a separate API route, to avoid adding another polled/billed request path given the Vercel cost constraint noted above.
- Form state and "already saved" status reset automatically whenever a fresh game starts (tied into the same phase-transition detection used for scratchpad clearing).

---

## Testing Tips

- **"Start anyway (2+ players)"** button in the lobby bypasses the 4-player minimum (still capped at 8) — useful for solo/pair testing without needing to fill a room. It does *not* use test players; you still need real distinct player sessions/tabs.
- **"Start with test players"** fills remaining slots up to 4 with CPU-controlled players (`name.startsWith("Test Player")` is how the code identifies them everywhere — there's no dedicated `isTestPlayer` flag). Test players rank based on true card value (`getTestPlayerRanking`) and always guess correctly on their first attempt (`testGuess = currentPlayerInTurn.card || "A"` — i.e., they cheat by reading their own card directly, which is intentional for fast testing, not a bug).
- Because polling is now 2s and pauses when tabs are backgrounded, testing with multiple browser tabs requires keeping every tab in the foreground (or accept up to ~2s lag) to see updates propagate during manual testing.
