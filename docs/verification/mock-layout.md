# Muted mock-game layout verification

## Reference and implementation

Revisited `references/pokernow/desktop.mov` at 1:40 and
`references/pokernow/phone.mov` at 0:30 before layout changes. Those frames
establish the white check pills, card/seat presentation and separate control
areas. The phone recording explicitly uses 440 × 956 CSS pixels; the desktop
recording's CSS dimensions are unknown. Its two-player scene does not establish
nine-player seat clearance, so exact nine-player reference parity is unverified.

Full-table browser inspection found and fixed:

- Desktop seat 2 check pill touched its nameplate by about 3px; seats 7/9
  check pills touched their cards. Their bet anchors now provide clearance.
- Desktop seat 6 check pill crossed the pot. Its anchor now mirrors seat 5.
- Phone seats 4/7 check pills crossed the board. Their bets now stay beside
  the seats, above the board.
- Desktop sound control crossed the upper-right seat. Sound/pause controls
  are compact and stay above that seat.
- Phone sizing's extra-time button covered the lower-right seat. It now uses
  the corner beside the bottom seat, opposite the amount input. Narrow-phone
  status controls have bounded width, and sizing presets wrap inside buttons.

Reviewed architecture overview and updated the existing browser guide paragraphs.
Existing unrelated working-tree changes were preserved.

## Environment and browser checks

Used the existing memory-only isolated backend on 8040 (`POKER_ENVIRONMENT=test`)
and real Vite frontends on 5201–5205. DynamoDB was not configured; no persisted
records exist to check environment labels. No production play occurred.

Nine separate browser identities filled every seat. All actions went through
visible controls in the Codex embedded browser. All nine tabs were muted as soon
as requested; replacement preview identities were muted before play. Final
snapshots confirmed `Unmute sounds` in all nine tabs.

Primary previews use fixed iframe CSS viewports of 1200 × 800 desktop and
390 × 844 phone, scaled to fit the visible browser panel. Also tested 328 × 844
phone sizing and extra-time controls. Preview wrappers live only in ignored
`.artifacts/mock-layout/`, served on 5210. This avoids the previous clipped
screenshots while preserving the real app's responsive layout.

Bounding-rectangle audits plus screenshots found no collisions among bets/check
pills, pot, community cards, other seats/cards, dealer marker, and primary/status
controls in the final nine-seat scenes. Intentional same-seat card/nameplate
layering is excluded. Rechecked the bet editor open/closed on both layouts,
phone chat submission, narrow-phone extra time including the longer activated
label, and narrow sizing labels. Actual device keyboards remain untested.

## Completed games

Finished setup hand 6 and five full nine-player hands (7–11), through preflop,
flop, turn, river, showdown and payout. Hands 10 and 11 ran after the final CSS
change. The final full desktop hand split a 90-chip pot between Evan and Grace;
the final full phone hand awarded 90 to Hugo. All nine player views agreed on
settled balances and zero pot for both hands.

| Final hand | Alice | Bob | Charlie | Diana | Evan | Fiona | Grace | Hugo | Ivy |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 10, desktop | 1320 | 880 | 940 | 930 | 1020 | 1110 | 975 | 930 | 940 |
| 11, phone | 1310 | 870 | 930 | 920 | 1010 | 1100 | 965 | 1010 | 930 |

Hand 11 automatically followed 10; hand 12 automatically followed 11. Hand 12
was played to the river and paused with eight check indicators and all nine
seats occupied for the user to inspect. The previews and all bot tabs remain
open, with local servers running and sound off.

Card backs hid opponents' hands during play. Made-hand ribbons, active-turn and
winner highlighting, check-pill persistence and street clearing were observed.
This was a spacing change; queued settings/stack edits and feedback submission
were not independently replayed. No claim covers all possible stack/name lengths,
all-in/two-board states or exact whole-table pixel parity.

## Checks and artifacts

Frontend build, ESLint, all 14 frontend tests, and `git diff --check` pass.
No backend code changed in this layout pass. Evidence is in
`.artifacts/mock-layout/gameplay.txt`, `results.json`, `frontend-tests.log`,
`desktop.jpg`, and `mobile.jpg`. The mobile screenshot is cropped from the full
capture to remove the surrounding empty preview area, without changing UI content.
