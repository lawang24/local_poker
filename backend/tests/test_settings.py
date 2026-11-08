import asyncio
import json
import unittest

from game import Table, InvalidAction
from main import GameServer
from storage import snapshot, restore


class SettingsTests(unittest.TestCase):
    def setUp(self):
        self.table = Table()
        self.a = self.table.join("Alice")
        self.b = self.table.join("Bob")

    def test_any_player_can_update_shared_settings_and_blinds(self):
        self.table.set_settings(self.b.id, 25, 50, True, True)
        for player in (self.a, self.b):
            state = self.table.state(player.id)
            self.assertEqual((state["small_blind"], state["big_blind"]), (25, 50))
            self.assertTrue(state["cents"])
            self.assertTrue(state["auto_deal"])
        self.table.start(self.a.id)
        self.assertEqual(self.table.pot, 75)
        self.assertEqual(self.table.min_raise, 50)

    def test_invalid_settings_are_atomic(self):
        for sb, bb, auto, cents in [(0, 10, False, False), (20, 10, False, False),
                                    (1.5, 10, False, False), (True, 10, False, False),
                                    (5, 1000001, False, False), (5, 10, 1, False),
                                    (5, 10, False, "yes")]:
            with self.subTest(values=(sb, bb, auto, cents)):
                with self.assertRaises(InvalidAction):
                    self.table.set_settings(self.b.id, sb, bb, auto, cents)
                self.assertEqual((self.table.small_blind, self.table.big_blind,
                                  self.table.auto_deal, self.table.cents), (5, 10, True, False))

    def test_live_settings_replaced_or_reverted_without_changing_hand(self):
        self.table.start(self.a.id)
        self.table.set_settings(self.b.id, 25, 50, None, True, 75)
        self.table.set_settings(self.a.id, 20, 40, None, True)
        with self.assertRaises(InvalidAction):
            self.table.set_settings(self.a.id, 70, 40, None, True)
        state = self.table.state(self.b.id)
        self.assertEqual(state["queued_settings"], {
            "small_blind": 20, "big_blind": 40, "seven_deuce_bonus": 75, "cents": True,
        })
        self.assertEqual((state["small_blind"], state["big_blind"], state["cents"]), (5, 10, False))
        self.table.set_settings(self.a.id, 5, 10, None, False, 0)
        self.assertIsNone(self.table.state(self.b.id)["queued_settings"])

    def test_restart_applies_edits_after_refund_once(self):
        self.table.start(self.a.id)
        self.table.set_settings(self.b.id, 25, 50, None, True, 30)
        self.table.set_stack(self.a.id, 200)
        self.table.set_stack(self.a.id, 0)
        recovered = restore(snapshot(self.table))
        cancelled = next(e for e in recovered.events if e["type"] == "hand_cancelled")
        self.assertEqual([p["stack"] for p in cancelled["players"]], [1000, 1000])
        self.assertEqual(cancelled["net"], {self.a.id: 0, self.b.id: 0})
        movement, = [e for e in recovered.events if e.get("reason") == "stack_adjustment"]
        self.assertEqual((movement["type"], movement["amount"], movement["hand_id"]), ("chips_removed", 1000, None))
        self.assertEqual(recovered.player(self.a.id).stack, 0)
        self.assertEqual((recovered.small_blind, recovered.big_blind, recovered.cents), (25, 50, True))
        again = restore(snapshot(recovered))
        self.assertFalse(any(e.get("reason") == "stack_adjustment" for e in again.events))
        self.assertEqual(again.player(self.a.id).stack, 0)

    def test_checkpoint_roundtrip_and_legacy_defaults(self):
        self.table.set_settings(self.b.id, 25, 50, True, True, 75)
        saved = snapshot(self.table)
        recovered = restore(saved)
        self.assertEqual(recovered.seven_deuce_bonus, 75)
        self.assertEqual((recovered.small_blind, recovered.big_blind,
                          recovered.auto_deal, recovered.cents), (25, 50, True, True))
        old = json.loads(saved)
        old["auto_deal"] = False
        self.assertTrue(restore(json.dumps(old)).auto_deal)
        del old["auto_deal"]
        del old["cents"]
        del old["seven_deuce_bonus"]
        recovered = restore(json.dumps(old))
        self.assertTrue(recovered.auto_deal)
        self.assertFalse(recovered.cents)
        self.assertEqual(recovered.seven_deuce_bonus, 0)

    def test_bonus_is_shared_validated_and_queued_during_a_hand(self):
        self.table.set_settings(self.b.id, 5, 10, None, False, 75)
        self.table.set_settings(self.a.id, 5, 10, None, False)
        self.assertEqual(self.table.state(self.a.id)["seven_deuce_bonus"], 75)
        for invalid in (-1, 1_000_001, True, 1.5, "10", None):
            with self.subTest(invalid=invalid), self.assertRaises(InvalidAction):
                self.table.set_settings(self.b.id, 10, 20, None, True, invalid)
        self.assertEqual(self.table.big_blind, 10)
        self.table.start(self.a.id)
        self.table.set_settings(self.a.id, 5, 10, None, False, 0)
        self.assertEqual(self.table.seven_deuce_bonus, 75)
        self.assertEqual(self.table.hand_start["seven_deuce_bonus"], 75)


