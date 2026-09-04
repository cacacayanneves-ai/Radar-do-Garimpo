import { ImageResponse } from "next/og";

// iOS não aceita SVG como ícone de tela inicial (só o favicon de aba usa
// icon.svg) — sem isso, "Adicionar à Tela de Início" caía no "R" genérico
// que o próprio iOS desenha quando não acha um apple-touch-icon. Mesmo
// desenho do radar verde do cabeçalho (RadarMark em Header.tsx / icon.svg),
// só que renderizado como PNG. Sem cantos arredondados de propósito: o iOS
// aplica a máscara arredondada dele mesmo — se a gente já mandar arredondado,
// fica um contorno duplicado feio.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "linear-gradient(135deg, #4DFFAA 0%, #0FA968 100%)",
        }}
      >
        <svg width="180" height="180" viewBox="0 0 64 64">
          <g transform="translate(32 32)" fill="none" stroke="#08090C" strokeWidth={2.2}>
            <circle r={21} opacity={0.55} />
            <circle r={13.5} opacity={0.55} />
            <circle r={6.5} opacity={0.55} />
            <line x1={0} y1={-21} x2={0} y2={21} opacity={0.3} />
            <line x1={-21} y1={0} x2={21} y2={0} opacity={0.3} />
          </g>
          <g transform="translate(32 32)">
            <path d="M0 0 L0 -21 A21 21 0 0 1 18 -10.5 Z" fill="#08090C" opacity={0.35} />
            <line x1={0} y1={0} x2={0} y2={-21} stroke="#08090C" strokeWidth={2.8} strokeLinecap="round" />
            <circle cx={9} cy={-8} r={2.8} fill="#08090C" />
          </g>
        </svg>
      </div>
    ),
    { ...size }
  );
}
