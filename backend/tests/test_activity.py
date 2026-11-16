import json
import unittest
from unittest.mock import Mock, patch

from activity import activity_environment
from archive import archive_items, decode, encode, query_records
from export_history import main as export_main
from game import Table
from storage import DynamoStore, snapshot


class ActivityTests(unittest.TestCase):
    def test_configuration_defaults_safe_and_rejects_typo_without_database(self):
        with patch.dict('os.environ', {}, clear=True):
            self.assertEqual(activity_environment(), 'development')
            self.assertIsNone(DynamoStore.from_env())
        with patch.dict('os.environ', {'POKER_ENVIRONMENT': 'prod', 'DYNAMODB_TABLE': ''}):
            with self.assertRaises(ValueError):
                DynamoStore.from_env()

    def test_same_database_has_isolated_checkpoints_profiles_and_feedback(self):
        db, history = Mock(), Mock()
        db.name, history.name = 'game', 'history'
        checkpoints, records = {}, {}

        def commit(**kwargs):
            for write in kwargs['TransactItems']:
                put = write['Put']
                item = put['Item']
                if put['TableName'] == 'game':
                    checkpoints[item['pk']] = item
                else:
                    records[item['pk'], item['sk']] = item

        db.meta.client.transact_write_items.side_effect = commit
        db.get_item.side_effect = lambda Key, **kw: {'Item': checkpoints[Key['pk']]} if Key['pk'] in checkpoints else {}
        history.get_item.side_effect = lambda Key, **kw: {'Item': records[Key['pk'], Key['sk']]} if (Key['pk'], Key['sk']) in records else {}
        production = DynamoStore(db, history, environment='production')
        live = Table()
        player = live.join('Real player')
        live.set_stack(player.id, 1234)
        production.save(snapshot(live), live.events, live.profiles)
        original = dict(checkpoints['GAME#GLOBAL'])
        for environment in ('development', 'test', 'staging'):
            store = DynamoStore(db, history, environment=environment)
            self.assertEqual(store.load().players, [])
            self.assertIsNone(store.identity(player.token))
            game = Table()
            game.join('Bot', player.token)
            game.join('Other bot')
            game.start(game.players[0].id)
            while game.running:
                game.act(game.actor, 'check_call')
            store.save(snapshot(game), game.events, game.profiles)
            self.assertTrue(all(item['environment'] == environment for (pk, sk), item in records.items() if pk.startswith(f'ENV#{environment}#')))
            restored = DynamoStore(db, history, environment=environment).load()
            self.assertEqual(sum(p.stack for p in restored.players), 2000)
            self.assertEqual(restored.hand_number, 1)
            store.save_feedback({'id': 'same-report', 'created_at': 'now', 'environment': 'production'})
            feedback = history.put_item.call_args.kwargs['Item']
            self.assertEqual(feedback['pk'], f'ENV#{environment}#FEEDBACK')
            self.assertEqual(feedback['environment'], environment)
        self.assertEqual(checkpoints['GAME#GLOBAL'], original)
        self.assertEqual(production.identity(player.token)['player_id'], player.id)
        self.assertEqual(DynamoStore(db, history, environment='production').load().players[0].stack, 1234)

    def test_archive_labels_every_record_and_payload_without_mutating_events(self):
        table = Table()
        a = table.join('A')
        table.join('B')
        table.start(a.id)
        while table.running:
            table.act(table.actor, 'check_call')
        before = json.dumps(table.events)
        items = list(archive_items(table.events, environment='test'))
        self.assertTrue(any(i['sk'].startswith('RESULT#') for i in items))
        for item in items:
            self.assertTrue(item['pk'].startswith('ENV#test#'))
            self.assertEqual(item['environment'], 'test')
            if 'payload' in item:
                self.assertEqual(decode(item['payload'])['environment'], 'test')
        self.assertEqual(json.dumps(table.events), before)

    def test_export_filters_mixed_records_and_keeps_legacy_explicit(self):
        table = Mock(name='history')
        table.meta.client.get_paginator.return_value.paginate.return_value = [
            {'Items': [
                {'payload': encode({'id': 'old'})},
                {'payload': encode({'id': 'live'}), 'environment': 'production'},
            ]},
            {'Items': [{'id': 'bot', 'environment': 'test'}]},
        ]
        self.assertEqual(list(query_records(table, 'SESSIONS', environment='production')),
                         [{'id': 'live', 'environment': 'production'}])
        records = list(query_records(table, 'SESSIONS', environment='production', include_legacy=True))
        self.assertEqual([r['environment'] for r in records], ['legacy', 'production'])
        with self.assertRaises(ValueError):
            list(query_records(table, 'SESSIONS', environment='test', include_legacy=True))
        list(query_records(table, 'SESSIONS', environment='test'))
        values = table.meta.client.get_paginator.return_value.paginate.call_args.kwargs['ExpressionAttributeValues']
        self.assertIn('ENV#test#SESSIONS', values.values())

    def test_production_can_restore_an_unlabelled_checkpoint(self):
        db = Mock()
        table = Table()
        table.join('Existing player')
        store = DynamoStore(db, environment='production')
        store.save(snapshot(table))
        old_item = db.put_item.call_args.kwargs['Item'].copy()
        old_item.pop('environment')
        db.get_item.return_value = {'Item': old_item}
        restored = DynamoStore(db, environment='production').load()
        self.assertEqual(restored.players[0].name, 'Existing player')
        self.assertEqual(db.get_item.call_args.kwargs['Key'], {'pk': 'GAME#GLOBAL'})

    def test_cli_selects_environment_before_calculating_player_totals(self):
        import tempfile
        from pathlib import Path
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / 'report.json'
            store = Mock(environment='production')
            store.history_table.meta.client.get_paginator.return_value.paginate.return_value = [{'Items': [
                {'sk': 'RESULT#1', 'net': 10, 'session_id': 'live', 'status': 'hand_completed', 'environment': 'production'},
                {'sk': 'RESULT#2', 'net': 999, 'session_id': 'test', 'status': 'hand_completed', 'environment': 'test'},
                {'sk': 'RESULT#3', 'net': 500, 'session_id': 'old', 'status': 'hand_completed'},
            ]}]
            with patch('sys.argv', ['export_history.py', '--player', 'alice', '--environment', 'production', '--output', str(output)]), patch('export_history.load_dotenv'), patch('export_history.DynamoStore.from_env', return_value=store) as configured:
                export_main()
            configured.assert_called_once_with(environment='production')
            report = json.loads(output.read_text())
            self.assertEqual(report['net'], 10)
            self.assertEqual(report['completed_hands'], 1)
            self.assertEqual(report['environment'], 'production')
            self.assertFalse(report['includes_legacy'])
            self.assertEqual(output.stat().st_mode & 0o777, 0o600)
