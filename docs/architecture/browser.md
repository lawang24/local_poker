# Browser: presenting the game

[Architecture overview](../architecture.md)

The browser displays the server’s view of the table and collects player actions.
It owns form and connection state; it does not decide game outcomes.

## State and rendering

[App.tsx](../../frontend/src/App.tsx) owns name entry, live seat messages, pending actions, and
connection recovery. [PokerTable.tsx](../../frontend/src/PokerTable.tsx) renders the
felt, board, bets, and nine fixed numbered seats in server seat order. The central pot amount excludes
all players' current-street commitments, including folded players' bets. While
those bets remain at the seats, a small `total` badge above the pot's right edge
shows the server's full pot, including those bets. Street transitions collect the
bets into the central amount and remove the badge. The runout vote retains the
current-street breakdown until resolution. After payout, the display ignores any
retained commitments and shows the server's zero pot, including on two-board
results. This is presentation only; pot-sized raise presets and settlement still
use the full server pot.
Empty seats are buttons that move the viewer between hands; occupied nameplates open a native
modal with player details and a kick confirmation for other players. Clicking
your own nameplate opens a stack editor using the existing `set_stack` command.
The editor opens with your queued total if one exists, otherwise your current balance.
It uses the denomination selected for the next hand. During play, the dialog
shows the accepted next-hand total alongside the current seat balance. Between
hands, saving updates the balance immediately and closes the dialog. The modal
supports Escape, traps focus, and restores focus when closed. Everyone sees the
same seat positions, so moving changes both the visible position and dealing order. Desktop seats surround an oval;
portrait layouts use two side rails close to the screen edges, with a gap for the board.
The game shell in [App.css](../../frontend/src/App.css) uses the small viewport height to keep seats fixed as browser chrome changes.
On portrait screens, the table fills the viewport and the toolbar, chat toggle, and
betting controls overlay reserved corner/bottom areas. Table geometry stays constant
between hands and turns. At desktop widths (1024px and up), [DesktopTable.css](../../frontend/src/DesktopTable.css)
fits a centered 16:9 frame to the available width and height. Nine seats surround the
full-width stage, with the shared board dealt left to right into five fixed positions.
The session log button and chat dock sit below the table on the left, with betting controls on
the right. Shorter landscape phones also use oval seating with a bottom control lane. Nameplates have two fixed lines for name
and balance, with transient status or payout alongside the balance. One dealer chip follows the server-designated dealer across the felt. It sits clear of the seat’s cards, balance and bet, with an oval profile on landscape tables and a round profile on portrait tables. Empty seats use numbered outlined slots. A connected player
who has not been dealt into the hand shows a clock and “Waiting” in the card area,
beside the balance on desktop and above the nameplate on phones. The deal replaces
the indicator with hole cards.
The bottom seat’s committed amount is anchored directly above its cards. [TableChat.tsx](../../frontend/src/TableChat.tsx)
shows player messages in a scrollable desktop dock. Players can expand it to read earlier messages. Log / Ledger opens [SessionLog.tsx](../../frontend/src/SessionLog.tsx) on the recent activity log.
The Ledger tab shows sortable player totals, expandable seat visits and chip movements,
and a CSV download with one row per visit. On narrow screens the amounts form a
two-column grid beneath each name. New message opens an input above the desktop dock. Enter sends the message. Below
1024px, Log and Chat open their respective dialogs from the toolbar. Sending closes the dialog and returns
focus to the opener. Closing without sending preserves the draft. A live chat
appears at its sender’s seat for six seconds; another message from the same player
replaces it. Long messages are abbreviated in the bubble and remain complete in chat.
[TableToolbar.tsx](../../frontend/src/TableToolbar.tsx) owns a compact Options button,
connection indicator, and Feedback in the top-right corner. Options opens a native
modal containing Settings, Invite, Leave, and expandable table instructions. The
modal supports Escape and native focus management. The desktop frame places the larrypokernow name above Options and the game type and
blinds in the opposite corner. Hand and street information stays with the board.
[Cards.tsx](../../frontend/src/Cards.tsx) embeds the 52 [clean card faces](../../frontend/src/assets/clean-cards/)
as data URLs in the JavaScript bundle, so dealing does not fetch separate card files.
Each face uses Abril Fatface rank outlines and one offset vector suit on white;
all ranks, including face cards, use the same layout. Vector outlines keep the
lettering consistent without browser font dependencies. The [asset generator](../../frontend/scripts/generate-cards.mjs)
uses shared rank outlines and suit paths to rebuild the deck. Hole cards share the same size and seven-degree fan as their backs. Portrait seats
tuck the cards behind the nameplate. A responsive picture source selects portrait
artwork with a compact corner rank and vector suit above the covered portion;
desktop seats place the larger cards beside the label. Both variants use native
61:74 artwork, so ranks and suits are never stretched. The deck README records
the font source and retained SIL Open Font License. Opponents
show card backs during betting and render the hole cards the server tables during an all-in runout vote or at settlement. Dealt, non-folded opponents whose cards remain private keep their backs throughout the completed-hand result, until the next deal replaces it. Folded opponents keep the folded placeholder unless they reveal cards; players not dealt in receive no backs. This uses the current server snapshot without retaining cards locally or expanding public card visibility. Seats that win a pot use the same white nameplate as the active player. Receiving an uncalled bet back alone does not highlight a seat. A compact uppercase ribbon overlays the lower edge of the hole cards from the flop onward. The viewer sees their own live hand and the same ribbon on fully exposed opponents. On portrait screens it sits at the right edge of the seat. A two-board result stacks numbered rows, and a winning run turns purple. The browser reads each label from the server snapshot.
[ActionControls.tsx](../../frontend/src/ActionControls.tsx) owns the raise form and in-hand actions.
After settlement it mounts [RevealControls.tsx](../../frontend/src/RevealControls.tsx)
for players with cards they can voluntarily show. The bottom-right group puts
**Show All Cards** above the individual card buttons on desktop and beside them on mobile.
Desktop shortcuts S, 1, and 2 mirror the buttons. The group fills accepted choices in
green and stays visible until the next deal. Opponents see each shown card in its original
position with a back in the hidden slot. The table caption indicates automatic dealing
or waiting for funded players. Stack
editing stays in the viewer’s nameplate dialog. During the viewer's turn, a compact outlined row presents Call or Check,
Bet/Raise, and Fold; unavailable actions are disabled. Outside their turn the
controls render nothing and the table caption identifies the actor. Bet/Raise opens a native dialog without focusing an input. It has numeric and slider
inputs plus minimum, half-pot, pot, and all-in presets. Presets only select a draft;
an explicit confirmation sends the raise. Cancel or Escape returns to the action
row. Pot raises include the call and then a fraction of the pot after calling;
presets are clamped to server limits, including short all-in raises. Opening bets
are labelled Bet, while the wire command remains `raise`. The draft resets when the hand, street, actor,
target, or maximum changes. Buttons disable while an action is pending or the
connection is unavailable. The action row stays in place behind the dialog.
[FoldAction.tsx](../../frontend/src/FoldAction.tsx) asks for confirmation when Fold
is selected with nothing to call, including the big blind's option. Its white modal,
wording, session checkbox, and red Cancel / green Confirm buttons follow the supplied
PokerNow desktop recording; [FoldAction.css](../../frontend/src/FoldAction.css) adapts
the layout for narrow screens. Cancel or Escape sends nothing. Only Confirm saves
the checked opt-out in player-scoped `sessionStorage`, suppressing future free-fold
warnings in that tab session, including after reload. Closing the tab ends that
preference. Facing a call folds immediately. Losing readiness closes the dialog;
the action controls' turn key discards it on hand, street, actor, or betting-limit
changes. Confirmation checks readiness again and prevents duplicate submission.
Native dialog focus stays inside, initially on Cancel, and returns to the opener.
The recording does not establish keyboard behavior, mobile layout, or the reference's
exact session lifetime; these are local behaviors, not verified reference parity.
[useTypingViewport.ts](../../frontend/src/useTypingViewport.ts) fits bet, chat and
feedback dialogs to the visible viewport when a keyboard takes up screen space,
without resizing the table.
[main.tsx](../../frontend/src/main.tsx) mounts the app. React stores the latest complete
server snapshot alongside local form and connection state. Each new snapshot
replaces the displayed game state and clears the pending action indicator.
There is no client-side game simulation or incremental event replay.

