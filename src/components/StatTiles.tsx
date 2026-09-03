import type { Offer } from "@/lib/types";
import { computeDelta, isNewThisWeek } from "@/lib/compute";

export default function StatTiles({ offers }: { offers: Offer[] }) {
  const total = offers.length;
  const escalando = offers.filter((o) => (computeDelta(o) ?? 0) > 0).length;
  const novas = offers.filter(isNewThisWeek).length;
  const risco = offers.filter((o) => o.riscoPolitica).length;

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
      </div>
      <div className="tile">
        <div className="tile-icon">✨</div>
        <div className="tile-value">{novas}</div>
        <div className="tile-label">Descobertas na semana</div>
      </div>
      <div className="tile warn">
        <div className="tile-icon">⚠️</div>
        <div className="tile-value">{risco}</div>
        <div className="tile-label">Risco de política Meta</div>
      </div>
    </div>
  );
}
