"""The recorded gross award is presentation, separate from net/stack accounting."""
from copy import deepcopy
import unittest

from game import Table
from storage import restore, snapshot


def recorded_hand():
    t = Table()
    larry = t.join("Larry")
    lar = t.join("Lar")
    t.set_stack(lar.id, 2200)
    t.set_stack(larry.id, 2000)
    t.start(larry.id)
    # State after the recorded 200-chip unmatched return, before awards.
    for p, hand, balance in ((larry, "9h 7s", 0), (lar, "8c 3d", 200)):
        p.hand = hand.split()
        p.stack, p.contribution, p.committed = balance, 2000, 0
    t.pot = 4000
    boards = ["5s Ac 3h 7h Qs".split(), "Ad Ah Jh Qh Qc".split()]
    t.board = boards[0]
    return t, larry, lar, boards


class PayoutDisplayTests(unittest.TestCase):
    def test_recorded_win_then_tie_aggregates_gross_awards(self):
        t, larry, lar, boards = recorded_hand()
        t.finish(boards)
        self.assertEqual(t.result["payouts"], {larry.id: 3000, lar.id: 1000})
        self.assertEqual(t.result["runouts"][0]["payouts"], {larry.id: 2000})
        self.assertEqual(t.result["runouts"][1]["payouts"], {larry.id: 1000, lar.id: 1000})
        self.assertEqual(t.result["stacks_before_payout"], {larry.id: 0, lar.id: 200})
        self.assertEqual([p.stack for p in t.players], [3000, 1200])
        self.assertEqual(t.pot, 0)
        completed = next(e for e in t.events if e["type"] == "hand_completed")
        self.assertEqual(completed["net"], {larry.id: 1000, lar.id: -1000})
        self.assertEqual(restore(snapshot(t)).result, t.result)
        for p in t.players:
            self.assertEqual(t.state(p.id)["result"]["stacks_before_payout"],
                             {larry.id: 0, lar.id: 200})
        t.start(larry.id)
        self.assertIsNone(t.result)
        self.assertEqual(sum(p.stack + p.contribution for p in t.players), 4200)

    def test_queued_edits_do_not_rewrite_result_or_net(self):
        t, larry, lar, boards = recorded_hand()
        t.set_stack(larry.id, 750)
        t.set_settings(lar.id, 10, 20, None, True)
        t.finish(boards)
        self.assertEqual(larry.stack, 750)
        self.assertTrue(t.cents)
        self.assertFalse(t.result["cents"])
        self.assertEqual(t.result["stacks_before_payout"], {larry.id: 0, lar.id: 200})
        self.assertEqual(t.result["payouts"], {larry.id: 3000, lar.id: 1000})
        completed = next(e for e in t.events if e["type"] == "hand_completed")
        self.assertEqual(completed["net"], {larry.id: 1000, lar.id: -1000})
        result = deepcopy(t.result)
        t.set_stack(lar.id, 500)
        self.assertEqual(t.result, result)
