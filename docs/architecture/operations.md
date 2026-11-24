# Operations: hosting and verification

[Architecture overview](../architecture.md)

The UI and backend are served separately. One backend process owns the live
table; optional DynamoDB storage provides restart recovery and permanent history. Setup and deployment
commands live in the [README](../../README.md).

## Serving the app

The frontend is a static Vite build; FastAPI runs separately under Uvicorn.
The browser reaches the backend through a WebSocket-capable proxy or a configured
backend address. Gameplay and private feedback use separate connections to the
same backend. HTTPS pages use secure WebSockets. During development, the
[Vite configuration](../../frontend/vite.config.ts) provides the proxy.
The current frontend/backend addresses are recorded in the
[hosting instructions](../../README.md#hosting-and-current-limits).
Netlify and GitHub Pages automatically deploy pushes to `main`, the repository's
only development and deployment branch. The
[Pages workflow](../../.github/workflows/pages.yml) builds `main`
with the base path supplied by Pages and an explicit production WebSocket URL;
Netlify uses the repository's [build configuration](../../netlify.toml) for the
root-path build and explicitly builds every `main` update, including changes
outside the frontend directory. Other branches are skipped.
Both reach the same backend and shared table.
Browser identities and preferences remain scoped to each site's origin.
Deployment does not copy the backend or expose its storage credentials.
The backend currently does not read or enforce `ALLOWED_WS_ORIGINS`; that
environment variable is not the source of truth for the frontend address.

The backend's environment selects its database tables and supplies its AWS
authentication. [Storage initialization](../../backend/storage.py) enables
persistence only when configured. Without it, gameplay runs in memory and
feedback is rejected. A healthy HTTP endpoint alone does not prove storage is
enabled; deployment verification must include a saved record.

Run **one backend worker**. The module-level
[GameServer](../../backend/main.py) owns the shared live table; separate workers
would create conflicting games. With persistence enabled, restarts recover
saved state. Rooms and distributed coordination are not implemented.

See the [README](../../README.md#hosting-and-current-limits) for deployment settings
and commands.

## Storage infrastructure

The [DynamoDB template](../../infra/dynamodb.yaml) provisions a bounded checkpoint
table and a growing history table. Capacity is fixed, with more write capacity
allocated to history. Transactions and duplicated query records increase write
consumption; exhausted capacity can throttle saves and stop play. Both tables
have deletion protection and are retained on infrastructure deletion or
replacement. History has no expiry; point-in-time backups are not enabled.

The [backend access template](../../infra/render-access.yaml) defines a dedicated
IAM identity that can read and write individual items on these two tables.
Its credential is supplied only to the backend, independently of developer
authentication. Browsers receive no AWS access. Authorized offline exports use
separate access to query private history.

Set `POKER_ENVIRONMENT=production` explicitly on the hosted game before deploying
this version; otherwise the safe development default opens a separate game.
Local previews default to development, and automated runners explicitly use test.
Each environment needs one backend writer and should use its own physical tables.
Environment-prefixed keys additionally isolate non-production checkpoints,
identities, feedback and archive partitions when table names are shared. Local development
uses memory-only mode or an isolated database emulator; running two backends
against the same checkpoint would trigger the version guard and stop play.
See [persistence](persistence.md) for recovery, migration, and failure behavior.

## Cost monitoring

The [budget template](../../infra/budgets.yaml) monitors project-tagged spending
and account-wide DynamoDB spending. Alerts exclude credits and refunds so those
do not hide usage charges. These notifications do not cap spending or stop
services. Thresholds live in the template; setup and pricing references live in
the [README](../../README.md#dynamodb-and-budget-alerts).

## Verification workflow

[Engine tests](../../backend/tests/test_game.py) cover the game rules and privacy.
[Runout tests](../../backend/tests/test_runouts.py) exercise unanimous consent,
one-run fallback, timer cancellation, card integrity, side-pot accounting and
restart/reconnect behavior.
[API tests](../../backend/tests/test_api.py) exercise the WebSocket contract,
sessions, invalid messages, and the single shared game using in-process clients.
[Feedback tests](../../backend/tests/test_feedback.py) cover private persistence, reporter
attribution, validation, and failures without AWS access.
[Persistence tests](../../backend/tests/test_storage.py) cover recovery and storage
failure behavior without AWS access. CloudFormation templates are checked with
`cfn-lint`; live deployment is verified through stack events and table/budget
descriptions. [GitHub Actions](../../.github/workflows/checks.yml) runs the backend
suite and frontend clean-install/lint/build checks on pushes and pull requests.
The frontend [npm configuration](../../frontend/.npmrc) enables normal peer-dependency
resolution, overriding user-level legacy settings. Validate the committed lockfile
with `npm ci` before lint/build so local dependency checks match CI.
[History tests](../../backend/tests/test_history.py) validate event capture,
identity, accounting, migration, and transactional failure behavior offline.
[Payout display tests](../../backend/tests/test_payout_display.py) reproduce the
user-supplied run-it-twice recording and separate gross awards from net results.
The [frontend checks](../../frontend/tests/payoutDisplay.test.mjs) cover the
pre-award balance and safe fallbacks for stack edits, bonuses and legacy results.
The [reference record](../verification/payout-video.md) distinguishes visible
amounts from inferred per-run awards and documents browser coverage limits.

[Browser E2E tests](../../backend/e2e/browser_test.py) run the real Vite frontend
and Uvicorn backend through Playwright/Chrome, backed by a separate Moto DynamoDB
server. Each player has an isolated browser profile. The test runner strips AWS
settings, supplies fake credentials and a loopback DynamoDB endpoint, and uses
separate temporary ports, so it does not write to the deployed game or history.
The `--feedback-only` mode checks desktop/mobile dialogs, focus restoration, draft
retention, guest/player persistence, Settings access, and private feedback export.
Backend subprocesses keep their normal production dependencies. Tests cover
complete hands, edits during runout voting, nine-player side pots, browser identity, private cards, crash
recovery, transaction conflicts, chat bubbles on a second player’s screen, separation of chat from session log entries,
mobile chat focus after sending, bottom-seat position and bet readability
after a raise, and the private export CLI.
Artifacts go to ignored `.artifacts/e2e/`; services stop after the run. The emulator
does not reproduce AWS IAM, billing, throttling, or service latency, and mobile
viewports do not replace physical-device testing. Setup is in the
[README](../../README.md#browser-end-to-end-tests).

UI verification uses a separate memory-only backend (`DYNAMODB_TABLE` empty)
and an explicitly configured development WebSocket URL. The supplied local
[phone and desktop recordings](../../references/pokernow/README.md) are the primary
PokerNow reference. Inspect the relevant video before UI changes and cite its
filename and timestamps in verification notes. Compare equivalent game states
and orientations, matching CSS viewport dimensions when known; video resolution
alone does not establish CSS dimensions. Document unknown dimensions or scaling.
Check sparse and full tables, showdown card spacing, controls, chat, and reconnects
where the recordings cover them. Browser viewport overrides may be affected by
zoom, so verify `innerWidth` and `innerHeight`.
Use the live private table only for states or interactions absent from the videos.
These fallback checks reuse one private table across runs and viewport sizes,
resuming the same players and using an unseated identity for spectator checks.
The [project instructions](../../AGENTS.md) describe how to resume the table.
For live fallback comparisons, match CSS viewport sizes. Missing recordings or
unobserved states remain explicit coverage limits. Mobile keyboard behavior
requires physical-device validation.

The browser E2E runners extend the deal timer for deterministic seating and
recovery scenarios and use the legacy start command at controlled boundaries.
[Control tests](../../backend/tests/test_table_controls.py) verify automatic check/fold,
stale timer cancellation, pause/resume across betting and runouts, Away eligibility,
paused disconnect/removal, and checkpoint compatibility. Embedded-browser gameplay
checks use separate loopback origins for player identities and drive visible
controls against an isolated in-memory backend.
[Settings tests](../../backend/tests/test_settings.py) verify automatic first and
subsequent deals, queued rebuys that restore eligibility, restart refunds, and
persistence-failure guards. [Seating tests](../../backend/e2e/seating_test.py)
exercise both editors at mobile and desktop sizes, including replacement of an
accepted edit while a hand is running.

[Runout timing tests](../../backend/tests/test_runout_timing.py) advance a virtual
clock across every face and settlement boundary, checking privacy, chip
conservation, disconnects, restart refunds, queued edits and scheduler cancellation.
The [recording comparison](../verification/runout-timing.md) gives measured video
offsets and embedded-browser gameplay coverage. Full once/twice hands must also
be driven through visible controls on phone and desktop, including payout and
the next automatic deal; unit timings alone do not establish visual parity.

## Keeping this guide current

This guide describes the implemented system. The Excalidraw files in
[`diagrams/`](../../diagrams/) are original design sketches and may differ from it.
Review the architecture documentation with each code change and update affected
explanations in the same change. Keep the
overview conceptual and implementation details in the relevant module page.
CI does not automatically verify documentation accuracy.
