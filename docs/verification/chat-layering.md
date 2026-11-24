# Chat bubble layering

Verified November 23, 2026 against the real local Vite frontend on port 5223
and a dedicated in-memory backend on port 8063 (`POKER_ENVIRONMENT=test`).
No production activity or persistent records were created.

## Reference and appearance

Inspected `references/pokernow/phone.mov` and `desktop.mov` contact sheets and
the 01:30 frame of each before editing. The phone recording identifies a
440 × 956 CSS viewport; desktop CSS dimensions are unknown. These establish
horizontal phone utility controls and vertical desktop controls, but the
sampled reference frames do not establish a chat bubble overlapping them.
Exact reference parity for that interaction remains unverified. The user's
screenshot and clarification establish the requested bubble-over-buttons order.

At 390 × 600 CSS pixels, a seat-five message overlapped the Options, Leave and
Away controls. The yellow bubble painted above them, with readable text and
its tail intact. Options remained clickable through the bubble and its native
modal painted above the bubble. At 440 × 956, chat submission and dismissal
preserved table placement. Desktop seat-five messages appeared below the seat
with the correct upward tail. The six-second disappearance was observed.
Evidence: `.artifacts/chat-layering/phone.jpg` (local ignored artifact).

## Gameplay

Two separately identified bots used `127.0.0.1` and `localhost`, with legal
calls/checks driven through visible embedded-browser buttons.

- Mobile hand 1: Alice at 440 × 956 and Bob at 328 × 871 CSS pixels; preflop,
  flop, turn, river, showdown and payout completed. Pot 20 paid to Bob;
  final stacks Bob 1,010 / Alice 990; pot returned to zero. Automatic hand 2
  was observed with the expected blinds deducted.
- Desktop hand 3: both views at 1440 × 900 CSS pixels; all streets, showdown
  and payout completed. Pot 20 paid to Alice; final stacks Bob 1,005 / Alice
  995; pot returned to zero. Automatic hand 4 was observed.
- Hands 2 and 4 subsequently ended through idle timer folds during UI setup;
  they are not counted as full-street verification hands.

Build and ESLint passed. Architecture overview and browser documentation were
reviewed; the browser guide now describes the measured portal overlay.

Coverage limits: two bots rather than three; no physical phone keyboard test;
no full nine-seat matrix, in-hand settings/rebuy regression, or new feedback
submission. The change does not alter game or WebSocket state. Local preview
remains running and paused for inspection.
