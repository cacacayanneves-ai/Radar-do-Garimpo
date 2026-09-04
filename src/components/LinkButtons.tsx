import type { Offer } from "@/lib/types";
import { IconEtiqueta, IconLink, IconMegafone } from "./Icons";

export default function LinkButtons({ offer }: { offer: Offer }) {
  const adUrl = `https://www.facebook.com/ads/library/?id=${offer.libraryId}`;
  const advertiserUrl = `https://www.facebook.com/ads/library/?active_status=active&ad_type=all&country=BR&view_all_page_id=${offer.pageId}&search_type=page&media_type=all`;

  return (
    <div className="links-cell">
      <a
        className="icon-btn"
        href={adUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Anúncio na Biblioteca de Anúncios"
      >
        <IconMegafone />
      </a>
      <a
        className="icon-btn"
        href={advertiserUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Todos os anúncios do anunciante"
      >
        <IconEtiqueta />
      </a>
      <a
        className="icon-btn"
        href={offer.vendaUrl}
        target="_blank"
        rel="noopener noreferrer"
        title="Página de venda"
      >
        <IconLink />
      </a>
    </div>
  );
}
