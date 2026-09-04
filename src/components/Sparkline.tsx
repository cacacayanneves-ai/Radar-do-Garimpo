"use client";

import type { HistoryPoint } from "@/lib/types";

const WIDTH = 72;
const HEIGHT = 26;
const PAD = 3;

// Cor por tendência: verde escalando, terracota esfriando, âmbar neutro/sem
// dado suficiente — mesma paleta do badge de Δ, só que no gráfico inteiro,
// pra dar pra ver de relance sem precisar ler o número.
function trendColor(delta: number | null): { line: string; glow: string } {
  if (delta !== null && delta > 0) return { line: "var(--moss)", glow: "var(--moss-bg)" };
  if (delta !== null && delta < 0) return { line: "var(--clay)", glow: "var(--clay-bg)" };
  return { line: "var(--brass)", glow: "var(--glow-brass)" };
}

export default function Sparkline({ history }: { history: HistoryPoint[] }) {
  const points = (history || []).slice(-14);
  const delta = points.length >= 2 ? points[points.length - 1].c - points[points.length - 2].c : null;
  const { line, glow } = trendColor(delta);

  if (points.length === 0) {
    return <svg width={WIDTH} height={HEIGHT} aria-hidden="true" />;
  }

  if (points.length === 1) {
    return (
      <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
        <circle cx={WIDTH / 2} cy={HEIGHT / 2} r={3} fill={line} />
      </svg>
    );
  }

  const values = points.map((p) => p.c);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const stepX = (WIDTH - PAD * 2) / (points.length - 1);
  const coords = points.map((p, i) => {
    const x = PAD + i * stepX;
    const y = HEIGHT - PAD - ((p.c - min) / range) * (HEIGHT - PAD * 2);
    return [x, y] as const;
  });

  const linePath = coords.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1][0].toFixed(1)},${HEIGHT} L${coords[0][0].toFixed(1)},${HEIGHT} Z`;

  const [lastX, lastY] = coords[coords.length - 1];

  return (
    <svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true">
      <path d={areaPath} fill={glow} stroke="none" />
      <path d={linePath} fill="none" stroke={line} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={2.4} fill={line} />
    </svg>
  );
}
