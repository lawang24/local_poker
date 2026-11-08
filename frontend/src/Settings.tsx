import { useState } from "react";
import type { State, TableSettings } from "./types";
import type { Action } from "./ActionControls";
import { formatAmount, inputAmount, parseAmount } from "./amounts";

function describeSettings(settings: TableSettings) {
  const amount = (value: number) => formatAmount(value, settings.cents);
  return `${amount(settings.small_blind)} / ${amount(settings.big_blind)} blinds · ${settings.cents ? "Cents" : "Whole chips"} · 2–7 bonus ${amount(settings.seven_deuce_bonus)}`;
}

export function Settings({ state, ready, send, back }: {
  state: State; ready: boolean; send: (action: Action) => void; back: () => void;
}) {
  const saved = state.queued_settings ?? state;
  const [cents, setCents] = useState(saved.cents);
  const [sb, setSb] = useState(inputAmount(saved.small_blind, saved.cents));
  const [bb, setBb] = useState(inputAmount(saved.big_blind, saved.cents));
  const [bonusInput, setBonusInput] = useState(inputAmount(saved.seven_deuce_bonus, saved.cents));
  const bonus = parseAmount(bonusInput, cents);
  const small = parseAmount(sb, cents), big = parseAmount(bb, cents);
  const valid = small > 0 && big >= small && big <= 1_000_000 && bonus >= 0 && bonus <= 1_000_000;
  const changed = small !== saved.small_blind || big !== saved.big_blind || cents !== saved.cents || bonus !== saved.seven_deuce_bonus;
  return <section className="settings-page panel" aria-labelledby="settings-title">
    <button type="button" onClick={back}>← Back to table</button>
    <p className="eyebrow">SHARED LOBBY</p>
    <h2 id="settings-title">Settings</h2>
    <p className="hint">Anyone at the table can change these settings. {state.running ? "Edits take effect after this hand." : "Changes apply to every player."}</p>
    {state.running && <div className="settings-summary" role="status">
      <p><strong>This hand</strong> {describeSettings(state)}</p>
      {state.queued_settings && <p><strong>Queued for next hand</strong> {describeSettings(state.queued_settings)}</p>}
    </div>}
    <form onSubmit={e => {
      e.preventDefault();
      if (ready && valid && changed) send({ type: "settings", small_blind: small, big_blind: big, cents, seven_deuce_bonus: bonus });
    }}>
      <fieldset disabled={!ready}>
        <legend>Denominations</legend>
        <label className="setting-toggle">
          <span>Use cents<small>Use 0.01 increments for blinds, bets, and stacks. 100 whole units become 1.00 when enabled.</small></span>
          <input type="checkbox" role="switch" checked={cents} onChange={e => {
            const next = e.target.checked;
            if (Number.isFinite(small)) setSb(inputAmount(small, next));
            if (Number.isFinite(big)) setBb(inputAmount(big, next));
            if (Number.isFinite(bonus)) setBonusInput(inputAmount(bonus, next));
            setCents(next);
          }} />
        </label>
        <div className="blind-inputs">
          <label>Small blind (SB)<input type="number" required min={cents ? .01 : 1} max={cents ? 10000 : 1000000} step={cents ? .01 : 1} value={sb} onChange={e => setSb(e.target.value)} /></label>
          <label>Big blind (BB)<input type="number" required min={cents ? .01 : 1} max={cents ? 10000 : 1000000} step={cents ? .01 : 1} value={bb} onChange={e => setBb(e.target.value)} /></label>
        </div>
        <p className="hint">Blinds must be positive, with the big blind at least as large as the small blind.</p>
      </fieldset>
      <fieldset disabled={!ready}>
        <legend>2–7 offsuit game</legend>
        <label>Bonus per opponent
          <input type="number" required min={0} max={cents ? 10000 : 1000000} step={cents ? .01 : 1}
            value={bonusInput} onChange={e => setBonusInput(e.target.value)} aria-describedby="bonus-help" />
        </label>
        <p id="bonus-help" className="hint">Win with 2–7 offsuit by taking the main pot outright on every board or by getting everyone to fold. Each other player dealt in pays up to the amount they have left. Set to 0 to turn off.</p>
      </fieldset>
      <div className="settings-save">
        <button className="primary" disabled={!ready || !valid || !changed}>{state.running ? "Queue settings" : "Save settings"}</button>
        <span role="status">{!ready ? "Waiting for connection or update…" : changed ? "Unsaved changes" : state.queued_settings ? "Queued for next hand" : "Lobby settings are up to date"}</span>
      </div>
    </form>
  </section>;
}
