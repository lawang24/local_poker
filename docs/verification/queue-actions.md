# Always-available queue submissions

Queue settings and Queue stack remain enabled for unchanged, already queued,
and invalid drafts. Native form validation explains invalid inputs on submit.
Requests may repeat or replace accepted edits; the server still applies them
after payout. Connection failures use the existing error response, not an
offline queue. Stack dialogs remain open when sending fails.

Reviewed the supplied recordings before editing: `references/pokernow/phone.mov`
sampled every 20 seconds (approximately 0:10–2:10), and `desktop.mov` every
25 seconds (approximately 0:12–3:32). These establish table and betting-control
appearance but the sampled frames do not establish a settings/stack queue
interaction. Exact reference appearance and behavior for these editors remain
unverified. This change retains their existing layout and labels.

Verification used Codex's embedded browser, the real Vite frontend on ports
5194/5195, and a fresh backend on 8024 launched with POKER_ENVIRONMENT=test
and both DynamoDB table variables empty. There are no persisted records or
environment labels to audit. Production was not used. Three origins supplied
independent Alice, Bob, and Charlie identities. The phone views measured
440 × 956 CSS pixels; the desktop test view measured 1440 × 900. Bob's companion
view remained 1280 × 720. Each hand included all three bots, using visible legal
Call/Check controls through preflop, flop, turn, river, showdown, and payout.

- Phone hand 1: repeated unchanged settings submission, queued BB 20 and Alice's
  stack 1200, then repeated both accepted submissions. Current-hand values stayed
  5/10 and the original balance. Charlie received the 30-chip pot. After payout
  and the stack edit, balances were Alice 1200, Bob 990, Charlie 1020. Automatic
  hand 2 posted 5/20, showing 1180 / 990 / 1015 plus 25 in bets.
- Desktop hand 2: while paused, queued Charlie's stack 1400 and BB 30, repeating
  both submissions. BB 1 was rejected with “Value must be greater than or equal
  to 5”; the button remained enabled. Resumed and completed the hand. Bob received
  60; settled balances were 1180 / 1030 / 1400. All player views agreed; the pot
  returned to zero. Automatic hand 3 posted 5/30, showing 1175 / 1000 / 1400 plus
  35 in bets. Paused hand 3 and left the stack editor open as a live demo.

Active-player and winner highlights and made-hand labels were observed. Alice's
mucked cards remained hidden from the other players at desktop payout. Desktop
settings and stack editor screenshots showed readable fields and enabled submit
controls. Physical phone keyboard behavior, chat, feedback, and all-in runout
interactions were not rechecked in this focused pass. No exact full-table visual
parity claim is made.

Frontend build and ESLint passed. The 35 existing settings, runout, and runout
timing tests passed with PYTHONPATH=.:tests; an initial invocation without the
tests helper path failed to import two modules, then passed with the correct path.
Architecture overview and browser guide reviewed; browser guide updated for
submission and connection behavior. No WebSocket or game-engine changes.
