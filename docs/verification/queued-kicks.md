# Kick player during a hand

Kick player remains enabled during betting and pauses. The confirmation explains
that the player can finish the current hand and will be removed after payout.
The accepted request displays “Removal queued for after this hand.” Repeating it
does not duplicate the cash-out or change the original requester attribution.
Between hands, removal remains immediate.

Before editing, reviewed the reference contact sheets from
`references/pokernow/phone.mov` (20-second samples, approximately 0:10–2:10)
and `desktop.mov` (25-second samples, approximately 0:12–3:32). Those samples
show betting/table appearance but not kick confirmations. Exact reference parity
for the dialog and removal timing is unverified; the requested behavior governs
this implementation. Existing dialog styling was retained.

Used the Codex embedded browser and real local frontend at ports 5194/5195, with
three independent origins/identities. Restarted only the isolated test backend
on 8024 with POKER_ENVIRONMENT=test and both DynamoDB table names empty. No
production activity or persisted records; persisted environment labels therefore
cannot be audited. Phone viewport measured 440 × 956 CSS pixels; desktop measured
1440 × 900. Companion Bob view used the existing desktop viewport.

- Setup hands 1 and 2 exercised timer expiry/reconnect and a queued winner removal.
  Hand 2 paid Bob 25 before cashing him out and closing his connection. His browser
  showed the removal message and allowed manual rejoin.
- Phone hand 3: three bots completed preflop, flop, turn, river and showdown using
  visible Call/Check controls. Alice queued Bob's removal; an additional Charlie
  removal was also present in the shared preview. Both continued playing. Bob won
  30, then cashed out 1020; Charlie cashed out 990. Alice retained 975. Pot returned
  to zero. With only one seat left the game waited correctly. Manual rejoins and
  resume led to automatic hand 4.
- Desktop hand 4: three bots completed every street with visible controls. Charlie
  queued Alice's removal and repeated the request. Alice kept acting until
  showdown. Charlie won 30, finishing at 1020; Bob finished at 990; Alice's settled
  965 was cashed out. Her browser returned to Join with the removal message.
  Automatic hand 5 dealt to Charlie/Bob, posting 5/10 with stacks 1015/980.
- Ledger confirmed total buy-ins 6000 = buy-outs 3990 + remaining balances 2010
  (including current commitments). Bob's total cash-outs were 2035; Charlie's
  990; Alice's 965. The log places payout before removal and the next deal.

Phone confirmation fits at 440 × 956 without clipped controls. Desktop dialog,
active-turn/winner highlights, made-hand labels, and hidden opponent cards were
observed. Physical phone keyboard, chat, feedback, and live all-in removal were
not rechecked. No claim of exact full-table visual parity. Preview remains open
with the in-hand Kick player confirmation available.

Build, ESLint, git diff whitespace check, and all 127 backend tests passed.
New tests cover preserving the active hand, repeated kicks, payout before cashout,
stack edits before removal, next deal, mutual removals/restart refunds, and saving
settlement before closing the removed player's socket with 4002. Architecture
overview, game, connection, and browser guides were updated alongside the code.
