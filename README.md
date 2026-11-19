# larrypokernow

One global play-money, no-limit Texas Hold’em game for 2–9 players. React/TypeScript renders the table; FastAPI owns the rules and sends each player a private WebSocket view.

## Run locally

Requirements: Python 3.12 and Node.js 22.12 or later.

In one terminal:

```sh
cd backend
python3.12 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python run.py
```

In another terminal:

```sh
cd frontend
npm ci
npm run dev -- --host 127.0.0.1
```

Open http://127.0.0.1:5173/ in two separate browser profiles (or different browsers) and enter a name in each. Tabs in the same profile reuse one player identity. Everyone connects to the same global game. Hands deal automatically after five seconds once two connected, non-away players have chips and the game is not paused. **Options → Invite friends** copies the app URL. Options also contains Settings, Feedback, and table help. The visible Leave seat button disconnects and returns to the join screen.

Vite proxies `/ws` to port 8000. To use another backend address, copy `frontend/.env.example` to `frontend/.env.development.local` and set `VITE_WS_URL` (for example, `ws://127.0.0.1:8001/ws`), then run Uvicorn on that port. A localhost invitation works only on the same machine; remote friends need a reachable hosted address.

## Experimental voice controls

On the experimental voice branch, use **Voice off** in the table header to opt in.
Keep the page visible. Say **check**, **call**, **fold**, **raise 50**, **raise half pot**,
**raise pot**, **raise minimum**, **bet 50**, or **all in**. Numeric amounts are the
street total in the displayed denomination. Say **confirm** for a proposed raise,
all-in call, or free fold; **cancel** discards it. Recognition stops outside your
turn. Errors leave the buttons available. Your browser may process audio through
its speech service; browser support and permissions vary. Voice starts off each
visit, and returning from Settings requires enabling it again. This experiment
has visual feedback, not spoken table narration or guaranteed lock-screen support.

Run parser checks with `cd frontend && node --test tests/voice.test.mjs`.
For simulated speech lifecycle checks, open `/tests/voice-harness.html` on the local
Vite server. The harness uses the real backend and real player identity, so use
only an isolated test backend. Its input emits synthetic transcripts, not audio.

## Gameplay

- Start with 1,000 play chips; blinds are 5/10. Click your nameplate to set your own total stack, including a rebuy. During play, your total and any shared settings edits queue for the next hand. Payouts settle first. Between hands, edits apply immediately.
- **2–7 offsuit game.** In Options → Settings, set **Bonus per opponent**. Zero turns the game off. A player holding an offsuit seven and two earns the bonus when everyone else folds or when they win the main pot outright on every runout. Their cards are shown. Each other player dealt into that hand pays the configured amount once, up to their stack after pot awards.
- **Turn timer.** Options → Settings sets the decision limit (20 seconds by default, 1–600 seconds, blank or zero for no limit). Expiry checks if allowed, otherwise folds. In-hand timer edits apply next hand.
- **Pause / Resume.** Anyone seated can freeze play and its decision/runout timers. Resume preserves remaining decision time; between hands it starts a fresh result hold.
- **Away / I’m back.** Keep your seat and stack while skipping future deals and blinds. During an existing hand, Away automatically checks for free or folds when facing a bet. Returning takes effect for the next deal if you were not dealt in. All-in hands remain eligible.
- The dealer rotates between eligible players. Heads-up, the dealer posts the small blind and acts first preflop, last postflop.
- **Raise to** is the total committed on the current betting street. The server checks turns, minimum raises, available chips, and whether short all-ins reopen betting.
- All-in players skip further actions. When no further betting is possible, the board runs out automatically. Main/side pots split by eligibility and hand rank; odd chips go clockwise starting left of the dealer. Uncalled excess is returned.
- A completed hand stays visible for five seconds before the next automatic deal, provided two connected, non-away players have chips and the table is not paused. There is no mid-hand restart.
- When all-in betting closes before the river, everyone still in the hand chooses **Run once** or **Run twice**. Two runs require unanimous agreement within 20 seconds; one-run votes, timeouts, or a disconnected contender mean one run. Existing community cards are shared, each pot is split between runs, and the boards reveal sequentially before the combined awards appear. Cards flip street by street at the recorded PokerNow cadence. All-in results remain visible for 6.1 seconds (once) or 8.1 seconds (twice) before the next deal.
- New arrivals wait for the next hand. Disconnecting during betting folds a player with chips; during a runout choice it settles once without folding; an all-in player remains eligible. Reload restores the same seat using its saved browser identity, but a hand already folded remains folded. Reconnecting the same token elsewhere replaces the old socket.
- Chat and the last 100 activity messages are shared by everyone at the table. After an all-in closes betting, remaining hands turn face up. At an ordinary showdown, the table automatically mucks beaten hands in show order. A fold win automatically shows the winner’s cards only for a 2–7 bonus. After any hand, you can show either hole card or choose **Show All Cards** before the next deal. Doing nothing keeps your hidden cards private.

## DynamoDB and budget alerts

