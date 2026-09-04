import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  style: ["italic", "normal"],
  variable: "--font-display",
  display: "swap",
});

const plexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-body",
  display: "swap",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Radar do Garimpo",
  description:
    "Monitoramento de ofertas digitais low ticket escalando na Biblioteca de Anúncios da Meta.",
  // Painel de pesquisa de concorrência — não deve aparecer em busca do
  // Google (a URL é pública pra quem tem o link, não pra indexação).
  robots: { index: false, follow: false },
  // Sem isso, "Adicionar à Tela de Início" no iOS às vezes monta o nome do
  // app sozinho (deu "RadardoGarimpo", sem espaço, pro Cayan) em vez de usar
  // o title. appleWebApp.title fixa o nome que aparece embaixo do ícone.
  appleWebApp: {
    title: "Radar do Garimpo",
    capable: true,
    statusBarStyle: "black-translucent",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable}`}>
        {children}
      </body>
    </html>
  );
}
