# Payout display reference

Source: `/Users/lawrence/Downloads/new_run_it_twice.mov`, explicitly designated
by the user. The older `pokernow_run_twice_demo.mov` was not used. Source SHA-256:
`48031be321a4d8679e65392382a9e81b202a748ca45ca8b25e069c41f23fb9dd`.
The recording is 3024 × 1964 pixels, 60 fps, 45.583 seconds. These are recording
pixels, not a measured browser CSS viewport. Times below are elapsed video time.
Review included consecutive source frames around 8.35–8.65 and 36.70–37.00 seconds,
plus full frames at contributions, both completed boards and the next deal.

## Observed amounts

| Time | Visible state |
| --- | --- |
| 0.0s | Larry has 2000; Lar has 2200. |
| 3.0s | Larry has 1980 with a 20 blind; Lar has 2190 with a 10 blind. Total commitments 30. |
| 7.0–7.5s | Lar's bet is 2200 and his balance says All In. Larry still has 1980 and a 20 bet. Total 2220. |
| 7.8–8.4s | Larry's bet is 2000; Lar's is 2200. Both say All In. Total 4200. |
| 8.5s | Collected pot 4000; Lar's balance is 200; Larry remains All In. Hole cards: Larry 9♥ 7♠; Lar 8♣ 3♦. |
| 23.0–24.0s | First board 5♠ A♣ 3♥ 7♥ Q♠. Larry has pair (7); Lar pair (3). Pot remains 4000, Lar 200, Larry All In. No +N award yet. |
| 34.0–36.75s | Second board A♦ A♥ J♥ Q♥ Q♣. Both have two pair (A,Q), with the board's jack kicker. Pot remains 4000. |
| 36.80s | Pot becomes 0. Larry shows **0 +3000**; Lar shows **200 +1000**. Both winning nameplates highlight; Larry's two run labels and Lar's second label identify the winning runs. Consecutive frames show both aggregate badges appearing together. |
| 44.0s | The same balances and aggregate badges remain visible. |
| 45.0–45.55s | New hand: Larry has 2990 with a 10 blind; Lar has 1180 with a 20 blind. Badges are gone. |

## Conclusions and limits

The badge is the **gross award across both runs**, including the recipient's
own matched contributions. It is not net hand profit or the award for only the
most recent run. The amounts imply a 2000 first-run award to Larry and a
1000/1000 split of the second run. These per-run numeric awards are calculated
from the visible pot and hands; they are not separately displayed at each river.
The next hand confirms settled totals of 3000 and 1200, hence net hand results
of +1000 and −1000 from opening stacks 2000 and 2200.

An unmatched return **can** be inferred in this clip: the visible 2200/2000
commitments become a 4000 pot and Lar's 200 balance before the runouts. That
200 is excluded from his subsequent +1000 badge. No separate refund notification
is visible, so its wording or animation is not established.

The clip covers a heads-up unequal-stack all-in, two runs, one outright win,
one tied board and the next deal. It does not establish multiway side-pot display,
odd chips, refunds at other settlement paths, fold-win presentation, the 2–7
bonus, queued edits, cents, mobile layout or physical keyboard behavior.

## Implementation boundary

The existing gross `result.payouts` badge already matches the recorded award
semantics. The corrected mismatch is the accompanying balance: the table showed
the settled balance plus the gross badge (3000 +3000 and 1200 +1000).

[The engine](../../backend/game.py) now records `result.stacks_before_payout`
without changing any payout, refund, side-pot, tie, bonus, history or queued-edit
calculation. [The display helper](../../frontend/src/payoutDisplay.ts) uses that
balance only when it plus the award equals the current authoritative stack and
the denomination matches. Edits or bonus transfers that break this equality use
the current stack. Older results fall back to the current stack. The current
stack remains authoritative for the editor, ledger and next hand. Reference
parity for those fallback cases remains unverified.

## Verification on 2026-11-12

- Two new backend regressions reproduce the exact boards and amounts, verify
  gross versus net, both player views, checkpoint recovery, the next deal, queued
  stack/settings changes and subsequent stack edits.
- Three frontend tests verify recorded balances, edit/bonus/denomination
  fallbacks, old checkpoints and next-hand behavior. Run with
  `node --experimental-strip-types --test frontend/tests/payoutDisplay.test.mjs`.
- Server rendering of the actual `PokerTable` component with the recorded
  engine result shows Larry `0 +3,000` and Lar `200 +1,000` (existing local
  thousands separators preserved).
- `npm ci`, frontend lint and production build passed. The final full backend
  run passed **109 tests**. An earlier volatile-clock assertion was corrected
  by the concurrent runout work before this final run.
- The targeted accounting regression group subsequently passed **53 tests**:
  payout display, runouts/side pots/ties/refunds, seven-deuce bonus, settings,
  history and ledger (`PYTHONPATH=tests` for the shared runout test helper).
- Supplemental real WebSocket check: three distinct bot identities, two
  complete check/call hands, 12 actions each through preflop/flop/turn/river.
  Each awarded a 30-chip pot and returned the pot to zero. All three views
  agreed. Stacks after hand 1: 1020/990/990; after hand 2: 1040/980/980. Total
  3000 conserved. Automatic deals of hands 2 and 3 verified.
- This WebSocket check is **not** a browser gameplay check. The embedded
  browser inventory was empty and selecting `iab` returned “Browser is not
  available: iab”. Desktop/mobile browser hands completed: **0**; actual CSS
  viewports: **not measured**. Clipping, input, privacy presentation, highlights,
  chat/bet editor stability and physical phone keyboards remain unverified.
- Memory-only preview started at `http://127.0.0.1:15920/`, connected to its own
  backend at `127.0.0.1:18920`. Opening it through the Codex panel tool returned
  `queued`; no visible demo could be observed. No deployment was performed.

The shared checkout also contains concurrent runout implementation changes;
those are separate from the payout snapshot and display correction described here.

## Follow-up visible demo

The embedded browser became available when the user requested “show me”. The
real frontend and existing isolated backend were exercised through visible
check/call buttons with three distinct browser identities: Payout Alice on
`127.0.0.1`, Payout Bob on `localhost`, and Payout Carol on `payout.localhost`.
Each view identified only its own player as “you” and kept opponents' cards
hidden before showdown.

- Desktop observer viewport: measured **1440 × 900 CSS pixels**. Hand 4 played
  all four streets to showdown. Bob displayed **990 +30**; settled stacks were
  Alice 990, Bob 1020, Carol 990. Pot became zero and hand 5 dealt automatically.
- Phone observer viewport: measured **390 × 844 CSS pixels**. Hand 5 played all
  four streets to showdown. Bob displayed **1010 +30**; all three views agreed
  on settled stacks Alice 980, Bob 1040, Carol 980. Pot became zero and hand 6
  dealt automatically. Bottom-seat balance and winner badge were readable.
- Total: **three browser bots, two completed browser hands**, 30 chips awarded
  each hand, 3000 chips conserved. Actual viewport dimensions were read from
  the page. Temporary viewport override was reset and all three live tabs kept
  open. Phone payout screenshot: `.artifacts/payout-demo/mobile-payout.png`.
- This closes the earlier browser-availability blocker for the payout demo and
  two full check/call games. Run-it-twice browser replay, mobile bet/chat input
  stability, in-hand edit UI checks and physical-phone keyboard behavior were
  not exercised in this follow-up. Exact recorded two-run arithmetic remains
  covered by the engine regression and component-render checks above.
