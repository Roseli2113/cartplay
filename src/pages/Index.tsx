import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import LandingHeader from "@/components/LandingHeader";
import heroBg from "@/assets/hero-bg.jpg";
import {
  Play, Smartphone, Layers, Tv, RefreshCw,
  UserPlus, CreditCard, CheckCircle,
  Monitor, Flame, QrCode,
} from "lucide-react";
import { usePlans } from "@/hooks/usePlans";

const benefits = [
  { icon: Smartphone, title: "Assista em Qualquer Lugar", desc: "No celular, tablet, computador ou Smart TV. Seu entretenimento te acompanha." },
  { icon: Layers, title: "Conteúdo Organizado", desc: "Filmes, séries, desenhos e canais organizados por categorias para você encontrar fácil." },
  { icon: Tv, title: "Compatível com Smart TVs", desc: "Apps dedicados para Android TV, Fire TV e outras plataformas de TV." },
  { icon: RefreshCw, title: "Atualizações Frequentes", desc: "Novos conteúdos adicionados toda semana para você nunca ficar sem opção." },
];

const steps = [
  { num: "01", icon: UserPlus, title: "Crie sua conta", desc: "Cadastre-se em menos de 1 minuto com seu e-mail." },
  { num: "02", icon: CreditCard, title: "Escolha seu plano", desc: "Selecione o plano que melhor se encaixa no seu bolso." },
  { num: "03", icon: CheckCircle, title: "Comece a assistir", desc: "Acesse todo o catálogo imediatamente em qualquer dispositivo." },
];

const Index = () => {
  const { plans, loading } = usePlans();
  // Show only monthly and annual on the home page
  const displayPlans = plans.filter(p => p.slug !== "trial");

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0">
          <img src={heroBg} alt="" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-background/30" />
        </div>
        <div className="relative z-10 container mx-auto px-4 text-center max-w-3xl animate-fade-in">
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-display font-bold leading-tight mb-6">
            Seus filmes e séries <span className="text-gradient">favoritos</span> em um só lugar
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Assista filmes, séries, desenhos e canais ao vivo com qualidade incrível. Disponível em todos os seus dispositivos.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button variant="hero" size="lg" asChild>
              <Link to="/register">
                <Play className="w-5 h-5 fill-current" /> Começar agora
              </Link>
            </Button>
            <Button variant="hero-outline" size="lg" asChild>
              <Link to="#planos">Ver planos</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">Por que escolher a CartPlay?</h2>
          <p className="text-muted-foreground text-center mb-14 max-w-xl mx-auto">Tudo o que você precisa para sua diversão, em uma única plataforma.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b) => (
              <div key={b.title} className="bg-card-gradient border border-border rounded-xl p-6 hover:border-primary/30 transition-colors shadow-card group">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <b.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-lg font-display font-semibold mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-14">Como funciona</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {steps.map((s) => (
              <div key={s.num} className="text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <s.icon className="w-7 h-7 text-primary" />
                </div>
                <span className="text-xs font-bold text-primary tracking-widest uppercase">Passo {s.num}</span>
                <h3 className="text-xl font-display font-semibold mt-2 mb-2">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TV Apps */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">Disponível para sua TV</h2>
          <p className="text-muted-foreground mb-10 max-w-lg mx-auto">Baixe o app e transforme sua TV em um cinema completo.</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="secondary" size="lg" className="gap-2">
              <Monitor className="w-5 h-5" /> Android TV
            </Button>
            <Button variant="secondary" size="lg" className="gap-2">
              <Flame className="w-5 h-5" /> Fire TV
            </Button>
            <Button variant="secondary" size="lg" className="gap-2">
              <Tv className="w-5 h-5" /> Smart TV
            </Button>
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-display font-bold text-center mb-4">Escolha seu plano</h2>
          <p className="text-muted-foreground text-center mb-14">Cancele quando quiser. Sem fidelidade.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {loading ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">Carregando planos...</div>
            ) : displayPlans.map((p) => (
              <div key={p.id} className={`relative bg-card-gradient border rounded-2xl p-8 ${p.is_popular ? 'border-primary shadow-glow' : 'border-border'}`}>
                {p.is_popular && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full">MAIS POPULAR</span>
                )}
                <h3 className="text-2xl font-display font-bold mb-1">{p.name}</h3>
                <div className="mb-6">
                  <span className="text-4xl font-display font-bold">{p.price}</span>
                  <span className="text-muted-foreground">{p.period}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <Button variant={p.is_popular ? "hero" : "hero-outline"} className="w-full" size="lg" asChild>
                  {p.payment_link ? (
                    <a href={p.payment_link} target="_blank" rel="noopener noreferrer">Assinar agora</a>
                  ) : (
                    <Link to="/register">Assinar agora</Link>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <Play className="w-4 h-4 text-primary-foreground fill-current" />
              </div>
              <span className="font-display font-bold text-foreground">CartPlay</span>
            </div>
            <div className="flex gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Sobre</a>
              <a href="#" className="hover:text-foreground transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-foreground transition-colors">Privacidade</a>
              <a href="#" className="hover:text-foreground transition-colors">Contato</a>
            </div>
          </div>
          <p className="text-center text-xs text-muted-foreground mt-8">© 2026 CartPlay. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
