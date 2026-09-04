import type { Offer } from "@/lib/types";
import { computeDelta, isNewThisWeek } from "@/lib/compute";

export default function StatTiles({ offers }: { offers: Offer[] }) {
  const total = offers.length;
  const escalando = offers.filter((o) => (computeDelta(o) ?? 0) > 0).length;
  const aguardando2aLeitura = offers.filter((o) => (o.history || []).length < 2).length;
  const novas = offers.filter(isNewThisWeek).length;

  // Maior escalada do dia: quem deu o maior salto de criativos desde a
  // última leitura — o apontador mais direto pra "olha essa aqui primeiro".
  let maiorEscalada: { offer: Offer; delta: number } | null = null;
  for (const o of offers) {
    const delta = computeDelta(o);
    if (delta !== null && delta > 0 && (maiorEscalada === null || delta > maiorEscalada.delta)) {
      maiorEscalada = { offer: o, delta };
    }
  }

  return (
    <div className="stats">
      <div className="tile">
        <div className="tile-icon">🗺️</div>
        <div className="tile-value">{total}</div>
        <div className="tile-label">Ofertas na mira</div>
      </div>
      <div className="tile">
        <div className="tile-icon">📈</div>
        <div className="tile-value">{escalando}</div>
        <div className="tile-label">Escalando agora</div>
        {total > 0 && aguardando2aLeitura === total ? (
          <div className="tile-note">todas aguardando 2ª leitura</div>
        ) : aguardando2aLeitura > 0 ? (
          <div className="tile-note">{aguardando2aLeitura} aguardando 2ª leitura</div>
        ) : null}
      </div>
      <div className="tile">
        <div className="tile-icon">✨</div>
        <div className="tile-value">{novas}</div>
        <div className="tile-label">Descobertas na semana</div>
      </div>
      <div className="tile">
        <div className="tile-icon">🔥</div>
        <div className="tile-value">{maiorEscalada ? `+${maiorEscalada.delta}` : "—"}</div>
        <div className="tile-label">Maior escalada do dia</div>
        <div className="tile-note">
          {maiorEscalada ? maiorEscalada.offer.produto.slice(0, 40) : "nenhuma escalada hoje"}
        </div>
      </div>
    </div>
  );
}
