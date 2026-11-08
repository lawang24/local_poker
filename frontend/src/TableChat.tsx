import { useEffect, useRef, useState, type RefObject } from "react";

export function TableChat({ history, ready, send, dialog, trigger }: {
  dialog: RefObject<HTMLDialogElement | null>; trigger: RefObject<HTMLButtonElement | null>;
  history: string[]; ready: boolean; send: (text: string) => boolean;
}) {
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const scrollLog = () => { if (log.current) log.current.scrollTop = log.current.scrollHeight; };
  useEffect(scrollLog, [history]);

  return <>
    <aside className="desktop-chat" aria-label="Table chat and log">
      <button className="log-button" aria-haspopup="dialog" aria-controls="table-chat"
        onClick={() => dialog.current?.showModal()}>Table log</button>
      <div className="chat-strip">
        <div className="recent-activity" role="log" aria-label="Recent table activity">
          {history.slice(-3).map((message, i) => <p key={i}>{message}</p>)}
        </div>
        <button className="new-message" aria-label="New message" title="New message"
          aria-haspopup="dialog" aria-controls="table-chat" onClick={() => {
            dialog.current?.showModal();
            input.current?.focus();
          }}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M28 14c0 6-6 11-13 11l-8 4 2-6C5 21 3 18 3 14 3 8 9 3 16 3s12 5 12 11Z" />
            <circle cx="10" cy="14" r="1" /><circle cx="16" cy="14" r="1" /><circle cx="22" cy="14" r="1" /></svg>
        </button>
      </div>
    </aside>
    <dialog id="table-chat" aria-labelledby="chat-title" className="typing-panel chat-dialog" ref={dialog}
      onToggle={e => { if (e.newState === "open") scrollLog(); }}
      onClose={() => { if (trigger.current?.offsetWidth) trigger.current.focus({ preventScroll: true }); }}>
      <div className="chat-heading"><h2 id="chat-title">Table talk</h2>
        <button aria-label="Close chat" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      <div className="log" ref={log} role="log" aria-label="Table activity">
        {history.length ? history.map((m, i) => <p key={i}>{m}</p>) : <p className="hint">Welcome to the table. Say hello.</p>}
      </div>
      <form onSubmit={e => {
        e.preventDefault();
        if (!ready || !draft.trim() || !send(draft.trim())) return;
        setDraft("");
        dialog.current?.close();
      }}>
        <label className="sr-only" htmlFor="chat">Chat message</label>
        <input ref={input} id="chat" maxLength={300} enterKeyHint="send" value={draft}
          onChange={e => setDraft(e.target.value)} placeholder="Message the table…" />
        <button disabled={!ready || !draft.trim()}>Send</button>
      </form>
    </dialog>
  </>;
}
