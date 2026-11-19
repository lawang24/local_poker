import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { State } from './types';
import type { Action } from './ActionControls';
import { formatAmount } from './amounts';
import { voiceCommand, voiceTurnKey } from './voiceCommands';
import './VoiceControl.css';

type Recognition = {
  lang: string; continuous: boolean; interimResults: boolean;
  onstart: (() => void) | null; onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { resultIndex: number; results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }> }) => void) | null;
  start(): void; abort(): void;
};
type SpeechWindow = Window & { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };

export function VoiceControl({ state, ready, send }: { state: State; ready: boolean; send: (action: Action) => void }) {
  const [enabled, setEnabled] = useState(false);
  const [visible, setVisible] = useState(document.visibilityState === 'visible');
  const [message, setMessage] = useState('');
  const [listening, setListening] = useState(false);
  const latest = useRef({ state, ready });
  const active = useRef<Recognition | null>(null);
  const Constructor = (window as SpeechWindow).SpeechRecognition || (window as SpeechWindow).webkitSpeechRecognition;
  const allowed = enabled && visible && ready && state.running && !state.paused && state.actor === state.you && !state.runout_vote && !state.players.find(p => p.id === state.you)?.away;
  const key = voiceTurnKey(state);
  useLayoutEffect(() => { latest.current = { state, ready }; }, [state, ready]);
  useEffect(() => {
    const change = () => { if (document.hidden) active.current?.abort(); setVisible(!document.hidden); };
    document.addEventListener('visibilitychange', change);
    return () => document.removeEventListener('visibilitychange', change);
  }, []);
  useEffect(() => {
    if (!allowed || !Constructor) return;
    let disposed = false;
    let submitted = false;
    let pending: Action | null = null;
    let restart: ReturnType<typeof setTimeout>;
    const recognition = new Constructor();
    active.current = recognition;
    recognition.lang = 'en-US';
    recognition.continuous = true;
    recognition.interimResults = false;
    const current = () => !disposed && !submitted && !document.hidden && latest.current.ready && !latest.current.state.paused && !latest.current.state.players.find(p => p.id === latest.current.state.you)?.away && voiceTurnKey(latest.current.state) === key;
    const start = () => {
      if (!current()) return;
      try { recognition.start(); }
      catch { setMessage('Voice could not start. Turn voice off and on to retry.'); setEnabled(false); }
    };
    recognition.onstart = () => { if (current()) { setListening(true); if (!pending) setMessage('Listening for your command'); } else recognition.abort(); };
    recognition.onresult = event => {
      if (!current()) return;
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (!event.results[i].isFinal || !current()) continue;
        const text = event.results[i][0].transcript.trim().toLowerCase().replace(/[.!?]+$/, '');
        if (text === 'cancel') { pending = null; setMessage('Cancelled. Say a new command.'); continue; }
        let action: Action;
        if (text === 'confirm') {
          if (!pending) { setMessage('No command to confirm.'); continue; }
          action = pending;
        } else {
          pending = null;
          const result = voiceCommand(text, latest.current.state);
          if ('error' in result) { setMessage(result.error); continue; }
          action = result.action;
          if (result.confirm) {
            pending = action;
            const label = action.type === 'raise' ? `Raise to ${formatAmount(action.amount!, latest.current.state.cents)}` : action.type === 'fold' ? 'Fold (you can check)' : 'Call all-in';
            setMessage(`${label}? Say confirm or cancel.`);
            continue;
          }
        }
        submitted = true;
        pending = null;
        recognition.abort();
        setListening(false);
        setMessage('Command sent');
        send(action);
        break;
      }
    };
    recognition.onerror = event => {
      if (disposed) return;
      setListening(false);
      if (event.error === 'no-speech' || event.error === 'aborted') return;
      disposed = true;
      setEnabled(false);
      setMessage(event.error === 'not-allowed' || event.error === 'service-not-allowed' ? 'Microphone or speech access denied. Allow access, then enable voice again.' : `Voice unavailable (${event.error}). Use the buttons or enable voice to retry.`);
      recognition.abort();
    };
    recognition.onend = () => {
      if (disposed) return;
      setListening(false);
      if (current()) restart = setTimeout(start, 350);
    };
    start();
    return () => {
      disposed = true;
      clearTimeout(restart);
      recognition.onstart = recognition.onend = recognition.onerror = recognition.onresult = null;
      recognition.abort();
      if (active.current === recognition) active.current = null;
    };
  }, [allowed, key, Constructor, send]);
  return <>
    <button className="toolbar-icon voice-toggle" aria-label={enabled ? 'Turn voice control off' : 'Turn voice control on'} aria-pressed={enabled} disabled={!Constructor}
      title={!Constructor ? 'Speech recognition is unavailable in this browser' : 'Experimental voice control. Commands and privacy details in Options.'}
      onClick={() => { active.current?.abort(); setListening(false); setMessage(''); setEnabled(!enabled); }}>
      <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="9" y="2" width="6" height="12" rx="3" /><path d="M5 10v2a7 7 0 0 0 14 0v-2h-2v2a5 5 0 0 1-10 0v-2ZM11 18h2v4h-2Z" /></svg>
      <span>{!Constructor ? 'No voice' : !enabled ? 'Voice off' : allowed && listening ? 'Listening' : 'Voice on'}</span>
    </button>
    {(enabled || message) && <p className="voice-feedback" role="status">{enabled && !allowed ? 'Voice waiting · listens only on your turn' : message || 'Starting voice…'}</p>}
  </>;
}
