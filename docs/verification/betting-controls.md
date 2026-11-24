# Betting controls

Reference: `references/pokernow/desktop.mov` 0:28–0:42 shows the action row
becoming an inline sizing row, changing 40 (2BB) to 60 (3BB), and submitting.
At 1:05 it shows waiting-turn Check / Fold and Check or Fold. At 1:50 it shows
quick Bet 20, Bet, Check, Fold and shortcut badges. `phone.mov` 0:39–0:51 shows
the waiting row, own-turn row, opening the editor, selecting an amount and betting.
The 0:45 phone frame establishes the stacked amount/presets arrangement, yellow
slider, minus/plus, and Back/Bet buttons. Desktop 0:35 establishes five presets,
BB equivalent, Back/Esc, and the extra-time activated treatment. Phone device
emulation in the recording is labeled 440 × 956; desktop CSS viewport scaling
is not established by the recording's 1920 × 1080 video dimensions.

The shared Git-configured live reference table opened but only displayed an
offline Dealer Test identity; this embedded browser did not recover that identity.
No replacement table or player was created. Queued-action cancellation rules,
plus/minus increment, and extra-time duration could not be established live.
The implemented policy is one BB per increment, Check cancelling upon a bet,
choices lasting one street, and one 30-second extension per decision. These
policies are explicitly not claimed as verified PokerNow behavior.

## Implementation and checks

Bet/Raise replaces the bottom row without a modal or backdrop. The editor contains
numeric entry, BB equivalent, five presets including 3/4 pot, a yellow slider,
minus/plus, Back and Bet/Raise. Quick minimum Bet, persistent waiting actions,
keyboard shortcuts and a server-validated extra-time extension are implemented.
Waiting choices are private in server views, consumed once, and cannot turn a
queued Check into a paid Call. The free-fold confirmation remains in effect.

Build, ESLint, 14 existing frontend tests, and all 133 backend tests pass,
including six new betting-control tests. Fault-injection tests deliberately emit
persistence-failure logs. A first test pass found use of a nonexistent engine
Player.all_in property; corrected to the authoritative zero-stack condition.
`git diff --check` passes. Reviewed the architecture overview and updated browser,
connection and game guides, including the new protocol and transient state.

## Embedded-browser gameplay

Real Vite frontends on 5198/5199 connected to a fresh Uvicorn backend on 8035.
`POKER_ENVIRONMENT=test`; both DynamoDB table variables were empty. All activity
was memory-only, so no persisted records or environment labels exist to audit.
Production was not used. Alice, Bob and Charlie had independent browser storage
via 127.0.0.1:5198, localhost:5198 and 127.0.0.1:5199.

Charlie’s measured viewport was 1440 × 900 CSS pixels for desktop and 440 × 956
for phone. Alice’s companion view was 1280 × 720; Bob’s was 328 × 871. Actions
were driven only through visible controls with fresh DOM snapshots. The shared
timer was set to 600 seconds through Settings for deterministic inspection.

| Hand | Main layout | Result and next deal |
| --- | --- | --- |
| 1 | Desktop | All three reached every street. 3/4-pot preflop raise to 29, then quick 10-chip flop bet. Alice won 117; settled balances Alice 1078, Bob 961, Charlie 1200 after Charlie's queued stack replacement. Hand 2 automatically posted 5/10. |
| 2 | Phone | Raise to 30, 3/4-pot flop bet 68, then checks through turn/river. Alice won 294; all three views agreed on 1274 / 863 / 1102. Hand 3 automatically posted 5/10. |
| 3 | Phone, final CSS | Complete preflop-to-river replay. Bob won 30; balances 1264 / 883 / 1092. Queued BB 20 remained inactive during the hand, applied after payout; automatic hand 4 posted 5/20, total 25. |
| 4 | Desktop, final CSS | Complete preflop-to-river replay. Alice won 60; all views agreed on 1304 / 863 / 1072; pot returned to zero. Hand 5 automatically dealt. |
| 5 | Desktop scenario | Charlie selected Check or Fold while facing a bet; it folded once when action reached him. Alice's F shortcut opened free-fold confirmation. Confirm completed the hand, Bob won 45. Hand 6 automatically dealt. |

During hand 1, a queued Check cancelled when Bob bet. A later queued Check
executed once after Bob checked, advancing directly to Alice. T increased the
remaining deadline by 30 seconds and changed the button to Extra time activated.
The 3/4-pot preset selected 29 from pot 15 with 10 to call; plus/minus selected
39 then 29. R opened sizing, Escape returned focus to the action button, and C
called. Private/mucked cards remained hidden in other player views; made-hand
labels, active highlights and winner highlights were observed.

On phone, the initial editor overlapped Chat/Log. Hiding that group while sizing
fixed the overlap; Back restores access. The bottom Alice nameplate stayed at
x=166, y=831.9765625 through opening sizing, numeric entry, and chat submission.
Its stack and above-card bet remained readable. Charlie's chat bubble appeared
at Charlie's seat; Feedback opened from Options with usable fields. Feedback
submission was not attempted because this backend has no durable feedback store.

Screenshots: `.artifacts/betting-controls/phone.jpg` and `desktop.jpg`.
The sizing structure, controls, colors and observed transitions were compared
against the cited frames. Exact full-table pixel parity, animation timing,
physical phone keyboards, live-reference queue policy and time-bank rules remain
unverified. Companion viewports differ; no claim is made that all bots shared
the primary viewport. Four full three-player hands plus the fold scenario were
completed. The local preview and player tabs are left available for interaction.
