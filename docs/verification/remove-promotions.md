# Remove PokerNow promotions

Verified November 24, 2026. Removed the shared Poker Club advertisement and
external link from the desktop chat dock and phone chat sheet, plus unused CSS.
No other external promotional links were found in the frontend source.

Inspected `references/pokernow/desktop.mov` at 01:40 and
`references/pokernow/phone.mov` at 01:00 before editing. Desktop establishes the
promotion beside Log / Ledger and the lower chat placement; the sampled phone
frame establishes portrait table geometry but does not show the open chat sheet.
The removal intentionally differs from the reference advertising. Exact overall
UI parity and the reference chat opening/closing timing remain unverified;
recording pixel sizes were not treated as CSS dimensions.

Build and ESLint passed. Architecture overview and browser guide reviewed;
responsibilities, application flows, and state ownership remain accurate, so no
architecture edit was necessary.

## Embedded-browser verification

Used the real Vite frontend on ports 18943/18944 and a dedicated memory-only
backend on 18942, with `POKER_ENVIRONMENT=test` and both DynamoDB table variables
empty. No persistent records or production hands were created. Three independent
browser identities used separate origins; calls and checks used visible buttons.

- Desktop: actual viewport 1280 × 720 CSS pixels for all three players. Hand 1
  completed preflop, flop, turn, river, showdown and payout. Cara won the 30-chip
  pot; resulting balances Alice 990, Bob 990, Cara 1,020. Pot returned to zero
  and automatic hand 2 appeared with the expected blind deductions.
- Phone: all three views at 440 × 956 CSS pixels. Hand 3 completed every street,
  showdown and payout. Alice won 30 with a full house; balances Alice 1,000,
  Bob 980, Cara 1,020 agreed across all three views. Opponents' mucked hands
  stayed hidden. Pot returned to zero and automatic hand 4 appeared.
- Hand 2 ended through disconnection while changing browser viewports; it is
  excluded from full-street verification counts.
- Desktop chat submitted successfully and its seat bubble appeared. Phone chat
  submitted, retained its transcript, and dismissed via Escape. Measured seat
  coordinates were identical before opening and after sending. No horizontal
  overflow. Both views contained no external links or Poker Club promotion.
- Preview left running, paused at hand 4, with desktop and phone chat tabs open.
  Local screenshots: `.artifacts/remove-promos/desktop.jpg` and `mobile.jpg`.

Coverage limits: no physical phone keyboard, full nine-seat matrix, new bet-editor,
feedback-submission, or queued-settings regression. This change only removes
promotional markup and its styling.
