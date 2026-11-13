"""Visible boundaries measured from the two user-supplied recordings."""
import asyncio
import json
import unittest
from unittest.mock import Mock
from game import InvalidAction
from main import GameServer
from runout import schedule, equity
from test_runouts import table, all_in
from runout_helpers import finish_runout
from storage import snapshot, restore, StorageError


class RevealTests(unittest.TestCase):
    def begin(self, count=1, stacks=(100, 200, 300)):
        t = table(stacks)
        all_in(t)
        for pid in list(t.runout_vote['eligible']):
            if t.runout_vote:
                t.choose_runouts(pid, count, t.hand_id)
        return t

    def test_recorded_schedules(self):
        for count, expected, payout in [(1, [4.13, 8.08, 12.33], 16),
                                        (2, [4.05, 8.05, 12.05, 16.15, 20.15, 24.25], 28.35)]:
            steps = schedule(0, count)
            self.assertEqual([s['at'] for s in steps if s['kind'] == 'backs'], expected)
            self.assertEqual(steps[-1]['at'], payout)
            faces = [s['at'] for s in steps if s['kind'] == 'face']
            self.assertAlmostEqual(faces[1] - faces[0], .175)
            self.assertAlmostEqual(faces[2] - faces[1], .175)

    def test_each_reveal_privacy_chips_and_delayed_settlement(self):
        for count in (1, 2):
            t = self.begin(count)
            start = t.runout['started_at']
            self.assertIsNone(t.result)
            self.assertEqual(sum(p.stack for p in t.players) + t.pot, 600)
            t.set_stack(t.players[0].id, 777)
            last_faces = 0
            while t.runout:
                step = dict(t._runout_steps[0])
                deadline = start + step['at']
                t.advance_runout(deadline - .001)
                self.assertIsNone(t.result)
                self.assertTrue(t.running)
                self.assertEqual(t.queued_stacks[t.players[0].id], 777)
                t.advance_runout(deadline + .000001)
                if t.runout:
                    run = t.state(t.players[0].id)['runout']
                    faces = sum(sum(c is not None for c in b) for b in run['boards'])
                    self.assertEqual(faces - last_faces, int(step['kind'] == 'face'))
                    last_faces = faces
                    self.assertEqual(sum(p.stack for p in t.players) + t.pot, 600)
                    public = json.dumps(t.state(t.players[0].id))
                    # No remaining deck / pending faces or winner data in snapshots.
                    self.assertNotIn('_runout_cards', public)
                    for card in t._runout_cards:
                        if card not in sum(run['boards'], []):
                            self.assertNotIn('"' + card + '"', public)
                    self.assertEqual(run, t.state(t.players[1].id)['runout'])
                    with self.assertRaises(InvalidAction):
                        t.start(t.players[0].id)
            self.assertEqual(t.players[0].stack, 777)
            self.assertEqual(len(t.result['runouts']), count)
            self.assertEqual(t.result['runout_presentation']['result_hold'], 6.1 if count == 1 else 8.1)
            self.assertEqual(len([e for e in t.events if e['type'] == 'hand_completed']), 1)
            before = [p.stack for p in t.players]
            t.advance_runout(start + 100)
            self.assertEqual(before, [p.stack for p in t.players])

    def test_disconnect_and_restart_during_each_stage(self):
        t = self.begin(2, (100, 200))
        cover = t.players[1]
        t.disconnect(cover.id)
        self.assertFalse(cover.folded)
        while t.runout:
            recovered = restore(snapshot(t))
            self.assertEqual([p.stack for p in recovered.players], [100, 200])
            self.assertIsNone(recovered.runout)
            self.assertFalse(recovered.running)
            t.advance_runout(t.runout['started_at'] + t._runout_steps[0]['at'] + .000001)
        self.assertEqual(sum(p.stack for p in t.players), 300)

    def test_shared_prefixes_and_no_repeated_streets(self):
        for street, prefix_len in [('flop', 3), ('turn', 4)]:
            t = table()
            while t.street != street:
                t.act(t.actor, 'check_call')
            prefix = list(t.board)
            all_in(t)
            for pid in list(t.runout_vote['eligible']):
                t.choose_runouts(pid, 2, t.hand_id)
            self.assertAlmostEqual(t._runout_steps[0]['at'], 4.05)
            finish_runout(t)
            for run in t.result['runouts']:
                self.assertEqual(run['board'][:prefix_len], prefix)

    def test_equity_uses_public_cards_and_splits_ties(self):
        self.assertEqual(equity((('Ah','Ad'), ('Kh','Kd')), ('2c','3c','4d','8s','9s')), (100,0))
        self.assertEqual(equity((('2h','3d'), ('4h','5d')), ('Ts','Js','Qs','Ks','As')), (50,50))


class RevealTimerTests(unittest.IsolatedAsyncioTestCase):
    async def test_one_scheduler_and_storage_failure_cancels_it(self):
        t = RevealTests().begin(2)
        server = GameServer(table=t)
        await server.broadcast()
        task = server.reveal_task
        await server.broadcast()
        self.assertIs(task, server.reveal_task)
        self.assertIsNone(server.deal_task)
        server.store = Mock(save=Mock(side_effect=OSError('offline')))
        with self.assertRaises(StorageError):
            await server.broadcast()
        await asyncio.gather(task, return_exceptions=True)
        self.assertIsNone(server.reveal_task)
        self.assertIsNone(t.result)
