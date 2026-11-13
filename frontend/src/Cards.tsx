import { cardName } from "./cardLabels";

const assets = import.meta.glob(
  "./assets/clean-cards/*.svg",
  { eager: true, query: "?inline", import: "default" },
) as Record<string, string>;
function Card({ code, hole, unused = false }: { code: string; hole: boolean; unused?: boolean }) {
  const label = cardName(code);
  const name = label.replaceAll(" ", "_");
  const face = (
    <img
      className={hole ? "card-face" : "card"}
      src={assets[`./assets/clean-cards/${name}.svg`]}
      alt={label}
    />
  );
  return hole ? <picture className={`card hole-card ${unused ? "unused-card" : ""}`}>
    <source
      media="(max-width: 1023px) and (min-height: 501px), (max-width: 600px)"
      srcSet={assets[`./assets/clean-cards/${name}-mobile.svg`]}
    />
    {face}
  </picture> : face;
}
export function Cards({ cards, hole = false, winningCards }: { cards: (string | null)[]; hole?: boolean; winningCards?: string[] }) {
  return (
    <div className="cards">
      {cards.map((c, i) => c ? <Card key={c} code={c} hole={hole} unused={winningCards !== undefined && !winningCards.includes(c)} /> :
        <span key={i} className="card hole-card concealed-card" role="img" aria-label="Hidden card" />)}
    </div>
  );
}
