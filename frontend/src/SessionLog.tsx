import { useState, type RefObject } from "react";
import { formatAmount, inputAmount } from "./amounts";
import type { LedgerRow, LedgerSession, State } from "./types";
import "./SessionLog.css";

const columns = { buy_in: "Buy-in", buy_out: "Buy-out", stack: "Stack", net: "Net" } as const;
type Column = keyof typeof columns;
const keys = Object.keys(columns) as Column[];

function downloadLedger(rows: LedgerRow[], cents: boolean) {
  const records = [["Player", "Player ID", "Session Start", "Session End", "Buy-in", "Buy-out", "Stack", "Net"]];
  for (const row of rows) {
    for (const session of row.sessions) {
      const stack = session.end ? 0 : row.stack;
      // Nicknames may contain delimiters, quotes, or a spreadsheet formula prefix.
      const name = /^[\s]*[=+@-]/.test(session.name) ? "'" + session.name : session.name;
      records.push([name, row.id, session.start, session.end ?? "", ...[
        session.buy_in, session.buy_out, stack, session.buy_out + stack - session.buy_in,
      ].map(amount => inputAmount(amount, cents))]);
    }
  }
  const csv = records.map(row => row.map(value => '"' + value.replaceAll('"', '""') + '"').join(",")).join("\r\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = "session-ledger.csv";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Numbers({ values, cents }: { values: Record<Column, number>; cents: boolean }) {
  return <div className="ledger-numbers">{keys.map(key => {
    const amount = values[key];
    const short = key === "buy_in" ? "In" : key === "buy_out" ? "Out" : columns[key];
    return <span key={key} className={key === "net" ? amount < 0 ? "ledger-loss" : "ledger-gain" : ""}>
      <b>{short}: </b>{key === "net" && amount > 0 ? "+" : ""}{formatAmount(amount, cents)}
    </span>;
  })}</div>;
}

function SessionDetail({ session, stack, cents }: { session: LedgerSession; stack: number; cents: boolean }) {
  const balance = session.end ? 0 : stack;
  return <div className="ledger-line ledger-detail">
    <div className="ledger-movements">
      <span>{new Date(session.start).toLocaleString()}{session.end && " – " + new Date(session.end).toLocaleString()}</span>
      {session.movements.map((move, i) => <span key={i} className={'ledger-movement ' + (move.incoming ? 'incoming' : 'outgoing')}
        title={new Date(move.at).toLocaleString()}>
        <small>{move.reason === "seat_entry" ? "Took a seat" : move.reason === "seat_removed" ? "Left the seat" : move.incoming ? "Add-on" : "Removed chips"}</small>
        {formatAmount(move.amount, cents)}</span>)}
    </div>
    <Numbers values={{...session, stack: balance, net: balance + session.buy_out - session.buy_in}} cents={cents} />
  </div>;
}

function PlayerRow({ row, cents }: { row: LedgerRow; cents: boolean }) {
  const [expanded, setExpanded] = useState(false);
  return <section className="ledger-player" aria-label={row.name}>
    <div className="ledger-line">
      <div className="ledger-identity">
        <strong>{row.name} <small title={row.id}>@ {row.id}</small></strong>
        <button aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "Hide details" : "Details"}</button>
      </div>
      <Numbers values={row} cents={cents} />
    </div>
    {expanded && row.sessions.map(session => <SessionDetail key={session.start} session={session} stack={row.stack} cents={cents} />)}
  </section>;
}

export function SessionLog({ dialog, state }: { dialog: RefObject<HTMLDialogElement | null>; state: State }) {
  const [ledger, setLedger] = useState(false);
  const [sort, setSort] = useState<{key: Column; descending: boolean}>({key: "net", descending: true});
  const rows = [...(state.ledger ?? [])].sort((a, b) => (b[sort.key] - a[sort.key]) * (sort.descending ? 1 : -1));
  return <dialog id="session-log" className="session-log" ref={dialog} aria-labelledby="session-title" onClose={() => setLedger(false)}>
    <div className="session-heading"><h2 id="session-title">{ledger ? "Session Ledger" : "Session Log"}</h2>
      <button autoFocus aria-label="Close session log" onClick={() => dialog.current?.close()}>×</button></div>
    <div className="session-content" key={String(ledger)}>
      {ledger ? <>
        <div className="ledger-columns ledger-line"><span>Player</span><div>{keys.map(key => <button key={key}
          onClick={() => setSort({ key, descending: sort.key !== key || !sort.descending })}>
          {columns[key]}{sort.key === key && (sort.descending ? "↓" : "↑")}</button>)}</div></div>
        {rows.map(row => <PlayerRow key={row.id} row={row} cents={state.cents} />)}
        <div className="ledger-total ledger-line"><span>Table total</span><div>{(["buy_in", "buy_out", "stack"] as const).map((key, i) =>
          <strong key={key}><b>{["In", "Out", "Stack"][i]}: </b>{formatAmount(rows.reduce((sum, row) => sum + row[key], 0), state.cents)}</strong>)}</div></div>
      </> : state.history.length ? [...state.history].reverse().map((message, i) => <p className="session-message" key={i}>{message}</p>) :
        <p className="session-message">No table activity yet.</p>}
    </div>
    <div className="session-footer">
      {ledger && <button className="ledger-download" onClick={() => downloadLedger(rows, state.cents)}>Download</button>}
      <div className="session-switch"><button aria-pressed={!ledger} onClick={() => setLedger(false)}>Full log</button>
        <button aria-pressed={ledger} onClick={() => setLedger(true)}>Ledger</button></div>
    </div>
  </dialog>;
}
