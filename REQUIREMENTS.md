# Forehead Mystery Requirements Doc

## Software Requirements Specification (Version 1.0)

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

* Minimum players: **4**
* Maximum players: **8**
* A game cannot begin with fewer than four players.
* A game cannot contain more than eight players.

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

## 3.3 Ranking Phase

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

## 3.4 Guessing Phase

After all players have submitted their rankings, the guessing phase begins.

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

## 3.5 Round Completion

After every player has guessed:

* If fewer than 2 rounds have been played, a new Ranking Phase begins.
* Previous rankings are cleared for the new round.
* **Eliminated guesses are reset** (players start fresh with all cards available).
* Turn order remains the same.

---

## 3.6 Game End

The game ends after exactly 2 rounds have been completed.

The results screen displays:

* Each player's assigned card
* Each player's ranking from the final round
* Total rounds played (always 2)

---

# 4. Scratchpad

Each player has access to a private scratchpad.

The scratchpad is never visible to other players.

Each possible card can be marked as one of three states:

* **Possible**
* **Impossible**
* **Most Likely**

Players may update these markings at any time.

Scratchpad information remains available throughout the game.

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
* Gameplay is synchronized in real time.
* All players remain connected throughout the game.

---

## Reconnection

If a player refreshes their browser or application:

* They should automatically reconnect to their current game whenever possible.

---

## Disconnects

If a player disconnects and cannot reconnect:

* The current game immediately ends.

Players may then create or join another game.

---

# 7. Win Condition

The game immediately ends once every player has correctly identified their own card.

The results screen should display:

* Every player's card
* Total rounds played

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

* Player actions should synchronize in near real time.
* Gameplay actions should propagate to all connected players within approximately **500 milliseconds** under normal conditions.
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

* Scratchpad information must remain private.
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

* Socket.IO (or an equivalent WebSocket solution)

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
* Statistics
* Match history
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
* The game ends correctly once every player has identified their card.
* The application performs reliably on modern mobile browsers.
