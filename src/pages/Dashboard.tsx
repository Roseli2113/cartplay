import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Play, Home, Film, Heart, PlayCircle, Radio, Monitor, User, LogOut, Menu, X,
  Flame, Tv, QrCode, ChevronRight, Shield,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const categories = ["Filmes", "Séries", "Desenhos", "Canais"];

const menuItems = [
  { icon: Home, label: "Início", id: "home" },
  { icon: Film, label: "Catálogo", id: "catalog" },
  { icon: Heart, label: "Favoritos", id: "favorites" },
  { icon: PlayCircle, label: "Continuar Assistindo", id: "continue" },
  { icon: Radio, label: "Canais ao Vivo", id: "live" },
  { icon: Monitor, label: "Baixar App para TV", id: "tv-app" },
  { icon: User, label: "Perfil", id: "profile" },
];

interface ContentCard {
  id: string;
  title: string;
  category: string;
  thumbnail_url?: string;
  stream_url?: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const { signOut, profile, isAdmin } = useAuth();
  const [activeSection, setActiveSection] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [content, setContent] = useState<ContentCard[]>([]);
  const [playingContent, setPlayingContent] = useState<ContentCard | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      const tables = ["movies", "series", "cartoons", "live_channels"] as const;
      const allContent: ContentCard[] = [];
      for (const table of tables) {
        const { data } = await supabase.from(table as any).select("id, title, category, thumbnail_url, stream_url");
        if (data) allContent.push(...(data as unknown as ContentCard[]));
      }
      setContent(allContent);
    };
    fetchContent();
  }, []);

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  const renderContent = () => {
    if (activeSection === "tv-app") {
      return (
        <div className="animate-fade-in">
          <h2 className="text-2xl font-display font-bold mb-2">Baixar App para TV</h2>
          <p className="text-muted-foreground mb-8 max-w-lg">Instale o aplicativo na sua Smart TV e aproveite todo o catálogo na tela grande.</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-2xl">
            <div className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
              <Monitor className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-display font-semibold mb-2">Android TV</h3>
              <p className="text-xs text-muted-foreground mb-4">Baixe o APK diretamente</p>
              <Button variant="hero" size="sm" className="w-full">Baixar APK</Button>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
              <Flame className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-display font-semibold mb-2">Fire TV</h3>
              <p className="text-xs text-muted-foreground mb-4">Disponível na loja Fire TV</p>
              <Button variant="hero" size="sm" className="w-full">Instalar</Button>
            </div>
            <div className="bg-card border border-border rounded-xl p-6 text-center hover:border-primary/30 transition-colors">
              <QrCode className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-display font-semibold mb-2">QR Code</h3>
              <p className="text-xs text-muted-foreground mb-4">Escaneie com seu celular</p>
              <div className="w-24 h-24 bg-muted rounded-lg mx-auto flex items-center justify-center">
                <QrCode className="w-16 h-16 text-muted-foreground/50" />
              </div>
            </div>
          </div>
        </div>
      );
    }

    const displayContent: ContentCard[] = content.length > 0 ? content : Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      title: [`Ação Total`, `Aventura Épica`, `Drama Intenso`, `Comédia Leve`, `Terror Sombrio`, `Ficção Científica`][i],
      category: categories[i % 4],
    }));

    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-display font-bold mb-1">Olá, {profile?.name || "bem-vindo"}! 👋</h2>
        <p className="text-muted-foreground mb-8">O que você quer assistir hoje?</p>

        <div className="flex gap-3 mb-8 overflow-x-auto pb-2">
          {categories.map((cat) => (
            <button key={cat} className="px-5 py-2 rounded-full text-sm font-medium bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground transition-colors whitespace-nowrap">
              {cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {displayContent.map((card) => (
            <div key={card.id} onClick={() => card.stream_url && setPlayingContent(card)} className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-glow cursor-pointer">
              <div className="aspect-video bg-muted/50 flex items-center justify-center relative overflow-hidden">
                {card.thumbnail_url ? (
                  <img src={card.thumbnail_url} alt={card.title} className="w-full h-full object-cover" />
                ) : (
                  <Film className="w-10 h-10 text-muted-foreground/30" />
                )}
                <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                  <Play className="w-10 h-10 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity fill-current" />
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{card.title}</h3>
                <span className="text-xs text-muted-foreground">{card.category}</span>
              </div>
            </div>
          ))}
        </div>

        <h3 className="text-xl font-display font-semibold mt-10 mb-4 flex items-center gap-2">
          Continuar Assistindo <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayContent.slice(0, 4).map((card, i) => (
            <div key={`continue-${card.id}`} onClick={() => card.stream_url && setPlayingContent(card)} className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors">
              <div className="aspect-video bg-muted/50 flex items-center justify-center">
                {card.thumbnail_url ? (
                  <img src={card.thumbnail_url} alt={card.title} className="w-full h-full object-cover" />
                ) : (
                  <PlayCircle className="w-8 h-8 text-muted-foreground/30" />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-medium text-sm truncate">{card.title}</h3>
                <div className="w-full bg-muted rounded-full h-1 mt-2">
                  <div className="bg-primary h-1 rounded-full" style={{ width: `${30 + i * 15}%` }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Play className="w-4 h-4 text-primary-foreground fill-current" />
          </div>
          <span className="font-display font-bold text-foreground">StreamMax</span>
          <button className="ml-auto lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${activeSection === item.id ? 'bg-sidebar-accent text-foreground font-medium' : 'text-sidebar-foreground hover:bg-sidebar-accent/50'}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
            >
              <Shield className="w-5 h-5 flex-shrink-0" />
              Área Admin
            </button>
          )}
        </nav>

        <div className="p-3 border-t border-sidebar-border">
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <LogOut className="w-5 h-5" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 min-h-screen">
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-8 sticky top-0 bg-background/80 backdrop-blur-md z-30">
          <button className="lg:hidden mr-4 text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg">
            {menuItems.find((m) => m.id === activeSection)?.label || "Início"}
          </h1>
        </header>
        <div className="p-4 lg:p-8">
          {renderContent()}
        </div>
      </main>
      {/* Fullscreen Video Player */}
      {playingContent && (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
            <div>
              <h2 className="font-display font-semibold text-white text-lg">{playingContent.title}</h2>
              <span className="text-xs text-white/60">{playingContent.category}</span>
            </div>
            <button
              onClick={() => setPlayingContent(null)}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="flex-1 relative overflow-hidden">
            <iframe
              src={`${playingContent.stream_url.replace('youtube.com', 'youtube-nocookie.com')}${playingContent.stream_url.includes('?') ? '&' : '?'}modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&disablekb=0&fs=0&controls=1&autoplay=1`}
              className="absolute inset-0 w-full h-full"
              style={{ border: 'none' }}
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              title={playingContent.title}
            />
            {/* Gradient overlay on top to subtly hide YouTube title bar on hover */}
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black to-transparent z-10 pointer-events-none" />
            {/* Small overlay to hide YouTube bottom-right logo */}
            <div className="absolute bottom-0 right-0 w-28 h-9 bg-gradient-to-tl from-black via-black/80 to-transparent z-10 pointer-events-none" />
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
