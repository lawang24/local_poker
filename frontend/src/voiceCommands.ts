import { parseAmount } from './amounts';
import type { State } from './types';
import type { Action } from './ActionControls';

export type VoiceDecision = { action: Action; confirm: boolean } | { error: string };

const small = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const tens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
function spokenInteger(text: string): number {
  const tokens = text.trim().split(' ');
  if (tokens.length === 1 && small.includes(text)) return small.indexOf(text);
  if (tokens.length <= 2 && tens.includes(tokens[0])) {
    const unit = tokens.length === 1 ? 0 : small.indexOf(tokens[1]);
    return unit >= 0 && unit <= 9 ? (tens.indexOf(tokens[0]) + 2) * 10 + unit : NaN;
  }
  const hundred = text.match(/^([a-z]+) hundred(?: (?:and )?(.+))?$/);
  if (hundred && small.indexOf(hundred[1]) > 0 && small.indexOf(hundred[1]) < 10) {
    const rest = hundred[2] ? spokenInteger(hundred[2]) : 0;
    return rest < 100 ? small.indexOf(hundred[1]) * 100 + rest : NaN;
  }
  const thousand = text.match(/^(.+) thousand(?: (?:and )?(.+))?$/);
  if (thousand && !thousand[1].includes('thousand') && !thousand[2]?.includes('thousand')) {
    const prefix = spokenInteger(thousand[1]);
    const rest = thousand[2] ? spokenInteger(thousand[2]) : 0;
    return prefix > 0 && prefix < 1000 && rest < 1000 ? prefix * 1000 + rest : NaN;
  }
  return NaN;
}
function spokenAmount(text: string, cents: boolean) {
  if (/^\d+(?:,\d{3})*(?:\.\d{1,2})?$/.test(text)) return parseAmount(text.replace(/,/g, ''), cents);
  const parts = text.split(' point ');
  const integer = spokenInteger(parts[0]);
  if (!Number.isFinite(integer) || parts.length > 2) return NaN;
  if (parts.length === 1) return parseAmount(String(integer), cents);
  const digits = parts[1].split(' ').map(word => small.indexOf(word));
  if (!digits.length || digits.length > 2 || digits.some(d => d < 0 || d > 9)) return NaN;
  return parseAmount(`${integer}.${digits.join('')}`, cents);
}

// Deliberately accept complete commands only, never keywords inside conversation.
export function voiceCommand(transcript: string, state: State): VoiceDecision {
  const text = transcript.toLowerCase().trim().replace(/[.!?]+$/, '').replace(/([a-z])-([a-z])/g, '$1 $2').replace(/\s+/g, ' ');
  const me = state.players.find(p => p.id === state.you);
  if (!me || !state.running || state.actor !== state.you || state.paused || me.away || state.runout_vote) return { error: 'Not your turn.' };
  if (text === 'check') return state.call_amount === 0 ? { action: { type: 'check_call' }, confirm: false } : { error: 'You cannot check while facing a bet.' };
  if (text === 'call') return state.call_amount > 0 ? { action: { type: 'check_call' }, confirm: state.call_amount === me.stack } : { error: 'Nothing to call. Say check.' };
  if (text === 'fold') return { action: { type: 'fold' }, confirm: state.call_amount === 0 };
  let amount: number;
  const size = text.match(/^(?:raise|bet)(?: to)? (.+)$/)?.[1];
  if (text === 'all in') amount = state.max_raise_to;
  else if (size === 'half pot' || size === 'pot') {
    amount = Math.max(Math.min(state.min_raise_to, state.max_raise_to), Math.min(state.max_raise_to,
      Math.round(me.committed + state.call_amount + (state.pot + state.call_amount) * (size === 'pot' ? 1 : .5))));
  } else if (size === 'min' || size === 'minimum') amount = Math.min(state.min_raise_to, state.max_raise_to);
  else if (size) amount = spokenAmount(size, state.cents);
  else return { error: 'Not recognized. Say check, call, fold, raise 50, raise half pot, raise pot, or all in.' };
  // All-in can also be a call when the player cannot cover the current bet.
  if (text === 'all in' && state.call_amount === me.stack && me.stack > 0) return { action: { type: 'check_call' }, confirm: true };
  if (!state.can_raise) return { error: 'Raising is not available.' };
  if (!Number.isSafeInteger(amount) || amount <= state.target || amount > state.max_raise_to || (amount < state.min_raise_to && amount !== state.max_raise_to)) return { error: 'That raise is outside the allowed limits. Try raise minimum.' };
  return { action: { type: 'raise', amount }, confirm: true };
}

export function voiceTurnKey(state: State) {
  return [state.hand_number, state.street, state.actor, state.target, state.max_raise_to, state.cents, state.turn_deadline].join(':');
}
