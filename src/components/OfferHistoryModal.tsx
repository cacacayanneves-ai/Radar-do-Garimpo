"use client";

import { useEffect } from "react";
import type { HistoryPoint, Offer } from "@/lib/types";

const WIDTH = 560;
const HEIGHT = 220;
const PAD_LEFT = 34;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 28;
const DIAS_NO_GRAFICO = 15;

function formatDia(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// Gráfico de "quantos criativos rodando" ao longo dos últimos ~15 dias — é o
// mesmo dado do Sparkline da tabela (o.history), só que maior e com eixo de
// data, pra ver de perto a subida/descida em vez de só o formato geral.
function HistoryChart({ points }: { points: HistoryPoint[] }) {
  const values = points.map((p) => p.c);
  const min = Math.min(...values, 0);
  const max = Math.max(...values);
  const range = max - min || 1;

  const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const stepX = points.length > 1 ? innerW / (points.length - 1) : 0;

  const coords = points.map((p, i) => ({
    x: PAD_LEFT + i * stepX,
    y: PAD_TOP + innerH - ((p.c - min) / range) * innerH,
    p,
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L${coords[coords.length - 1].x.toFixed(1)},${PAD_TOP + innerH} L${coords[0].x.toFixed(
    1
  )},${PAD_TOP + innerH} Z`;

  // Tendência geral (primeiro vs último ponto do período) decide a cor —
  // mesma paleta do badge de Δ e do Sparkline da tabela.
  const deltaTotal = values[values.length - 1] - values[0];
  const cor = deltaTotal > 0 ? "var(--moss)" : deltaTotal < 0 ? "var(--clay)" : "var(--brass)";
  const corArea = deltaTotal > 0 ? "var(--moss-bg)" : deltaTotal < 0 ? "var(--clay-bg)" : "var(--glow-brass)";

  // Só marca alguns dias no eixo X — todos os 15 poluiria demais.
  const maxLabels = 6;
  const labelStep = Math.max(1, Math.ceil(points.length / maxLabels));

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="history-chart"
      role="img"
      aria-label="Gráfico de criativos rodando por dia"
    >
      {[0, 0.5, 1].map((f) => {
        const y = PAD_TOP + innerH * (1 - f);
        const valor = Math.round(min + range * f);
        return (
          <g key={f}>
            <line x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} stroke="var(--border)" strokeWidth={1} />
            <text x={PAD_LEFT - 8} y={y + 3} textAnchor="end" fontSize={10} fill="var(--ink-muted)">
              {valor}
            </text>
          </g>
        );
      })}

      <path d={areaPath} fill={corArea} stroke="none" />
      <path d={linePath} fill="none" stroke={cor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {coords.map((c, i) => (
        <g key={c.p.d}>
          <circle cx={c.x} cy={c.y} r={3} fill={cor} />
          <title>{`${formatDia(c.p.d)}: ${c.p.c} criativos`}</title>
          {(i % labelStep === 0 || i === coords.length - 1) && (
            <text x={c.x} y={HEIGHT - 8} textAnchor="middle" fontSize={10} fill="var(--ink-muted)">
              {formatDia(c.p.d)}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

export default function OfferHistoryModal({ offer, onClose }: { offer: Offer; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const points = (offer.history || []).slice(-DIAS_NO_GRAFICO);
  const primeiro = points[0];
  const ultimo = points[points.length - 1];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <div className="modal-title">{offer.produto}</div>
            <div className="modal-subtitle">{offer.anunciante}</div>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Fechar" title="Fechar">
            ✕
          </button>
        </div>

        {points.length < 2 ? (
          <div className="modal-empty">
            Ainda não tem histórico suficiente pra montar o gráfico — precisa de pelo menos 2 dias de leitura.
          </div>
        ) : (
          <>
            <HistoryChart points={points} />
            <div className="modal-footer">
              {formatDia(primeiro.d)}: {primeiro.c} criativos → {formatDia(ultimo.d)}: {ultimo.c} criativos
              {" · "}
              últimos {points.length} dias
            </div>
          </>
        )}
      </div>
    </div>
  );
}
