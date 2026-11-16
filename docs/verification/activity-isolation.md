# Development and test activity isolation

Verified on 2026-11-16 using the Codex embedded browser, the real local frontend,
and a separate backend with `POKER_ENVIRONMENT=test`. Persistence used local Moto
DynamoDB tables with an independently seeded production checkpoint and session.
No live AWS data or hosted game was used.

## Automated checks

All 124 backend tests passed. The six activity regression tests cover safe defaults,
invalid configuration, checkpoint/identity/feedback isolation when physical tables
are shared, labels on archive payloads and player results, legacy production
checkpoint recovery, and environment filtering before export totals are calculated.
Architecture links and `git diff --check` passed.

## Browser play

Three controlled identities used separate loopback origins with the same backend.
All actions were driven through visible controls. Four complete hands traversed
preflop, flop, turn, river, showdown and payout. The next automatic deal was
observed after each, including hand 5 after the final phone check.

| Hand | Viewport coverage (actual CSS pixels) | Pot paid | Ending stacks: Alice / Bob / Carol |
| --- | --- | --- | --- |
| 1 | Desktop: 1280×720; Carol at 1440×900 | 30, split 15/15 | 1005 / 990 / 1005 |
| 2 | Phone: Carol at 390×844; peers at 1280×720 | 60 to Bob | 985 / 1030 / 985 |
| 3 | Desktop: all three at 1280×720 | 30, split 10/10/10 | 985 / 1030 / 985 |
| 4 | Phone: Carol at 390×844; peers at 1280×720 | 30 to Alice | 1005 / 1020 / 975 |

Player views agreed on the final three payouts; the first hand's payout was also
confirmed by the following deal's stacks and the persisted result. Total chips
remained 3000. The phone check included submitting a raise, chat, and private
feedback, with feedback success shown. No horizontal or vertical page overflow
was observed. Hidden opponent cards stayed hidden during betting.

All queried test events carried `environment=test`. Production's checkpoint and
session history were unchanged throughout all four hands in the same emulator
tables. The running test artifacts and screenshots are under the ignored
`.artifacts/activity/` directory; the durable regression tests are in
[tests/test_activity.py](../../backend/tests/test_activity.py).

## Limits

This verifies application-level storage separation, not AWS IAM or capacity
isolation. A production deployment still needs `POKER_ENVIRONMENT=production`.
Old history is unclassified and excluded from normal exports unless explicitly
included; historical test sessions were not guessed or migrated. Testing against
a production-configured backend would still create production activity.

The phone viewport does not simulate a physical keyboard. No UI styling or game
rules were changed here; PokerNow visual parity, all-in runouts, muck/reveal
variants and queued settings were not reverified in this browser run. The
existing backend regression suite covers the associated game behaviors.
