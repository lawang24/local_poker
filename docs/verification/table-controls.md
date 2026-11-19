# Table controls verification

Reference: `references/pokernow/phone.mov` at 0:05 and 1:00 (recorded emulator
440 × 956 CSS px); `desktop.mov` at 0:05 and 2:00 (CSS dimensions unknown).
Frames establish control placement and appearance, not the reference's pause or
leave behavior. Personal controls are horizontal on phone and a bordered vertical
strip on desktop. Chat/Log form the phone's lower-left stack. Pause is separate.
Feedback is in Options. Leave seat deliberately retains local leave-table behavior.
Sound, stop, voice/video, and reference Options-dialog parity are not implemented.
This change matches supported controls, not the entire table's geometry.

Verification used the Codex embedded browser and a dedicated memory-only backend
on 127.0.0.1:8012, launched with POKER_ENVIRONMENT=test and both DynamoDB table
variables empty. No records were persisted, so there are no persisted environment
labels to audit. Production was not used. Frontends on ports 5182/5183 connected
explicitly to this backend. Three independent origins provided Alice, Bob and
Charlie browser identities.

Phone: 440 × 956. Desktop: 1440 × 900. Dimensions read from the rendered DOM.
Six hands completed during verification, with legal visible Call/Check/Raise
controls driving preflop, flop, turn, river, showdown and payout. Hand 2 was a
heads-up reconnect check; the others included all three bots. Hand 3 ran with all
three views at phone size; hands 4 and 5 used three desktop views. Final hand 6
used Charlie's phone view alongside the two desktop player views.

- Hand 1: raised to 20, 60-chip pot paid to Bob; stacks 980 / 1040 / 980.
- Hand 2: 20-chip pot paid to Alice; stacks 990 / 1040 / 970.
- Hand 3: 30-chip pot paid to Bob; stacks 980 / 1060 / 960.
- Hand 4: 30-chip pot paid to Charlie; stacks 970 / 1050 / 980.
- Final desktop hand 5: 30-chip pot paid to Bob; stacks 960 / 1070 / 970.
- Final phone hand 6: 30-chip pot paid to Bob; stacks 950 / 1090 / 960.

All pots returned to zero after payout; total chips remained 3000. Player views
agreed on payouts and stacks. Automatic next deals observed. Winners and active
players highlighted; made-hand labels appeared; mucked cards remained hidden in
other players' DOM views. A 60-second timer queued during hand 4 retained the
current hand's disabled timer and applied to the following hand.

Pause/resume, Away/I'm back, Leave/rejoin, Options/Settings, phone Chat/Log, and
Feedback open/close exercised. Feedback returned focus to its Options button.
Feedback submission was not tested because this backend deliberately has no durable
feedback storage. Phone bet editor submitted a raise and chat submitted a message;
the sender-seat bubble appeared and the table stayed fixed. Bottom-seat balance
and committed bet remained readable. Physical phone keyboard behavior is unverified.

Build, ESLint, and nine backend table-control tests passed. Architecture overview
and browser guide reviewed; browser guide and README updated for control placement
and navigation. Existing unrelated working-tree changes were preserved.
