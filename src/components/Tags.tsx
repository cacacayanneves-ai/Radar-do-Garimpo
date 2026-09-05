import type { Offer } from "@/lib/types";
import { isNewThisWeek } from "@/lib/compute";

export default function Tags({ offer }: { offer: Offer }) {
  const tags: { key: string; label: string; cls: string }[] = [];

  if (offer.internacional === "Alta") {
    tags.push({ key: "intl", label: "Fora do BR: alta", cls: "teal" });
  } else if (offer.internacional === "Media") {
    tags.push({ key: "intl", label: "Fora do BR: média", cls: "teal" });
  } else if (offer.internacional === "Baixa") {
    tags.push({ key: "intl", label: "Fora do BR: baixa", cls: "plum" });
  }

  if (offer.riscoPolitica) {
    tags.push({ key: "risco", label: "risco de política", cls: "plum" });
  }

  if (isNewThisWeek(offer)) {
    tags.push({ key: "nova", label: "nova", cls: "teal" });
  }

  if (tags.length === 0) return <div className="tags-cell" />;

  return (
    <div className="tags-cell">
      {tags.map((t) => (
        <span key={t.key} className={`tag-chip ${t.cls}`}>
          <span className="tag-dot" style={{ background: `var(--${t.cls})` }} />
          {t.label}
        </span>
      ))}
    </div>
  );
}
