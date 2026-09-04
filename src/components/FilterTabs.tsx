import type { FilterKey } from "@/lib/types";
import { CATEGORIA_LABEL, type Categoria } from "@/lib/keywordCategorias";

const TABS: { key: FilterKey; label: string; title?: string }[] = [
  { key: "todas", label: "Todas" },
  { key: "escalando", label: "Escalando" },
  { key: "esfriando", label: "Esfriando" },
  { key: "novas", label: "Novas" },
  {
    key: "top10",
    label: "🏆 Top 10",
    title: "As 10 melhores: muitos criativos rodando + pouca concorrência, com bônus pra quem está escalando agora",
  },
  { key: "favoritas", label: "⭐ Favoritas", title: "Só as que você marcou com estrela — fica salvo neste navegador" },
  { key: "descartadas", label: "🗑 Descartadas", title: "As que você já revisou e descartou — fica salvo neste navegador" },
];

// Filtro por nicho é INDEPENDENTE do filtro por aba (Top 10, Escalando etc)
// — os dois se combinam. Ex: "Top 10" + "Saúde" mostra as 10 melhores
// DENTRO só das ofertas de saúde, não o Top 10 geral filtrado depois.
const CATEGORIAS: { key: Categoria | "todas"; label: string }[] = [
  { key: "todas", label: "Todos os nichos" },
  { key: "saude", label: CATEGORIA_LABEL.saude },
  { key: "religiao", label: CATEGORIA_LABEL.religiao },
  { key: "renda_extra", label: CATEGORIA_LABEL.renda_extra },
];

export default function FilterTabs({
  active,
  onChange,
  categoria,
  onCategoriaChange,
  categoriaCounts,
  favoritasCount,
  descartadasCount,
}: {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
  categoria: Categoria | "todas";
  onCategoriaChange: (categoria: Categoria | "todas") => void;
  categoriaCounts: Record<Categoria, number>;
  favoritasCount: number;
  descartadasCount: number;
}) {
  return (
    <>
      <div className="nicho-row">
        <span className="nicho-label">Nicho:</span>
        <div className="pill-group">
          {CATEGORIAS.map((c) => {
            const count = c.key === "todas" ? null : categoriaCounts[c.key];
            return (
              <button
                key={c.key}
                className={categoria === c.key ? "active" : ""}
                onClick={() => onCategoriaChange(c.key)}
              >
                {c.label}
                {count !== null && count !== undefined ? ` (${count})` : ""}
              </button>
            );
          })}
        </div>
      </div>

      <div className="controls">
      <div className="pill-group">
        {TABS.map((t) => {
          const count = t.key === "favoritas" ? favoritasCount : t.key === "descartadas" ? descartadasCount : null;
          return (
            <button
              key={t.key}
              className={active === t.key ? "active" : ""}
              onClick={() => onChange(t.key)}
              title={t.title}
            >
              {t.label}
              {count !== null && count > 0 ? ` (${count})` : ""}
            </button>
          );
        })}
      </div>

      {/* Sem o rótulo, os três números soltos não diziam a que se referiam. */}
      <div className="legend" title="Anúncios ativos no nicho — quanto menos, melhor">
        <span className="legend-titulo">Concorrência:</span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--moss)" }} />
          ≤350 baixa
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--brass)" }} />
          ≤900 média
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--clay)" }} />
          &gt;900 alta
        </span>
      </div>
      </div>
    </>
  );
}
