import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { CheckCircle, Play, ArrowLeft, Clock, Zap, Crown } from "lucide-react";

const plans = [
  {
    name: "Teste Grátis",
    price: "R$ 0",
    period: "1 hora",
    icon: Clock,
    features: [
      "Acesso total ao catálogo por 1 hora",
      "1 tela simultânea",
      "Qualidade HD",
      "Sem compromisso",
    ],
    popular: false,
    cta: "Começar teste grátis",
    variant: "hero-outline" as const,
  },
  {
    name: "Mensal",
    price: "R$ 29,90",
    period: "/mês",
    icon: Zap,
    features: [
      "Acesso total ao catálogo",
      "Até 2 telas simultâneas",
      "Qualidade HD",
      "Canais ao vivo",
      "Cancele quando quiser",
    ],
    popular: false,
    cta: "Assinar mensal",
    variant: "hero-outline" as const,
  },
  {
    name: "Anual",
    price: "R$ 19,90",
    period: "/mês",
    icon: Crown,
    features: [
      "Tudo do plano mensal",
      "Até 4 telas simultâneas",
      "Qualidade 4K",
      "Download offline",
      "Economia de 33%",
      "Suporte prioritário",
    ],
    popular: true,
    cta: "Assinar anual",
    variant: "hero" as const,
  },
];

const Subscription = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container mx-auto flex items-center h-16 px-4 gap-3">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Play className="w-4 h-4 text-primary-foreground fill-current" />
            </div>
            <span className="font-display font-bold text-foreground">CartPlay</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-3xl md:text-5xl font-display font-bold mb-3">
            Escolha seu <span className="text-gradient">plano</span>
          </h1>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            Comece com 1 hora grátis. Cancele quando quiser. Sem fidelidade.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto animate-slide-up">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`relative bg-card-gradient border rounded-2xl p-6 md:p-8 flex flex-col ${
                plan.popular ? "border-primary shadow-glow scale-[1.02]" : "border-border"
              }`}
            >
              {plan.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-4 py-1 rounded-full whitespace-nowrap">
                  MAIS POPULAR
                </span>
              )}

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${plan.popular ? "bg-primary/20" : "bg-secondary"}`}>
                  <plan.icon className={`w-5 h-5 ${plan.popular ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <h3 className="text-xl font-display font-bold">{plan.name}</h3>
              </div>

              <div className="mb-6">
                <span className="text-4xl font-display font-bold">{plan.price}</span>
                <span className="text-muted-foreground ml-1">{plan.period}</span>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              <Button variant={plan.variant} size="lg" className="w-full">
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>

        <div className="text-center mt-12 text-sm text-muted-foreground">
          <p>Ao assinar, você concorda com nossos <a href="#" className="text-primary hover:underline">Termos de Uso</a> e <a href="#" className="text-primary hover:underline">Política de Privacidade</a>.</p>
        </div>
      </main>
    </div>
  );
};

export default Subscription;
