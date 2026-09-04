import type { MetadataRoute } from "next";

// Next.js publica isso em /manifest.webmanifest automaticamente. No iOS,
// quem controla nome/ícone do ícone instalado são as tags apple-* (ver
// layout.tsx e apple-icon.tsx) — este manifest é o equivalente pra
// Android/Chrome, caso o Cayan (ou alguém com o link) instale por lá.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Radar do Garimpo",
    short_name: "Radar do Garimpo",
    description:
      "Monitoramento de ofertas digitais low ticket escalando na Biblioteca de Anúncios da Meta.",
    start_url: "/",
    display: "standalone",
    background_color: "#08090c",
    theme_color: "#08090c",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
