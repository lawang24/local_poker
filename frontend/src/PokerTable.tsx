import { useRef, useState, type CSSProperties } from "react";
import type { Action } from "./ActionControls";
import { formatAmount, inputAmount, parseAmount } from "./amounts";
import { Cards } from "./Cards";
import type { Player, State } from "./types";

// Percentage anchors run clockwise from seat one. All viewers share the
// same seat order on the desktop oval and the two portrait rails.
const seats = [
  { x: 50,   y: 89,   betX: 50,   betY: 78,   dealerX: 41, dealerY: 78, mobileX: 50, mobileY: 86 },
  { x: 17,   y: 72.8, betX: 28.5, betY: 68,   dealerX: 30, dealerY: 75, mobileX: 14, mobileY: 74 },
  { x: 11.5, y: 46.8, betX: 24,   betY: 46.8, dealerX: 23, dealerY: 56, mobileX: 14, mobileY: 58 },
  { x: 17,   y: 20.8, betX: 29.5, betY: 28.5, dealerX: 22.5, dealerY: 32.4, mobileX: 14, mobileY: 33 },
  { x: 38,   y: 8.8,  betX: 40,   betY: 23,   dealerX: 47.1, dealerY: 20.2, mobileX: 14, mobileY: 17 },
  { x: 62,   y: 8.8,  betX: 58,   betY: 23,   dealerX: 51, dealerY: 20.9, mobileX: 86, mobileY: 17 },
  { x: 83,   y: 20.8, betX: 70.5, betY: 28.5, dealerX: 75, dealerY: 35.8, mobileX: 86, mobileY: 33 },
  { x: 89.5, y: 46.8, betX: 76.5, betY: 46.8, dealerX: 78.6, dealerY: 59.6, mobileX: 86, mobileY: 58 },
  { x: 84,   y: 72.8, betX: 71.5, betY: 68,   dealerX: 70, dealerY: 75, mobileX: 86, mobileY: 74 },
];

function seatPosition(index: number): CSSProperties {
  const { x, y, mobileX, mobileY } = seats[index];
  return { "--seat-x": `${x}%`, "--seat-y": `${y}%`,
    "--mobile-x": `${mobileX}%`, "--mobile-y": `${mobileY}%` } as CSSProperties;
}

