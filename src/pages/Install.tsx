import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingHeader from "@/components/LandingHeader";
import WhatsAppButton from "@/components/WhatsAppButton";
import {
  Monitor, Smartphone, Laptop, Tv, Flame, Download,
  Play, ChevronRight, QrCode, ArrowLeft, Globe,
} from "lucide-react";

const devices = [
  {
    id: "android",
    icon: Smartphone,
    title: "Android (Celular/Tablet)",
    steps: [
      "Abra o navegador Chrome no seu dispositivo Android.",
      "Acesse cartplay.lovable.app.",
      'Toque no menu (⋮) no canto superior direito.',
      'Selecione "Instalar app" ou "Adicionar à tela inicial".',
      "Confirme a instalação.",
      "O ícone do CartPlay aparecerá na sua tela inicial!",
    ],
  },
  {
    id: "iphone",
    icon: Smartphone,
    title: "iPhone / iPad",
    steps: [
      "Abra o Safari no seu iPhone ou iPad.",
      "Acesse cartplay.lovable.app.",
      "Toque no ícone de compartilhar (⬆️) na barra inferior.",
      'Role para baixo e selecione "Adicionar à Tela de Início".',
      'Toque em "Adicionar" no canto superior direito.',
      "Pronto! O CartPlay estará na sua tela inicial.",
    ],
  },
  {
    id: "pc",
    icon: Laptop,
    title: "Computador / Notebook",
    steps: [
      "Abra o Google Chrome ou Microsoft Edge.",
      "Acesse cartplay.lovable.app.",
      "Clique no ícone de instalação (⊕) na barra de endereço.",
      'Ou clique no menu (⋮) → "Instalar CartPlay".',
      "Confirme a instalação.",
      "O app será instalado e abrirá como uma janela dedicada!",
    ],
  },
  {
    id: "android-tv",
    icon: Monitor,
    title: "Android TV",
    steps: [
      "No seu celular, escaneie o QR Code abaixo para baixar o APK.",
      "Transfira o APK para a TV via pen drive ou app de transferência.",
      "Na TV, abra o gerenciador de arquivos.",
      "Localize o APK e instale.",
      "Abra o CartPlay e faça login com sua conta.",
    ],
    showQR: true,
  },
  {
    id: "fire-tv",
    icon: Flame,
    title: "Amazon Fire TV Stick",
    steps: [
      'Na Fire TV, vá em Configurações → "Minha Fire TV" → "Opções do Desenvolvedor".',
      'Ative "Apps de fontes desconhecidas".',
      "Instale o app Downloader pela loja da Amazon.",
      "Abra o Downloader e digite o link fornecido.",
      "Baixe e instale o APK do CartPlay.",
      "Abra o CartPlay e aproveite na tela grande!",
    ],
  },
  {
    id: "smart-tv",
    icon: Tv,
    title: "Smart TV (Samsung, LG, etc.)",
    steps: [
      "Abra o navegador da sua Smart TV.",
      "Acesse cartplay.lovable.app.",
      "Faça login com sua conta CartPlay.",
      "Para melhor experiência, use um teclado/controle com cursor.",
      "Dica: Adicione o site aos favoritos para acesso rápido!",
    ],
  },
];

const Install = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main className="pt-28 pb-20">
        <div className="container mx-auto px-4 max-w-4xl">
          {/* Header */}
          <div className="text-center mb-12 animate-fade-in">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Download className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-5xl font-display font-bold mb-4">
              Instale o <span className="text-gradient">CartPlay</span>
            </h1>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Siga as instruções do seu dispositivo e tenha o CartPlay sempre à mão, como um app nativo.
            </p>
          </div>

          {/* Device cards */}
          <div className="space-y-6 animate-fade-in">
            {devices.map((device, idx) => (
              <details
                key={device.id}
                className="group bg-card-gradient border border-border rounded-xl overflow-hidden hover:border-primary/20 transition-colors"
              >
                <summary className="flex items-center gap-4 p-5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                  <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <device.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="text-lg font-display font-semibold flex-1">{device.title}</h2>
                  <ChevronRight className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-90" />
                </summary>

                <div className="px-5 pb-6 pt-2">
                  <ol className="space-y-3 ml-2">
                    {device.steps.map((step, i) => (
                      <li key={i} className="flex gap-3 items-start">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {i + 1}
                        </span>
                        <span className="text-sm text-muted-foreground leading-relaxed">{step}</span>
                      </li>
                    ))}
                  </ol>

                  {device.showQR && (
                    <div className="mt-6 flex flex-col items-center">
                      <p className="text-xs text-muted-foreground mb-3">Escaneie para acessar o CartPlay:</p>
                      <div className="w-32 h-32 rounded-lg overflow-hidden">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=256x256&data=${encodeURIComponent("https://cartplay.lovable.app")}&bgcolor=1a1a2e&color=ffffff&format=png`}
                          alt="QR Code CartPlay"
                          className="w-full h-full"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-14 animate-fade-in">
            <p className="text-muted-foreground mb-4">Já tem uma conta? Acesse agora.</p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="hero" size="lg" asChild>
                <Link to="/login">
                  <Play className="w-5 h-5 fill-current" /> Entrar
                </Link>
              </Button>
              <Button variant="hero-outline" size="lg" asChild>
                <Link to="/register">Criar Conta</Link>
              </Button>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <p className="text-center text-xs text-muted-foreground">© 2026 CartPlay. Todos os direitos reservados.</p>
      </footer>
      <WhatsAppButton />
    </div>
  );
};

export default Install;
