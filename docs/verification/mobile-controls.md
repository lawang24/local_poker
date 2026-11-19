# Short-phone control layout

Reference remains phone.mov 0:05 / 1:00 (440 × 956 emulator) and desktop.mov
0:05 / 2:00 (unknown CSS size), inspected during the original toolbar change.
The recordings do not establish the SE layout. Short-phone adaptation is local:
Chat/Log share a 44px-high horizontal row below the lower seats when viewport
height is at most 760px. Tall-phone reference layout is preserved. Landscape puts
Chat/Log in the bottom action lane, with betting controls beside them.

Before the fix, Chat/Log overlapped seat 2's nameplate at 320×568, 375×667,
375×548 and 360×640. Landscape's toolbar was still in flex flow with height 100%,
pushing the table below the screen. The toolbar is now an absolute overlay at
all mobile widths. Short-landscape personal buttons are shorter to clear seat 4.

## Size matrix

Codex embedded browser, actual document CSS dimensions measured during a live
three-player hand with Call/Raise/Fold visible:

| Portrait | Landscape |
| --- | --- |
| 320×568 | 667×375 |
| 360×640 | 740×360 |
| 360×740 | 844×390 |
| 375×548 | 896×414 |
| 375×667 | |
| 375×812 | |
| 390×844 | |
| 393×852 | |
| 412×915 | |
| 414×736 | |
| 414×896 | |
| 430×932 | |
| 440×956 | |

All 17 sizes: no document overflow, no clipped toolbar/action buttons, and no
intersections between those controls and the three occupied player nameplates.
Visual checks included SE portrait and landscape, original SE 320×568, reduced
height 375×548, and 414×736. This is three-player coverage, not nine occupied seats.

## Gameplay and input

Fresh isolated memory-only backend 127.0.0.1:8014, POKER_ENVIRONMENT=test,
DynamoDB table names empty. No persisted records/environment labels exist.
Production untouched. Frontends 5184/5185 explicitly target this backend; three
origins give each bot a separate identity.

- All three bots at 375×667: hand 1 raised to 20, then called/checked through
  preflop/flop/turn/river/showdown. Alice won 60, stacks 1040/980/980, pot zero.
- All three bots at 1440×900: hand 2 called/checked through all streets and
  showdown. Alice won 30, stacks 1060/970/970, pot zero.
- Payouts/stacks agreed in all three player views; total chips 3000.
- Next automatic deals verified. Active and winning highlights, made-hand
  labels and hidden opponent cards inspected; Bob's mucked hand stayed private
  after hand 2.
- SE bet editor submitted a raise; chat submitted and showed its sender-seat
  bubble. Table bounds stayed exactly [0,0,375,667] before/after chat submission.
  Bottom-seat stack and bet stayed readable.
- Log and Feedback opened/closed at 320×568. Feedback actions fit onscreen;
  no feedback submission because the backend has no durable feedback store.
- Physical iPhone keyboard/safe-area behavior remains unverified. 375×548 tests
  reduced layout height, not a physical keyboard simulation.

Frontend build, ESLint, and git diff whitespace checks passed. Architecture guide
updated to describe compact utilities and absolute mobile toolbar ownership.
