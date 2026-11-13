import type { Player, State } from "./types";

// PokerNow shows the remaining balance beside the gross award during results.
// Use a server snapshot, never subtract from a possibly edited current stack.
export function payoutBalance(player: Player, state: State): number {
  const result = state.result;
  const payout = result?.payouts[player.id] ?? 0;
  const before = result?.stacks_before_payout?.[player.id];
  return state.street === "complete" && payout > 0 && before !== undefined
    && before + payout === player.stack
    && (result?.cents ?? state.cents) === state.cents
    ? before : player.stack;
}
