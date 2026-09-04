"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FilterKey, MetaStatus, Offer, SortKey } from "@/lib/types";
import { computeDelta, isNewThisWeek, opportunity, topScore } from "@/lib/compute";
import Header from "./Header";
import StatTiles from "./StatTiles";
import FilterTabs from "./FilterTabs";
import OffersTable from "./OffersTable";

const POLL_INTERVAL_MS = 45_000;

function formatLastRun(iso: string | null): string {
  if (!iso) return "ainda não rodou";
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${dd}/${mm} ${hh}:${min}`;
}

export default function LiveDashboard({
  initialOffers,
  initialStatus,
}: {
  initialOffers: Offer[];
  initialStatus: MetaStatus | null;
}) {
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [status, setStatus] = useState<MetaStatus | null>(initialStatus);
  const [filter, setFilter] = useState<FilterKey>("todas");
  const [sortKey, setSortKey] = useState<SortKey>("opportunity");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    async function poll() {
      try {
        const [offersRes, statusRes] = await Promise.all([
          fetch("/api/offers", { cache: "no-store" }),
          fetch("/api/status", { cache: "no-store" }),
        ]);
        if (offersRes.ok) setOffers(await offersRes.json());
        if (statusRes.ok) setStatus(await statusRes.json());
      } catch {
        // Falha silenciosa — mantém os dados já carregados até a próxima tentativa.
      }
    }

    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const filtered = useMemo(() => {
    switch (filter) {
      case "top10":
        // As 10 de maior nota (ver topScore em lib/compute). A ordenação da
        // coluna escolhida continua valendo, mas só dentro dessas 10.
        return [...offers].sort((a, b) => topScore(b) - topScore(a)).slice(0, 10);
      case "escalando":
        return offers.filter((o) => (computeDelta(o) ?? 0) > 0);
      case "esfriando":
        return offers.filter((o) => (computeDelta(o) ?? 0) < 0);
      case "novas":
        return offers.filter(isNewThisWeek);
      default:
        return offers;
    }
  }, [offers, filter]);

  const sorted = useMemo(() => {
    const list = [...filtered];
    switch (sortKey) {
      case "collation":
        list.sort((a, b) => (b.collation ?? 0) - (a.collation ?? 0));
        break;
      case "delta":
        list.sort((a, b) => (computeDelta(b) ?? -Infinity) - (computeDelta(a) ?? -Infinity));
        break;
      case "concorrencia":
        list.sort((a, b) => (a.concorrencia ?? 9999) - (b.concorrencia ?? 9999));
        break;
      default:
        list.sort((a, b) => opportunity(b) - opportunity(a));
    }
    return list;
  }, [filtered, sortKey]);

  function handleSort(key: SortKey) {
    setSortKey((current) => (current === key ? "opportunity" : key));
  }

  return (
    <div className="page">
      <Header offersCount={offers.length} />
      <StatTiles offers={offers} />
      <FilterTabs active={filter} onChange={setFilter} />
      <OffersTable offers={sorted} sortKey={sortKey} onSort={handleSort} />
      <div className="footer">Última mineração: {formatLastRun(status?.lastRun ?? null)}</div>
    </div>
  );
}
