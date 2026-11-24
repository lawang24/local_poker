# Check indicator verification

## Reference

Inspected `references/pokernow/desktop.mov` at 1:35–2:02 and
`references/pokernow/phone.mov` at 0:24–0:48. Desktop 1:38–1:56 and phone
0:24–0:36 show a white rounded pill with bold black lowercase `check` in the
seat's bet position. It persists while the next player decides and disappears
on the next street (desktop around 1:59, phone around 0:40). Phone developer
tools explicitly show 440 × 956 CSS pixels. Desktop CSS viewport dimensions
are not established by the recording. Reference frames were extracted locally;
no fallback live table was needed.

The implementation uses the existing bet anchors, including above the bottom
seat's cards. The server derives a public `checked` flag from current-street
zero commitment and zero acted-at target for live, non-folded players. Queued
checks are not displayed before execution. Calls/raises replace the pill with
the committed amount; folding, street advancement, runout and settlement hide it.

## Automated checks

136 backend tests pass, including three new regression tests for street/hand
clearing, calls/folds/rejected actions, identical public views and queued checks.
Frontend build, ESLint and 14 frontend tests pass. Reviewed architecture overview
and updated browser and connection guides for the presentation and wire field.
No game-rule or persistence schema changes were required.

## Embedded-browser games

Real frontend previews on 5201 and 5202 connected to an isolated backend on
8040, with `POKER_ENVIRONMENT=test`. DynamoDB table variables were absent;
activity was memory-only, with no persisted records whose labels could be audited.
Production was not used. Alice, Bob and Charlie used separate origins:
127.0.0.1:5201, localhost:5201, and 127.0.0.1:5202. Decision limit was set to
600 seconds through Settings. All actions used visible browser controls.

Primary view: Charlie at measured 440 × 956 (phone) and 1440 × 900 (desktop).
Companion views stayed desktop; Alice measured 1280 × 720. The screenshot
capture clipped the desktop's right edge to the embedded browser's visible
surface, despite the measured CSS viewport override.

| Hand | Layout | Payout and resulting stacks (Alice / Bob / Charlie) |
| --- | --- | --- |
| 1 | Desktop setup, two dealt players | Alice +20; 1010 / 990 / 1000. Charlie joined during this hand. |
| 2 | Desktop scenario, three players | Alice +60; 1050 / 970 / 980. Two check pills persisted facing a bet, then became amounts on calls. |
| 3 | Phone, final styling, three players | Alice +30; 1070 / 960 / 970. Complete preflop, flop, turn, river, showdown and payout. |
| 4 | Desktop, final styling, three players | Bob +30; 1060 / 980 / 960. Complete preflop, flop, turn, river, showdown and payout. |
| 5 | Phone input scenario, three players | Alice +60; 1100 / 960 / 940. Submitted raise to 20, then completed every street. |

All three views agreed on hands 2–4's settled stacks and zero central pot.
Automatic next deals were observed after each of those hands. Check pills
appeared for consecutive checkers and cleared at each street and settlement.
Active/winner highlights, made-hand ribbons and opponents' hidden backs were
observed. Phone chat submitted at the sending seat, and chat/raise submission
kept the bottom nameplate at x=166, y=831.9765625 with readable stack and bet.

Artifacts: `.artifacts/check-indicator/mobile.jpg`, `desktop.jpg`,
`gameplay.txt`, and `backend-tests.log`. The local preview remains available.

## Limits

The pill's label, colors, rounded shape, bet-relative position and observed
street lifetime match the recordings. Exact whole-table pixel parity and
sub-frame animation timing are not established. No physical phone keyboard
was used. Reference behavior when a checker later faces a bet is not shown;
retaining their last check until they act is the implemented policy. Queued
settings/stack edits, feedback submission and every empty seat position were
not independently replayed for this change.
