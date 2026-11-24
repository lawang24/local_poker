import { useEffect, useRef, useState, type FormEvent, type RefObject } from "react";
import type { State } from "./types";
import "./TableChat.css";

type Message = State["chat_history"][number];
const clock = new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

function transcriptRows(messages: Message[], selfId: string) {
  const groups: Message[][] = [];
  for (const message of messages) {
    const group = groups.at(-1);
    if (group && group[0].player_id === message.player_id && group[0].name === message.name) group.push(message);
    else groups.push([message]);
  }
  return groups.map((group, index) => {
    const first = group[0];
    const sent = group.at(-1)?.sent_at;
    return <div className="chat-row" key={index}>
      <span className={'chat-author' + (first.player_id === selfId ? ' self' : '')}>{first.name}</span>
      <span className="chat-body">{group.map(message => message.text).join("\n")}
        {sent && <time dateTime={sent}> ◷ {clock.format(new Date(sent))}</time>}
      </span>
    </div>;
  });
}

export function TableChat({ messages, selfId, ready, send, dialog, trigger, openLog }: {
  dialog: RefObject<HTMLDialogElement | null>; trigger: RefObject<HTMLButtonElement | null>;
  openLog: () => void; messages: Message[]; selfId: string; ready: boolean; send: (text: string) => boolean;
}) {
  const [draft, setDraft] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [composing, setComposing] = useState(false);
  const logButton = useRef<HTMLButtonElement>(null);
  const dockButton = useRef<HTMLButtonElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLDivElement>(null);
  const last = messages.at(-1);
  useEffect(() => {
    for (const list of [dock.current, transcript.current]) {
      if (list) list.scrollTop = list.scrollHeight;
    }
  }, [messages.length, last?.sent_at, last?.name, last?.text, expanded]);
  useEffect(() => {
    function shortcut(e: KeyboardEvent) {
      if (e.defaultPrevented || e.repeat || e.metaKey || e.ctrlKey || e.altKey ||
          !dockButton.current?.offsetWidth ||
          document.querySelector("dialog[open]") ||
          (e.target instanceof Element && e.target.closest("input, textarea, select, [contenteditable=true]"))) return;
      const key = e.key.toLowerCase();
      if (key === "m") { e.preventDefault(); setComposing(true); }
      if (key === "l") { e.preventDefault(); logButton.current?.click(); }
    }
    document.addEventListener("keydown", shortcut);
    return () => document.removeEventListener("keydown", shortcut);
  }, []);

  function submit(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!ready || !text || !send(text)) return;
    setDraft("");
    if (dialog.current?.open) dialog.current.querySelector("input")?.blur();
    else {
      setComposing(false);
      dockButton.current?.focus({ preventScroll: true });
    }
  }

  const input = (focus: boolean) => <input autoFocus={focus} aria-label="Chat message" maxLength={300}
    enterKeyHint="send" autoComplete="off" value={draft} onChange={e => setDraft(e.target.value)}
    placeholder="Your Message (press Enter to submit)" />;
  const rows = transcriptRows(messages, selfId);
  return <>
    <aside className="desktop-chat" aria-label="Table chat and log">
      <div className="chat-links" hidden={expanded}><button ref={logButton} aria-keyshortcuts="L" className="log-button" aria-haspopup="dialog" aria-controls="session-log"
        onClick={openLog}>Log / Ledger<small aria-hidden="true">L</small></button></div>
      <div className={'chat-strip' + (expanded ? ' expanded' : '')}>
        <div className="recent-chat" ref={dock} role="log" aria-label="Recent chat messages">
          {rows.length ? rows : <div className="quiet-chat">It's a bit quiet here.<br />Click on the balloon and send a Message!</div>}
        </div>
        <button className="chat-expand" aria-label={expanded ? "Collapse chat" : "Expand chat"}
          aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m2 10 6-6 6 6m-12 4 6-6 6 6" /></svg>
        </button>
        <button ref={dockButton} className="new-message" aria-label="New message" title="New message (M)"
          aria-keyshortcuts="M" aria-expanded={composing} onClick={() => setComposing(!composing)}>
          <small>M</small><svg viewBox="0 0 32 32" aria-hidden="true"><path d="M28 14c0 6-6 11-13 11l-8 4 2-6C5 21 3 18 3 14 3 8 9 3 16 3s12 5 12 11Z" />
            <circle cx="10" cy="14" r="1" /><circle cx="16" cy="14" r="1" /><circle cx="22" cy="14" r="1" /></svg>
        </button>
        {composing && <form className="dock-composer chat-composer" onSubmit={submit}
          onBlur={e => { if (e.relatedTarget !== dockButton.current) setComposing(false); }}
          onKeyDown={e => { if (e.key === "Escape") { setComposing(false); dockButton.current?.focus(); } }}>
          {input(true)}
        </form>}
      </div>
    </aside>
    <dialog id="table-chat" aria-label="Table chat" className="typing-panel chat-dialog" ref={dialog}
      onClick={e => { if (e.target === e.currentTarget && e.clientY < e.currentTarget.getBoundingClientRect().top) e.currentTarget.close(); }}
      onToggle={e => { if (e.newState === "open" && transcript.current) transcript.current.scrollTop = transcript.current.scrollHeight; }}
      onClose={() => trigger.current?.focus({ preventScroll: true })}>
      <div className="phone-transcript" ref={transcript} role="log" aria-label="Chat messages">
        {rows.length ? rows : <div className="quiet-chat">It's a bit quiet here.</div>}
      </div>
      <form className="chat-composer" onSubmit={submit}>{input(false)}</form>
    </dialog>
  </>;
}
