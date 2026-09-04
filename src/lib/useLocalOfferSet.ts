"use client";

import { useCallback, useEffect, useState } from "react";

// Guarda um conjunto de ids de oferta no localStorage do navegador —
// usado pra "favoritar"/"descartar". É por dispositivo/navegador, não
// sincroniza entre aparelhos: como o site é público sem login, gravar isso
// no banco deixaria qualquer visitante esconder/favoritar oferta pra todo
// mundo que acessa o link. Sem autenticação, local é a opção seguro.
export function useLocalOfferSet(storageKey: string) {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setIds(new Set(JSON.parse(raw)));
    } catch {
      // localStorage indisponível (aba privada etc.) — segue com o Set vazio.
    }
    setHydrated(true);
  }, [storageKey]);

  const persist = useCallback(
    (next: Set<string>) => {
      setIds(next);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify([...next]));
      } catch {
        // ignora — pior caso, não persiste entre sessões.
      }
    },
    [storageKey]
  );

  const toggle = useCallback(
    (id: string) => {
      setIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        persist(next);
        return next;
      });
    },
    [persist]
  );

  const has = useCallback((id: string) => ids.has(id), [ids]);

  return { ids, has, toggle, hydrated };
}
