import { Link } from "react-router-dom";
import { Play, Mail, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import WhatsAppButton from "@/components/WhatsAppButton";

const ConfirmEmail = () => (
  <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
    <div className="w-full max-w-md animate-fade-in text-center">
      <Link to="/" className="flex items-center gap-2 justify-center mb-10">
        <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center shadow-glow">
          <Play className="w-5 h-5 text-primary-foreground fill-current" />
        </div>
        <span className="text-2xl font-display font-bold text-foreground">CartPlay</span>
      </Link>

      <div className="bg-card border border-border rounded-2xl p-8 shadow-card space-y-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Mail className="w-8 h-8 text-primary" />
        </div>

        <h1 className="text-2xl font-display font-bold">Verifique seu e-mail</h1>

        <p className="text-muted-foreground leading-relaxed">
          Enviamos um link de confirmação para o seu e-mail. Abra sua caixa de entrada e clique no botão{" "}
          <strong className="text-foreground">Confirmar E-mail</strong> para ativar sua conta.
        </p>

        <div className="bg-secondary/50 border border-border rounded-lg p-4 text-sm text-muted-foreground">
          <p>💡 Não encontrou? Verifique a pasta de <strong className="text-foreground">spam</strong> ou lixo eletrônico.</p>
        </div>

        <Button variant="hero-outline" className="w-full" asChild>
          <Link to="/login">
            Já confirmei, fazer login <ArrowRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
    </div>
    <WhatsAppButton />
  </div>
);

export default ConfirmEmail;
