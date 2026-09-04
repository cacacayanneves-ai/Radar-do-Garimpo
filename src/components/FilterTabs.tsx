import type { FilterKey } from "@/lib/types";

const TABS: { key: FilterKey; label: string; title?: string }[] = [
  {
    key: "top10",
    label: "🏆 Top 10",
    title: "As 10 melhores: muitos criativos rodando + pouca concorrência, com bônus pra quem está escalando agora",
  },
  { key: "todas", label: "Todas" },
  { key: "escalando", label: "Escalando" },
  { key: "esfriando", label: "Esfriando" },
  { key: "novas", label: "Novas" },
];

export default function FilterTabs({
  active,
  onChange,
}: {
  active: FilterKey;
  onChange: (key: FilterKey) => void;
}) {
  return (
    <div className="controls">
      <div className="pill-group">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={active === t.key ? "active" : ""}
            onClick={() => onChange(t.key)}
            title={t.title}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="legend">
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--moss)" }} />
          ≤350
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--brass)" }} />
          ≤900
        </span>
        <span className="legend-item">
          <span className="legend-dot" style={{ background: "var(--clay)" }} />
          &gt;900
        </span>
      </div>
    </div>
  );
}
