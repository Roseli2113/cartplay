import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Play, Home, Film, Heart, PlayCircle, Radio, Monitor, User, LogOut, Menu, X,
  Flame, Tv, QrCode, ChevronRight, Shield, Search, HeartOff, Camera, CreditCard, Save, Loader2,
} from "lucide-react";
import YouTubePlayer from "@/components/YouTubePlayer";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const categories = ["Filmes", "Séries", "Desenhos", "Canais", "Futebol"];

const menuItems = [
  { icon: Home, label: "Início", id: "home" },
  { icon: Film, label: "Catálogo", id: "catalog" },
  { icon: Heart, label: "Favoritos", id: "favorites" },
  { icon: PlayCircle, label: "Continuar Assistindo", id: "continue" },
  { icon: Radio, label: "Canais ao Vivo", id: "live" },
  { icon: Monitor, label: "Baixar App para TV", id: "tv-app" },
  { icon: CreditCard, label: "Assinatura", id: "subscription" },
  { icon: User, label: "Perfil", id: "profile" },
];

interface ContentCard {
  id: string;
  title: string;
  category: string;
  thumbnail_url?: string;
  stream_url?: string;
}

interface FavoriteItem {
  id: string;
  content_id: string;
  content_table: string;
  title: string;
  category: string;
  thumbnail_url: string;
  stream_url: string;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, profile, isAdmin, user } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionHistoryRef = useRef<string[]>(["home"]);
  const [content, setContent] = useState<ContentCard[]>([]);
  const [playingContent, setPlayingContent] = useState<ContentCard | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const playingContentRef = useRef(playingContent);
  playingContentRef.current = playingContent;

  // Track section navigation for back button
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    sectionHistoryRef.current.push(section);
    window.history.pushState({ section }, "");
  };

  // Handle browser back button - navigate within app sections instead of leaving
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      e.preventDefault();
      if (playingContentRef.current) {
        setPlayingContent(null);
        window.history.pushState({ section: activeSection }, "");
        return;
      }
      const history = sectionHistoryRef.current;
      if (history.length > 1) {
        history.pop();
        const prevSection = history[history.length - 1];
        setActiveSection(prevSection);
        window.history.pushState({ section: prevSection }, "");
      } else {
        window.history.pushState({ section: "home" }, "");
      }
    };

    window.history.pushState({ section: "home" }, "");
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [activeSection]);

  useEffect(() => {
    const fetchContent = async () => {
      const tables = ["movies", "series", "cartoons", "live_channels", "football_channels"] as const;
      const allContent: ContentCard[] = [];
      for (const table of tables) {
        const { data } = await supabase.from(table as any).select("id, title, category, thumbnail_url, stream_url");
        if (data) allContent.push(...(data as unknown as ContentCard[]));
      }
      setContent(allContent);
    };
    fetchContent();
  }, []);

  // Fetch favorites
  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase.from("favorites" as any).select("*").order("created_at", { ascending: false });
    if (data) {
      const favs = data as unknown as FavoriteItem[];
      setFavorites(favs);
      setFavoriteIds(new Set(favs.map(f => f.content_id)));
    }
  }, [user]);

  useEffect(() => { fetchFavorites(); }, [fetchFavorites]);

  const toggleFavorite = async (card: ContentCard) => {
    if (!user) return;
    if (favoriteIds.has(card.id)) {
      // Remove
      await supabase.from("favorites" as any).delete().eq("user_id", user.id).eq("content_id", card.id);
      toast({ title: "Removido dos favoritos" });
    } else {
      // Add - determine table from category
      const tableForCategory: Record<string, string> = {
        "Filmes": "movies", "Séries": "series", "Desenhos": "cartoons",
        "Canais": "live_channels", "Futebol": "football_channels",
      };
      await supabase.from("favorites" as any).insert({
        user_id: user.id,
        content_id: card.id,
        content_table: tableForCategory[card.category] || "movies",
        title: card.title,
        category: card.category || "",
        thumbnail_url: card.thumbnail_url || "",
        stream_url: card.stream_url || "",
      });
      toast({ title: "Adicionado aos favoritos ❤️" });
    }
    fetchFavorites();
  };

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  // Sidebar section → category mapping
  useEffect(() => {
    const map: Record<string, string | null> = {
      home: null,
      catalog: null,
      live: "Canais",
    };
    if (activeSection in map) {
      setActiveCategory(map[activeSection]);
    }
    // Don't reset category for favorites/continue/tv-app/profile
  }, [activeSection]);

  // Fetch active banner
  const [banner, setBanner] = useState<{ title: string; description: string; banner_url: string; trailer_url: string } | null>(null);
  useEffect(() => {
    const fetchBanner = async () => {
      const { data } = await supabase.from("dashboard_banner" as any).select("*").eq("is_active", true).limit(1);
      if (data && data.length > 0) setBanner(data[0] as any);
    };
    fetchBanner();
  }, []);

  // Content card component
  const ContentCardEl = ({ card, showFavBtn = true }: { card: ContentCard; showFavBtn?: boolean }) => (
    <div className="group bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-glow cursor-pointer active:scale-[0.97] touch-manipulation relative">
      <div className="aspect-[2/3] bg-muted/50 flex items-center justify-center relative overflow-hidden" onClick={() => setPlayingContent(card)}>
        {card.thumbnail_url ? (
          <img src={card.thumbnail_url} alt={card.title} className="w-full h-full object-cover" />
        ) : (
          <Film className="w-10 h-10 text-muted-foreground/30" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Play className="w-10 h-10 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity fill-current drop-shadow-lg" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
          <h3 className="font-medium text-xs text-white truncate">{card.title}</h3>
          <span className="text-[10px] text-white/60">{card.category}</span>
        </div>
      </div>
      {showFavBtn && (
        <button
          onClick={(e) => { e.stopPropagation(); toggleFavorite(card); }}
          className="absolute top-1.5 right-1.5 z-10 w-8 h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors touch-manipulation"
        >
          <Heart className={`w-4 h-4 ${favoriteIds.has(card.id) ? 'text-red-500 fill-red-500' : 'text-white/70'}`} />
        </button>
      )}
    </div>
  );

  const renderFavorites = () => (
    <div className="animate-fade-in">
      <h2 className="text-2xl font-display font-bold mb-1">Meus Favoritos ❤️</h2>
      <p className="text-muted-foreground mb-6">{favorites.length} conteúdos salvos</p>
      {favorites.length === 0 ? (
        <div className="text-center py-16">
          <HeartOff className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Você ainda não tem favoritos.</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Toque no ❤️ nos cards para salvar.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {favorites.map((fav) => (
            <ContentCardEl key={fav.id} card={{ id: fav.content_id, title: fav.title, category: fav.category, thumbnail_url: fav.thumbnail_url, stream_url: fav.stream_url }} />
          ))}
        </div>
      )}
    </div>
  );

  const renderContinueWatching = () => {
    const displayContent: ContentCard[] = content.length > 0 ? content : Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      title: [`Ação Total`, `Aventura Épica`, `Drama Intenso`, `Comédia Leve`, `Terror Sombrio`, `Ficção Científica`][i],
      category: categories[i % 4],
    }));

    return (
      <div className="animate-fade-in">
        <h2 className="text-2xl font-display font-bold mb-1">Continuar Assistindo</h2>
        <p className="text-muted-foreground mb-6">Retome de onde parou.</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {displayContent.slice(0, 6).map((card, i) => (
            <div key={`continue-${card.id}`} onClick={() => setPlayingContent(card)} className="group bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.97] touch-manipulation">
              <div className="aspect-[2/3] bg-muted/50 flex items-center justify-center relative overflow-hidden">
                {card.thumbnail_url ? (
                  <img src={card.thumbnail_url} alt={card.title} className="w-full h-full object-cover" />
                ) : (
                  <PlayCircle className="w-8 h-8 text-muted-foreground/30" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                  <h3 className="font-medium text-xs text-white truncate">{card.title}</h3>
                  <div className="w-full bg-white/20 rounded-full h-1 mt-1.5">
                    <div className="bg-primary h-1 rounded-full" style={{ width: `${30 + i * 12}%` }} />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Profile state
  const [profileName, setProfileName] = useState(profile?.name || "");
  const [profileEmail, setProfileEmail] = useState(profile?.email || "");
  const [profilePhone, setProfilePhone] = useState(profile?.phone || "");
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");

  useEffect(() => {
    if (profile) {
      setProfileName(profile.name || "");
      setProfileEmail(profile.email || "");
      setProfilePhone(profile.phone || "");
    }
  }, [profile]);

  // Fetch avatar
  useEffect(() => {
    const fetchAvatar = async () => {
      if (!user) return;
      const { data } = await supabase.from("profiles").select("avatar_url").eq("user_id", user.id).maybeSingle();
      if (data?.avatar_url) setAvatarUrl(data.avatar_url);
    };
    fetchAvatar();
  }, [user]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setAvatarUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("thumbnails").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Erro ao enviar foto", variant: "destructive" });
      setAvatarUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(path);
    const newUrl = `${urlData.publicUrl}?t=${Date.now()}`;
    await supabase.from("profiles").update({ avatar_url: newUrl }).eq("user_id", user.id);
    setAvatarUrl(newUrl);
    toast({ title: "Foto atualizada!" });
    setAvatarUploading(false);
  };

  const handleProfileSave = async () => {
    if (!user) return;
    setProfileSaving(true);
    const { error } = await supabase.from("profiles").update({
      name: profileName,
      email: profileEmail,
      phone: profilePhone,
    }).eq("user_id", user.id);
    if (error) {
      toast({ title: "Erro ao salvar perfil", variant: "destructive" });
    } else {
      toast({ title: "Perfil atualizado com sucesso!" });
    }
    setProfileSaving(false);
  };

  const renderProfile = () => (
    <div className="animate-fade-in max-w-lg">
      <h2 className="text-2xl font-display font-bold mb-1">Meu Perfil</h2>
      <p className="text-muted-foreground mb-8">Edite suas informações pessoais.</p>

      <div className="flex flex-col items-center mb-8">
        <div className="relative group">
          <Avatar className="w-24 h-24 border-2 border-border">
            {avatarUrl ? (
              <AvatarImage src={avatarUrl} alt="Avatar" />
            ) : null}
            <AvatarFallback className="text-2xl font-display bg-primary/10 text-primary">
              {(profileName || "U").charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
            {avatarUploading ? (
              <Loader2 className="w-6 h-6 text-white animate-spin" />
            ) : (
              <Camera className="w-6 h-6 text-white" />
            )}
            <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={avatarUploading} />
          </label>
        </div>
        <p className="text-xs text-muted-foreground mt-2">Clique para alterar a foto</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
          <Input value={profileName} onChange={(e) => setProfileName(e.target.value)} placeholder="Seu nome" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">E-mail</label>
          <Input value={profileEmail} onChange={(e) => setProfileEmail(e.target.value)} placeholder="seu@email.com" type="email" />
        </div>
        <div>
          <label className="text-sm font-medium text-foreground mb-1.5 block">Telefone</label>
          <Input value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)} placeholder="(00) 00000-0000" />
        </div>
        <Button variant="hero" className="w-full mt-4" onClick={handleProfileSave} disabled={profileSaving}>
          {profileSaving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
          Salvar alterações
        </Button>
      </div>
    </div>
  );

  const renderContent = () => {
    if (activeSection === "profile") return renderProfile();
    if (activeSection === "subscription") { navigate("/subscription"); return null; }

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

    if (activeSection === "favorites") return renderFavorites();
    if (activeSection === "continue") return renderContinueWatching();

    // Home / Catalog / Live — main content with filters
    const displayContent: ContentCard[] = content.length > 0 ? content : Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      title: [`Ação Total`, `Aventura Épica`, `Drama Intenso`, `Comédia Leve`, `Terror Sombrio`, `Ficção Científica`][i],
      category: categories[i % 4],
    }));

    const filtered = displayContent.filter((c) => {
      const matchesSearch = !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = !activeCategory || c.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="animate-fade-in">
        {/* Banner/Trailer Hero */}
        {banner && (banner.banner_url || banner.trailer_url) && activeSection === "home" && (
          <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[21/9] bg-muted">
            {banner.trailer_url ? (
              <iframe
                src={`${banner.trailer_url}${banner.trailer_url.includes('?') ? '&' : '?'}autoplay=1&mute=1&loop=1&controls=0&modestbranding=1&rel=0&showinfo=0`}
                className="absolute inset-0 w-full h-full"
                style={{ border: 'none' }}
                allow="autoplay; encrypted-media"
                title="Banner trailer"
              />
            ) : banner.banner_url ? (
              <img src={banner.banner_url} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 p-6">
              <h2 className="text-2xl md:text-3xl font-display font-bold text-white">{banner.title}</h2>
              {banner.description && <p className="text-white/70 mt-1 max-w-lg text-sm">{banner.description}</p>}
            </div>
          </div>
        )}

        <h2 className="text-2xl font-display font-bold mb-1">
          {activeSection === "catalog" ? "Catálogo Completo" : activeSection === "live" ? "Canais ao Vivo" : `Olá, ${profile?.name || "bem-vindo"}! 👋`}
        </h2>
        <p className="text-muted-foreground mb-4">
          {activeSection === "catalog" ? "Explore todo o nosso conteúdo." : activeSection === "live" ? "Assista aos canais ao vivo." : "O que você quer assistir hoje?"}
        </p>

        {/* Search */}
        <div className="relative mb-6 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Buscar filmes, séries, canais..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        {/* Category filters */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-4 px-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveCategory(activeCategory === cat ? null : cat); }}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 active:scale-95 touch-manipulation ${activeCategory === cat ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground'}`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
          {filtered.map((card) => (
            <ContentCardEl key={card.id} card={card} />
          ))}
        </div>

        {/* Continue watching section on home */}
        {activeSection === "home" && !searchQuery && !activeCategory && (
          <>
            <h3 className="text-xl font-display font-semibold mt-10 mb-4 flex items-center gap-2">
              Continuar Assistindo <ChevronRight className="w-5 h-5 text-muted-foreground" />
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-3">
              {displayContent.slice(0, 6).map((card, i) => (
                <div key={`continue-${card.id}`} onClick={() => setPlayingContent(card)} className="group bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.97] touch-manipulation">
                  <div className="aspect-[2/3] bg-muted/50 flex items-center justify-center relative overflow-hidden">
                    {card.thumbnail_url ? (
                      <img src={card.thumbnail_url} alt={card.title} className="w-full h-full object-cover" />
                    ) : (
                      <PlayCircle className="w-8 h-8 text-muted-foreground/30" />
                    )}
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 pt-6">
                      <h3 className="font-medium text-xs text-white truncate">{card.title}</h3>
                      <div className="w-full bg-white/20 rounded-full h-1 mt-1.5">
                        <div className="bg-primary h-1 rounded-full" style={{ width: `${30 + i * 12}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden">
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
              onClick={() => { handleSectionChange(item.id); setSidebarOpen(false); }}
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
      {playingContent && playingContent.stream_url && (
        <YouTubePlayer
          title={playingContent.title}
          category={playingContent.category}
          streamUrl={playingContent.stream_url}
          onClose={() => setPlayingContent(null)}
        />
      )}
    </div>
  );
};

export default Dashboard;
