import type { Offer, SortKey } from "@/lib/types";
import { computeDelta, diasNoAr } from "@/lib/compute";
import Sparkline from "./Sparkline";
import DeltaBadge from "./DeltaBadge";
import CompetitionBar from "./CompetitionBar";
import Tags from "./Tags";
import LinkButtons from "./LinkButtons";
import { IconEstrela, IconLixeira, IconRestaurar } from "./Icons";

// Rótulos curtos de propósito: como os cabeçalhos não quebram linha
// (white-space: nowrap), eles é que definiam a largura mínima da tabela —
// "Δ desde última leitura" sozinho empurrava a tabela pra fora da tela. O
// significado completo fica no title (tooltip).
const SORTABLE: { key: SortKey; label: string; title: string }[] = [
  { key: "collation", label: "Sinal", title: "Quantos criativos o anunciante roda com esse mesmo texto" },
  { key: "delta", label: "Δ", title: "Variação de criativos desde a última leitura" },
  { key: "concorrencia", label: "Concorrência", title: "Quantos anúncios ativos existem no nicho" },
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
              <th key={s.key} className="sortable" onClick={() => onSort(s.key)} title={s.title}>
                {s.label}
                <span className="arrow">{sortKey === s.key ? "▾" : ""}</span>
              </th>
            ))}
            <th>No ar</th>
            <th>Tags</th>
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
                  <div className="offer-produto" title={o.produto}>
                    {o.produto}
                  </div>
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
                {/* Tempo de veiculação do anunciante: sinal forte (anúncio
                    que sustenta 2 meses no ar vale mais que um de 2 dias),
                    então merece coluna própria em vez de ficar diluído na
                    linha do anunciante. */}
                <td data-label="No ar">
                  <span className="dias-no-ar">{dias === null ? "n/d" : `${dias}d`}</span>
                </td>
                <td data-label="Tags">
                  <Tags offer={o} />
                </td>
                {/* Links e ações numa coluna só, pelo mesmo motivo: menos
                    colunas = tabela cabe na tela sem rolagem lateral. */}
                <td data-label="Ações">
                  <div className="actions-cell">
                    <LinkButtons offer={o} />
                    <button
                      className={`icon-btn action-btn ${favorita ? "active-fav" : ""}`}
                      onClick={() => onToggleFavorita(o.id)}
                      title={favorita ? "Remover dos favoritos" : "Favoritar"}
                      aria-pressed={favorita}
                    >
                      <IconEstrela preenchida={favorita} />
                    </button>
                    <button
                      className={`icon-btn action-btn ${descartada ? "active-discard" : ""}`}
                      onClick={() => onToggleDescartada(o.id)}
                      title={descartada ? "Restaurar" : "Descartar"}
                      aria-pressed={descartada}
                    >
                      {descartada ? <IconRestaurar /> : <IconLixeira />}
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
