import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { sessionKey } from "./session";
import "./FoldAction.css";

/** Mounted inside the turn-keyed action controls, so a new turn discards consent. */
export function FoldAction({ ready, callAmount, playerId, fold }: {
  ready: boolean; callAmount: number; playerId: string; fold: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef<HTMLButtonElement>(null);
  const skip = useRef<HTMLInputElement>(null);
  const submitted = useRef(false);
  const preferenceKey = `${sessionKey}:skip-free-fold:${playerId}`;

  useEffect(() => {
    if (!ready || callAmount !== 0) dialog.current?.close();
    if (ready) submitted.current = false;
  }, [ready, callAmount]);

  function submit() {
    if (!ready || submitted.current) return;
    submitted.current = true;
    fold();
  }

  function requestFold() {
    if (!ready || submitted.current) return;
    let skipConfirmation = false;
    try { skipConfirmation = sessionStorage.getItem(preferenceKey) === "true"; }
    catch { /* Storage restrictions must never bypass the confirmation. */ }
    if (callAmount > 0 || skipConfirmation) {
      submit();
      return;
    }
    if (skip.current) skip.current.checked = false;
    dialog.current?.showModal();
    cancel.current?.focus({ preventScroll: true });
  }

  return <>
    <button type="button" className="fold-action" disabled={!ready} onClick={requestFold}>Fold</button>
    {createPortal(<dialog className="fold-confirmation" ref={dialog} aria-labelledby="fold-question"
      onKeyDown={event => {
        if (event.repeat && (event.key === "Enter" || event.key === " ")) event.preventDefault();
        if (event.key === "Tab") {
          const controls = [...event.currentTarget.querySelectorAll<HTMLElement>("input:not(:disabled), button:not(:disabled)")];
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }}>
      <div className="fold-confirmation-message">
        <p id="fold-question">Are you sure that you want do an unnecessary fold?</p>
        <label>Do not show this again in this session? <input ref={skip} type="checkbox" /></label>
      </div>
      <div className="fold-confirmation-buttons">
        <button type="button" className="fold-cancel" ref={cancel} onClick={() => dialog.current?.close()}>Cancel</button>
        <button type="button" className="fold-confirm" disabled={!ready || callAmount !== 0} onClick={() => {
          if (!dialog.current?.open || !ready || callAmount !== 0 || submitted.current) return;
          if (skip.current?.checked) {
            try { sessionStorage.setItem(preferenceKey, "true"); }
            catch { /* Folding still works when session storage is unavailable. */ }
          }
          dialog.current.close();
          submit();
        }}>Confirm</button>
      </div>
    </dialog>, document.body)}
  </>;
}