Gameplay runs in memory by default. Optional DynamoDB storage saves the table
and its history together before players receive an update. On restart, the
backend refunds contributions from an unfinished hand and preserves completed
payouts. For local persistence, copy `backend/.env.example` to `backend/.env`,
set both table names to development tables, keep `POKER_ENVIRONMENT=development`,
and start the server with `python run.py`. The example defaults to memory-only
development. Use `POKER_ENVIRONMENT=test` for automated bots and `staging` for
a staging backend; invalid values fail startup. All persisted activity is labeled,
and non-production storage keys are isolated even if table names are shared.
The [operations guide](docs/architecture/operations.md) describes the
tables and budget alerts. AWS documents its [DynamoDB free tier](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)
and [budget alert limitations](https://docs.aws.amazon.com/cost-management/latest/userguide/bcm-lite-use-budget.html).

## Exporting history

The [history export CLI](backend/export_history.py) lets authorized operators
review sessions, hands, player results, system events, and private feedback.
Hand and session exports contain private cards and deck order. Select the activity
explicitly, for example (from `backend/`, with the target table names configured):

```sh
./venv/bin/python export_history.py --environment production --sessions --output production-sessions.json
./venv/bin/python export_history.py --environment test --player PLAYER_ID --output test-player.json
```

Without `--environment`, exports use `POKER_ENVIRONMENT` (default `development`).
Production analytics exclude test/development activity and unlabeled older records.
To audit old data, add `--include-legacy --environment production`; those records
are labeled `legacy` and included in totals only when requested. Existing records
cannot reliably distinguish past tests from real play and are left intact.
Run bots against a separate test backend: actions sent to the production backend
are production activity regardless of nickname or browser.

## Checks

```sh
cd backend
./venv/bin/python -m unittest discover -s tests -v
```

```sh
cd frontend
npm ci
npm run lint
npm run build
```

GitHub Actions runs the backend regression suite and frontend lint/build on pushes and pull requests. Tests cover complete hands, turn order, invalid requests, private cards, chip accounting, folded players, all-ins, ties, side pots, disconnects, sessions, the single shared game, and randomized legal play.

### Seating checks

Click an empty numbered seat to move, or a player's nameplate to open the kick
confirmation. Anyone seated can remove another player. Both actions are available
between hands. Kicking cashes out the player and returns them to the join screen;
they can join again manually.

After installing the browser test dependencies below, run the isolated seating check:

```sh
PYTHONPATH=.artifacts/e2e/deps backend/venv/bin/python backend/e2e/seating_test.py
```

It uses local ports 18800 and 15173, in-memory game state, and disposable Chrome
profiles. The browser runners extend the automatic-deal delay to keep long setup
and seating checks deterministic, and start hands through the legacy protocol.
The backend settings tests cover the automatic first/next-hand timer. It checks moving, reconnecting, kicking, live-hand restrictions, and
desktop/mobile layouts; screenshots go to `.artifacts/seating/`.

### Browser end-to-end tests

After installing the normal backend and frontend dependencies, run from the
repository root:

```sh
backend/venv/bin/python -m pip install --upgrade --target .artifacts/e2e/deps -r backend/e2e/requirements.txt
PYTHONPATH=.artifacts/e2e/deps backend/venv/bin/python backend/e2e/browser_test.py
```

The runner uses installed Google Chrome on macOS, or Playwright Chromium elsewhere
(install it with `PYTHONPATH=.artifacts/e2e/deps backend/venv/bin/python -m playwright install chromium`).
It starts the real frontend and backend on temporary ports, with a local Moto
DynamoDB emulator and disposable browser profiles. The runner sets `POKER_ENVIRONMENT=test`. AWS credentials and endpoints
are explicitly isolated; no live game data is changed. Backend and export
subprocesses use the existing `backend/venv` production dependencies, with the
test package path removed from their environment.

Coverage includes browser identity, chat, card privacy, rejected actions, a full
hand, all-ins/side pots with nine players, mobile layout/chat, process-crash recovery,
conditional-write failure, and permanent history/profit exports. Screenshots,
logs, and the passing-check report are written to the ignored `.artifacts/e2e/`
directory. Test services shut down on completion. This is Chromium browser testing
with mobile viewport simulation, not a physical-phone or real-AWS load test.

## Structure

- [Architecture guide](docs/architecture.md): a short system overview with focused module pages for implementation details. Update the guide alongside relevant code changes.
- `backend/game.py`: synchronous game rules and serializable player views.
- `backend/main.py`: WebSocket protocol, the game lock, sessions, bounded broadcasts, and `/health`.
- `backend/storage.py`: atomic DynamoDB checkpoints/history and restart recovery.
- `backend/archive.py`: private event schema, query records, and paginated reads.
- `backend/export_history.py`: authorized offline exports and player net-chip totals.
- `infra/`: CloudFormation table and monitoring budgets.
- `backend/tests/`: engine and in-process WebSocket integration tests.
- `frontend/src/App.tsx`: name entry, connection recovery, table, actions, and chat.
- `diagrams/`: original design sketches; the architecture guide describes the implemented system.

## Hosting and current limits

The live frontend is [larrypokernow.netlify.app](https://larrypokernow.netlify.app/).
Its backend is [headwins-poker.onrender.com](https://headwins-poker.onrender.com/health)
(Render service `headwins_poker`). The frontend's build-time `VITE_WS_URL` points
to `wss://headwins-poker.onrender.com/ws`. `ALLOWED_WS_ORIGINS` is currently unused
by the backend and is not an authoritative frontend address or an enforced
origin restriction.

Build the frontend with `npm run build` and serve `frontend/dist`. Proxy `/ws` to Uvicorn with WebSocket upgrade support, or supply an explicit `VITE_WS_URL` at build time. HTTPS pages require `wss://` connections. Set **`POKER_ENVIRONMENT=production` on the hosted backend before deploying this
version** to retain the existing production checkpoint and player identities.
The default development namespace opens a separate game. Run **one backend worker**: live gameplay is not coordinated between processes. `/health` returns `{"status":"ok"}` unless a persistence failure has stopped the game.

This implementation is for casual play-money games. Memory-only mode loses state on restart; DynamoDB mode recovers the saved table. Everyone who opens the app joins the same game; there is no room selection, password, or account system. Account authentication, a history/equity UI, distributed workers, and public-service abuse controls are separate work; no real-money settlement is implemented.
