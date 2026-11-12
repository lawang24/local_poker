import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import type { State } from "./types";

export function TableChat({ messages, ready, send, dialog, trigger, openLog }: {
  dialog: RefObject<HTMLDialogElement | null>; trigger: RefObject<HTMLButtonElement | null>;
  openLog: () => void; messages: State["chat_history"]; ready: boolean; send: (text: string) => boolean;
}) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [composing, setComposing] = useState(false);
  const dockButton = useRef<HTMLButtonElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const lastMessage = messages.at(-1);
  useEffect(() => {
    for (const list of [dock.current, transcript.current]) {
      if (list) list.scrollTop = list.scrollHeight;
    }
  }, [messages.length, lastMessage?.name, lastMessage?.text, expanded]);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!ready || !text || !send(text)) return;
    setDraft("");
    if (dialog.current?.open) dialog.current.close();
    else {
      setComposing(false);
      dockButton.current?.focus({ preventScroll: true });
    }
  }

  const rows = messages.map((message, i) => <p key={i}><b>{message.name}</b> {message.text}</p>);
  const empty = <p className="hint">It’s a bit quiet here. Send a message!</p>;
  return <>
    <aside className="desktop-chat" aria-label="Table chat and log">
      <button className="log-button" aria-haspopup="dialog" aria-controls="session-log"
        onClick={openLog}>Log / Ledger</button>
      <div className={'chat-strip' + (expanded ? ' expanded' : '')}>
        <div className="recent-chat" ref={dock} role="log" aria-label="Recent chat messages">
          {messages.length ? rows : empty}
        </div>
        <button className="chat-expand" aria-label={expanded ? "Collapse chat" : "Expand chat"}
          aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{expanded ? "⌄" : "⌃"}</button>
        <button ref={dockButton} className="new-message" aria-label="New message" title="New message"
          aria-expanded={composing} onClick={() => setComposing(!composing)}>
          <svg viewBox="0 0 32 32" aria-hidden="true"><path d="M28 14c0 6-6 11-13 11l-8 4 2-6C5 21 3 18 3 14 3 8 9 3 16 3s12 5 12 11Z" />
            <circle cx="10" cy="14" r="1" /><circle cx="16" cy="14" r="1" /><circle cx="22" cy="14" r="1" /></svg>
        </button>
        {composing && <form className="dock-composer" onSubmit={submit}
          onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget) && e.relatedTarget !== dockButton.current) setComposing(false); }}
          onKeyDown={e => { if (e.key === "Escape") { setComposing(false); dockButton.current?.focus(); } }}>
          <input autoFocus aria-label="Chat message" maxLength={300} value={draft}
            onChange={e => setDraft(e.target.value)} placeholder="Your Message (press Enter to submit)" />
        </form>}
      </div>
    </aside>
    <dialog id="table-chat" aria-labelledby="chat-title" className="typing-panel chat-dialog" ref={dialog}
      onToggle={e => { if (e.newState === "open" && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }}
      onClose={() => { if (trigger.current?.offsetWidth) trigger.current.focus({ preventScroll: true }); }}>
      <div className="chat-heading"><h2 id="chat-title">Table talk</h2>
        <button aria-label="Close chat" onClick={() => dialog.current?.close()}>Close</button>
      </div>
      <div className="log" ref={transcript} role="log" aria-label="Chat messages">
        {messages.length ? rows : empty}
      </div>
      <form onSubmit={submit}>
        <label className="sr-only" htmlFor="chat">Chat message</label>
        <input id="chat" maxLength={300} enterKeyHint="send" value={draft}
          onChange={e => setDraft(e.target.value)} placeholder="Your Message (press Enter to submit)" />
        <button disabled={!ready || !draft.trim()}>Send</button>
      </form>
    </dialog>
  </>;
}
