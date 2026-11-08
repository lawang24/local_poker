import { useRef, useState } from "react";
import { formatAmount, inputAmount, parseAmount } from "./amounts";
import { RevealControls } from "./RevealControls";
import type { State } from "./types";

export type Action = { type: string; seat?: number; player_id?: string; amount?: number; text?: string; small_blind?: number; big_blind?: number; seven_deuce_bonus?: number; cents?: boolean; count?: number; hand_id?: string; hand_number?: number; cards?: number[] };

export function ActionControls({ state, ready, send }: {
  state: State; ready: boolean; send: (action: Action) => void;
}) {
  const fmt = (value: number) => formatAmount(value, state.cents);
  const unit = state.cents ? 100 : 1;
  const me = state.players.find(p => p.id === state.you)!;
  const myTurn = state.running && state.actor === state.you;
  const minimum = Math.min(state.min_raise_to, state.max_raise_to);
  const editor = useRef<HTMLDialogElement>(null);
  const [raiseTo, setRaiseTo] = useState(inputAmount(minimum, state.cents));
  const amount = parseAmount(raiseTo, state.cents);
  const canRaise = ready && myTurn && state.can_raise;
  const valid = raiseTo.trim() !== "" && Number.isInteger(amount) && amount > state.target && amount <= state.max_raise_to && (amount >= state.min_raise_to || amount === state.max_raise_to);
  const sliderValue = Number.isFinite(amount) ? Math.max(minimum, Math.min(state.max_raise_to, amount)) : minimum;
  const betLabel = state.target === 0 ? "Bet" : "Raise";
  const selectAmount = (value: number) => setRaiseTo(inputAmount(Math.max(minimum, Math.min(state.max_raise_to, Math.round(value))), state.cents));
  // A pot-sized raise includes the call, then raises by the pot after calling.
  const potRaise = (fraction: number) => me.committed + state.call_amount + (state.pot + state.call_amount) * fraction;
  if (state.street === "complete" && state.result && state.hand.length === 2) {
    return <RevealControls state={state} ready={ready} send={send} />;
  }
  if (!myTurn) return null;
  return <section className={`action-controls ${state.running ? "is-playing" : ""} ${myTurn ? "is-your-turn" : ""}`} aria-label="Game controls">
    <div className="action-status" role="status">
      {myTurn ? "Your turn" : `${state.players.find(p => p.id === state.actor)?.name || "Player"} to act`}
      <span>{!ready ? "Waiting for connection or update…" : myTurn ? state.call_amount ? `${fmt(state.call_amount)} to call${state.call_amount === me.stack ? " · all-in" : ""}` : "You can check" : "Actions unlock on your turn"}</span>
    </div>
    <div className="betting-controls">
      <dialog className="typing-panel bet-dialog" ref={editor} aria-labelledby="bet-title">
        <div className="feedback-heading"><h2 id="bet-title">{betLabel} amount</h2>
          <button type="button" aria-label="Close bet amount" onClick={() => editor.current?.close()}>×</button>
        </div>
        <form className="bet-form" onSubmit={e => {
          e.preventDefault();
          if (canRaise && valid) {
            send({ type: "raise", amount });
            editor.current?.close();
          }
        }}>
        <div className="raise-sizing">
          <label className="raise-amount">{betLabel} to
            <input inputMode={state.cents ? "decimal" : "numeric"} aria-label={`${betLabel} to (total chips)`} type="number" step={1 / unit} min={minimum / unit} max={state.max_raise_to / unit} value={raiseTo} disabled={!canRaise} aria-invalid={!valid} aria-describedby="raise-help" onFocus={e => e.target.select()} onChange={e => setRaiseTo(e.target.value)} />
          </label>
          <input className="raise-slider" type="range" aria-label="Raise amount slider" aria-valuetext={`${fmt(sliderValue)} total chips`} min={minimum} max={state.max_raise_to} step="1" value={sliderValue} disabled={!canRaise} onChange={e => setRaiseTo(inputAmount(Number(e.target.value), state.cents))} />
        </div>
        <div className="bet-presets" aria-label="Bet sizes">
          <button type="button" disabled={!canRaise} onClick={() => selectAmount(minimum)}>Min</button>
          <button type="button" disabled={!canRaise} onClick={() => selectAmount(potRaise(.5))}>½ pot</button>
          <button type="button" disabled={!canRaise} onClick={() => selectAmount(potRaise(1))}>Pot</button>
          <button type="button" disabled={!canRaise} onClick={() => selectAmount(state.max_raise_to)}>All-in</button>
        </div>
        <p id="raise-help" className="raise-help">{valid ? `${fmt(amount)} total · ${fmt((amount - me.committed))} more chips${amount === state.max_raise_to ? " · all-in" : ""}` : `Enter ${fmt(minimum)}–${fmt(state.max_raise_to)} total chips.`}</p>
        <div className="raise-confirmation">
          <button type="button" className="cancel-action" onClick={() => editor.current?.close()}>Cancel</button>
          <button className="confirm-action" disabled={!canRaise || !valid}>Confirm {betLabel.toLowerCase()}{valid ? ` ${fmt(amount)}` : ""}</button>
        </div>
      </form>
      </dialog>
      <div className="primary-actions">
        {state.call_amount > 0 && <button className="call-action" disabled={!ready || !state.call_amount} onClick={() => send({type:"check_call"})}>Call{state.call_amount > 0 ? ` ${fmt(state.call_amount)}` : ""}{state.call_amount > 0 && state.call_amount === me.stack && <small>All-in</small>}</button>}
        <button className="raise-action" disabled={!canRaise} onClick={() => editor.current?.showModal()}>{betLabel}</button>
        {state.call_amount === 0 && <button className="check-action" disabled={!ready || state.call_amount > 0} onClick={() => send({type:"check_call"})}>Check</button>}
        <button className="fold-action" disabled={!ready} onClick={() => send({type:"fold"})}>Fold</button>
      </div>
    </div>
  </section>;
}
