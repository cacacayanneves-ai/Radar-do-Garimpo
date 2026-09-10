"use client";

import { useState } from "react";
import type { Destino } from "@/lib/types";

// Botão que troca o que a mineração de oferta NOVA busca na PRÓXIMA rodada
// (PV ou Quiz) — grava no banco via POST /api/mining-target, o robô lê essa
// escolha sozinho a cada rodada (8x/dia). Fica selecionado pra sempre até
// trocar de novo — não precisa reconfirmar a cada rodada.
// Diferente do toggle PV/Quiz do FilterTabs: aquele só decide o que VOCÊ está
// vendo agora no painel; este decide o que o ROBÔ vai procurar depois.
export default function MiningTargetToggle({
  miningTarget,
  onChange,
}: {
  miningTarget: Destino;
  onChange: (destino: Destino) => void;
}) {
  const [salvando, setSalvando] = useState(false);

  async function trocar(destino: Destino) {
    if (destino === miningTarget || salvando) return;
    const anterior = miningTarget;
    onChange(destino); // otimista — atualiza a tela na hora.
    setSalvando(true);
    try {
      const res = await fetch("/api/mining-target", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ miningTarget: destino }),
      });
      if (!res.ok) onChange(anterior); // falhou — desfaz.
    } catch {
      onChange(anterior);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="mining-target"
      title="O que o robô vai minerar de NOVO a partir da próxima rodada — fica assim até você trocar de novo"
    >
      <span className="mining-target-label">🤖 Minerando:</span>
      <div className="pill-group">
        <button className={miningTarget === "sales_page" ? "active" : ""} onClick={() => trocar("sales_page")}>
          PV
        </button>
        <button className={miningTarget === "quiz" ? "active" : ""} onClick={() => trocar("quiz")}>
          Quiz
        </button>
      </div>
    </div>
  );
}
