// Notificação por WhatsApp via CallMeBot — serviço comunitário gratuito
// (não é API oficial da Meta), ativado pelo próprio Cayan no telefone dele.
// Pedido em 04/09/2026: saber de cada rodada de mineração sem precisar abrir
// o site. NUNCA pode derrubar a mineração — se as credenciais não estiverem
// configuradas (ex: rodando local, sem os secrets do GitHub Actions) ou o
// envio falhar por qualquer motivo, só registra um aviso no log e segue.
const CALLMEBOT_URL = "https://api.callmebot.com/whatsapp.php";

export async function notifyWhatsApp(texto: string): Promise<void> {
  const phone = process.env.WHATSAPP_PHONE;
  const apikey = process.env.WHATSAPP_APIKEY;

  if (!phone || !apikey) {
    console.log("Notificação por WhatsApp pulada: WHATSAPP_PHONE/WHATSAPP_APIKEY não configurados.");
    return;
  }

  try {
    const url = `${CALLMEBOT_URL}?phone=${encodeURIComponent(phone)}&text=${encodeURIComponent(
      texto
    )}&apikey=${encodeURIComponent(apikey)}`;
    const res = await fetch(url);
    const body = await res.text();
    if (!res.ok || !body.toLowerCase().includes("queued")) {
      console.warn(`Notificação por WhatsApp pode ter falhado (HTTP ${res.status}): ${body.slice(0, 200)}`);
      return;
    }
    console.log("Notificação por WhatsApp enviada.");
  } catch (err) {
    console.warn("Notificação por WhatsApp falhou:", err);
  }
}
