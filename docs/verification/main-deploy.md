# Main deployment verification

Verified November 24, 2026. The combined `main` includes the existing game/UI
commits and GitHub Pages workflow. `netlify.toml` now builds every push to `main`
and skips other branches; its ignore command was checked with both branch values.
The repository-local `AGENTS.md` requires work directly on `main` and preserves
other chats' uncommitted changes. That file remains locally excluded from Git.

A clean archived checkout passed `npm ci`, frontend lint, root-path and
`/local_poker/` builds. All 136 backend unit tests passed. The operations guide
and README describe both deployment paths and their shared production backend.

The combined frontend was served under `/local_poker/` against a separate
memory-only backend on port 18025 with `POKER_ENVIRONMENT=test` and both DynamoDB
table settings empty. No production hands or persisted records were created.
Three browser identities used separate loopback ports. The local decision timer
was disabled through Settings. Visible Call/Check controls drove automatic deals
through preflop, flop, turn, river, showdown and payout.

| Hand | Primary viewport (CSS pixels) | Payout | Settled Alice / Bob / Carol |
| --- | --- | --- | --- |
| 1 | Desktop 1440 × 900 | 30 to Bob | 990 / 1020 / 990 |
| 2 | Phone 390 × 844 | 30 to Bob | 980 / 1040 / 980 |

All three views agreed on settled balances, conserving 3000 chips. Opponents'
hidden cards stayed hidden before showdown, and Carol's mucked first hand
remained hidden from Alice. Automatic hand 2 followed desktop payout; automatic
hand 3 followed phone payout. The phone had no horizontal overflow. The previews
remain running for inspection.

This change configures deployment without modifying UI behavior or styling.
It does not establish new exact PokerNow parity. Physical phone keyboards,
chat/input movement, full-table layouts, and in-hand settings edits were not
retested here. Existing reference and layout verification records cover earlier
UI changes; these deployment checks do not extend that coverage.
