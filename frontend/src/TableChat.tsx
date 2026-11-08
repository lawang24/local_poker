import { useEffect, useRef, useState, type RefObject } from "react";

const compactLayout = "(max-width: 1023px)";
export function TableChat({ history, ready, send, dialog, trigger }: {
  dialog: RefObject<HTMLDialogElement | null>; trigger: RefObject<HTMLButtonElement | null>;
  history: string[]; ready: boolean; send: (text: string) => boolean;
}) {
  const [compact, setCompact] = useState(() => matchMedia(compactLayout).matches);
  const [draft, setDraft] = useState("");
  const log = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = matchMedia(compactLayout);
    const change = () => setCompact(media.matches);
    media.addEventListener("change", change);
    return () => media.removeEventListener("change", change);
  }, []);
  const scrollLog = () => { if (log.current) log.current.scrollTop = log.current.scrollHeight; };
  useEffect(scrollLog, [history, compact]);

  const panel = <>
    <div className="chat-heading">
      <h2 id="chat-title">Table talk</h2>
      {compact && <button aria-label="Close chat" onClick={() => dialog.current?.close()}>Close</button>}
    </div>
    <div className="log" ref={log} role="log" aria-label="Table activity">
      {history.length ? history.map((m, i) => <p key={i}>{m}</p>) : <p className="hint">Welcome to the table. Say hello.</p>}
    </div>
    <form onSubmit={e => {
      e.preventDefault();
      if (!ready || !draft.trim() || !send(draft.trim())) return;
      setDraft("");
      if (compact) dialog.current?.close();
    }}>
      <label className="sr-only" htmlFor="chat">Chat message</label>
      <input id="chat" maxLength={300} enterKeyHint="send" value={draft}
        onChange={e => setDraft(e.target.value)} placeholder="Message the table…" />
      <button disabled={!ready || !draft.trim()}>Send</button>
    </form>
  </>;
  return compact ? <dialog id="table-chat" aria-labelledby="chat-title" className="typing-panel chat-dialog" ref={dialog}
    onToggle={e => { if (e.newState === "open") scrollLog(); }}
    onClose={() => trigger.current?.focus({ preventScroll: true })}>{panel}</dialog>
    : <aside className="panel chat-panel">{panel}</aside>;
}