The UI uses server-computed action limits to guide the player. The backend still
validates every request. See the [connection module](connections.md) for messages
and the [game module](game.md) for visibility rules.

## All-in runout choice

[RunoutChoice.tsx](../../frontend/src/RunoutChoice.tsx) displays a native modal over
the table or Settings whenever the server offers runouts. Eligible players see
Run once and Run twice buttons; other players see progress only. The dialog shows
who has voted and the time remaining, and disables submissions after a vote,
during a pending request, or without a connection. Return to game or Escape lets players use the editors while votes are pending.
A countdown button reopens the choice until the server resolves it.
Closing after resolution restores native focus. The browser does not decide the
outcome from its countdown. [Runouts.css](../../frontend/src/Runouts.css) owns the
choice and result styling. [PokerTable.tsx](../../frontend/src/PokerTable.tsx) shows
two labeled boards and each run's payouts after a two-run showdown; seat payouts
show the aggregate pot award. The felt lists the configured 2–7 amount when
enabled and shows the collected bonus on a qualifying result. The activity log
identifies the winner. Existing single-board results remain supported.

## Feedback

[Feedback.tsx](../../frontend/src/Feedback.tsx) renders a labeled Feedback button in the top-right header corner
on the join screen, table, and Settings page. A native modal dialog contains the
report form, traps focus, supports Escape when idle, and restores focus on close.
Opening the dialog leaves the keyboard dismissed until a field is selected. Drafts survive closing the dialog and failed submissions. Sending disables duplicate
clicks; confirmation appears only after the backend acknowledges persistence.
The report includes 1–2000 characters. Guests supply a name; returning browser
identities are attributed to their server-side player profile. A separate short-lived
WebSocket to `/feedback` uses the same backend host as `VITE_WS_URL` (replacing
its trailing `/ws`) and does not join a seat or interrupt the game connection.

