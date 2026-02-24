import { MessageCircle } from "lucide-react";

const WHATSAPP_NUMBER = "5515997109182";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Ol%C3%A1%2C%20preciso%20de%20ajuda!`;

const WhatsAppButton = () => (
  <a
    href={WHATSAPP_URL}
    target="_blank"
    rel="noopener noreferrer"
    aria-label="Fale conosco pelo WhatsApp"
    className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-[#25D366] hover:bg-[#1ebe57] text-white flex items-center justify-center shadow-lg hover:scale-110 transition-transform"
  >
    <MessageCircle className="w-7 h-7 fill-current" />
  </a>
);

export default WhatsAppButton;
