import type { Offer, SortKey } from "@/lib/types";
import { computeDelta, diasNoAr } from "@/lib/compute";
import Sparkline from "./Sparkline";
import DeltaBadge from "./DeltaBadge";
import CompetitionBar from "./CompetitionBar";
import Tags from "./Tags";
import LinkButtons from "./LinkButtons";

const SORTABLE: { key: SortKey; label: string }[] = [
  { key: "collation", label: "Sinal (criativo)" },
  { key: "delta", label: "Δ desde última leitura" },
  { key: "concorrencia", label: "Concorrência do nicho" },
];

export default function OffersTable({
  offers,
  sortKey,
  onSort,
  isFavorita,
  isDescartada,
  onToggleFavorita,
  onToggleDescartada,
}: {
  offers: Offer[];
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
  isFavorita: (id: string) => boolean;
  isDescartada: (id: string) => boolean;
  onToggleFavorita: (id: string) => void;
  onToggleDescartada: (id: string) => void;
}) {
  if (offers.length === 0) {
    return (
      <div className="table-wrap">
        <div className="empty-state">Nenhuma oferta encontrada para este filtro.</div>
      </div>
    );
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Oferta</th>
            <th>Ticket</th>
            {SORTABLE.map((s) => (
              <th key={s.key} className="sortable" onClick={() => onSort(s.key)}>
                {s.label}
                <span className="arrow">{sortKey === s.key ? "▾" : ""}</span>
              </th>
            ))}
            <th>No ar</th>
            <th>Tags</th>
            <th>Links</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o, i) => {
            const delta = computeDelta(o);
            const rowCls = delta && delta > 0 ? "row-up" : delta && delta < 0 ? "row-down" : "";
            const style = i < 20 ? { animationDelay: `${i * 22}ms` } : undefined;
            const dias = diasNoAr(o);
            const favorita = isFavorita(o.id);
            const descartada = isDescartada(o.id);

            return (
              <tr key={o.id} className={`row-rise ${rowCls}`} style={style}>
                <td data-label="Oferta">
                  <div className="niche-badge">{o.niche}</div>
                  <div className="offer-produto">{o.produto}</div>
                  <div className="offer-anunciante">{o.anunciante}</div>
                </td>
                <td data-label="Ticket">
                  <span className={`ticket ${o.ticket ? "" : "empty"}`}>{o.ticket || "n/d"}</span>
                </td>
                <td data-label="Sinal (criativo)">
                  <div className="signal-cell">
                    <span className="signal-count">×{o.collation ?? "n/d"}</span>
                    <Sparkline history={o.history} />
                  </div>
                </td>
                <td data-label="Δ desde última leitura">
                  <DeltaBadge delta={delta} />
                </td>
                <td data-label="Concorrência do nicho">
                  <CompetitionBar concorrencia={o.concorrencia} />
                </td>
                <td data-label="No ar" className="mono">
                  {dias === null ? "n/d" : dias === 0 ? "hoje" : `${dias}d`}
                </td>
                <td data-label="Tags">
                  <Tags offer={o} />
                </td>
                <td data-label="Links">
                  <LinkButtons offer={o} />
                </td>
                <td data-label="Ações">
                  <div className="actions-cell">
                    <button
                      className={`icon-btn action-btn ${favorita ? "active-fav" : ""}`}
                      onClick={() => onToggleFavorita(o.id)}
                      title={favorita ? "Remover dos favoritos" : "Favoritar"}
                      aria-pressed={favorita}
                    >
                      {favorita ? "⭐" : "☆"}
                    </button>
                    <button
                      className={`icon-btn action-btn ${descartada ? "active-discard" : ""}`}
                      onClick={() => onToggleDescartada(o.id)}
                      title={descartada ? "Restaurar" : "Descartar"}
                      aria-pressed={descartada}
                    >
                      {descartada ? "↺" : "🗑"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
