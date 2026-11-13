import assert from "node:assert/strict";
import { test } from "node:test";
import { payoutBalance } from "../src/payoutDisplay.ts";

const state = {
  street: "complete", cents: false,
  result: { cents: false, payouts: { larry: 3000, lar: 1000 },
    stacks_before_payout: { larry: 0, lar: 200 } },
};

test("recorded win and tied run show the residual balance beside gross awards", () => {
  assert.equal(payoutBalance({ id: "larry", stack: 3000 }, state), 0);
  assert.equal(payoutBalance({ id: "lar", stack: 1200 }, state), 200);
  assert.equal(state.result.payouts.larry, 3000);
  assert.equal(state.result.payouts.lar, 1000);
});

test("stack edits, bonus transfers, and changed denominations retain current balances", () => {
  assert.equal(payoutBalance({ id: "larry", stack: 750 }, state), 750);
  assert.equal(payoutBalance({ id: "larry", stack: 3050 }, state), 3050);
  assert.equal(payoutBalance({ id: "lar", stack: 1150 }, state), 1150);
  assert.equal(payoutBalance({ id: "lar", stack: 1200 }, { ...state, cents: true }), 1200);
});

test("old checkpoints and the next deal never fabricate a pre-award balance", () => {
  const player = { id: "larry", stack: 3000 };
  const legacy = { ...state, result: { payouts: { larry: 3000 } } };
  assert.equal(payoutBalance(player, legacy), 3000);
  assert.equal(payoutBalance(player, { ...state, result: null }), 3000);
  assert.equal(payoutBalance(player, { ...state, street: "preflop" }), 3000);
  assert.equal(payoutBalance({ id: "other", stack: 800 }, state), 800);
});
