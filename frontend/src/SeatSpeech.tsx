import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// Measure in the seat's layout, but paint outside the table's stacking context.
export function SeatSpeech({ text, seat }: { text: string; seat: number }) {
  const anchor = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const element = anchor.current;
    if (!element) return;
    const update = () => setBox(element.getBoundingClientRect());
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    const stage = element.closest(".table-stage");
    if (stage) observer.observe(stage);
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [text, seat]);

  return <>
    <div ref={anchor} className="seat-speech seat-speech-anchor" aria-hidden="true"><span>{text}</span></div>
    {box && createPortal(<div className="seat-speech-layer" data-seat={seat}>
      <div className="seat-speech" style={{ position: "fixed", top: box.top, left: box.left,
        bottom: "auto", right: "auto", width: box.width, maxWidth: "none" }}><span>{text}</span></div>
    </div>, document.body)}
  </>;
}
