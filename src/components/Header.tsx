"use client";

import { useEffect, useState } from "react";

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
        <div className="logo">⛏️</div>
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
