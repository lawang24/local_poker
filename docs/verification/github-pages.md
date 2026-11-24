# GitHub Pages deployment verification

Verified November 24, 2026 against an isolated in-memory backend with
`POKER_ENVIRONMENT=test` and both DynamoDB table settings empty. No production
hands or persistent records were created. The decision timer was disabled locally
to allow browser inspection; the normal automatic-deal timing was retained.

The deployment-only change adds a workflow and documentation. Application source,
styles, and Netlify configuration are unchanged. The Pages build uses
`/local_poker/`; the separate Netlify build retains `/`. Both build successfully
after `npm ci`, and frontend lint passes. Generated HTML points to the correct
JavaScript, stylesheet, and favicon paths in both builds.

Three embedded-browser identities used separate loopback ports serving the same
Pages build and connecting to one test backend. Primary desktop verification used
1440×900 CSS pixels, the second player used 1280×720, and primary phone verification
used 390×844. Two hands were driven through visible Call/Check controls, from
automatic preflop deal through flop, turn, river, showdown, and payout.

| Hand | Primary layout | Pot awarded | Final stacks: Alice / Bob / Carol | Following automatic deal |
| --- | --- | --- | --- | --- |
| 1 | Desktop | 30 to Bob | 990 / 1,020 / 990 | Hand 2 observed |
| 2 | Phone | 30 to Alice | 1,010 / 1,010 / 980 | Hand 3 observed |

All player views agreed on settled stacks, totaling 3,000 chips. Winners and made
hands were visible; opponents' private and mucked cards stayed hidden. The game
was briefly paused after each payout to inspect all views, then resumed to verify
the next automatic deal. Reloading the phone's repository-path URL restored its
identity and connected table. No broken images or horizontal page overflow were
observed at 390×844. The local preview remains available with the third hand paused.

Coverage limits: these were simulated viewports, not a physical phone or software
keyboard test. Hosting introduces no PokerNow UI or interaction changes, so no new
recording parity claim is made. Chat, bet-editor keyboard behavior, settings edits,
and exact visual parity are outside this deployment check. Production verification
is limited to loading the two public join screens, without seating production bots.
