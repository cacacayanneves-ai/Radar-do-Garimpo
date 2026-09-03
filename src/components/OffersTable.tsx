import type { Offer, SortKey } from "@/lib/types";
import { computeDelta } from "@/lib/compute";
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
}: {
  offers: Offer[];
  sortKey: SortKey;
  onSort: (key: SortKey) => void;
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
            <th>Tags</th>
            <th>Links</th>
          </tr>
        </thead>
        <tbody>
          {offers.map((o, i) => {
            const delta = computeDelta(o);
            const rowCls = delta && delta > 0 ? "row-up" : delta && delta < 0 ? "row-down" : "";
            const style = i < 20 ? { animationDelay: `${i * 22}ms` } : undefined;

            return (
              <tr key={o.id} className={`row-rise ${rowCls}`} style={style}>
                <td>
                  <div className="niche-badge">{o.niche}</div>
                  <div className="offer-produto">{o.produto}</div>
                  <div className="offer-anunciante">{o.anunciante}</div>
                </td>
                <td>
                  <span className={`ticket ${o.ticket ? "" : "empty"}`}>{o.ticket || "n/d"}</span>
                </td>
                <td>
                  <div className="signal-cell">
                    <span className="signal-count">×{o.collation ?? "n/d"}</span>
                    <Sparkline history={o.history} />
                  </div>
                </td>
                <td>
                  <DeltaBadge delta={delta} />
                </td>
                <td>
                  <CompetitionBar concorrencia={o.concorrencia} />
                </td>
                <td>
                  <Tags offer={o} />
                </td>
                <td>
                  <LinkButtons offer={o} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
