import unittest
from game import Table, InvalidAction


class CheckIndicatorTests(unittest.TestCase):
    def setUp(self):
        self.t = Table()
        self.players = [self.t.join(n) for n in ('A', 'B', 'C')]
        self.t.start(self.players[0].id)

    def checked(self):
        views = [self.t.state(p.id)['players'] for p in self.players]
        self.assertTrue(all(v == views[0] for v in views))
        return {p['id'] for p in views[0] if p['checked']}

    def flop(self):
        while self.t.street == 'preflop':
            self.t.act(self.t.actor, 'check_call')
            self.assertFalse(self.checked())

    def test_street_settlement_and_next_deal_clear_checks(self):
        self.flop()
        for street in ('flop', 'turn', 'river'):
            self.assertEqual(self.t.street, street)
            seen = set()
            for _ in range(2):
                actor = self.t.actor
                self.t.act(actor, 'check_call')
                seen.add(actor)
                self.assertEqual(self.checked(), seen)
            self.t.act(self.t.actor, 'check_call')
            self.assertFalse(self.checked())
        self.assertEqual(self.t.street, 'complete')
        self.t.start(self.players[0].id)
        self.assertFalse(self.checked())

    def test_call_fold_and_invalid_action(self):
        for action in ('check_call', 'fold'):
            with self.subTest(action=action):
                self.setUp()
                self.flop()
                checker = self.t.actor
                self.t.act(checker, 'check_call')
                self.t.act(self.t.actor, 'raise', 20)
                self.assertEqual(self.checked(), {checker})
                with self.assertRaises(InvalidAction):
                    self.t.act(checker, 'check_call')
                self.assertEqual(self.checked(), {checker})
                self.t.act(self.t.actor, 'check_call')
                self.t.act(checker, action)
                self.assertFalse(self.checked())

    def test_queue_does_not_show_until_executed(self):
        self.flop()
        first = self.t.actor
        next_id = self.t.clockwise(first, self.t.pending - {first})
        self.t.queue_action(next_id, 'check', self.t.hand_number, 'flop')
        self.assertFalse(self.checked())
        self.t.act(first, 'check_call')
        self.assertTrue(self.t.consume_queued_action())
        self.assertEqual(self.checked(), {first, next_id})
