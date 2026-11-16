import asyncio
import json
import unittest
from datetime import datetime, timezone
from unittest.mock import patch
from game import InvalidAction
from main import GameServer
from storage import restore, snapshot


class TableControlTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.s = GameServer(auto_deal_delay=60)
        self.t = self.s.table
        self.a, self.b, self.c = [self.t.join(n) for n in ('Alice', 'Bob', 'Carol')]

    async def asyncTearDown(self):
        tasks = [getattr(self.s, n) for n in ('turn_task', 'deal_task', 'runout_task', 'reveal_task')]
        for task in tasks:
            if task:
                task.cancel()
        await asyncio.gather(*(task for task in tasks if task), return_exceptions=True)

    async def expire(self):
        self.t.turn_deadline = datetime.now(timezone.utc).timestamp() - .01
        await self.s.broadcast()
        await asyncio.sleep(.02)

    async def test_timeout_folds_bet_but_checks_for_free(self):
        self.t.start(self.a.id)
        await self.s.broadcast()
        actor = self.t.player(self.t.actor)
        await self.expire()
        self.assertTrue(actor.folded)
        self.assertEqual(self.t.pot, 15)
        self.t.act(self.t.actor, 'check_call')
        await self.s.broadcast()
        bb = self.t.player(self.t.actor)
        self.assertEqual(bb.committed, self.t.target)
        await self.expire()
        self.assertFalse(bb.folded)
        self.assertEqual(self.t.street, 'flop')
        self.assertEqual(self.t.pot, 20)

    async def test_broadcast_reconnect_preserve_deadline_and_stale_timer_cannot_act(self):
        self.t.start(self.a.id)
        await self.s.broadcast()
        deadline, task = self.t.turn_deadline, self.s.turn_task
        self.t.add_chat(self.a, 'hello')
        self.t.join('Alice', self.a.token)
        await self.s.broadcast()
        self.assertEqual(deadline, self.t.turn_deadline)
        self.assertIs(task, self.s.turn_task)
        stale = self.s.turn_key
        self.t.act(self.t.actor, 'check_call')
        await self.s.broadcast()
        actor = self.t.actor
        with patch('main.asyncio.sleep', return_value=None):
            await self.s.expire_turn(stale)
        self.assertEqual(actor, self.t.actor)

    async def test_pause_preserves_remaining_time_and_rejects_actions(self):
        self.t.start(self.a.id)
        await self.s.broadcast()
        self.t.set_paused(self.b.id, True)
        await self.s.broadcast()
        remaining = self.t.turn_deadline - self.t.paused_at
        actor = self.t.actor
        self.assertIsNone(self.s.turn_task)
        with self.assertRaises(InvalidAction):
            self.t.act(actor, 'fold')
        await asyncio.sleep(.03)
        self.t.set_paused(self.c.id, False)
        await self.s.broadcast()
        self.assertAlmostEqual(self.t.turn_deadline - datetime.now(timezone.utc).timestamp(), remaining, delta=.02)
        self.assertEqual(self.t.actor, actor)

    async def test_away_keeps_seat_skips_deals_and_auto_acts(self):
        self.t.set_away(self.a.id, True)
        self.t.start(self.b.id)
        self.assertFalse(self.a.in_hand)
        self.assertEqual((self.a.stack, self.a.seat), (1000, 0))
        self.t.set_away(self.a.id, False)
        self.assertFalse(self.a.in_hand)
        actor = self.t.player(self.t.actor)
        self.t.set_away(actor.id, True)
        await self.s.broadcast()
        self.assertTrue(actor.folded)
        self.assertFalse(self.t.running)
        self.t.start(self.a.id)
        self.assertTrue(self.a.in_hand)
        self.assertFalse(actor.in_hand)

    async def test_away_and_pause_cancel_next_deal(self):
        await self.s.broadcast()
        self.assertIsNotNone(self.s.deal_task)
        self.t.set_paused(self.a.id, True)
        await self.s.broadcast()
        self.assertIsNone(self.s.deal_task)
        for p in (self.a, self.b):
            self.t.set_away(p.id, True)
        self.t.set_paused(self.c.id, False)
        await self.s.broadcast()
        self.assertIsNone(self.s.deal_task)
        self.t.set_away(self.a.id, False)
        await self.s.broadcast()
        self.assertIsNotNone(self.s.deal_task)

    async def test_paused_disconnect_waits_until_resume(self):
        self.t.start(self.a.id)
        self.t.set_paused(self.b.id, True)
        actor = self.t.actor
        self.t.disconnect(actor)
        await self.s.broadcast()
        self.assertEqual(self.t.actor, actor)
        self.assertFalse(self.t.player(actor).folded)
        self.t.set_paused(self.b.id, False)
        await self.s.broadcast()
        self.assertTrue(self.t.player(actor).folded)
        self.assertNotEqual(self.t.actor, actor)

    async def test_removed_disconnected_seat_does_not_break_resume(self):
        self.t.set_paused(self.a.id, True)
        self.t.disconnect(self.b.id)
        self.t.kick(self.a.id, self.b.id)
        self.t.set_paused(self.a.id, False)
        await self.s.broadcast()
        self.assertIsNone(self.t.paused_at)
        self.assertEqual(len(self.t.players), 2)
        self.assertIsNotNone(self.s.deal_task)

    async def test_timer_validation_queue_disable_and_recovery(self):
        for value in (-1, 601, True, 1.5, '20', None):
            with self.assertRaises(InvalidAction):
                self.t.set_settings(self.a.id, 10, 20, None, True, turn_seconds=value)
        self.assertEqual(self.t.big_blind, 10)
        self.t.start(self.a.id)
        self.t.set_settings(self.a.id, 5, 10, None, False, turn_seconds=0)
        self.assertEqual(self.t.turn_seconds, 20)
        while self.t.running:
            self.t.act(self.t.actor, 'fold')
        self.t.start(self.a.id)
        await self.s.broadcast()
        self.assertIsNone(self.t.turn_deadline)
        self.assertIsNone(self.s.turn_task)
        self.t.set_away(self.c.id, True)
        self.t.set_paused(self.a.id, True)
        recovered = restore(snapshot(self.t))
        self.assertEqual(recovered.turn_seconds, 0)
        self.assertTrue(recovered.player(self.c.id).away)
        self.assertIsNotNone(recovered.paused_at)
        self.assertFalse(recovered.running)
        old = json.loads(snapshot(self.t))
        for key in ('turn_seconds', 'paused'):
            del old[key]
        for p in old['players']:
            del p['away']
        recovered = restore(json.dumps(old))
        self.assertEqual(recovered.turn_seconds, 20)
        self.assertIsNone(recovered.paused_at)
        self.assertFalse(any(p.away for p in recovered.players))

    async def test_pause_freezes_vote_and_reveal(self):
        self.t.start(self.a.id)
        while self.t.actor:
            if self.t.target < 1000:
                self.t.act(self.t.actor, 'raise', 1000)
            else:
                self.t.act(self.t.actor, 'check_call')
        await self.s.broadcast()
        vote = self.t.runout_vote
        self.t.set_paused(self.a.id, True)
        await self.s.broadcast()
        deadline = datetime.fromisoformat(vote['deadline']).timestamp()
        with self.assertRaises(InvalidAction):
            self.t.choose_runouts(self.a.id, 1, self.t.hand_id)
        await asyncio.sleep(.03)
        self.t.set_paused(self.b.id, False)
        self.assertGreater(datetime.fromisoformat(vote['deadline']).timestamp(), deadline)
        self.t.choose_runouts(self.a.id, 1, self.t.hand_id)
        self.t.set_paused(self.b.id, True)
        await self.s.broadcast()
        run, board = self.t.runout, list(self.t.board)
        started = run['started_at']
        await asyncio.sleep(.03)
        self.assertEqual(self.t.board, board)
        self.assertIsNone(self.s.reveal_task)
        self.t.set_paused(self.b.id, False)
        await self.s.broadcast()
        self.assertGreater(run['started_at'], started)
        self.assertIsNotNone(self.s.reveal_task)