function Seat({ player, state, index, select, speech }: {
  player: Player; state: State; index: number; select: () => void; speech?: string;
}) {
  const mine = player.id === state.you;
  const cards = mine ? state.hand : state.result?.hands[player.id] ?? state.runout_vote?.hands?.[player.id] ?? [];
  const covered = !mine && state.running && player.in_hand && !player.folded;
  const acting = state.actor === player.id;
  const payout = state.result?.payouts[player.id] || 0;
  const result = state.result;
  const strengths = mine ? state.hand_strengths : state.shown_hand_strengths?.[player.id];
  const shownIndices = result?.shown_indices?.[player.id];
  const slots = !mine && cards.length === 1 && shownIndices
    ? [0, 1].map(i => shownIndices.includes(i) ? cards[0] : null) : cards;
  // Per-run pots exclude uncalled chip returns. Fold wins have no runouts.
  const wonRuns = result?.runouts?.map(run =>
    run.pots.some(pot => pot.amount > 0 && pot.winners.includes(player.id)));
  const winner = wonRuns?.length
    ? wonRuns.some(Boolean)
    : result?.pots.some(pot => pot.winners.includes(player.id));
  const waiting = player.connected && !player.in_hand;
  const label = !player.connected ? "Disconnected" : player.folded ? "Folded"
    : player.all_in && state.running ? "All-in" : acting ? "To act"
    : waiting ? "Waiting" : "";
  return <article
    className={`table-seat ${mine ? "is-you" : ""} ${acting ? "is-acting" : ""} ${player.folded ? "is-folded" : ""} ${!player.connected ? "is-disconnected" : ""} ${winner ? "is-winner" : ""}`}
    style={seatPosition(index)}
    data-seat={index + 1}
    aria-label={`${player.name}${mine ? ", you" : ""}, ${formatAmount(player.stack, state.cents)} chips${winner ? ", winner" : ""}${label ? `, ${label}` : ""}`}
  >
    {speech && <div className="seat-speech"><span>{speech}</span></div>}
    {index === 0 && state.running && player.committed > 0 && <div className="table-bet south-bet" aria-label={`${player.name} bet ${formatAmount(player.committed, state.cents)}`}>{formatAmount(player.committed, state.cents)}</div>}
    <div className="seat-body">
      {waiting && <span className="seat-waiting" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
          <circle cx="12" cy="12" r="9.5" />
          <path d="M12 6v6H7" />
        </svg>
        Waiting
      </span>}
      <div className="seat-cards">
        {cards.length ? <Cards cards={slots} hole /> : covered ? <div className="card-backs" aria-label="Two hidden cards"><span /><span /></div> : <div className="empty-cards" aria-hidden="true">{player.folded ? "×" : ""}</div>}
      </div>
      <button type="button" className="nameplate" onClick={select} aria-label={`Player options for ${player.name}`}>
        <strong title={player.name}>{player.name}</strong>
        <span className="seat-balance">{formatAmount(player.stack, state.cents)}</span>
        {payout > 0 && <span className="seat-payout">+{formatAmount(payout, state.result?.cents ?? state.cents)}</span>}
        {label && !waiting && !payout && <span className="player-status">{label}</span>}
      </button>
      {!!strengths?.length && <div className={`hand-strength ${strengths.length > 1 ? "two-runs" : ""}`} aria-live="polite">
        <span className="sr-only">{mine ? "Your" : player.name + "’s"} made hand: </span>
        <div className="hand-badge">
          {strengths.map((strength, i) => <div key={i} className={`hand-name ${wonRuns?.[i] ? "won-run" : ""}`}>
            {strengths.length > 1 && <><span className="sr-only">Run {i + 1}: </span><span className="run-number" aria-hidden="true">#{i + 1}</span></>}
            {strength}{wonRuns?.[i] && <span className="sr-only">, winner</span>}
          </div>)}
        </div>
      </div>}
    </div>
  </article>;
}

function PlayerStackEditor({ player, state, ready, send, close }: {
  player: Player; state: State; ready: boolean; send: (action: Action) => void; close: () => void;
}) {
  const cents = state.queued_settings?.cents ?? state.cents;
  const [draft, setDraft] = useState<string | null>(null);
  const stack = draft ?? inputAmount(state.queued_stack ?? player.stack, cents);
  const amount = parseAmount(stack, cents);
  const valid = Number.isInteger(amount) && amount >= 0 && amount <= 1_000_000;
  const unit = cents ? 100 : 1;
  return <form onSubmit={event => {
    event.preventDefault();
    if (!ready || !valid) return;
    send({ type: "set_stack", amount });
    if (!state.running) close();
  }}>
    <label>Your stack
      <input type="number" min="0" max={1_000_000 / unit} step={1 / unit}
        required value={stack} disabled={!ready}
        onChange={event => setDraft(event.target.value)} aria-describedby="player-stack-help" />
    </label>
    <p id="player-stack-help" className="hint">{state.running
      ? `Set your total for the next hand in ${cents ? "cents" : "whole chips"}. It replaces your balance after payouts.`
      : `Set your total stack from 0 to ${formatAmount(1_000_000, state.cents)} chips.`}</p>
    {state.queued_stack != null && <p className="queued-stack" role="status">Queued for next hand · {formatAmount(state.queued_stack, cents)} chips</p>}
    <button className="primary" disabled={!ready || !valid || amount === state.queued_stack}>{state.running ? "Queue stack" : "Set stack"}</button>
  </form>;
}

export function PokerTable({ state, ready, send, speech }: {
  speech: Record<string, string>;
  state: State; ready: boolean; send: (action: Action) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [editorVersion, setEditorVersion] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const player = state.players.find(p => p.id === selected);
  const players = state.players;

  const dealer = players.find(p => p.id === state.dealer);
  const eligible = players.filter(p => p.connected && p.stack > 0).length;
  const runouts = state.result?.runouts;
  const bonus = state.result?.seven_deuce_bonus;
  const twice = runouts && runouts.length > 1;
  return <div className={`table-stage ${twice ? "has-two-runouts" : ""}`} data-player-count={seats.length}>
    <div className="felt">
      <div className="board-content">
        <div className="pot" aria-label={`Pot ${formatAmount(state.pot, state.cents)} chips`}><span>Pot</span> {formatAmount(state.pot, state.cents)}</div>
        {twice ? <div className="runout-boards" aria-label="Two runout results">
          {runouts.map((runout, index) => <section key={index} aria-label={`Run ${index + 1}`}>
            <h3>Run {index + 1}</h3>
            <div className="community-cards"><Cards cards={runout.board} /></div>
            <p className="runout-winners">{Object.entries(runout.payouts).filter(([, amount]) => amount > 0).map(([id, amount]) => `${players.find(p => p.id === id)?.name || "Player"}: +${formatAmount(amount, state.result?.cents ?? state.cents)}`).join(" · ")}</p>
          </section>)}
        </div> : <div className="community-cards">
          <Cards cards={state.board} />
        </div>}
        <p className="table-caption">{bonus ? `2–7 offsuit bonus +${formatAmount(bonus.total, state.result?.cents ?? state.cents)}` : state.runout_vote ? "Choosing runouts" : state.running ? `${players.find(p => p.id === state.actor)?.name || "Table"} to act` : eligible < 2 ? "Waiting for players with chips" : state.street === "complete" ? "Next hand starting soon" : "First hand starting soon"}</p>
        <p className="board-meta">Hand #{state.hand_number} · {state.street}<span className="board-blinds"> · {formatAmount(state.small_blind, state.cents)} / {formatAmount(state.big_blind, state.cents)}</span>{state.seven_deuce_bonus > 0 && ` · 2–7: ${formatAmount(state.seven_deuce_bonus, state.cents)}`}</p>
      </div>
      <span className="felt-brand" aria-hidden="true">larrypokernow</span>
    </div>
    {dealer && <span className="dealer-marker" data-seat={dealer.seat + 1}
      style={{
        ...seatPosition(dealer.seat),
        "--dealer-x": `${seats[dealer.seat].dealerX}%`,
        "--dealer-y": `${seats[dealer.seat].dealerY}%`,
      } as CSSProperties}
      role="img" aria-label={`Dealer: ${dealer.name}`} title={`Dealer: ${dealer.name}`}>D</span>}
    {seats.map((_, index) => {
      const occupant = players.find(p => p.seat === index);
      return occupant ? <Seat key={index} speech={speech[occupant.id]} player={occupant} state={state} index={index} select={() => {
        setSelected(occupant.id);
        setEditorVersion(version => version + 1);
        dialog.current?.showModal();
      }} /> : <button key={index} className="table-seat empty-seat" data-seat={index + 1} aria-label={`Seat ${index + 1}`} type="button"
        style={seatPosition(index)}
        disabled={!ready || state.running} title={state.running ? "Change seats between hands" : `Move to seat ${index + 1}`}
        onClick={() => send({ type: "move_seat", seat: index })}>
        <span className="empty-seat-number" aria-hidden="true">{index + 1}</span><span aria-hidden="true">Sit</span><span className="sr-only">Seat {index + 1}</span>
      </button>;
    })}
    <dialog ref={dialog} className="feedback-modal player-modal" aria-labelledby="player-title">
      <h2 id="player-title">{player?.name || "Player has left"}</h2>
      {player && <p>Seat {player.seat + 1} · {formatAmount(player.stack, state.cents)} chips</p>}
      {player?.id === state.you
        ? <>
          <PlayerStackEditor key={`${editorVersion}:${state.queued_stack}:${state.queued_settings?.cents ?? state.cents}`}
            player={player} state={state} ready={ready} send={send} close={() => dialog.current?.close()} />
          {!state.running && <p className="hint">Click an empty seat to move between hands.</p>}
        </>
        : player && <p>Remove this player from the table? Their remaining chips will be cashed out. They can join again manually.</p>}
      {state.running && <p className="hint">Finish the current hand before moving seats or removing players.</p>}
      <div className="feedback-actions">
        <button autoFocus onClick={() => dialog.current?.close()}>{player?.id === state.you && state.queued_stack != null ? "Done" : "Cancel"}</button>
        {player && player.id !== state.you && <button className="danger" disabled={!ready || state.running} onClick={() => {
          send({ type: "kick", player_id: player.id });
          dialog.current?.close();
        }}>Kick player</button>}
      </div>
    </dialog>
    {players.map((player) => {
      const index = player.seat;
      const { betX, betY, mobileX, mobileY } = seats[index];
      return index !== 0 && state.running && player.committed > 0 ? <div key={player.id} className={`table-bet ${mobileX < 50 ? "bet-left" : "bet-right"}`} style={{"--desktop-bet-x": `${betX}%`, "--desktop-bet-y": `${betY}%`, "--mobile-bet-y": `${mobileY + (mobileY < 50 ? 8 : -3)}%`} as CSSProperties} aria-label={`${player.name} bet ${formatAmount(player.committed, state.cents)}`}><i aria-hidden="true" />{formatAmount(player.committed, state.cents)}</div> : null;
    })}
  </div>;
}
