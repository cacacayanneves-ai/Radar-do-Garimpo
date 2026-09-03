import { prisma } from "@/lib/db";
import { serializeOffer, serializeStatus } from "@/lib/serialize";
import LiveDashboard from "@/components/LiveDashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [offerRows, statusRow] = await Promise.all([
    prisma.offer.findMany({ orderBy: { primeiraDeteccao: "desc" } }),
    prisma.metaStatus.findUnique({ where: { id: "singleton" } }),
  ]);

  const offers = offerRows.map(serializeOffer);
  const status = statusRow ? serializeStatus(statusRow) : null;

  return <LiveDashboard initialOffers={offers} initialStatus={status} />;
}
