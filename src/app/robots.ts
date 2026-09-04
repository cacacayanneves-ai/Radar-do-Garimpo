import type { MetadataRoute } from "next";

// Painel de pesquisa de concorrência — pública pra quem tem o link, mas
// não deve aparecer indexada em busca nenhuma.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", disallow: "/" },
  };
}
