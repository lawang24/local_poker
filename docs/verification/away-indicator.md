# Away indicator overlap

Verified locally on 2026-11-23. `PokerTable.tsx` independently rendered the
Away/Waiting clock and the folded-hand × in the same card slot. The clock now
suppresses that marker; visible private, revealed, or covered cards take
precedence over the clock. Returning restores the ordinary folded marker.

## Reference and limits

Inspected contact sheets from `references/pokernow/desktop.mov` at 20-second
intervals (approximately 00:10, 00:30 through 03:30), and `phone.mov` at
15-second intervals (approximately 00:07.5 through 02:07.5). Desktop card/nameplate
placement and phone cards above the nameplate are visible. The sampled frames
do not establish the Away transition, its timing, or exact icon appearance.
No live reference fallback was performed, so exact PokerNow Away parity remains
unverified. Recording pixel dimensions do not establish CSS viewport dimensions.
The user's screenshot establishes the overlapping clock and folded marker.

## Embedded-browser gameplay

Used the real Vite UI with a separate memory-only Uvicorn backend on port 8027,
`POKER_ENVIRONMENT=test`, and both DynamoDB table variables empty. No persisted
records were produced and production was not used. Three identities used
127.0.0.1:5197, localhost:5197, and 127.0.0.1:5200. Actions used visible controls;
the decision timeout was disabled through Settings before the automatic deal.

- Desktop observer: 1440 × 900 CSS pixels. Additional icon comparison at
  1200 × 800. Phone observer: 390 × 844. A second bot also rendered at 328 × 871.
- Hand 1 reproduced Away while facing a preflop call, causing a fold. The
  opponent saw only the clock; returning showed only ×. The remaining two
  players checked through flop, turn, and river. Bob won 20; resulting stacks
  were Alice 1000, Bob 1010, Cara 990. Hand 2 dealt automatically.
- Hand 2 retained live covered cards when Alice temporarily went Away before
  her turn. Returning and calling/checking with all three players completed
  all four streets. The 30-chip pot split between Alice and Cara; final stacks
  were 1005, 1000, 995. Hand 3 dealt automatically.
- Hand 3 completed all four streets with the phone observer at 390 × 844.
  Bob won 30; final stacks were 995, 1020, 985, verified from both Bob and
  Cara's views. Pot returned to zero. Hand 4 dealt automatically.
- Hand 4 repeated the Away/fold case on phone and desktop. The clock, name,
  and balance remained readable without ×. Return/Away toggles restored the
  appropriate single indicator. Preview left paused in this state.
- Winner highlighting and made-hand labels appeared at showdown. Opponents'
  private/folded cards were absent, and mucked hands remained covered.

Build, lint, and `git diff --check` passed. Architecture browser documentation
now describes the precedence. This narrow rendering change does not alter
layout or the WebSocket contract. Physical keyboard behavior, chat/editor
regressions, all-in Away transitions, and exhaustive reference parity were not
retested. Screenshots are under ignored `.artifacts/away/`.
