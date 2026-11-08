import { useEffect } from "react";

// Mobile keyboards can cover the layout viewport. Fit only the open panel to
// the visible area; the poker table keeps its own geometry underneath.
export function useTypingViewport() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const style = document.documentElement.style;
    const update = () => {
      style.setProperty("--typing-height", `${viewport.height}px`);
      style.setProperty("--typing-top", `${viewport.offsetTop}px`);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      style.removeProperty("--typing-height");
      style.removeProperty("--typing-top");
    };
  }, []);
}
