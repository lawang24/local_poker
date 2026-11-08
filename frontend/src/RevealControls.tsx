import { useEffect } from "react";
import type { Action } from "./ActionControls";
import { cardName, shortCardName } from "./cardLabels";
import type { State } from "./types";
import "./RevealControls.css";

const choices = [[0, 1], [0], [1]];
const shortcuts = ["s", "1", "2"];

export function RevealControls({ state, ready, send }: {
  state: State; ready: boolean; send: (action: Action) => void;
}) {
  const shown = state.result?.hands[state.you] ?? [];
  const available = shown.length < 2 || !!state.result?.shown_indices?.[state.you];
  const reveal = (indices: number[]) => {
    if (available && ready && indices.some(i => !shown.includes(state.hand[i]))) {
      send({ type: "reveal_cards", hand_number: state.hand_number, cards: indices });
    }
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.repeat || event.altKey || event.ctrlKey || event.metaKey ||
          document.querySelector("dialog[open]") || (event.target instanceof Element &&
          event.target.closest("input, textarea, select, [contenteditable]"))) return;
      const choice = shortcuts.indexOf(event.key.toLowerCase());
      if (choice !== -1) reveal(choices[choice]);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!available) return null;
  return <section className="reveal-controls" aria-label="Reveal cards to the table">
    {choices.map((indices, index) => {
      const all = index === 0;
      const card = state.hand[indices[0]];
      const visible = indices.every(i => shown.includes(state.hand[i]));
      const label = all ? "Show All Cards" : shortCardName(card);
      return <button key={shortcuts[index]} type="button" disabled={!ready || visible}
        aria-label={all ? label : `${visible ? "Shown" : "Show"} ${cardName(card)}`}
        aria-pressed={visible} aria-keyshortcuts={shortcuts[index].toUpperCase()}
        onClick={() => reveal(indices)}>
        {label}<span aria-hidden="true">{shortcuts[index]}</span>
      </button>;
    })}
  </section>;
}
