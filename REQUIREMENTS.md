# Forehead Mystery Requirements Doc

## Software Requirements Specification (Version 1.1)

> This document describes intended product behavior. For implementation notes, architecture decisions, known gaps, and gotchas discovered along the way, see [KNOWLEDGE_BASE.md](./KNOWLEDGE_BASE.md).

---

# 1. Overview

## Project Name

**Forehead Mystery**

## Objective

Forehead Mystery is a cooperative online deduction game for 4–8 players. Each player is randomly assigned a unique playing card but cannot see their own card. Every player can see the cards assigned to all other players and must use logic, rankings, and previous guesses to determine which card they hold.

The objective is for **every player to correctly identify their own card.**

---

# 2. Game Rules

## Players

* Recommended players: **4–8**
* Maximum players: **8**
* By default, a game cannot begin with fewer than four players.
* A game cannot contain more than eight players.
* The host may bypass the minimum via a "Start anyway" option, which allows a game to begin with as few as **2** players. This exists for testing/casual play and is not the intended standard experience.

---

## Cards

* Cards are randomly assigned at the beginning of every game.
* Cards may never be duplicated.
* All cards belong to the same suit.
* Each player receives one unique card randomly selected from the full deck of 13 cards (Ace through King).

Examples:

**4 Players**
* Each player receives 4 randomly selected unique cards from Ace through King
* Example: Ace, 5, Queen, 8

**6 Players**
* Each player receives 6 randomly selected unique cards from Ace through King
* Example: 2, 7, 10, Jack, King, 3

**8 Players**
* Each player receives 8 randomly selected unique cards from Ace through King
* Example: Ace, 4, 9, Jack, 6, King, 2, 10

Card assignment is completely random and always drawn from the full 13-card deck without replacement.

---

## Card Visibility

Each player can see:

* Every other player's card
* Every player's declared ranking
* Eliminated guesses for every player
* The current player's turn
* The current round number

Each player **cannot** see:

* Their own card
* Another player's scratchpad
* Another player's notes or reasoning

---

# 3. Gameplay Flow

## 3.1 Lobby

Players may join a game by:

* Room code
* User account

The lobby displays:

* Room code
* Connected players
* Host designation
* Ready/connected status

Only the host may begin the game.

---

## 3.2 Card Assignment

When the host starts the game:

* Cards are randomly assigned from the full 13-card deck (Ace through King).
* Every player immediately sees every opponent's card.
* Their own card remains hidden.

---

## 3.3 Ranking Phase (Round 1)

The ranking phase is labeled **Round 1**.

Beginning with Player 1 and proceeding in turn order:

Each player selects the rank they believe they occupy relative to everyone else.

Examples:

* 1st
* 2nd
* 3rd
* etc.

The interface should display:

* Number of players above the selected rank
* Number of players below the selected rank

Once submitted:

* Rankings remain visible for all players during the ranking phase.
* Rankings cannot be changed until the next round.

---

## 3.4 Guessing Phase (Round 2)

After all players have submitted their rankings, the guessing phase begins. This phase is labeled **Round 2**.

Players guess one at a time using the same turn order established during the Ranking Phase.

Each player selects the card they believe they possess.

The interface should require confirmation before locking in the guess to prevent accidental selections.

### Guess Results

**If the guess is correct:**

* The game confirms the correct guess to all players.
* Their card is marked as correctly identified.
* Turn passes to the next player.

**If the guess is incorrect:**

* The game confirms the incorrect guess to all players.
* Turn passes to the next player.

---

## 3.5 Game End

A game consists of exactly one Ranking Phase (Round 1) followed by one Guessing Phase (Round 2) — there is no repeated cycle. Once every player has taken their guessing turn, the game ends immediately, regardless of whether guesses were correct.

Eliminated guesses persist for the duration of the (single) guessing phase and are not reset mid-game.

The results screen displays:

* Each player's assigned card
* Each player's ranking

