import { useRef, useState, type RefObject } from "react";
import { Feedback } from "./Feedback";

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
    <button className="toolbar-icon" aria-label="Options" onClick={() => menu.current?.showModal()}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18M3 12h18M3 19h18" /></svg>
      <span>Options</span>
    </button>
    {!settingsOpen && <>
      <button className="toolbar-icon away-toggle" disabled={!ready} aria-label={away ? "I'm back" : "Away"} aria-pressed={away} onClick={toggleAway}>
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="4" r="2" /><path d="M7 12V9h10v3M12 9v7m-4 6 4-6 4 6" /></svg>
        <span>{away ? "I'm back" : "Away"}</span>
      </button>
      <button className="toolbar-icon pause-toggle" disabled={!ready} aria-label={paused ? "Resume game" : "Pause game"} onClick={pause}>
        <svg viewBox="0 0 24 24" aria-hidden="true">{paused ? <path d="m8 4 12 8-12 8Z" /> : <path d="M8 3v18M16 3v18" />}</svg>
        <span>{paused ? "Resume" : "Pause"}</span>
      </button>
    </>}
    <span className={`status ${status === "Connected" ? "online" : ""}`} role="status" title={status}><span className="sr-only">{status}</span></span>
    {!settingsOpen && <button className="table-chat-toggle" aria-haspopup="dialog"
      aria-controls="session-log" onClick={openLog}>Log</button>}
    {!settingsOpen && <button ref={chatButton} className="table-chat-toggle" aria-haspopup="dialog"
      aria-controls="table-chat" onClick={openChat}>Chat</button>}
    <Feedback name={name} />
    <dialog ref={menu} className="feedback-modal table-options" aria-labelledby="options-title">
      <div className="feedback-heading"><h2 id="options-title">Table options</h2><button autoFocus aria-label="Close options" onClick={() => menu.current?.close()}>×</button></div>
      <p className="hint">{name} · {status}</p>
      <nav aria-label="Table options">
        <button onClick={() => { menu.current?.close(); settings(); }}>{settingsOpen ? "Back to table" : "Settings"}</button>
        <button onClick={async () => {
          try { await navigator.clipboard.writeText(`${location.origin}${location.pathname}`); setCopied(true); setCopyError(false); }
          catch { setCopyError(true); }
        }}>{copied ? "Link copied" : "Invite friends"}</button>
        <button onClick={() => { menu.current?.close(); leave(); }}>Leave table</button>
      </nav>
      {copyError && <p role="alert">Copy the table URL from your address bar to invite friends.</p>}
      <details><summary>How this table works</summary><p>Play chips only. Hands deal automatically when two connected players have chips and are not away. Away keeps your seat, auto-checks or folds this hand, and skips future deals. Pause freezes play until anyone resumes. Click your name to set your stack. During play, stack and settings edits apply after the hand. Disconnecting folds a live hand unless you’re all-in. Refreshing restores a retained seat.</p></details>
    </dialog>
  </header>;
}
