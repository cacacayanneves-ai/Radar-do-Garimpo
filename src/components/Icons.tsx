// Ícones em SVG no lugar de emoji: herdam a cor do tema (currentColor),
// ficam nítidos em qualquer tamanho e têm contraste consistente — emoji
// renderiza com cor própria e some no fundo escuro.

const base = {
  width: 15,
  height: 15,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.9,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

// Livro aberto — usado pro link do anúncio específico na Biblioteca de
// Anúncios. O ícone antigo (megafone desenhado como alto-falante) confundia
// com "som"; livro casa com "biblioteca" e não repete a forma do ícone de
// loja (todos os anúncios do anunciante).
export function IconBiblioteca() {
  return (
    <svg {...base}>
      <path d="M12 7c-2.1-1.4-4.7-2-7-2v12.5c2.3 0 4.9.6 7 2 2.1-1.4 4.7-2 7-2V5c-2.3 0-4.9.6-7 2Z" />
      <path d="M12 7v12.5" />
    </svg>
  );
}

// Loja/anunciante — usado pro link "todos os anúncios do anunciante", pra
// não ficar parecido com o ícone do anúncio único (megafone). No celular não
// tem hover pra ler o title, então o ícone sozinho precisa dar a diferença.
export function IconLoja() {
  return (
    <svg {...base}>
      <path d="M4 10v9a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-9" />
      <path d="M3 10 4.5 4h15L21 10" />
      <path d="M3 10a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" />
    </svg>
  );
}

export function IconLink() {
  return (
    <svg {...base}>
      <path d="M10 13a5 5 0 0 0 7 0l3-3a5 5 0 0 0-7-7l-1 1" />
      <path d="M14 11a5 5 0 0 0-7 0l-3 3a5 5 0 0 0 7 7l1-1" />
    </svg>
  );
}

export function IconEstrela({ preenchida }: { preenchida: boolean }) {
  return (
    <svg {...base} fill={preenchida ? "currentColor" : "none"}>
      <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.3-4.1 5.9-.9Z" />
    </svg>
  );
}

export function IconLixeira() {
  return (
    <svg {...base}>
      <path d="M4 7h16" />
      <path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
      <path d="M6 7h12l-.8 12a1 1 0 0 1-1 1H7.8a1 1 0 0 1-1-1L6 7Z" />
      <path d="M10 11v6M14 11v6" />
    </svg>
  );
}

export function IconRestaurar() {
  return (
    <svg {...base}>
      <path d="M3 12a9 9 0 1 0 3-6.7" />
      <path d="M3 4v5h5" />
    </svg>
  );
}