If every player correctly identified their own card, a "Perfect game" banner is shown, and the host may save the win — see [Section 7](#7-win-condition).

---

## 3.6 Starting a New Game

The host may start another game within the same room ("Next game" / "Start new game") once the current game ends.

* New cards are dealt and shuffled.
* The player who goes first rotates: whoever was second-in-turn-order in the previous game goes first in the new one (i.e., the front of the turn order cycles forward by one position each game). This continues indefinitely across successive games in the same room.
* Each player's private scratchpad is cleared automatically at the start of a new game.

---

# 4. Scratchpad

Each player has access to a private scratchpad.

The scratchpad is never visible to other players.

Each possible card can be marked as one of three states:

* **Possible**
* **Impossible**
* **Most Likely**

Players may update these markings at any time by clicking a card to cycle through the three states.

Any card visibly held by another player is automatically locked to a non-interactive "impossible" state, labeled **"That's not possible"** to distinguish it from a card the player has manually marked impossible themselves (which is labeled **"Impossible"**).

Scratchpad information remains available throughout the game and is cleared automatically at the start of each new game (see [Section 3.6](#36-starting-a-new-game)).

---

# 5. User Interface Requirements

## Main Game Screen

Each player should see:

* All opponents
* Each opponent's visible card
* Each opponent's declared ranking
* Eliminated guesses
* Current player turn
* Current round number
* Their private scratchpad

Their own card should display as a hidden card or question mark.

---

## Turn Indicator

The interface should clearly indicate:

* Current player
* Whether it is the user's turn

The active player's turn should be visually highlighted.

---

## Guess Submission

Players submit one guess during their turn.

The application should require confirmation before locking in a guess to prevent accidental selections.

---

# 6. Multiplayer Requirements

## Online Play

* Every player uses their own mobile device.
* Gameplay is synchronized by polling the server (see [Section 9](#9-technology-stack) — not a persistent real-time connection). Under normal conditions, updates propagate to other players within a few seconds.
* Polling automatically pauses while a player's browser tab is hidden or backgrounded, and resumes with an immediate refresh when the tab becomes visible again.

---

## Reconnection

* Each player's identity is stored in their browser's local storage, so refreshing the page or reopening the room link automatically reconnects them to their current game and seat.

---

## Disconnects

There is currently no server-side detection of a player disconnecting (e.g., closing their browser or losing network access). A disconnected player's seat remains part of the game; other players are not notified, and the game does not automatically end. Handling disconnects gracefully is not yet implemented — see [Knowledge Base](./KNOWLEDGE_BASE.md).

---

# 7. Win Condition

The game does not end early based on correctness — it always plays out the full turn order for both the Ranking Phase and Guessing Phase (see [Section 3](#3-gameplay-flow)), ending once every player has taken their guessing turn.

If, at that point, every player correctly identified their own card, the results screen shows a "Perfect game" banner. The host (only) may then fill out a short form — team name, date, time, and location — to save the win. Saved wins, along with each player's name and card, are viewable in a running table at the `/winners` route.

The results screen always displays:

* Every player's card
* Every player's final ranking

Additional statistics may be added in future versions.

---

# 8. Non-Functional Requirements

## Platform

* Mobile-first responsive web application
* Compatible with modern iOS and Android browsers
* Desktop browsers should also be supported
* Future support for Progressive Web App (PWA)

---

## Performance

* The player who performed an action sees it reflected immediately on their own screen.
* Other players receive that update via polling, currently every **2 seconds** while their tab is visible (paused entirely while backgrounded). This interval was deliberately chosen over faster polling to limit server request volume — see [Knowledge Base](./KNOWLEDGE_BASE.md).
* The application should comfortably support eight simultaneous players.

---

## Authentication

Players may:

* Create an account
* Join games as guests using a room code

Guest accounts should not require registration.

---

## Data Persistence

* Active game state should remain available while the server is online.
* Refreshing the browser should reconnect the player to their active game whenever possible.
* Recovery after a complete server restart is not required for Version 1.

---

## Security

* Scratchpad information must remain private. (Currently enforced client-side only — scratchpad data is never sent to the server. See [Knowledge Base](./KNOWLEDGE_BASE.md) for the current server-validation gap.)
* Players may only view information intended for them.
* All player actions must be validated by the server.
* Hidden game information must never be trusted from the client.
* Players may only submit actions during their own turn.

---

## Reliability

* Duplicate cards must never be assigned.
* Duplicate guesses within the same turn are not permitted.
* Turn order must remain consistent.
* The server is the authoritative source of all game state.

---

# 9. Technology Stack

Version 1 is planned using:

### Frontend

* Next.js (App Router)
* React
* TypeScript

### Styling

* Tailwind CSS
* ShadCN UI

### Backend

* Next.js API Routes

### Database

* MongoDB

### Real-Time Communication

* Client-side polling of REST API routes (`GET /api/rooms`), currently every 2 seconds, paused when the browser tab is hidden.
* A Socket.IO server implementation exists in the codebase (`src/app/socket.ts`, `src/app/server.ts`) but is not wired into the app's actual dev/build/start scripts and is not currently used. Polling was adopted instead because the app deploys to Vercel's serverless model, which does not support long-lived WebSocket connections without additional infrastructure. See [Knowledge Base](./KNOWLEDGE_BASE.md).

---

# 10. Assumptions & Constraints

## Version 1 Scope

Version 1 focuses solely on delivering the core online multiplayer experience.

The following features are **out of scope**:

* Friends lists
* Public matchmaking
* Spectator mode
* AI players
* Voice chat
* Video chat
* Push notifications
* Custom game rules
* Alternate game modes

---

## Server Authority

The server is responsible for:

* Creating games
* Assigning cards
* Maintaining turn order
* Validating every player action
* Synchronizing game state

Clients should never determine hidden information independently.

---

## Player Devices

* One device per player
* Internet connection required
* Offline play is not supported

---

## Browser Support

Version 1 should support current versions of:

* Google Chrome
* Safari
* Microsoft Edge
* Mozilla Firefox

---

## Accessibility

Version 1 should strive to:

* Use readable font sizes
* Support portrait and landscape orientation
* Maintain sufficient color contrast
* Avoid communicating important information using color alone

---

# 11. Future Enhancements

The following features are intentionally postponed until after Version 1:

* Player profiles
* Statistics beyond the win log described in [Section 7](#7-win-condition)
* Match history for non-winning games
* Achievements
* Friends lists
* Spectator mode
* Timed games
* Alternate card themes
* Dark mode
* Additional accessibility options
* Tutorials
* Multiple game variants
* Replay previous games

---

# 12. Success Criteria

Version 1 will be considered complete when:

* Players can create and join games online.
* Four to eight players can successfully participate.
* Cards are randomly assigned from Ace through King without duplicates.
* Every player sees only the information intended for them.
* Rankings and guesses function according to the game rules.
* Scratchpads remain private.
* The game remains synchronized for all connected players.
* Players can reconnect after refreshing their browser.
* The game ends correctly once every player has taken their guessing turn, with a "Perfect game" result recognized and saveable when every guess was correct.
* The application performs reliably on modern mobile browsers.
