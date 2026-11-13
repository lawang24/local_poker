# Game: rules and player views

[Architecture overview](../architecture.md)

The game engine owns the table and decides what each action means. It is
synchronous and independent of WebSockets, so rules can be tested without a
running server. Its implementation is [game.py](../../backend/game.py).

## Session ledger

The [table](../../backend/game.py) groups applied chip transfers by stable player
ID and seat visit. Reconnecting to a retained seat continues the visit. A kick
or pruning cashes out the remaining stack and closes the visit. Returning after
removal opens another visit under the same ID. The ledger balance includes the
player’s contributions until payout, so outstanding bets do not appear as
realized losses. Net equals buy-outs plus that balance minus buy-ins. Queued edits
enter the ledger when applied against the settled stack.

The live ledger covers the current table session. After everyone disconnects or
the server restarts, the next session starts with each returning player’s actual
opening stack. Historical movements remain in the private archive when storage
is enabled. [Ledger tests](../../backend/tests/test_ledger.py) cover these boundaries.

## Hand lifecycle

The table begins in `waiting`, moves through `preflop`, `flop`, `turn`, and `river`,
and ends in `complete`. A hand can finish early when only one player remains.
When all calls are settled and at most one remaining player has chips, betting
is closed. Before the river, the engine pauses on the current street with no actor
and offers every non-folded contender a choice of one or two runouts. This includes
a covering player with chips left. Two runs require unanimous agreement; any
one-run vote, a disconnected contender, or the 20-second deadline resolves to one.
Folded players and new arrivals observe but cannot vote. A river all-in or an
uncontested hand settles immediately without a vote.

Each run copies the existing board and draws its remaining streets, including
burn cards, sequentially from the same deck without reshuffling or replacement.
Every contested main/side-pot layer is divided between runs before evaluating
winners; an odd chip goes to the first run. Ties within each run award odd chips
clockwise left of the dealer. Uncalled contributions return before the timed
runout begins, reducing both the pot and refundable contributions exactly once.
They are recorded separately from runout payouts. The result includes each run's board, pots and payouts, alongside
aggregate payouts; the legacy `board` is the first run. If insufficient cards
remain for two runs, the engine falls back to one.
Settlement also snapshots `stacks_before_payout` for the result presentation.
Pot awards, bonus transfers, net history and queued edits still settle in their
existing order; the snapshot does not delay or alter chip ownership.
The result stays visible for 6.1 seconds after one all-in run, or 8.1 seconds
after two. Ordinary results and the first hand use five seconds. The next deal
requires at least two connected players with chips; otherwise the table waits.

[runout.py](../../backend/runout.py) defines the reveal schedule measured from the
supplied once/twice recordings. After consent, the hand remains running with no
actor. Each street first publishes face-down slots, then one face at a time;
the flop faces stagger by 175 ms. Run one completes before run two starts.
The full contested pot remains outstanding through the final river pause, and
only the final scheduled stage calls settlement, records net results, and applies
queued edits. Existing board prefixes are shared and never replayed. Disconnects
cannot fold a contender after consent. A restart still refunds the unfinished
hand, including during a reveal, without returning an earlier refund twice.

Live equity is calculated from public contenders and revealed board cards only,
never the actual remaining deck or folded cards. Flop, turn and river enumerate
possible completions; preflop uses 2,000 deterministic samples. Percentages are
rounded, so multiway totals can differ slightly from 100. Each new run evaluates
its own board and excludes cards already exposed on earlier runs. Best-five
highlights are emitted only for already public winning hands.

## Rules and shared state

The engine owns blinds, dealer rotation, turn order, minimum raises, all-in
eligibility, main/side pots, ties, and uncalled-chip returns. Chips are integers;
players start with 1,000 and blinds are 5/10. Players can request a new total for their own stack at any time. Players have stable numbered seats; the engine keeps its player
list sorted by seat for clockwise dealing and action order. Moves to empty seats
and removal of other players are allowed only between hands. Removal records a
cash-out and preserves the next dealer when removing the current dealer.
Seat numbers are checkpointed; older checkpoints derive them from list order.
Moves emit `seat_changed` events, and kicks attribute `seat_removed` to the requester.
Any connected player can change the shared lobby settings:
positive integer-unit blinds (SB ≤ BB ≤ 1,000,000), cents mode, and the per-opponent
2–7 offsuit bonus (0–1,000,000 units, default 0). Between hands, stack and settings edits take effect immediately. Automatic dealing is always enabled.
Cents mode denominates each integer unit as 0.01 instead of 1 for everyone;
switching modes preserves underlying chip balances. The default denomination is whole chips. Settings are checkpointed with backward-compatible defaults and
emit a `settings_changed` archive event. Chat and game activity each retain their latest 100 entries independently. Chat records the sender’s display name at send time.
The engine also emits structured, ordered private events for joins, seat removal,
chip movements, blinds, actions (including forced folds), runout offers/votes/decisions,
boards (indexed by runout during an all-in), chat, and results.
Each event has a schema version, UTC timestamp, sequence, session ID, and hand ID
when applicable. Hand starts capture seat order, starting stacks, all hole cards,
and the shuffled deck in draw order. Completion captures contributions, payouts,
ending stacks, and per-player net (ending stack minus opening stack).

