import type { CSSProperties } from "react";
import { Cards } from "./Cards";
import type { State } from "./types";
import "./RunoutBoard.css";

// A snapshot carries only faces already revealed by the server. Negative delays
// resume a flip at its current position after reconnects or unrelated broadcasts.
export function RunoutBoard({ state }: { state: State }) {
  const run = state.runout;
  const boards = run?.boards ?? state.result?.runouts?.map(r => r.board) ?? [state.board];
  const twice = boards.length > 1;
  const dimFirst = !!run && twice && run.boards[1].filter(Boolean).length < 5;
  return <div className={`runout-display ${twice ? "two-boards" : ""} ${dimFirst ? "dim-first" : ""}`} aria-label={twice ? "Two runout boards" : "Community cards"}>
    {boards.map((board, index) => <section className="runout-row" key={`${state.hand_number}:${index}`} aria-label={`Run ${index + 1}`}>
      <div className="community-cards"><div className="cards">
        {board.map((card, slot) => {
          const at = run?.revealed_at[index][slot];
          const backsAt = run?.backs_at[index][slot];
          const firstNewSlot = board.length === 3 ? 0 : board.length - 1;
          const flipAt = backsAt == null ? null : backsAt + .175 + (slot - firstNewSlot) * .175;
          const age = at == null ? null : Math.max(0, state.server_time - at);
          const turning = age != null && age < .1;
          return <span key={slot} className={`runout-card ${card ? "face-up" : "face-down"} ${turning ? "revealing" : ""}`}
            data-card-slot={slot + 1} data-face-up={!!card}
            style={{ "--flip-delay": `${-(age ?? 0)}s`, "--back-delay": `${flipAt == null ? 0 : flipAt - .1 - state.server_time}s` } as CSSProperties}>
            {card ? <Cards cards={[card]} /> : <span className="card runout-back" role="img" aria-label="Face-down community card" />}
          </span>;
        })}
      </div></div>
    </section>)}
  </div>;
}
