# Forehead Mystery - UI Redesign Project

**Date Started:** July 22, 2026  
**Status:** Design & Requirements Phase (Pre-Implementation)

---

## Project Overview

Redesigning the Forehead Mystery game UI to be more mobile-friendly with improved information architecture. The core functionality remains the same; this is primarily an aesthetic and layout overhaul.

---

## Visual Changes

### Layout Structure
- **Header:** Round number and phase name (e.g., "ROUND 1 - Ranking Phase")
- **Player List:** Central content area showing all players with their cards and statuses
- **Action Bar:** Fixed bottom bar with action buttons (Select Rank, Open Scratchpad, Guess Card, Leave Game/Menu)

### Player List Display
- Shows all players with:
  - Player name + info button (ⓘ)
  - Card display (large red diamond with rank/suit)
  - Current rank/guess status
  - Visual indicator of turn status (text: "It's your move sucker!" or similar)
- **Player Ordering:** Dynamically reorders based on turn sequence (current player → upcoming players)
- **Turn Indicator:** Darkened outline around player name for those who've already taken their turn
- **Yellow Highlight:** Current player's row highlighted in yellow

### Modals/Overlays
All modals open as overlays and close with a "Close" button. Include:

1. **Select Rank Modal** (Round 1)
   - Shows 4 ranking options: 1st, 2nd, 3rd, 4th
   - Each option displays relative position info (e.g., "0 above - 3 Below")

2. **Guess Card Modal** (Round 2)
   - Shows card selection options (2, 3, 4, 6, 7, 8, 9, 10, J, K)
   - Confirm button when card selected

3. **Private Scratchpad Modal**
   - Shows card likelihood assessments per player
   - Categories: "That's not possible", "Possible", "Most likely", "Impossible"
   - Color-coded for status (red for impossible, yellow for most likely, etc.)
   - "Clear" and "Close" buttons

4. **Window View Modal** (info button)
   - Shows another player's scratchpad from their perspective
   - Scratchpad data excludes both the viewing player and the target player
   - Displays cards as "Possible" for all other players
   - Read-only view

5. **Menu Modal** (three-dot menu)
   - Currently: "Leave Game" option
   - Expandable for future options

---

## Functionality Details

### Button Behavior

**Select Rank Button**
- **Enabled:** Round 1 AND it's the user's turn
- **Disabled:** Round 2 OR it's not the user's turn
- Opens rank selection modal

**Guess Card Button**
- **Enabled:** Round 2 AND it's the user's turn
- **Disabled:** Round 1 OR it's not the user's turn
- Opens card guessing modal

**Open Scratchpad Button**
- **Always Enabled**
- Opens private scratchpad modal

**Leave Game Button** (three-dot menu)
- Ends the game
- Host is prompted to restart a new game

### Card Reveal Logic
- Cards are hidden (shown as "?") until the player guesses
- After a player guesses, their card is revealed
- Status bar under player name updates to show their guess result (correct/incorrect) and the card they guessed

### Player Turn Sequence
- Player list reorders to show current player first, followed by turn order
- Players who have already taken their turn have darkened outlines
- When a turn ends, UI updates to reflect next player (follows current turn change logic)

### Scratchpad Behavior
- **Scope:** Local and private to each player
- **Data Visibility:** Only visible to the player who created it
- **Window View:** When viewing another player's scratchpad, it shows what that player would know (excluding both the viewer's and target player's cards)
- **Persistence:** Clears between rounds (follows original scratchpad logic)
- **Updates:** Not editable or viewable by other players in real-time

### Real-time Updates
- Follow existing turn change mechanism (polling or WebSocket)
- No changes to backend update logic
- UI should update when:
  - A player completes their action (rank/guess)
  - Turn passes to next player
  - Round ends/changes

### Edge Cases

**Player Leaves Mid-Game**
- Game ends immediately
- Host is prompted to start a new game

**Loading States**
- Text indicators only ("It's your move sucker!" / "Waiting for Player X")
- No additional loading spinners needed for now

---

## Card Display

### Current Implementation
- No card art library currently in use
- Using placeholder display (red diamond with rank/suit)

### Future Considerations
- Investigate 3rd-party card art libraries as optional improvement
- Can increase card prominence on different devices if needed after testing
- Keep current size for MVP, iterate based on device testing

---

## Technical Assumptions

### State Management
- Turn logic and state management remain unchanged from current implementation
- Player turn sequence managed by existing system
- No changes to backend APIs or data flow

### Responsive Design
- Mobile-first approach (phone browser primary use case)
- Current card size sufficient for initial release
- Adjust sizing based on device testing feedback

### Real-time Synchronization
- Maintain existing polling/WebSocket mechanism
- UI automatically updates when game state changes server-side

---

## Open Questions / Future Decisions
- Card art library selection (if pursuing)
- Card prominence adjustment after device testing
- Additional menu options beyond "Leave Game"

---

## Next Steps
1. Confirm this document captures all requirements
2. Review current codebase structure for component organization
3. Plan implementation approach (refactor vs. new components)
4. Begin implementation in logical phases
