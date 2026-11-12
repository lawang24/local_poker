import unittest

from game import Table
from storage import restore, snapshot


class LedgerTests(unittest.TestCase):
    def setUp(self):
        self.table = Table()
        self.a = self.table.join("Alice")
        self.b = self.table.join("Bob")

    def rows(self):
        return {r["id"]: r for r in self.table.state(self.b.id)["ledger"]}

    def test_payout_before_queued_edits_and_no_bets_counted_as_losses(self):
        self.table.start(self.a.id)
        self.table.act(self.table.actor, "raise", 50)
        self.table.set_stack(self.a.id, 1500)
        self.table.set_stack(self.a.id, 1400)
        self.assertEqual([r["net"] for r in self.rows().values()], [0, 0])
        self.assertEqual(self.rows()[self.a.id]["stack"], 1000)
        self.table.act(self.table.actor, "fold")
        row = self.rows()[self.a.id]
        self.assertEqual((row["buy_in"], row["buy_out"], row["stack"], row["net"]), (1390, 0, 1400, 10))
        self.assertEqual([m["amount"] for m in row["sessions"][0]["movements"]], [1000, 390])
        self.assertEqual(self.rows()[self.b.id]["net"], -10)

    def test_reentry_and_same_name_keep_their_own_transfers(self):
        self.table.disconnect(self.a.id)
        self.table.join("Alice", self.a.token)
        self.table.set_stack(self.a.id, 600)
        self.table.kick(self.b.id, self.a.id)
        former = self.rows()[self.a.id]
        self.assertEqual((former["buy_in"], former["buy_out"], former["stack"]), (1000, 1000, 0))
        self.assertIsNotNone(former["sessions"][0]["end"])
        replacement = self.table.join("Alice")
        self.table.join("Alice", self.a.token)
        row = self.rows()[self.a.id]
        self.assertEqual((row["buy_in"], row["buy_out"], row["stack"], row["net"]), (2000, 1000, 1000, 0))
        self.assertEqual(len(row["sessions"]), 2)
        self.assertEqual(self.rows()[replacement.id]["buy_in"], 1000)
        self.assertEqual(self.table.state(self.a.id)["ledger"], self.table.state(self.b.id)["ledger"])

    def test_pruning_and_new_session_boundaries(self):
        self.table.disconnect(self.a.id)
        self.table.join("Charlie")
        self.assertEqual(self.rows()[self.a.id]["buy_out"], 1000)
        for player in list(self.table.players):
            self.table.disconnect(player.id)
        self.table.join("Bob", self.b.token)
        self.assertEqual(list(self.rows()), [self.b.id])
        self.assertEqual(self.rows()[self.b.id]["buy_out"], 0)

    def test_restart_begins_with_refunded_balance(self):
        self.table.start(self.a.id)
        self.table.set_stack(self.b.id, 1300)
        self.table = restore(snapshot(self.table))
        self.table.join("Bob", self.b.token)
        row = self.rows()[self.b.id]
        self.assertEqual((row["buy_in"], row["buy_out"], row["stack"], row["net"]), (1300, 0, 1300, 0))
