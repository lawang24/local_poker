import unittest
from game import Table, InvalidAction
from main import GameServer


class BettingControlsTests(unittest.TestCase):
    def setUp(self):
        self.t = Table()
        self.players = [self.t.join(n) for n in ('A', 'B', 'C')]
        self.t.start(self.players[0].id)
        self.s = GameServer(table=self.t)
        self.s.prepare_turn()

    def queue(self, p, action):
        self.t.queue_action(p.id, action, self.t.hand_number, self.t.street)

    def test_extra_time_once_only_and_new_turn_reset(self):
        actor = self.t.actor
        old = self.t.turn_deadline
        self.t.use_extra_time(actor)
        self.assertEqual(self.t.turn_deadline, old + 30)
        with self.assertRaises(InvalidAction): self.t.use_extra_time(actor)
        other = next(p for p in self.players if p.id != actor)
        with self.assertRaises(InvalidAction): self.t.use_extra_time(other.id)
        self.t.act(actor, 'check_call')
        self.s.prepare_turn()
        self.assertFalse(self.t.extra_time_used)
        self.t.use_extra_time(self.t.actor)
        self.t.set_paused(actor, True)
        with self.assertRaises(InvalidAction): self.t.use_extra_time(self.t.actor)

    def test_check_is_cancelled_by_raise_and_never_calls(self):
        bb = next(p for p in self.players if p.committed == self.t.big_blind)
        self.queue(bb, 'check')
        stack = bb.stack
        self.t.act(self.t.actor, 'raise', 30)
        self.s.prepare_turn()
        self.assertNotIn(bb.id, self.t.queued_actions)
        self.assertEqual(bb.stack, stack)

    def test_queued_check_executes_once_and_is_private(self):
        bb = next(p for p in self.players if p.committed == self.t.big_blind)
        self.queue(bb, 'check')
        self.assertEqual(self.t.state(bb.id)['queued_action'], 'check')
        self.assertIsNone(self.t.state(self.t.actor)['queued_action'])
        for _ in range(2):
            self.t.act(self.t.actor, 'check_call')
            self.s.prepare_turn()
        self.assertEqual(self.t.street, 'flop')
        self.assertEqual(self.t.pot, 30)
        self.assertFalse(self.t.queued_actions)

    def test_check_fold_folds_to_bet_and_can_be_cancelled(self):
        waiting = next(p for p in self.players if p.id != self.t.actor and p.committed < self.t.target)
        self.queue(waiting, 'check_fold')
        self.queue(waiting, None)
        self.assertNotIn(waiting.id, self.t.queued_actions)
        self.queue(waiting, 'check_fold')
        self.t.act(self.t.actor, 'check_call')
        self.s.prepare_turn()
        self.assertTrue(waiting.folded)

    def test_reject_stale_and_clear_disconnect(self):
        waiting = next(p for p in self.players if p.id != self.t.actor)
        with self.assertRaises(InvalidAction): self.t.queue_action(waiting.id, 'fold', 0, 'preflop')
        self.queue(waiting, 'fold')
        self.t.disconnect(waiting.id)
        self.assertNotIn(waiting.id, self.t.queued_actions)

    def test_disabled_timer_cannot_be_extended(self):
        self.t.turn_deadline = None
        with self.assertRaises(InvalidAction): self.t.use_extra_time(self.t.actor)
