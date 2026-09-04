"use client";

import { useEffect, useState } from "react";

// Marca do radar: círculos concêntricos, varredura e dois blips. Desenhada
// em SVG (não emoji) pra herdar a cor do tema e ficar nítida em qualquer
// tamanho. A varredura gira devagar; para sob prefers-reduced-motion.
function RadarMark() {
  return (
    <svg viewBox="0 0 48 48" width="30" height="30" aria-hidden="true" className="radar-mark">
      <g fill="none" stroke="currentColor" strokeWidth="1.6" opacity="0.55">
        <circle cx="24" cy="24" r="19" />
        <circle cx="24" cy="24" r="12.5" />
        <circle cx="24" cy="24" r="6" />
      </g>
      <g stroke="currentColor" strokeWidth="1.2" opacity="0.35">
        <line x1="24" y1="5" x2="24" y2="43" />
        <line x1="5" y1="24" x2="43" y2="24" />
      </g>
      <g className="radar-sweep">
        <path d="M24 24 L24 5 A19 19 0 0 1 40.5 14.5 Z" fill="currentColor" opacity="0.28" />
        <line x1="24" y1="24" x2="24" y2="5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="32" cy="17" r="2.2" fill="currentColor" />
      <circle cx="17" cy="31" r="1.6" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

export default function Header({ offersCount }: { offersCount: number }) {
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const saved = window.localStorage.getItem("radar-theme");
    if (saved === "light" || saved === "dark") {
      setTheme(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  function toggleTheme() {
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const current = theme ?? (prefersDark ? "dark" : "light");
    const next = current === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem("radar-theme", next);
  }

  return (
    <header className="header">
      <div className="brand">
        <div className="logo">
          <RadarMark />
        </div>
        <div className="brand-text">
          <h1>Radar do Garimpo</h1>
          <p>Ofertas low ticket escalando na Biblioteca de Anúncios da Meta</p>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="status-pill">
          <span className="dot-live" />
          {offersCount} {offersCount === 1 ? "oferta" : "ofertas"} sob vigilância
        </div>
        <button className="theme-toggle" onClick={toggleTheme} title="Alternar tema" aria-label="Alternar tema claro/escuro">
          {theme === "dark" ? "☀️" : "🌙"}
        </button>
      </div>
    </header>
  );
}
