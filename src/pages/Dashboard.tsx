import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  Play, Home, Film, Heart, PlayCircle, Radio, Monitor, User, LogOut, Menu, X,
  Flame, Tv, QrCode, ChevronRight, Shield, Search, HeartOff, Camera, CreditCard, Save, Loader2, ArrowLeft, Volume2, VolumeX,
  AlertTriangle,
} from "lucide-react";
import VideoPlayer from "@/components/player/VideoPlayer";
import { extractVideoId } from "@/components/player/YouTubeProvider";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePresenceTrack } from "@/hooks/usePresence";
import WhatsAppButton from "@/components/WhatsAppButton";

const categories = ["Filmes", "Séries", "Desenhos", "Canais", "Futebol"];

const getTrailerEmbedSrc = (trailerUrl: string, isMuted: boolean) => {
  const videoId = extractVideoId(trailerUrl);

  if (videoId) {
    const params = new URLSearchParams({
      autoplay: "1",
      mute: isMuted ? "1" : "0",
      controls: "0",
      rel: "0",
      modestbranding: "1",
      showinfo: "0",
      fs: "0",
      iv_load_policy: "3",
      disablekb: "1",
      playsinline: "1",
      loop: "1",
      playlist: videoId,
      enablejsapi: "1",
      origin: window.location.origin,
    });

    return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
  }

  const separator = trailerUrl.includes("?") ? "&" : "?";
  return `${trailerUrl}${separator}autoplay=1&mute=${isMuted ? 1 : 0}&controls=0&rel=0&modestbranding=1&showinfo=0&fs=0&iv_load_policy=3&disablekb=1&playsinline=1&loop=1`;
};

