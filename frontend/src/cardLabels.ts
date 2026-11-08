const ranks: Record<string, string> = {
  T: "10",
  J: "jack",
  Q: "queen",
  K: "king",
  A: "ace",
};
const suits: Record<string, string> = {
  h: "hearts",
  d: "diamonds",
  c: "clubs",
  s: "spades",
};
export function cardName(code: string) {
  return `${ranks[code[0]] || code[0]} of ${suits[code[1]]}`;
}

const suitSymbols: Record<string, string> = { c: "♣", d: "♦", h: "♥", s: "♠" };

export function shortCardName(code: string) {
  return `${code[0] === "T" ? "10" : code[0]}${suitSymbols[code[1]]}`;
}
