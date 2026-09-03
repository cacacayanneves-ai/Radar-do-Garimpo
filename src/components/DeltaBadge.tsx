export default function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) {
    return <span className="delta-badge first">1ª leitura</span>;
  }
  if (delta > 0) {
    return <span className="delta-badge up">▲ +{delta}</span>;
  }
  if (delta < 0) {
    return <span className="delta-badge down">▼ {delta}</span>;
  }
  return <span className="delta-badge flat">= 0</span>;
}
