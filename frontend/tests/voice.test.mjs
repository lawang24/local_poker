import { build } from 'esbuild';
import assert from 'node:assert/strict';
import { test } from 'node:test';
const bundle = await build({ entryPoints: ['src/voiceCommands.ts'], bundle: true, write: false, format: 'esm', platform: 'node' });
const { voiceCommand } = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString('base64')}`);
const base = { you: 'a', actor: 'a', running: true, paused: false, runout_vote: null, cents: false, can_raise: true, target: 10, min_raise_to: 20, max_raise_to: 1000, call_amount: 10, pot: 15, players: [{ id: 'a', stack: 1000, committed: 0, away: false }] };
test('exact commands and check/call distinction', () => {
 assert.deepEqual(voiceCommand('call.', base).action, {type:'check_call'});
 assert.ok(voiceCommand('check', base).error);
 assert.ok(voiceCommand('please do not fold', base).error);
 assert.ok(voiceCommand('fold call', base).error);
 assert.equal(voiceCommand('fold', base).confirm, false);
 assert.equal(voiceCommand('fold', {...base, call_amount:0}).confirm, true);
 assert.ok(voiceCommand('call', {...base, call_amount:0}).error);
});
test('raise totals, pot after call, limits and cents', () => {
 assert.deepEqual(voiceCommand('raise 50', base), {action:{type:'raise',amount:50},confirm:true});
 assert.equal(voiceCommand('raise half pot', base).action.amount, 23);
 assert.equal(voiceCommand('raise pot', base).action.amount, 35);
 assert.equal(voiceCommand('raise minimum', base).action.amount, 20);
 assert.equal(voiceCommand('bet 0.50', {...base,cents:true}).action.amount, 50);
 for (const phrase of ['raise 1','raise 1001','raise 0.50','raise -50','raise 50 more']) assert.ok(voiceCommand(phrase,base).error, phrase);
 assert.ok(voiceCommand('raise 50', {...base,can_raise:false}).error);
});
test('short all-ins and all-in calls', () => {
 assert.equal(voiceCommand('all-in', {...base,max_raise_to:15}).action.amount,15);
 assert.equal(voiceCommand('raise half pot', {...base,max_raise_to:15}).action.amount,15);
 assert.deepEqual(voiceCommand('all in', {...base,call_amount:1000,can_raise:false}), {action:{type:'check_call'},confirm:true});
});
test('reject outside eligible turn', () => {
 for (const change of [{actor:'b'},{running:false},{paused:true},{runout_vote:{}},{players:[{id:'a',away:true}]}]) assert.ok(voiceCommand('fold',{...base,...change}).error);
});

test('spoken numbers and rejection of ambiguous phrases', () => {
 assert.equal(voiceCommand('raise fifty',base).action.amount,50);
 assert.equal(voiceCommand('raise twenty-five',base).action.amount,25);
 assert.equal(voiceCommand('raise one hundred and fifty',base).action.amount,150);
 assert.equal(voiceCommand('raise one thousand',base).action.amount,1000);
 assert.equal(voiceCommand('raise zero point five zero',{...base,cents:true}).action.amount,50);
 for(const phrase of ['raise fifty fifty','raise negative fifty','raise -50','raise one hundred hundred']) assert.ok(voiceCommand(phrase,base).error);
});
