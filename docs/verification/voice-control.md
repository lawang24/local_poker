# Experimental voice control verification

Branch: `codex/experimental-voice-control`. Existing and concurrently edited
working-tree changes were preserved; this feature was not deployed.

## References and scope

Inspected `references/pokernow/desktop.mov` at 0:10 for the desktop toolbar,
seats and action row, and `references/pokernow/phone.mov` at 1:00 for portrait
layout. The phone recording shows a 440 × 956 emulator setting; recording image
scaling is not a CSS-pixel measurement. The 0:10 phone frame shows another app,
so it was not used for layout comparison. Voice is a new experimental interaction;
these references do not establish voice parity. No live PokerNow fallback used.

## Automated and browser checks

- `cd frontend && node --test tests/voice.test.mjs`: five passing test groups,
  including exact commands, invalid actions, integer/cents amounts, spelled-out
  numbers, pot sizing after calling, short all-ins, and turn restrictions.
- `npm --prefix frontend run lint` and `npm --prefix frontend run build`: pass.
- `git diff --check`: pass.
- Embedded browser only. Real Vite frontend on ports 15183/15184, isolated backend
  on 18831, `POKER_ENVIRONMENT=test`, no DynamoDB tables and no persisted records.
  There are consequently no persisted environment labels to audit. Production
  was not contacted. Decision timers disabled in the test backend for deterministic
  UI-driven play; automatic dealing and normal settlement remained enabled.
- Three separate browser origins/identities: Voice Alice, Voice Bob, Voice Cara.
  Measured desktop 1440 × 900 and phone portrait 440 × 956 CSS pixels. A failed
  127.0.0.2 navigation was replaced with a separate loopback port.
- Six completed hands total. Hand 1 was heads-up while Cara joined; hand 3
  exercised a reload/disconnect fold. Hands 2, 4, 5 and 6 were full three-player
  preflop/flop/turn/river/showdown games driven through visible controls, including
  simulated speech controls. Desktop and phone views were inspected together.
- Hand 2: 30-chip payout to Cara; final Alice/Bob/Cara stacks 980/1000/1020.
- Hand 4: voiced half-pot preflop raise to 23; 69-chip payout to Bob; final stacks
  952/1061/987. All three views agreed and pot returned to zero.
- Hand 5: 30-chip payout to Cara; final stacks 942/1051/1007.
- Final hand 6, after the last application changes: phone voice “raise fifty”,
  confirmation, calls and checks through every street; 150-chip payout to Alice;
  final stacks 1042/1001/957, conserved total 3000, pot zero in all three views.
  Next automatic deal observed as hand 7. Prior next deals were also observed.
- Speech harness uses the real app/backend but synthetic final transcripts.
  Verified zero recognizer starts outside the turn, starts only when eligible,
  stop after submission, duplicate confirm ignored, invalid check rejected,
  cancellation, pause clearing a proposed raise, resume requiring a new proposal,
  and simulated denied permission disabling voice while retaining manual buttons.
- Both numeric and spoken-number raises were exercised. Phone confirmation/status
  stayed above the table, clear of seats. Desktop microphone initially overlapped
  a seat; moved to the header and rechecked. Active and winner highlights, made-hand
  labels, hidden opponent cards and settled stacks were visible during play.
- Phone chat submission displayed at the sending seat. Desktop bet editor opened
  and cancelled correctly. Options help was expanded and verified. No physical
  phone keyboard was available; mobile bet-keyboard interaction was not retested.

## Limits and handoff

The embedded browser exposes SpeechRecognition but a real service start stayed at
“Starting voice…” without a recognized result. It was stopped. Therefore actual
microphone recognition is **not verified**; the synthetic harness establishes
command handling and lifecycle, not audio accuracy. Test real AirPods on a supported
browser before relying on this experiment. Gym noise, accents, microphone routing,
permission retention across visits, background/locked-phone behavior, and physical
phone keyboard behavior remain unverified. This feature provides visual feedback;
it does not narrate the game aloud.

The architecture overview and links were reviewed; the browser architecture guide
and README now describe the implemented feature and its limits. Normal previews
remain running and open, with voice disabled: http://127.0.0.1:15183/ and
http://127.0.0.1:15184/. The former shows Options with voice help expanded.
Screenshots are local ignored artifacts at `.artifacts/voice/desktop.jpg` and
`.artifacts/voice/mobile.jpg`.
