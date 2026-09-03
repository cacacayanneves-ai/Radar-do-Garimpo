import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function isoDate(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

function isoDateTime(daysAgo: number, hour = 9): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
}

// Gera uma série de `days` pontos terminando "hoje", com uma trajetória
// (crescente, decrescente ou estável) e um pouco de ruído — só para popular
// a UI com sparklines/deltas plausíveis antes do scraper real rodar.
function genHistory(days: number, start: number, trend: "up" | "down" | "flat" | "spike"): { d: string; c: number }[] {
  const points: { d: string; c: number }[] = [];
  let value = start;
  for (let i = days - 1; i >= 0; i--) {
    if (trend === "up") value += Math.random() < 0.7 ? 1 : 0;
    if (trend === "down") value = Math.max(1, value - (Math.random() < 0.5 ? 1 : 0));
    if (trend === "flat") value += Math.random() < 0.2 ? (Math.random() < 0.5 ? 1 : -1) : 0;
    if (trend === "spike" && i === 0) value += 4;
    value = Math.max(1, value);
    points.push({ d: isoDate(i), c: Math.round(value) });
  }
  return points;
}

async function main() {
  const offers = [
    {
      id: "bianca-seabra-moldes",
      niche: "Moldes de costura",
      produto: "Pacote 500 Moldes de Costura PDF",
      anunciante: "Bianca Seabra Ateliê",
      ticket: "R$ 17,00",
      vendaUrl: "https://exemplo-vendas.com/moldes-costura",
      libraryId: "1187654321098765",
      pageId: "245566778899001",
      concorrencia: 210,
      concorrenciaEm: isoDateTime(2),
      internacional: "Alta",
      riscoPolitica: false,
      primeiraDeteccaoDays: 12,
      descoberta: false,
      history: genHistory(20, 3, "up"),
    },
    {
      id: "guia-emagrecimento-natural",
      niche: "Guia de emagrecimento",
      produto: "Guia Completo Detox 21 Dias",
      anunciante: "Vida Leve Saúde",
      ticket: "R$ 27,90",
      vendaUrl: "https://exemplo-vendas.com/detox21",
      libraryId: "1187654321098766",
      pageId: "245566778899002",
      concorrencia: 1340,
      concorrenciaEm: isoDateTime(1),
      internacional: "Media",
      riscoPolitica: true,
      primeiraDeteccaoDays: 30,
      descoberta: false,
      history: genHistory(20, 8, "down"),
    },
    {
      id: "kit-planilhas-treino-hipertrofia",
      niche: "Planilhas de treino",
      produto: "Kit 12 Planilhas de Treino Hipertrofia",
      anunciante: "Foco Total Fitness",
      ticket: "R$ 19,90",
      vendaUrl: "https://exemplo-vendas.com/planilhas-treino",
      libraryId: "1187654321098767",
      pageId: "245566778899003",
      concorrencia: 640,
      concorrenciaEm: isoDateTime(3),
      internacional: "Media",
      riscoPolitica: false,
      primeiraDeteccaoDays: 5,
      descoberta: true,
      history: genHistory(9, 2, "spike"),
    },
    {
      id: "desenhos-colorir-infantil-pdf",
      niche: "Desenhos para colorir",
      produto: "500 Desenhos para Colorir Infantil",
      anunciante: "Mundo Coloridinho",
      ticket: "R$ 14,90",
      vendaUrl: "https://exemplo-vendas.com/colorir-infantil",
      libraryId: "1187654321098768",
      pageId: "245566778899004",
      concorrencia: 95,
      concorrenciaEm: isoDateTime(4),
      internacional: "Alta",
      riscoPolitica: false,
      primeiraDeteccaoDays: 2,
      descoberta: true,
      history: genHistory(3, 1, "up"),
    },
    {
      id: "graficos-croche-amigurumi",
      niche: "Gráficos de crochê",
      produto: "80 Gráficos de Amigurumi Passo a Passo",
      anunciante: "Ateliê da Vovó Crochê",
      ticket: "R$ 22,00",
      vendaUrl: "https://exemplo-vendas.com/amigurumi-graficos",
      libraryId: "1187654321098769",
      pageId: "245566778899005",
      concorrencia: 410,
      concorrenciaEm: isoDateTime(6),
      internacional: "Alta",
      riscoPolitica: false,
      primeiraDeteccaoDays: 18,
      descoberta: false,
      history: genHistory(20, 5, "flat"),
    },
    {
      id: "projetos-serralheria-portoes",
      niche: "Projetos de serralheria",
      produto: "120 Projetos de Portões e Grades em PDF",
      anunciante: "Serralheria Prática BR",
      ticket: "R$ 24,90",
      vendaUrl: "https://exemplo-vendas.com/serralheria-projetos",
      libraryId: "1187654321098770",
      pageId: "245566778899006",
      concorrencia: 78,
      concorrenciaEm: isoDateTime(2),
      internacional: "Baixa",
      riscoPolitica: false,
      primeiraDeteccaoDays: 9,
      descoberta: false,
      history: genHistory(15, 2, "up"),
    },
    {
      id: "curso-refrigeracao-basico",
      niche: "Curso de refrigeração",
      produto: "Curso Refrigeração e Ar-Condicionado do Zero",
      anunciante: "Técnico Rápido Cursos",
      ticket: "R$ 39,90",
      vendaUrl: "https://exemplo-vendas.com/refrigeracao-basico",
      libraryId: "1187654321098771",
      pageId: "245566778899007",
      concorrencia: 520,
      concorrenciaEm: isoDateTime(5),
      internacional: "Baixa",
      riscoPolitica: false,
      primeiraDeteccaoDays: 25,
      descoberta: false,
      history: genHistory(20, 6, "down"),
    },
    {
      id: "arteterapia-mandalas-kit",
      niche: "Arteterapia",
      produto: "Kit Arteterapia 200 Mandalas Antiestresse",
      anunciante: "Respira Arteterapia",
      ticket: "R$ 16,00",
      vendaUrl: "https://exemplo-vendas.com/arteterapia-mandalas",
      libraryId: "1187654321098772",
      pageId: "245566778899008",
      concorrencia: 260,
      concorrenciaEm: isoDateTime(1),
      internacional: "Media",
      riscoPolitica: true,
      primeiraDeteccaoDays: 4,
      descoberta: true,
      history: genHistory(6, 1, "spike"),
    },
    {
      id: "caligrafia-moderna-apostila",
      niche: "Caligrafia",
      produto: "Apostila Caligrafia Moderna do Zero ao Avançado",
      anunciante: "Letra Bonita Ateliê",
      ticket: "R$ 12,90",
      vendaUrl: "https://exemplo-vendas.com/caligrafia-moderna",
      libraryId: "1187654321098773",
      pageId: "245566778899009",
      concorrencia: 890,
      concorrenciaEm: isoDateTime(3),
      internacional: "Media",
      riscoPolitica: false,
      primeiraDeteccaoDays: 15,
      descoberta: false,
      history: genHistory(20, 4, "flat"),
    },
    {
      id: "moldes-letras-decoradas-3d",
      niche: "Moldes de letras",
      produto: "Moldes de Letras 3D para Festas",
      anunciante: "Festa Fácil Moldes",
      ticket: "R$ 15,00",
      vendaUrl: "https://exemplo-vendas.com/letras-3d",
      libraryId: "1187654321098774",
      pageId: "245566778899010",
      concorrencia: 1050,
      concorrenciaEm: isoDateTime(2),
      internacional: "Alta",
      riscoPolitica: false,
      primeiraDeteccaoDays: 40,
      descoberta: false,
      history: genHistory(20, 3, "down"),
    },
    {
      id: "kit-atividades-alfabetizacao",
      niche: "Consciência fonológica",
      produto: "Kit 300 Atividades de Consciência Fonológica",
      anunciante: "Alfabetizar Brincando",
      ticket: "R$ 18,90",
      vendaUrl: "https://exemplo-vendas.com/consciencia-fonologica",
      libraryId: "1187654321098775",
      pageId: "245566778899011",
      concorrencia: 175,
      concorrenciaEm: isoDateTime(1),
      internacional: "Baixa",
      riscoPolitica: false,
      primeiraDeteccaoDays: 6,
      descoberta: true,
      history: genHistory(7, 2, "up"),
    },
    {
      id: "roupinhas-pet-moldes-kit",
      niche: "Roupinhas pet",
      produto: "40 Moldes de Roupinhas para Pet",
      anunciante: "Pet Estilo Moldes",
      ticket: "R$ 13,90",
      vendaUrl: "https://exemplo-vendas.com/roupinhas-pet",
      libraryId: "1187654321098776",
      pageId: "245566778899012",
      concorrencia: 330,
      concorrenciaEm: isoDateTime(4),
      internacional: "Alta",
      riscoPolitica: false,
      primeiraDeteccaoDays: 3,
      descoberta: true,
      history: genHistory(4, 1, "up"),
    },
  ] as const;

  for (const o of offers) {
    const { primeiraDeteccaoDays, ...rest } = o;
    await prisma.offer.upsert({
      where: { id: o.id },
      create: {
        ...rest,
        destino: "sales_page",
        collation: rest.history[rest.history.length - 1]?.c ?? 1,
        primeiraDeteccao: new Date(isoDateTime(primeiraDeteccaoDays)),
        history: rest.history,
      },
      update: {
        ...rest,
        collation: rest.history[rest.history.length - 1]?.c ?? 1,
        history: rest.history,
      },
    });
  }

  const escalations = offers
    .filter((o) => o.history.length >= 2)
    .filter((o) => {
      const last = o.history[o.history.length - 1].c;
      const prev = o.history[o.history.length - 2].c;
      return last - prev >= 2 || (prev >= 1 && last >= prev * 2);
    })
    .map((o) => o.id);

  await prisma.metaStatus.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      lastRun: new Date(),
      lastRunNota: `Seed de exemplo — ${offers.length} ofertas carregadas para visualização.`,
      offersTracked: offers.length,
      novasHoje: offers.filter((o) => o.descoberta).length,
      podadasHoje: 0,
      escalations,
    },
    update: {
      lastRun: new Date(),
      lastRunNota: `Seed de exemplo — ${offers.length} ofertas carregadas para visualização.`,
      offersTracked: offers.length,
      novasHoje: offers.filter((o) => o.descoberta).length,
      podadasHoje: 0,
      escalations,
    },
  });

  console.log(`Seed concluído: ${offers.length} ofertas.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