class AutoDealTests(unittest.IsolatedAsyncioTestCase):
    async def asyncSetUp(self):
        self.server = GameServer(auto_deal_delay=.02)
        self.a = self.server.table.join("Alice")
        self.server.table.join("Bob")

    async def asyncTearDown(self):
        if self.server.deal_task:
            self.server.deal_task.cancel()
            await asyncio.gather(self.server.deal_task, return_exceptions=True)

    async def finish_hand(self):
        self.server.table.start(self.a.id)
        self.server.table.act(self.server.table.actor, "fold")
        await self.server.broadcast()

    async def test_first_and_subsequent_hands_deal_automatically(self):
        await self.server.broadcast()
        self.assertIsNotNone(self.server.deal_task)
        await asyncio.sleep(.05)
        self.assertEqual(self.server.table.hand_number, 1)
        self.assertTrue(self.server.table.running)
        self.server.table.act(self.server.table.actor, "fold")
        await self.server.broadcast()
        self.assertEqual(self.server.table.street, "complete")
        task = self.server.deal_task
        await self.server.broadcast()
        self.assertIs(self.server.deal_task, task)
        await asyncio.sleep(.05)
        self.assertEqual(self.server.table.hand_number, 2)
        self.assertTrue(self.server.table.running)

    async def test_legacy_setting_cannot_disable_automatic_dealing(self):
        await self.finish_hand()
        self.server.table.set_settings(self.a.id, 5, 10, False, False)
        await self.server.broadcast()
        await asyncio.sleep(.05)
        self.assertEqual(self.server.table.hand_number, 2)
        self.assertTrue(self.server.table.auto_deal)

    async def test_manual_deal_cancels_timer(self):
        await self.finish_hand()
        self.server.table.start(self.a.id)
        await self.server.broadcast()
        await asyncio.sleep(.05)
        self.assertEqual(self.server.table.hand_number, 2)
        self.assertIsNone(self.server.deal_task)

    async def test_disconnect_pauses_until_enough_players(self):
        await self.finish_hand()
        self.server.table.disconnect(self.a.id)
        await self.server.broadcast()
        await asyncio.sleep(.05)
        self.assertEqual(self.server.table.hand_number, 1)
        self.server.table.join("Alice", self.a.token)
        await self.server.broadcast()
        await asyncio.sleep(.05)
        self.assertEqual(self.server.table.hand_number, 2)

    async def test_insufficient_funded_players_pause_first_deal(self):
        self.server.table.set_stack(self.a.id, 0)
        await self.server.broadcast()
        self.assertIsNone(self.server.deal_task)
        self.server.table.set_stack(self.a.id, 1000)
        await self.server.broadcast()
        await asyncio.sleep(.05)
        self.assertEqual(self.server.table.hand_number, 1)

    async def test_queued_rebuy_enables_the_next_automatic_deal(self):
        t = self.server.table
        a, b = t.players
        t.set_stack(a.id, 6)
        t.set_settings(b.id, 5, 10, None, False, 10)
        t.start(a.id)
        b.hand = ["7h", "2c"]
        t.set_stack(a.id, 50)
        t.set_settings(b.id, 10, 20, None, True, 0)
        t.act(a.id, "fold")
        completed = next(e for e in t.events if e["type"] == "hand_completed")
        self.assertEqual(completed["net"], {a.id: -6, b.id: 6})
        self.assertEqual(completed["result"]["seven_deuce_bonus"]["total"], 1)
        self.assertFalse(completed["result"]["cents"])
        self.assertEqual(t.events[-1]["reason"], "stack_adjustment")
        self.assertEqual(t.events[-1]["amount"], 50)
        await self.server.broadcast()
        await asyncio.sleep(.05)
        self.assertEqual(t.hand_number, 2)
        self.assertEqual(t.hand_start["players"][0]["stack"], 50)
        self.assertEqual((a.stack, a.committed, b.committed), (30, 20, 10))
        self.assertEqual((t.cents, t.seven_deuce_bonus), (True, 0))
        self.assertIsNone(t.state(a.id)["queued_stack"])

    async def test_failure_prevents_dealing(self):
        await self.server.broadcast()
        self.server.failed = True
        await asyncio.sleep(.05)
        self.assertEqual(self.server.table.hand_number, 0)
