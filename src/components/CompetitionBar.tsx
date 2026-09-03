import { competitionBand } from "@/lib/compute";

export default function CompetitionBar({ concorrencia }: { concorrencia: number | null }) {
  const band = competitionBand(concorrencia);
  const width = concorrencia == null ? 0 : Math.min(100, (concorrencia / 2000) * 100);

  return (
    <div className="competition-cell">
      <div className="competition-number">{concorrencia == null ? "n/d" : `~${concorrencia}`}</div>
      <div className="competition-bar-track">
        <div className={`competition-bar-fill ${band}`} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
