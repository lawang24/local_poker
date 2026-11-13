# All-in runout reference and verification

Sources supplied by the user on November 12, 2026:
`~/Downloads/pokernow_run_twice_demo.mov` (one run) and
`~/Downloads/new_run_it_twice.mov` (two runs). The second recording is authoritative
for running twice. Both show preflop all-ins on desktop. No mobile reference or
shared-board all-in sequence is present in either recording.

The [schedule](../../backend/runout.py) uses seconds from the beginning of the
runout after consent. The video anchors are approximately 24.85 s for once and
8.40 s for twice. Recording observations have about 50 ms resolution; browser
rendering/network delivery introduce additional jitter.

| Stage | Once offset | Twice offset |
| --- | ---: | ---: |
| First flop backs | 4.130 | 4.050 |
| First turn back | 8.080 | 8.050 |
| First river back | 12.330 | 12.050 |
| Second flop backs, upper board dims | — | 16.150 |
| Second turn back | — | 20.150 |
| Second river back | — | 24.250 |
| Combined settlement | 16.000 | 28.350 |
| Result hold before next deal | 6.100 | 8.100 |

Each face becomes public 175 ms after its back appears; flop faces stagger by
another 175 ms each. The face finishes turning over the next 100 ms. The first
board returns to full opacity when the second river face is public. Both boards
remain visible through the result. Uncalled contributions return at the start;
all contested awards wait for the final settlement. There is no intermediate
payout after the first run. The existing consent dialog remains: neither video
shows voting UI, so voting time is outside these reveal offsets.

The configured private PokerNow table resumed as Dealer Test, but the embedded
browser exposed only that one retained identity. Opening the same URL in another
tab reused it, so a controlled two-player live reference hand and independent
spectator could not be exercised. No replacement table was created.

## Automated and browser checks

[Timing tests](../../backend/tests/test_runout_timing.py) verify the measured
schedule, individual face boundaries, no premature faces/results, chip
conservation, queued edits, shared prefixes, disconnects, restart refunds, and
storage-failure cancellation. The existing engine, history and WebSocket tests
now explicitly advance/consume staged runouts before checking settlement.

Embedded-browser checks use the real Vite frontend and a memory-only backend on
loopback, with three player identities on distinct origins. The observed viewports
are 1440 × 900 desktop and 390 × 844 phone portrait (other bot tabs use 1280 × 720).
No live backend or persistence store is used. Physical phone keyboard behavior,
real network latency, and the live reference's shared-board transitions remain
outside this verification.

The final implementation completed six hands with three bots using legal visible
controls. Every hand settled with conserved chips and reached the next automatic
deal. All-in hands queued replacement stacks of 1,000 per player; those changes
took effect after settlement, before the next deal.

| Viewport | Hand | Pot | Gross awards | Observed result hold |
| --- | --- | ---: | --- | ---: |
| Phone 390 × 844 | Once | 3,000 | Carol 3,000 | 6.13 s |
| Phone 390 × 844 | Twice | 3,000 | Bob 1,500; Carol 1,500 | 8.27 s |
| Desktop 1440 × 900 | Twice | 3,000 | Bob 1,500; Carol 1,500 | 8.14 s |
| Desktop 1440 × 900 | Once | 3,000 | Bob 3,000 | 6.12 s |
| Desktop 1440 × 900 | Ordinary check/call | 30 | Alice 30 | 5.1 s |
| Phone 390 × 844 | Ordinary check/call | 30 | Bob 30 | 5.1 s |

DOM observations sampled roughly every 75 ms confirmed individual flop flips,
the complete first run before the second, upper-board dimming/restoration, and
one combined settlement. Polling and rendering account for the observed delay
above the scheduler's exact 6.1/8.1-second result holds. The engine tests check
each 175 ms reveal boundary without sampling error. Ordinary hands traversed
preflop, flop, turn, river and showdown; payouts and resulting balances agreed
across all three players' views.

Phone checks opened the bet editor, submitted chat, checked the sender's seat
bubble, and opened/closed Feedback. The felt and bottom-seat geometry remained
unchanged after chat submission, and stacks and bets stayed readable. Desktop
and phone runouts showed the pot, both board rows, equity badges, hand labels,
and winner emphasis without observed clipping. This establishes local behavior;
it does not establish mobile reference parity from the desktop-only recordings.

Validation: 109 backend tests, TypeScript/Vite production build, ESLint, and
three payout-display tests passed. Preflop equity is a deterministic 2,000-sample
estimate; flop, turn and river equity is exact for these Hold'em scenarios.
