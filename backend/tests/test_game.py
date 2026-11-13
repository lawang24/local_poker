import json
import random
import unittest
from game import Table, InvalidAction, made_hand
from runout_helpers import finish_runout


class PokerTests(unittest.TestCase):
    def table(self, stacks=(100, 100, 100)):
        t = Table()
        for i, stack in enumerate(stacks):
            t.join(f"Player {i}").stack = stack
        return t

    def total(self, t):
        return sum(p.stack for p in t.players) + t.pot

    def test_made_hand_categories(self):
        for cards, label in [
            ("As 2h 9h 7h 3h", "High card"),  # Four hearts are only a draw.
            ("As 2h 9h 7h 2d", "Pair (2)"), ("As 2h Ad 2d 3h", "Two pair (A,2)"),
            ("As 2h Ad 2d Ts Th 3h", "Two pair (A,10)"),
            ("As 2h Ad Ac 3h", "Three of a kind"),
            ("As 2h 3d 4s 5h", "Straight"), ("As 2s 9s 7s 3s", "Flush"),
            ("As 2h Ad 2d Ah", "Full house"), ("As 2h Ad Ac Ah", "Four of a kind"),
            ("As 2s 3s 4s 5s", "Straight flush"),
            ("2h 3h As Ks Qs Js Ts", "Royal flush"),  # Both hole cards play no part.
        ]:
            with self.subTest(cards=cards):
                hole, board = cards.split()[:2], cards.split()[2:]
                self.assertEqual(made_hand(hole, board), label)

    def test_strength_is_per_viewer_and_per_board(self):
        t = self.table((100, 100))
        a, b = t.players
        self.assertEqual(t.state(a.id)["hand_strengths"], [])
        t.start(a.id)
        self.assertEqual(t.state(a.id)["hand_strengths"], [])
        a.hand, b.hand = ["Ah", "Ad"], ["Ks", "Qd"]
        t.board = ["Kh", "Kd", "5c"]
        self.assertEqual(t.state(a.id)["hand_strengths"], ["Two pair (A,K)"])
        self.assertEqual(t.state(b.id)["hand_strengths"], ["Three of a kind"])
        self.assertEqual(t.state(a.id)["shown_hand_strengths"], {})
        self.assertTrue(all("hand_strengths" not in p for p in t.state(a.id)["players"]))
        t.finish([t.board + ["2d", "3s"], t.board + ["Ac", "3h"]])
        self.assertEqual(t.state(a.id)["hand_strengths"], ["Two pair (A,K)", "Full house"])
        t.start(a.id)
        t.act(t.actor, "fold")
        folded = next(p for p in t.players if p.folded)
        self.assertEqual(t.state(folded.id)["hand_strengths"], [])

    def test_labels_follow_public_reveals(self):
        t = self.table((100, 100))
        a, b = t.players
        t.start(a.id)
        t.act(a.id, "check_call")
        t.act(b.id, "check_call")
        t.act(b.id, "fold")

        def view():
            return t.state(a.id)["shown_hand_strengths"]

        self.assertEqual(view(), {})
        t.reveal_cards(b.id, t.hand_number, [1])
        self.assertEqual(view(), {})
        t.reveal_cards(b.id, t.hand_number, [0])
        self.assertEqual(view(), {b.id: [made_hand(b.hand, t.board)]})
        t.start(a.id)
        self.assertEqual(view(), {})

    def test_face_up_all_in_strengths_use_each_visible_board(self):
        t = self.table((100, 100))
        a, b = t.players
        t.start(a.id)
        t.act(a.id, "check_call")
        t.act(b.id, "check_call")
        t.act(b.id, "raise", b.stack)
        t.act(a.id, "check_call")
        for viewer in (a, b):
            self.assertEqual(t.state(viewer.id)["shown_hand_strengths"],
                             {p.id: [made_hand(p.hand, t.board)] for p in (a, b)})
        for p in (a, b):
            t.choose_runouts(p.id, 2, t.hand_id)
        finish_runout(t)
        boards = [run["board"] for run in t.result["runouts"]]
        self.assertEqual(t.state(b.id)["shown_hand_strengths"],
                         {p.id: [made_hand(p.hand, board) for board in boards] for p in (a, b)})

    def test_blinds_and_positions(self):
        t = self.table()
        t.start(t.players[0].id)
        a, b, c = t.players
        self.assertEqual(t.dealer, a.id)
        self.assertEqual(t.actor, a.id)
        self.assertEqual([p.stack for p in t.players], [100, 95, 90])
        self.assertEqual(t.pot, 15)
        self.assertEqual(self.total(t), 300)

    def test_heads_up_and_dealer_rotation(self):
        t = self.table((100, 100))
        a, b = t.players
        t.start(t.players[0].id)
        self.assertEqual(t.actor, a.id)
        self.assertEqual(a.committed, 5)
        t.act(a.id, "check_call")
        t.act(b.id, "check_call")
        self.assertEqual(t.street, "flop")
        self.assertEqual(t.actor, b.id)
        t.act(b.id, "fold")
        t.start(t.players[0].id)
        self.assertEqual(t.dealer, b.id)
        self.assertEqual(t.actor, b.id)

    def test_zero_and_single_player_start(self):
        for stacks in [(), (100,), (100, 0)]:
            t = self.table(stacks)
            with self.assertRaises(InvalidAction):
                t.start(t.players[0].id if t.players else None)
            self.assertEqual(t.street, "waiting")

    def test_full_hand_all_streets_and_big_blind_option(self):
        t = self.table()
        t.start(t.players[0].id)
        for _ in range(2):
            t.act(t.actor, "check_call")
        self.assertEqual(t.street, "preflop")
        t.act(t.actor, "check_call")
        for street, count in [("flop", 3), ("turn", 4), ("river", 5)]:
            self.assertEqual((t.street, len(t.board)), (street, count))
            for _ in range(3):
                t.act(t.actor, "check_call")
        self.assertEqual(t.street, "complete")
        self.assertEqual(self.total(t), 300)
        self.assertEqual(len(set(t.board + sum([p.hand for p in t.players], []))), 11)

    def test_out_of_turn_and_invalid_bets_are_atomic(self):
        t = self.table()
        t.start(t.players[0].id)
        before = t.state(t.actor)
        for action in ["fold", "check_call", "raise"]:
            with self.assertRaises(InvalidAction):
                t.act(t.players[1].id, action, 20)
        for value in [-1, 5, 11, 101, 1.5, True, "20", None]:
            with self.assertRaises(InvalidAction):
                t.act(t.actor, "raise", value)
            self.assertEqual(before, t.state(t.actor))

    def test_folded_player_never_gets_turn_again(self):
        t = self.table((200,) * 4)
        t.start(t.players[0].id)
        folded = t.actor
        t.act(folded, "fold")
        t.act(t.actor, "raise", 30)
        while t.running:
            self.assertNotEqual(t.actor, folded)
            t.act(t.actor, "check_call")
        self.assertEqual(self.total(t), 800)

    def test_last_fold_pays_and_waits(self):
        t = self.table((100, 100))
        t.start(t.players[0].id)
        t.act(t.actor, "fold")
        self.assertEqual(t.street, "complete")
        self.assertEqual(t.pot, 0)
        self.assertEqual(self.total(t), 200)
        self.assertEqual(t.hand_number, 1)
        self.assertEqual(t.result["hands"], {})

    def test_voluntary_reveals_are_additive_and_scoped_to_the_completed_hand(self):
        t = self.table((100, 100))
        a, b = t.players
        t.start(a.id)
        with self.assertRaises(InvalidAction):
            t.reveal_cards(a.id, t.hand_number, [0])
        t.act(a.id, "fold")
        observer = t.join("Observer")
        with self.assertRaises(InvalidAction):
            t.reveal_cards(observer.id, t.hand_number, [0])
        for invalid in (None, [], "both", [0, True], [2], [0, 0], [0, 1, 0]):
            with self.assertRaises(InvalidAction):
                t.reveal_cards(a.id, t.hand_number, invalid)
        self.assertEqual(t.result["hands"], {})

        t.reveal_cards(a.id, t.hand_number, [1])
        self.assertEqual(t.state(b.id)["result"]["hands"], {a.id: [a.hand[1]]})
        self.assertEqual(t.result["shown_indices"], {a.id: [1]})
        self.assertNotIn(json.dumps(a.hand[0]), json.dumps(t.state(b.id)))
        sequence = t.event_sequence
        t.reveal_cards(a.id, t.hand_number, [1])
        self.assertEqual(t.event_sequence, sequence)
        t.reveal_cards(b.id, t.hand_number, [0, 1])
        t.reveal_cards(a.id, t.hand_number, [0])
        self.assertEqual(t.state(observer.id)["result"]["hands"], {a.id: a.hand, b.id: b.hand})
        self.assertEqual(t.result["shown_indices"], {a.id: [0, 1], b.id: [0, 1]})
        old_number = t.hand_number
        t.start(a.id)
        while t.running:
            t.act(t.actor, "fold")
        with self.assertRaises(InvalidAction):
            t.reveal_cards(a.id, old_number, [0, 1])
        self.assertEqual(t.result["hands"], {})

    def test_show_order_and_automatic_muck(self):
        for river_action in ("checked", "bet", "reraised", "tie"):
            with self.subTest(river_action=river_action):
                t = self.table()
                a, b, c = t.players
                t.start(a.id)
                while t.street != "river":
                    t.act(t.actor, "check_call")
                t.board = "2c 3d 7h 8s 9c".split()
                a.hand, b.hand, c.hand = ["Qh", "Qd"], ["Ah", "Ad"], ["Kh", "Kd"]
                if river_action == "tie":
                    a.hand, b.hand = ["As", "Qc"], ["Ah", "Qd"]
                    c.hand = ["Js", "4d"]
                t.act(b.id, "check_call")
                if river_action in ("bet", "reraised"):
                    t.act(c.id, "raise", 10)
                if river_action == "reraised":
                    t.act(a.id, "raise", 20)
                while t.running:
                    t.act(t.actor, "check_call")
                expected = {"checked": [b], "bet": [c, b], "reraised": [a, b],
                            "tie": [b, a]}[river_action]
                for viewer in t.players:
                    state = t.state(viewer.id)
                    self.assertEqual(list(state["result"]["hands"]), [p.id for p in expected])
                    self.assertEqual(state["hand"], viewer.hand)

    def test_all_in_offers_runout_choice(self):
        t = self.table((5, 8))
        t.start(t.players[0].id)
        self.assertIsNotNone(t.runout_vote)
        t.choose_runouts(t.players[0].id, 1, t.hand_id)
        finish_runout(t)
        self.assertEqual(t.street, "complete")
        self.assertEqual(len(t.board), 5)
        self.assertEqual(self.total(t), 13)

    def test_short_big_blind_does_not_force_uncalled_chips(self):
        t = self.table((100, 8))
        t.start(t.players[0].id)
        self.assertEqual(t.state(t.actor)["call_amount"], 3)
        t.act(t.actor, "check_call")
        t.choose_runouts(t.players[0].id, 1, t.hand_id)
        finish_runout(t)
        self.assertEqual(t.street, "complete")
        self.assertEqual(self.total(t), 108)
        self.assertEqual(t.result["pots"][0]["amount"], 16)

    def test_short_all_in_does_not_reopen_raise(self):
        t = self.table((100, 15, 100))
        t.start(t.players[0].id)
        a, b, c = t.players
        t.act(a.id, "check_call")
        t.act(b.id, "raise", 15)
        t.act(c.id, "check_call")
        self.assertEqual(t.actor, a.id)
        self.assertFalse(t.state(a.id)["can_raise"])
        with self.assertRaises(InvalidAction):
            t.act(a.id, "raise", 30)
        t.act(a.id, "check_call")
        self.assertEqual(t.street, "flop")

    def test_cumulative_short_all_ins_reopen(self):
        t = self.table((15, 20, 100, 100))
        t.start(t.players[0].id)
        a, b, c, d = t.players
        self.assertEqual(t.actor, d.id)
        t.act(d.id, "check_call")
        t.act(a.id, "raise", 15)
        t.act(b.id, "raise", 20)
        t.act(c.id, "check_call")
        self.assertEqual(t.actor, d.id)
        self.assertTrue(t.state(d.id)["can_raise"])
        t.act(d.id, "raise", 30)

    def showdown(self, contributions, hands, board, folded=()):
        t = self.table((0,) * len(contributions))
        t.dealer = t.players[0].id
        t.board = board.split()
        t.street = "river"
        for i, (p, money, hand) in enumerate(zip(t.players, contributions, hands)):
            p.in_hand = True
            p.folded = i in folded
            p.contribution = money
            p.hand = hand.split()
        t.pot = sum(contributions)
        t.finish()
        self.assertEqual(self.total(t), sum(contributions))
        return t

    def test_main_and_side_pots_and_uncalled_return(self):
        t = self.showdown([50, 100, 200], ["Ah Ad", "Kh Kd", "Qh Qd"], "2c 3d 7h 8s 9c")
        self.assertEqual([p.stack for p in t.players], [150, 100, 100])

    def test_tie_and_odd_chip_left_of_dealer(self):
        t = self.showdown(
            [5, 5, 5], ["Ah Kd", "As Kc", "Qh Jd"], "2c 3d 7h 8s 9c", folded=(2,)
        )
        self.assertEqual([p.stack for p in t.players], [7, 8, 0])

    def test_board_plays(self):
        t = self.showdown([10, 10, 10], ["2h 3d", "4h 5d", "6h 7d"], "Ts Js Qs Ks As")
        self.assertEqual([p.stack for p in t.players], [10, 10, 10])

    def test_disconnect_and_reconnect(self):
        t = self.table()
        t.start(t.players[0].id)
        p = t.player(t.actor)
        t.disconnect(p.id)
        self.assertTrue(p.folded)
        self.assertNotEqual(t.actor, p.id)
        self.assertIs(t.join("New name", p.token), p)
        self.assertTrue(p.connected)
        self.assertTrue(p.folded)
        self.assertEqual(self.total(t), 300)

    def test_nonactor_disconnect_preserves_turn(self):
        t = self.table((100,) * 4)
        t.start(t.players[0].id)
        actor = t.actor
        t.disconnect(t.players[0].id)
        self.assertEqual(t.actor, actor)
        while t.running:
            t.act(t.actor, "check_call")
        self.assertEqual(self.total(t), 400)

    def test_disconnected_all_in_stays_eligible(self):
        t = self.table((100, 10, 100))
        t.start(t.players[0].id)
        p = t.players[1]
        t.act(t.actor, "check_call")
        t.act(t.actor, "check_call")
        self.assertEqual(p.stack, 0)
        t.disconnect(p.id)
        self.assertFalse(p.folded)
        while t.running:
            t.act(t.actor, "check_call")
        self.assertEqual(self.total(t), 210)

    def test_any_player_deals_and_stack_and_join_guards(self):
        t = self.table()
        with self.assertRaises(InvalidAction):
            t.start("not-a-player")
        t.start(t.players[1].id)
        with self.assertRaises(InvalidAction):
            t.start(t.players[0].id)
        with self.assertRaises(InvalidAction):
            t.set_stack(t.players[0].id, -1)
        newcomer = t.join("Player 0")
        self.assertNotEqual(newcomer.name, t.players[0].name)
        self.assertFalse(newcomer.in_hand)
        for value in [None, "", "a" * 25]:
            with self.assertRaises(InvalidAction):
                t.join(value)

    def test_private_cards(self):
        t = self.table()
        t.start(t.players[0].id)
        state = t.state(t.players[0].id)
        self.assertEqual(state["hand"], t.player(t.players[0].id).hand)
        self.assertTrue(
            all("hand" not in p and "token" not in p for p in state["players"])
        )

    def test_random_legal_hands_conserve_chips_and_terminate(self):
        rng = random.Random(42)
        for _ in range(150):
            t = self.table(tuple(rng.randint(1, 300) for _ in range(rng.randint(2, 9))))
            total = self.total(t)
            for _ in range(5):
                if sum(p.stack > 0 for p in t.players) < 2:
                    break
                t.start(t.players[0].id)
                actions = 0
                while t.running:
                    actions += 1
                    self.assertLess(actions, 250)
                    if t.runout:
                        finish_runout(t)
                        continue
                    if t.runout_vote:
                        for pid in list(t.runout_vote["eligible"]):
                            if t.runout_vote and pid not in t.runout_vote["votes"]:
                                t.choose_runouts(pid, 2 if rng.random() < .75 else 1, t.hand_id)
                        continue
                    state = t.state(t.actor)
                    choice = rng.random()
                    if choice < 0.15:
                        t.act(t.actor, "fold")
                    elif choice < 0.4 and state["can_raise"]:
                        minimum = min(state["min_raise_to"], state["max_raise_to"])
                        amount = rng.randint(minimum, state["max_raise_to"])
                        t.act(t.actor, "raise", amount)
                    else:
                        t.act(t.actor, "check_call")
                    self.assertEqual(self.total(t), total)
                    self.assertTrue(all(p.stack >= 0 for p in t.players))
                self.assertEqual(self.total(t), total)


if __name__ == "__main__":
    unittest.main()
