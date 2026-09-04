import type { Offer } from "@/lib/types";
import { computeDelta, isNewThisWeek, parseTicketValue } from "@/lib/compute";

export default function StatTiles({ offers }: { offers: Offer[] }) {
  const total = offers.length;
  const escalando = offers.filter((o) => (computeDelta(o) ?? 0) > 0).length;
  const aguardando2aLeitura = offers.filter((o) => (o.history || []).length < 2).length;
  const novas = offers.filter(isNewThisWeek).length;

  const tickets = offers.map((o) => parseTicketValue(o.ticket)).filter((v): v is number => v !== null);
  const ticketMedio = tickets.length > 0 ? tickets.reduce((a, b) => a + b, 0) / tickets.length : null;

  return (
    <div className="stats">
      <div className="tile">
        <div className="tile-icon">🗺️</div>
        <div className="tile-value">{total}</div>
        <div className="tile-label">Ofertas na mira</div>
      </div>
      <div className="tile">
        <div className="tile-icon">📈</div>
        <div className="tile-value">{escalando}</div>
        <div className="tile-label">Escalando agora</div>
        {total > 0 && aguardando2aLeitura === total ? (
          <div className="tile-note">todas aguardando 2ª leitura</div>
        ) : aguardando2aLeitura > 0 ? (
          <div className="tile-note">{aguardando2aLeitura} aguardando 2ª leitura</div>
        ) : null}
      </div>
      <div className="tile">
        <div className="tile-icon">✨</div>
        <div className="tile-value">{novas}</div>
        <div className="tile-label">Descobertas na semana</div>
      </div>
      <div className="tile">
        <div className="tile-icon">💰</div>
        <div className="tile-value">
          {ticketMedio != null ? `R$ ${ticketMedio.toFixed(2).replace(".", ",")}` : "n/d"}
        </div>
        <div className="tile-label">Ticket médio</div>
        {tickets.length > 0 && tickets.length < total ? (
          <div className="tile-note">
            {tickets.length} de {total} com preço
          </div>
        ) : null}
      </div>
    </div>
  );
}