During a hand, the engine keeps one requested total per player and one shared
set of requested settings. A later valid edit replaces the earlier request.
Saving the active settings clears any queued settings. The live betting limits,
pot contributions, blinds, denomination and bonus continue to use the active values
through all runouts. After payouts and bonuses, the engine records the completed
hand with its settled stacks and net results. It then applies each requested total
and records the difference from the settled stack as a separate chip movement.
It clears the queue before checking eligibility, scheduling a deal or posting blinds.
A queued rebuy can fund a player for the next deal, and a zero total can sit them out.

With a positive bonus, the engine checks the dealt hole cards when the hand ends.
An offsuit seven and two qualify on a fold win or an outright main-pot win on
every runout. A tie, a side-pot-only win, or an uncalled-chip return alone does
not qualify. After ordinary pot settlement, every other player dealt in,
including folded and disconnected players, pays once up to their remaining stack.
Players who joined mid-hand or sat out owe nothing. The result records actual
payments and the winner's total separately from pot awards. The activity log
names the winner, and the archive includes the transfers in hand profit.

Pending events and identity registrations live on `Table` only until the connection
layer saves them. They are cleared after a successful save (or discarded in
memory-only mode). `hand_start`, hand/session IDs, and the sequence are checkpointed
for recovery; the entire accumulated archive is never loaded into the engine.

[DeckOfCards](../../backend/deck_of_cards.py) creates, shuffles, and draws from a
52-card deck. The engine uses `phevaluator` to rank hands at showdown; the
package is declared in [requirements.txt](../../backend/requirements.txt).

## Player privacy

`Table.state(viewer)` is the privacy boundary. It includes public seat information,
the board and betting state, the viewer's hole cards, and server-computed action
limits. From the flop onward the showdown evaluator names the viewer’s live hand and each fully exposed hand against the current board or each completed runout. Pair and two-pair labels identify the paired ranks. The engine derives public labels from the actual revealed cards. An opponent’s hidden or partially shown hand stays unlabelled. After an all-in closes betting, the server tables every live contender immediately, including during the runout vote. At an ordinary river showdown it starts with the last river bettor or raiser, or the first live seat left of the dealer on a checked river. Going clockwise, the first player tables, followed by each player who ties or beats the best hand shown so far. The server automatically mucks a beaten hand. Folded hands stay private at settlement. A fold win automatically shows the winner’s cards only when the 2–7 bonus requires them as proof. This show order and all-in policy follows [Poker TDA rules 17 and 18](https://www.pokertda.com/view-poker-tda-rules/).

Until the next deal, any dealt player can voluntarily reveal either hole card or both, including after folding or being mucked. The server adds only the selected cards to the public result in deal order. Reveals are permanent for that result, survive reconnects and completed-hand checkpoints, and leave payouts and the next-deal timer intact.

Session tokens are sent in the joining player's
session response, not in table snapshots.

The server sends these views through the [connection module](connections.md).
[Recovery checkpoints and archives](persistence.md) use separate private representations.
Archive events strip bearer tokens, but include hidden cards and deck order;
only authorized offline analysis can read them. They never appear in `state`.
Identity lookup records use a SHA-256 digest of the random token.

## Verification

[Engine tests](../../backend/tests/test_game.py) cover turn order, betting rules,
payouts, privacy, disconnects, and chip conservation, including randomized legal
hands. [Settings tests](../../backend/tests/test_settings.py) cover shared-setting
validation, checkpoint compatibility, delayed deals, cancellation, and disconnects.
[Runout tests](../../backend/tests/test_runouts.py) cover consent, deadlines,
card uniqueness, shared board prefixes, side pots, odd chips, reconnects and recovery.
[2–7 tests](../../backend/tests/test_seven_deuce.py) cover eligibility, capped
payments, pot accounting, reveals, and completed-hand recovery.
See the [README](../../README.md#checks) for test commands.