## Lobby settings

[Settings.tsx](../../frontend/src/Settings.tsx) is a dedicated page opened from the
Options menu without dropping the connection. Any connected player can save shared
small/big blinds, cents mode, and the 2–7 bonus per opponent. Zero disables the
bonus. Dealing is always automatic, including the first hand;
there is no manual deal button or auto-deal toggle. The server snapshot is authoritative;
there is no browser-local settings preference. During play, Settings displays the current hand’s values and any accepted
replacement for the next hand. New shared settings reset open drafts, and leaving the page discards unsaved changes.

[amounts.ts](../../frontend/src/amounts.ts) formats amounts and converts numeric
inputs to integer wire units. With cents enabled, 100 wire units equal 1.00;
otherwise they equal 100 whole chips. Switching modes preserves integer balances
and configured bet and bonus amounts, changing their denomination for everyone. Bets, stacks, payouts, and
blind labels use the shared mode. Historical activity text retains its original
integer-unit amounts. Inputs accept increments of 0.01 in cents mode and 1 otherwise.

## Reconnecting to a seat

The browser keeps its name and bearer token in `localStorage` across visits.
On startup, the [storage migration](../../frontend/src/session.ts) moves names and tokens from the previous project namespace into `larrypokernow:global` within each storage area, preserving any values already under the new name.
Tab-scoped `sessionStorage` keeps the active tab's identity and whether to reconnect
on reload; old tab tokens take precedence and migrate to local storage after a
successful join. Leaving clears the active tab token but retains the browser identity.
A newly opened tab shows the join form and reuses the browser identity on joining.
Use separate browser profiles for separate people; names do not identify players.
Clearing browser storage loses access to that identity, and cross-device login and
account recovery are not implemented.

While joining or restoring a tab, the browser shows an
[indeterminate progress bar](../../frontend/src/ConnectionProgress.tsx) and elapsed wait
time across connection attempts. While waiting for the server, the panel says
connecting should take between 30 seconds and 1 minute. Only the elapsed time
updates; retries continue past a minute. Opening the socket changes the message
to loading the table. The first player state ends the wait. Once a table is visible, it stays
on screen during reconnects.

After a connection closes, the browser retries with exponential backoff capped at
ten seconds. The token reclaims a retained seat or creates a new seat with the
same permanent player ID after pruning. A second connection using the same token
replaces the first; the old socket receives close code `4001` and stops retrying.
A kicked socket receives `4002`: it clears the active tab token, stops retrying, and
returns to the join screen with an explanation. The browser identity is retained
so the player may explicitly join again; kicking is removal, not a permanent ban.

Seat retention and the effect of disconnecting during a hand are described in
[connections and sessions](connections.md#seat-lifecycle).

## Build and server address

Vite serves the development UI and builds static production assets; TypeScript
and ESLint check the frontend. See [vite.config.ts](../../frontend/vite.config.ts)
and [package.json](../../frontend/package.json).

During development, Vite proxies `/ws`, `/feedback`, and `/health` to the backend on port 8000.
The frontend normally derives the WebSocket address from the page's host and
protocol; `VITE_WS_URL` can override it.

For production routing and serving, see [operations](operations.md#serving-the-app).
