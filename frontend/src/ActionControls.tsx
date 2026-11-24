import { useEffect, useRef, useState } from "react";
import { formatAmount, inputAmount, parseAmount } from "./amounts";
import { RevealControls } from "./RevealControls";
import { FoldAction } from "./FoldAction";
import type { State } from "./types";
import "./BettingControls.css";

export type Action = { type: string; action?: string | null; street?: string; paused?: boolean; away?: boolean; turn_seconds?: number; seat?: number; player_id?: string; amount?: number; text?: string; small_blind?: number; big_blind?: number; seven_deuce_bonus?: number; cents?: boolean; count?: number; hand_id?: string; hand_number?: number; cards?: number[] };

export function ActionControls({ state, ready, send }: {
  state: State; ready: boolean; send: (action: Action) => void;
}) {
  ready = ready && !state.paused;
  const fmt = (value: number) => formatAmount(value, state.cents);
  const unit = state.cents ? 100 : 1;
  const me = state.players.find(p => p.id === state.you)!;
  const myTurn = state.running && state.actor === state.you;
  const eligible = state.running && me.in_hand && !me.folded && !me.all_in && !me.away && !!state.actor;
  const minimum = Math.min(state.min_raise_to, state.max_raise_to);
  const [editing, setEditing] = useState(false);
  const [raiseTo, setRaiseTo] = useState(inputAmount(minimum, state.cents));
  const controls = useRef<HTMLElement>(null);
  const foldButton = useRef<HTMLButtonElement>(null);
  const betButton = useRef<HTMLButtonElement>(null);
  const amount = parseAmount(raiseTo, state.cents);
  const canRaise = ready && myTurn && state.can_raise;
  const valid = raiseTo.trim() !== "" && Number.isInteger(amount) && amount > state.target && amount <= state.max_raise_to && (amount >= state.min_raise_to || amount === state.max_raise_to);
  const sliderValue = Number.isFinite(amount) ? Math.max(minimum, Math.min(state.max_raise_to, amount)) : minimum;
  const betLabel = state.target === 0 ? "Bet" : "Raise";
  const selectAmount = (value: number) => setRaiseTo(inputAmount(Math.max(minimum, Math.min(state.max_raise_to, Math.round(value))), state.cents));
  const potRaise = (fraction: number) => me.committed + state.call_amount + (state.pot + state.call_amount) * fraction;
  const queue = (action: string) => send({ type: "queue_action", action: state.queued_action === action ? null : action, hand_number: state.hand_number, street: state.street });
  const back = () => { setEditing(false); requestAnimationFrame(() => betButton.current?.focus({ preventScroll: true })); };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat || event.altKey || event.ctrlKey || event.metaKey || !ready || !eligible || document.hidden || document.querySelector('dialog[open]')) return;
      const target = event.target as HTMLElement;
      if (target.closest('input, textarea, select, [contenteditable="true"]')) {
        if (event.key === 'Escape' && editing && controls.current?.contains(target)) { event.preventDefault(); back(); }
        return;
      }
      const key = event.key.toLowerCase();
      if (!['c', 'r', 'k', 'f', 'i', 't', 'escape'].includes(key)) return;
      const button = controls.current?.querySelector<HTMLButtonElement>(`[data-key="${key === 'escape' ? 'esc' : key}"]`);
      if (key === 'f' && !editing && myTurn) { event.preventDefault(); foldButton.current?.click(); }
      else if (button && !button.disabled) { event.preventDefault(); button.click(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ready, eligible, editing, myTurn]);

  if (state.street === "complete" && state.result && state.hand.length === 2) return <RevealControls state={state} ready={ready} send={send} />;
  if (!eligible) return null;
  return <section ref={controls} className={`action-controls betting-panel is-playing ${myTurn ? "is-your-turn" : "is-waiting"} ${editing ? "is-sizing" : ""}`} aria-label="Game controls">
    <div className="betting-status">
      {myTurn ? <>
        {!editing && <span className="your-turn">● Your turn</span>}
        {state.turn_deadline != null && <button type="button" className="extra-time" data-key="t" aria-keyshortcuts="T" disabled={!ready || state.extra_time_used} onClick={() => send({ type: "extra_time" })}>
          {state.extra_time_used ? "Extra time activated" : "Extra time +30s"}<kbd>T</kbd>
        </button>}
      </> : <button type="button" className="queue-combined" data-key="i" aria-keyshortcuts="I" aria-pressed={state.queued_action === 'check_fold'} disabled={!ready} onClick={() => queue('check_fold')}>Check or fold<kbd>I</kbd></button>}
    </div>
    {editing && myTurn ? <form className="inline-bet-editor" aria-label="Bet amount" onSubmit={e => { e.preventDefault(); if (canRaise && valid) send({ type: "raise", amount }); }}>
      <label className="bet-value">Your bet
        <span className="bet-value-input"><input aria-label={`${betLabel} to (total chips)`} inputMode={state.cents ? "decimal" : "numeric"} type="number" step={1 / unit} min={minimum / unit} max={state.max_raise_to / unit} value={raiseTo} disabled={!canRaise} aria-invalid={!valid} onFocus={e => e.target.select()} onChange={e => setRaiseTo(e.target.value)} />
        <span className="bet-bb">{Number.isFinite(amount) ? `${Number((amount / state.big_blind).toFixed(2))}BB` : '—'}</span></span>
      </label>
      <div className="bet-sizing">
        <div className="sizing-presets" aria-label="Bet sizes">
          <button type="button" disabled={!canRaise} onClick={() => selectAmount(minimum)}>Min raise</button>
          <button type="button" disabled={!canRaise} onClick={() => selectAmount(potRaise(.5))}>1/2 pot</button>
          <button type="button" disabled={!canRaise} onClick={() => selectAmount(potRaise(.75))}>3/4 pot</button>
          <button type="button" disabled={!canRaise} onClick={() => selectAmount(potRaise(1))}>Pot</button>
          <button type="button" disabled={!canRaise} onClick={() => selectAmount(state.max_raise_to)}>All in</button>
        </div>
        <div className="sizing-slider">
          <button type="button" aria-label="Decrease bet" disabled={!canRaise || sliderValue === minimum} onClick={() => selectAmount(sliderValue - state.big_blind)}>−</button>
          <input type="range" aria-label="Raise amount slider" aria-valuetext={`${fmt(sliderValue)} total chips`} min={minimum} max={state.max_raise_to} step="1" value={sliderValue} disabled={!canRaise} onChange={e => selectAmount(Number(e.target.value))} />
          <button type="button" aria-label="Increase bet" disabled={!canRaise || sliderValue === state.max_raise_to} onClick={() => selectAmount(sliderValue + state.big_blind)}>+</button>
        </div>
      </div>
      <button type="button" className="bet-back" data-key="esc" aria-keyshortcuts="Escape" onClick={back}>Back<kbd>Esc</kbd></button>
      <button type="submit" className="bet-submit" disabled={!canRaise || !valid}>{betLabel}</button>
      {!valid && <p className="bet-error" role="status">Enter {fmt(minimum)}–{fmt(state.max_raise_to)} total chips.</p>}
    </form> : <div className="primary-actions">
      <button className="quick-action" data-key="c" aria-keyshortcuts="C" disabled={!ready || !myTurn || (state.call_amount === 0 && (state.target > 0 || !state.can_raise))} onClick={() => send(state.call_amount ? { type: "check_call" } : { type: "raise", amount: minimum })}>
        {state.call_amount ? `Call ${fmt(state.call_amount)}` : `Bet ${fmt(minimum)}`}<kbd>C</kbd>
      </button>
      <button ref={betButton} data-key="r" aria-keyshortcuts="R" disabled={!canRaise} onClick={() => setEditing(true)}>{betLabel}<kbd>R</kbd></button>
      <button data-key="k" aria-keyshortcuts="K" aria-pressed={!myTurn && state.queued_action === 'check'} disabled={!ready || state.call_amount > 0} onClick={() => myTurn ? send({ type: "check_call" }) : queue('check')}>Check<kbd>K</kbd></button>
      {myTurn ? <FoldAction buttonRef={foldButton} ready={ready} callAmount={state.call_amount} playerId={state.you} fold={() => send({ type: "fold" })} /> : <button className="fold-action" data-key="f" aria-keyshortcuts="F" aria-pressed={state.queued_action === 'fold'} disabled={!ready} onClick={() => queue('fold')}>Fold<kbd>F</kbd></button>}
    </div>}
  </section>;
}
