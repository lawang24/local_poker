import { useEffect, useRef, useState } from "react";
import "./App.css";
import "./DesktopTable.css";
import { formatAmount } from "./amounts";
import type { State } from "./types";
import { ActionControls, type Action } from "./ActionControls";
import { PokerTable } from "./PokerTable";
import { RunoutChoice } from "./RunoutChoice";

import { Feedback } from "./Feedback";
import { TableToolbar } from "./TableToolbar";
import { Settings } from "./Settings";

import { ConnectionProgress } from "./ConnectionProgress";

import { TableChat } from "./TableChat";
import { useTypingViewport } from "./useTypingViewport";

import { sessionKey } from "./session";

export default function App() {
  const [name, setName] = useState(
    sessionStorage.getItem(`${sessionKey}:name`) || localStorage.getItem(`${sessionKey}:name`) || "",
  );
  const [joined, setJoined] = useState(
    Boolean(sessionStorage.getItem(`${sessionKey}:token`)),
  );
  const [state, setState] = useState<State | null>(null);
  const [status, setStatus] = useState("Offline");
  const [error, setError] = useState("");
  useTypingViewport();
  const [speech, setSpeech] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [copied, setCopied] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const chatDialog = useRef<HTMLDialogElement>(null);
  const chatButton = useRef<HTMLButtonElement>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!joined) return;
    const timers = new Map<string, ReturnType<typeof setTimeout>>();
    const clearSpeech = () => {
      timers.forEach(clearTimeout);
      timers.clear();
      setSpeech({});
    };
    let stopped = false;
    let retry: ReturnType<typeof setTimeout>;
    let attempts = 0;
    function connect() {
      setStatus("Connecting");
      const configured = import.meta.env.VITE_WS_URL as string | undefined;
      const url = new URL(
        configured ||
          `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
      );
      const socket = new WebSocket(url);
      ws.current = socket;
      socket.onopen = () => {
        if (stopped) {
          socket.close();
          return;
        }
        attempts = 0;
        setStatus("Loading table");
        setError("");
        socket.send(
          JSON.stringify({
            type: "join",
            name: sessionStorage.getItem(`${sessionKey}:name`) || localStorage.getItem(`${sessionKey}:name`) || "Player",
            token: sessionStorage.getItem(`${sessionKey}:token`) || localStorage.getItem(`${sessionKey}:token`),
          }),
        );
      };
      socket.onmessage = (event) => {
        if (stopped) return;
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === "session") {
            sessionStorage.setItem(`${sessionKey}:token`, msg.token);
            localStorage.setItem(`${sessionKey}:token`, msg.token);
          }
          if (msg.type === "state") {
            setState(msg.state);
            if (msg.chat) {
              const { player_id: id, text } = msg.chat;
              setSpeech(current => ({ ...current, [id]: text }));
              clearTimeout(timers.get(id));
              timers.set(id, setTimeout(() => {
                timers.delete(id);
                setSpeech(current => {
                  const next = { ...current };
                  delete next[id];
                  return next;
                });
              }, 6000));
            }
            setStatus("Connected");
            setPending(false);
          }
          if (msg.type === "error") {
            setError(msg.message);
            setStatus(current => current === "Loading table" ? "Unable to join" : current);
            setPending(false);
          }
        } catch {
          setError("The server sent an unreadable response.");
          setStatus(current => current === "Loading table" ? "Unable to join" : current);
        }
      };
      socket.onclose = (event) => {
        if (stopped) return;
        setPending(false);
        clearSpeech();
        if (event.code === 4002) {
          stopped = true;
          sessionStorage.removeItem(`${sessionKey}:token`);
          setJoined(false);
          setState(null);
          setSettingsOpen(false);
          setStatus("Offline");
          setError("You were removed from the table.");
          return;
        }
        if (event.code === 4001) {
          setStatus("Seat opened elsewhere");
          setError(
            "This seat was opened in another window. Close this window or reload to reclaim it.",
          );
          return;
        }
        setStatus("Reconnecting");
        retry = setTimeout(connect, Math.min(1000 * 2 ** attempts++, 10000));
      };
    }
    connect();
    return () => {
      stopped = true;
      clearTimeout(retry);
      clearSpeech();
      ws.current?.close();
    };
  }, [joined]);

  const send = (msg: Action) => {
    if (ws.current?.readyState !== WebSocket.OPEN) {
      setError("Wait until you reconnect.");
      return false;
    }
    setError("");
    setPending(true);
    ws.current.send(JSON.stringify(msg));
    return true;
  };
  const me = state?.players.find((p) => p.id === state.you);
  const ready = status === "Connected" && !pending;
  const settings = state?.queued_settings ?? state;

  return (
    <main className={`app ${joined && state && !settingsOpen ? "app-table" : ""}`}>
      {joined && state ? <TableToolbar name={me?.name || name} status={status}
        blinds={`${formatAmount(state.small_blind, state.cents)} / ${formatAmount(state.big_blind, state.cents)}`} settingsOpen={settingsOpen} chatButton={chatButton} openChat={() => chatDialog.current?.showModal()}
        settings={() => setSettingsOpen(!settingsOpen)} leave={() => {
          setSettingsOpen(false); setJoined(false); setState(null); setStatus("Offline");
          setPending(false); setError(""); sessionStorage.removeItem(`${sessionKey}:token`);
        }} /> : <header>
        <div>
          <p className="eyebrow">PLAY MONEY • NO-LIMIT HOLD’EM</p>
          <h1>larrypokernow</h1>
        </div>
        <div className="connection-info">
          <span className={`status ${status === "Connected" ? "online" : ""}`}>
            {status}
          </span>
          {joined && (
            <button
              onClick={() => {
                setSettingsOpen(false);
                setJoined(false);
                setState(null);
                setStatus("Offline");
                setPending(false);
                setError("");
                sessionStorage.removeItem(`${sessionKey}:token`);
              }}
            >
              Leave table
            </button>
          )}
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(
                  `${location.origin}${location.pathname}`,
                );
                setCopied(true);
              } catch {
                setError(
                  "Copy the table URL from your address bar to invite friends.",
                );
              }
            }}
          >
            {copied ? "Link copied" : "Invite friends"}
          </button>
        </div>
        <Feedback name={me?.name || name} />
      </header>}
      {error && (
        <div role="alert" className="error">
          {error}
          <button aria-label="Dismiss error" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
      {!joined ? (
        <section className="join panel">
          <p className="eyebrow">TAKE A SEAT</p>
          <h2>Join the table</h2>
          <p>
            Join this table with 1,000 play chips. Share the table link to play
            with friends.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!name.trim()) return;
              sessionStorage.setItem(`${sessionKey}:name`, name.trim());
              localStorage.setItem(`${sessionKey}:name`, name.trim());
              setJoined(true);
            }}
          >
            <label>
              Your name
              <input
                autoFocus
                maxLength={24}
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
              />
            </label>
            <button className="primary">Join table</button>
          </form>
          <p className="hint">
            Two to nine players. Click your nameplate to adjust your stack.
          </p>
        </section>
      ) : !state ? (
        status === "Unable to join" || status === "Seat opened elsewhere" ? null :
          <ConnectionProgress loadingTable={status === "Loading table"} />
      ) : settingsOpen ? (
        <Settings key={`${settings?.small_blind}:${settings?.big_blind}:${settings?.seven_deuce_bonus}:${settings?.cents}`} state={state} ready={ready} send={send} back={() => setSettingsOpen(false)} />
      ) : (
        <>
          <div className="game-layout">
            <section className="table-area" aria-label="Poker table">
              <PokerTable speech={speech} state={state} ready={ready} send={send} />
              <ActionControls key={`${state.hand_number}:${state.street}:${state.actor}:${state.target}:${state.max_raise_to}:${state.cents}`} state={state} ready={ready} send={send} />
            </section>
            <TableChat dialog={chatDialog} trigger={chatButton} history={state.history} ready={ready} send={text => send({ type: "chat", text })} />
          </div>
        </>
      )}
      {joined && state?.runout_vote && <RunoutChoice key={state.runout_vote.hand_id} state={state} ready={ready} send={send} />}
    </main>
  );
}
