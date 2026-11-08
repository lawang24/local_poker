import unittest

from game import Table
from storage import restore, snapshot


class SevenDeuceTests(unittest.TestCase):
    def table(self, amount=25):
        t = Table()
        for name in ("Alice", "Bob", "Chris"):
            t.join(name)
        t.set_settings(t.players[0].id, 5, 10, None, False, amount)
        return t

    def test_fold_win_collects_only_from_dealt_players_and_survives_recovery(self):
        t = self.table()
        a, b, c = t.players
        t.set_stack(b.id, 10)
        t.start(a.id)
        c.hand = ["2s", "7h"]
        observer = t.join("Next hand")
        t.disconnect(a.id)
        t.act(b.id, "fold")
        result = t.state(observer.id)["result"]
        self.assertEqual(result["hands"], {c.id: c.hand})
        self.assertEqual(result["payouts"][c.id], 15)
        self.assertEqual(result["seven_deuce_bonus"], {
            "winner": c.id, "payments": {a.id: 25, b.id: 5}, "total": 30,
        })
        self.assertEqual([p.stack for p in t.players], [975, 0, 1035, 1000])
        self.assertEqual(t.events[-1]["net"], {a.id: -25, b.id: -10, c.id: 35})
        recovered = restore(snapshot(t))
        self.assertEqual(recovered.result, result)
        self.assertEqual([p.stack for p in recovered.players], [975, 0, 1035, 1000])

    def test_suited_other_ranks_and_disabled_game_keep_fold_wins_private(self):
        for cards, amount in [("7s 2s", 25), ("7s 3h", 25), ("7s 2h", 0)]:
            with self.subTest(cards=cards, amount=amount):
                t = self.table(amount)
                a, b, c = t.players
                t.start(a.id)
                c.hand = cards.split()
                t.act(a.id, "fold")
                t.act(b.id, "fold")
                self.assertEqual(t.result["hands"], {})
                self.assertIsNone(t.result["seven_deuce_bonus"])
                self.assertEqual(c.stack, 1005)

    def test_showdown_main_pot_decides_once_across_boards_and_side_pots(self):
        first = "7c 7d 6c Kc 9s".split()
        sweep = "7s 2c 2d 4s 5d".split()
        split = "3c 4d Jh Qs Kd".split()
        tie = "Ts Js Qs Ks As".split()
        for boards, wins in [([first], True), ([first, sweep], True),
                             ([first, split], False), ([tie], False), ([split], False)]:
            with self.subTest(boards=boards):
                t = self.table()
                a, b, c = t.players
                # Alice is all-in for 50; Bob and Chris contest a side pot.
                for p, stack in zip(t.players, (50, 100, 200)):
                    t.set_stack(p.id, stack)
                t.start(a.id)
                for p, hand in zip(t.players, ("7h 2s", "Ah Ad", "Kh Qh")):
                    p.hand = hand.split()
                    t.pay(p, p.stack)
                t.finish(boards)
                bonus = t.result["seven_deuce_bonus"]
                if wins:
                    self.assertEqual(bonus, {"winner": a.id, "payments": {b.id: 25, c.id: 25}, "total": 50})
                else:
                    self.assertIsNone(bonus)
                self.assertEqual(sum(t.result["payouts"].values()), 350)
                self.assertEqual(sum(p.stack for p in t.players), 350)
                self.assertEqual(t.events[-1]["net"], {
                    p.id: p.stack - opening for p, opening in zip(t.players, (50, 100, 200))
                })

    def test_winning_only_a_side_pot_or_getting_uncalled_chips_back_does_not_qualify(self):
        for board, expected in [("Qc 7c 2d 3s 9s", 200), ("Qc As Ad 3s 9s", 100)]:
            with self.subTest(board=board):
                t = self.table()
                a, b, c = t.players
                for p, stack in zip(t.players, (50, 100, 200)):
                    t.set_stack(p.id, stack)
                t.start(a.id)
                for p, cards in zip(t.players, ("Qh Qd", "Ks Jh", "2s 7h")):
                    p.hand = cards.split()
                    t.pay(p, p.stack)
                t.finish([board.split()])
                self.assertEqual(t.result["payouts"][c.id], expected)
                self.assertIsNone(t.result["seven_deuce_bonus"])
