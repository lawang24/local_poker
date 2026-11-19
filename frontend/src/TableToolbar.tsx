import { useRef, useState, type RefObject } from "react";
import { Feedback } from "./Feedback";
import "./TableToolbar.css";

export function TableToolbar({ name, status, blinds, paused, away, ready, pause, toggleAway, settingsOpen, settings, leave, chatButton, openChat, openLog }: {
  paused: boolean; away: boolean; ready: boolean; pause: () => void; toggleAway: () => void;
  chatButton: RefObject<HTMLButtonElement | null>; openChat: () => void; openLog: () => void;
  name: string; status: string; blinds: string; settingsOpen: boolean; settings: () => void; leave: () => void;
}) {
  const menu = useRef<HTMLDialogElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  return <header className="table-toolbar">
    {!settingsOpen && <><strong className="table-wordmark">larrypokernow</strong>
      <span className="table-stakes" aria-label={`No-limit Hold’em, blinds ${blinds}`}>NLH ~ {blinds}</span></>}
    <div className="personal-controls">
    <button className="toolbar-icon" aria-label="Options" onClick={() => menu.current?.showModal()}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18M3 12h18M3 19h18" /></svg>
      <span>Options</span>
    </button>
    {!settingsOpen && <>
      <button className="toolbar-icon leave-control" aria-label="Leave table" title="Leave table" onClick={leave}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /><path d="M13 2 23 12 13 22v-6H7V8h6Z" /></svg>
        <span>Leave seat</span>
      </button>
      <button className="toolbar-icon away-toggle" disabled={!ready} aria-label={away ? "I'm back" : "Away"} aria-pressed={away} onClick={toggleAway}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="3" r="3" /><path d="M6 7h12a2 2 0 0 1 2 2v7h-3v-6h-1v14h-3v-9h-2v9H8V10H7v6H4V9a2 2 0 0 1 2-2Z" /></svg>
        <span>{away ? "I'm back" : "Away"}</span>
      </button>
    </>}
    </div>
    {!settingsOpen && <>
      <button className="toolbar-icon pause-toggle" disabled={!ready} aria-label={paused ? "Resume game" : "Pause game"} title={paused ? "Resume game" : "Pause game"} aria-pressed={paused} onClick={pause}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="m8 4 12 8-12 8Z" /> : <path d="M4 3h6v18H4Zm10 0h6v18h-6Z" />}</svg>
        <span>{paused ? "Resume" : "Pause"}</span>
      </button>
    </>}
    <span className={`status ${status === "Connected" ? "online" : ""}`} role="status" title={status}><span className="sr-only">{status}</span></span>
    {!settingsOpen && <div className="mobile-chat-controls">
      <button ref={chatButton} className="table-chat-toggle" aria-haspopup="dialog"
        aria-controls="table-chat" onClick={openChat}>Chat</button>
      <button className="table-chat-toggle" aria-haspopup="dialog"
        aria-controls="session-log" onClick={openLog}>Log</button>
    </div>}
    <dialog ref={menu} className="feedback-modal table-options" aria-labelledby="options-title">
      <div className="feedback-heading"><h2 id="options-title">Table options</h2><button autoFocus aria-label="Close options" onClick={() => menu.current?.close()}>×</button></div>
      <p className="hint">{name} · {status}</p>
      <nav aria-label="Table options">
        <button onClick={() => { menu.current?.close(); settings(); }}>{settingsOpen ? "Back to table" : "Settings"}</button>
        <button onClick={async () => {
          try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}`); setCopied(true); setCopyError(false); }
          catch { setCopyError(true); }
        }}>{copied ? "Link copied" : "Invite friends"}</button>
        <Feedback name={name} />
      </nav>
      {copyError && <p role="alert">Copy the table URL from your address bar to invite friends.</p>}
      <details><summary>How this table works</summary><p>Play chips only. Hands deal automatically when two connected players have chips and are not away. Away keeps your seat, auto-checks or folds this hand, and skips future deals. Pause freezes play until anyone resumes. Click your name to set your stack. During play, stack and settings edits apply after the hand. Disconnecting folds a live hand unless you’re all-in. Refreshing restores a retained seat.</p></details>
    </dialog>
  </header>;
}