const menuItems = [
  { icon: Home, label: "Início", id: "home" },
  { icon: Film, label: "Filmes", id: "cat-filmes", category: "Filmes" },
  { icon: Tv, label: "Séries", id: "cat-series", category: "Séries" },
  { icon: PlayCircle, label: "Desenhos", id: "cat-desenhos", category: "Desenhos" },
  { icon: Flame, label: "Doramas", id: "cat-doramas", category: "Doramas" },
  { icon: Monitor, label: "Canais", id: "cat-canais", category: "Canais" },
  { icon: Radio, label: "Canais ao Vivo", id: "live" },
  { icon: QrCode, label: "Futebol", id: "cat-futebol", category: "Futebol" },
  { icon: Flame, label: "Novidades", id: "cat-novidades", category: "Novidades" },
  { icon: Heart, label: "Favoritos", id: "favorites" },
  { icon: PlayCircle, label: "Continuar Assistindo", id: "continue" },
  { icon: Monitor, label: "Instalar App", id: "tv-app" },
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
  const { signOut, profile, isAdmin, user, accessBlocked, accessReason, subscriptionPlan } = useAuth();
  const { toast } = useToast();
  const [activeSection, setActiveSection] = useState("home");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const sectionHistoryRef = useRef<string[]>(["home"]);
  const [content, setContent] = useState<ContentCard[]>([]);
  const [playingContent, setPlayingContent] = useState<ContentCard | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [trailerMuted, setTrailerMuted] = useState(true);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const playingContentRef = useRef(playingContent);
  playingContentRef.current = playingContent;

  // Track this user's online presence
  usePresenceTrack(user?.id);

  // Track section navigation for back button
  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    sectionHistoryRef.current.push(section);
    window.history.pushState({ section }, "");
  };

  // Handle browser back button - navigate within app sections instead of leaving
  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      // Always prevent leaving the app
      if (playingContentRef.current) {
        setPlayingContent(null);
      } else {
        const history = sectionHistoryRef.current;
        if (history.length > 1) {
          history.pop();
          const prevSection = history[history.length - 1];
          setActiveSection(prevSection);
        }
        // If already at home with no history, stay put
      }
      // Always re-push state so browser never actually leaves the page
      window.history.pushState({ section: "dashboard" }, "");
    };

    // Replace current entry and add a guard entry
    window.history.replaceState({ section: "dashboard" }, "");
    window.history.pushState({ section: "dashboard" }, "");

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

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

  const handleAccessBlockedAction = useCallback(() => {
    const title = accessReason === "blocked" ? "Conta bloqueada" : "Acesso indisponível";
    const description = accessReason === "blocked"
      ? "Sua conta foi bloqueada pelo administrador."
      : "Seu período de acesso terminou. Regularize o pagamento para continuar.";

    toast({ title, description, variant: "destructive" });

    if (accessReason === "blocked") {
      navigate("/");
      return;
    }

    navigate("/subscription");
  }, [accessReason, navigate, toast]);

  const startPlayback = useCallback((card: ContentCard) => {
    if (accessBlocked) {
      handleAccessBlockedAction();
      return;
    }

    setPlayingContent(card);
  }, [accessBlocked, handleAccessBlockedAction]);

  useEffect(() => {
    if (!accessBlocked || !playingContent) return;
    setPlayingContent(null);
    handleAccessBlockedAction();
  }, [accessBlocked, handleAccessBlockedAction, playingContent]);

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
    const currentMenu = menuItems.find(m => m.id === activeSection);
    if (currentMenu && 'category' in currentMenu && currentMenu.category) {
      setActiveCategory(currentMenu.category);
    } else if (activeSection === "home" || activeSection === "live") {
      setActiveCategory(activeSection === "live" ? "Canais" : null);
    }
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
    <div className="group w-full min-w-0 bg-card border border-border rounded-lg sm:rounded-xl overflow-hidden hover:border-primary/30 transition-all hover:shadow-glow cursor-pointer active:scale-[0.97] touch-manipulation relative">
      <div className="aspect-[2/3] bg-muted/50 flex items-center justify-center relative overflow-hidden" onClick={() => startPlayback(card)}>
        {card.thumbnail_url ? (
          <img src={card.thumbnail_url} alt={card.title} className="w-full h-full object-cover" />
        ) : (
          <Film className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/30" />
        )}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
          <Play className="w-8 h-8 sm:w-10 sm:h-10 text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity fill-current drop-shadow-lg" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 sm:p-2 pt-6">
          <h3 className="font-medium text-[10px] sm:text-xs text-white truncate">{card.title}</h3>
          <span className="text-[9px] sm:text-[10px] text-white/60">{card.category}</span>
        </div>
      </div>
      {showFavBtn && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            toggleFavorite(card);
          }}
          className="absolute top-1 right-1 sm:top-1.5 sm:right-1.5 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/50 flex items-center justify-center hover:bg-black/70 transition-colors touch-manipulation"
        >
          <Heart
            className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${favoriteIds.has(card.id) ? "text-red-500 fill-red-500" : "text-white/70"}`}
          />
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1.5 sm:gap-3">
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
        <div className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-3">
          {displayContent.slice(0, 6).map((card, i) => (
            <div key={`continue-${card.id}`} onClick={() => startPlayback(card)} className="group bg-card border border-border rounded-xl overflow-hidden cursor-pointer hover:border-primary/30 transition-colors active:scale-[0.97] touch-manipulation">
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
    if (activeSection === "tv-app") { navigate("/install"); return null; }

    if (activeSection === "favorites") return renderFavorites();
    if (activeSection === "continue") return renderContinueWatching();

    // Home / Catalog / Live — main content with filters
    const displayContent: ContentCard[] = content.length > 0 ? content : Array.from({ length: 6 }, (_, i) => ({
      id: String(i),
      title: [`Ação Total`, `Aventura Épica`, `Drama Intenso`, `Comédia Leve`, `Terror Sombrio`, `Ficção Científica`][i],
      category: categories[i % 4],
    }));

    const filtered = displayContent.filter((c) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || c.title.toLowerCase().includes(query) || (c.category && c.category.toLowerCase().includes(query));
      const matchesCategory = !activeCategory || c.category === activeCategory;
      return matchesSearch && matchesCategory;
    });

    return (
      <div className="animate-fade-in">
        {/* Banner/Trailer Hero */}
        {banner && (banner.banner_url || banner.trailer_url) && activeSection === "home" && !playingContent && (
          <div className="relative rounded-2xl overflow-hidden mb-6 aspect-[21/9] bg-muted" style={{ clipPath: "inset(0 round 1rem)" }} onContextMenu={(e) => e.preventDefault()}>
            {banner.trailer_url ? (
              <>
                <iframe
                  key={`trailer-${trailerMuted}`}
                  src={getTrailerEmbedSrc(banner.trailer_url, trailerMuted)}
                  className="absolute"
                  style={{ border: "none", pointerEvents: "none", top: "-10%", left: "-10%", width: "120%", height: "120%" }}
                  allow="autoplay; encrypted-media"
                  title="Trailer em destaque"
                />
                {/* Solid overlay blocks all YouTube interactions and hides any text fallback */}
                <div className="absolute inset-0 z-[5]" />
              </>
            ) : banner.banner_url ? (
              <img src={banner.banner_url} alt={banner.title} className="absolute inset-0 w-full h-full object-cover" />
            ) : null}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-6 flex items-end justify-between">
              <div>
                <h2 className="text-2xl md:text-3xl font-display font-bold text-white">{banner.title}</h2>
                {banner.description && <p className="text-white/70 mt-1 max-w-lg text-sm">{banner.description}</p>}
              </div>
              {banner.trailer_url && (
                <button
                  onClick={() => setTrailerMuted(!trailerMuted)}
                  className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-black/50 hover:bg-black/70 flex items-center justify-center transition-colors flex-shrink-0 touch-manipulation z-10 relative"
                >
                  {trailerMuted ? <VolumeX className="w-4 h-4 sm:w-5 sm:h-5 text-white" /> : <Volume2 className="w-4 h-4 sm:w-5 sm:h-5 text-white" />}
                </button>
              )}
            </div>
          </div>
        )}

        <h2 className="text-2xl font-display font-bold mb-1">
          {activeSection === "home" ? `Olá, ${profile?.name || "bem-vindo"}! 👋` : menuItems.find(m => m.id === activeSection)?.label || "Início"}
        </h2>
        <p className="text-muted-foreground mb-4">
          {activeSection === "home" ? "O que você quer assistir hoje?" : `Explore ${menuItems.find(m => m.id === activeSection)?.label || "o conteúdo"}.`}
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
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2 -mx-3 px-3 sm:-mx-4 sm:px-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setActiveCategory(activeCategory === cat ? null : cat);
              }}
              className={`px-4 py-2.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap flex-shrink-0 active:scale-95 touch-manipulation ${
                activeCategory === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Content grid */}
        <div className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-3">
          {filtered.map((card) => (
            <ContentCardEl key={card.id} card={card} />
          ))}
        </div>

        {activeSection === "home" && !searchQuery && !activeCategory && (() => {
          const categoryBlocks = [
            { label: "🎬 Filmes", filter: "Filmes" },
            { label: "🖍️ Desenhos", filter: "Desenhos" },
            { label: "🆕 Novos na CartPlay", filter: "Novos na CartPlay" },
            { label: "🔥 Novidades", filter: "Novidades" },
            { label: "🇰🇷 Doramas", filter: "Doramas" },
            { label: "📺 Canais", filter: "Canais" },
            { label: "⭐ Premium", filter: "Premium" },
            { label: "😂 Comédia", filter: "Comédia" },
            { label: "💥 Ação", filter: "Ação" },
            { label: "🎬 Terror", filter: "Terror" },
          ];

          return categoryBlocks.map((block) => {
            const items = displayContent.filter(c => c.category?.toLowerCase() === block.filter.toLowerCase()).slice(0, 6);
            if (items.length === 0) return null;
            return (
              <div key={block.label}>
                <h3 className="text-xl font-display font-semibold mt-10 mb-4 flex items-center gap-2">
                  {block.label} <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </h3>
                <div className="grid w-full min-w-0 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-1 sm:gap-3">
                  {items.map((card) => (
                    <ContentCardEl key={`${block.label}-${card.id}`} card={card} />
                  ))}
                </div>
              </div>
            );
          });
        })()}
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
          <span className="font-display font-bold text-foreground">CartPlay</span>
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

      <main className="flex-1 min-h-screen min-w-0 w-full">
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-8 sticky top-0 bg-background/80 backdrop-blur-md z-30">
          <button className="lg:hidden mr-4 text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          {activeSection !== "home" && (
            <button
              className="mr-2 text-muted-foreground hover:text-foreground transition-colors touch-manipulation"
              onClick={() => {
                const history = sectionHistoryRef.current;
                if (history.length > 1) {
                  history.pop();
                  setActiveSection(history[history.length - 1]);
                } else {
                  setActiveSection("home");
                }
              }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="font-display font-semibold text-lg">
            {menuItems.find((m) => m.id === activeSection)?.label || "Início"}
          </h1>
        </header>
        <div key={activeSection} className="p-3 sm:p-4 lg:p-8 overflow-hidden animate-fade-in">
          {accessBlocked && (
            <div className="mb-6 bg-destructive/10 border border-destructive/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/20 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display font-semibold text-sm text-destructive">
                  {accessReason === "blocked"
                    ? "Conta bloqueada"
                    : "Assinatura pendente"}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {accessReason === "blocked"
                    ? "Sua conta foi bloqueada pelo administrador."
                    : "Assine um plano para ter acesso ao catálogo completo."}
                </p>
              </div>
              <Button
                variant="hero"
                size="sm"
                onClick={() => navigate(accessReason === "blocked" ? "/" : "/subscription")}
                className="flex-shrink-0 whitespace-nowrap"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                {accessReason === "blocked"
                  ? "Ir para início"
                  : "Assinar agora"}
              </Button>
            </div>
          )}
          {renderContent()}
        </div>
      </main>

      {/* Fullscreen Video Player */}
      {playingContent && playingContent.stream_url && (
        <VideoPlayer
          title={playingContent.title}
          category={playingContent.category}
          streamUrl={playingContent.stream_url}
          onClose={() => setPlayingContent(null)}
        />
      )}
      <WhatsAppButton />
    </div>
  );
};

export default Dashboard;
