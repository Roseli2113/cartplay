import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Play, Home, Users, Film, Tv, Radio, Shield, LogOut, Menu, X,
  MoreVertical, Eye, Ban, Trash2, Search, Plus, Edit, Save,
  Clapperboard, Baby, Dribbble, ChevronRight, ArrowLeft, Upload, ImageIcon,
  Monitor, BookOpen, Image, Wifi,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { usePresenceCount } from "@/hooks/usePresence";

// ─── Types ──────────────────────────────────────────────────────
interface ProfileUser {
  id: string;
  user_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  status: "active" | "blocked";
}

interface ContentItem {
  id: string;
  title: string;
  description: string;
  stream_url: string;
  thumbnail_url: string;
  category: string;
  created_at: string;
}

const tableMap: Record<string, string> = {
  movies: "movies",
  series: "series",
  cartoons: "cartoons",
  live: "live_channels",
  football: "football_channels",
};

const contentCategories = [
  { id: "movies", label: "Filmes", icon: Film },
  { id: "series", label: "Séries", icon: Clapperboard },
  { id: "cartoons", label: "Desenhos", icon: Baby },
  { id: "live", label: "Canais ao Vivo", icon: Radio },
  { id: "football", label: "Futebol", icon: Dribbble },
];

const adminMenu = [
  { icon: Home, label: "Visão Geral", id: "overview" },
  { icon: Users, label: "Usuários", id: "users" },
  { icon: Film, label: "Filmes", id: "movies" },
  { icon: Clapperboard, label: "Séries", id: "series" },
  { icon: Baby, label: "Desenhos", id: "cartoons" },
  { icon: Radio, label: "Canais ao Vivo", id: "live" },
  { icon: Dribbble, label: "Futebol", id: "football" },
  { icon: Image, label: "Banner / Trailer", id: "banner" },
  { icon: BookOpen, label: "Instruções TV App", id: "tv-instructions" },
];

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const onlineCount = usePresenceCount();

  // Users state
  const [users, setUsers] = useState<ProfileUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<ProfileUser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Content state
  const [content, setContent] = useState<ContentItem[]>([]);
  const [contentSearch, setContentSearch] = useState("");
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [contentFormOpen, setContentFormOpen] = useState(false);
  const [contentForm, setContentForm] = useState({ title: "", description: "", stream_url: "", thumbnail_url: "" });
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Banner state
  const [bannerForm, setBannerForm] = useState({ title: "", description: "", banner_url: "", trailer_url: "", is_active: false });
  const [bannerId, setBannerId] = useState<string | null>(null);
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);

  // Fetch banner
  const fetchBanner = useCallback(async () => {
    const { data } = await supabase.from("dashboard_banner" as any).select("*").limit(1);
    if (data && data.length > 0) {
      const b = data[0] as any;
      setBannerId(b.id);
      setBannerForm({ title: b.title || "", description: b.description || "", banner_url: b.banner_url || "", trailer_url: b.trailer_url || "", is_active: b.is_active || false });
    }
  }, []);

  useEffect(() => { fetchBanner(); }, [fetchBanner]);

  const uploadThumbnail = async (file: File) => {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `${activeSection}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("thumbnails").upload(filePath, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(filePath);
    setContentForm((f) => ({ ...f, thumbnail_url: urlData.publicUrl }));
    setUploading(false);
    toast({ title: "Imagem enviada com sucesso!" });
  };

  // Fetch users
  const fetchUsers = useCallback(async () => {
    const { data: profiles } = await supabase.from("profiles" as any).select("*");
    if (profiles) {
      setUsers(profiles.map((p: any) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name || "",
        email: p.email || "",
        phone: p.phone || "",
        created_at: p.created_at,
        status: "active" as const, // We don't have a status field yet, default to active
      })));
    }
  }, []);

  // Fetch content for active section
  const fetchContent = useCallback(async () => {
    const tableName = tableMap[activeSection];
    if (!tableName) return;
    const { data } = await supabase.from(tableName as any).select("*").order("created_at", { ascending: false });
    if (data) setContent(data as unknown as ContentItem[]);
  }, [activeSection]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => {
    if (tableMap[activeSection]) fetchContent();
  }, [activeSection, fetchContent]);

  // ── User Actions ──
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch)
  );

  const deleteUser = async () => {
    if (!userToDelete) return;
    const user = users.find(u => u.id === userToDelete);
    if (!user) return;
    
    const { error } = await supabase.from("profiles" as any).delete().eq("id", userToDelete);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Usuário excluído" });
      fetchUsers();
    }
    setUserToDelete(null);
    setDeleteConfirmOpen(false);
  };

  // ── Content Actions ──
  const filteredContent = content.filter((c) =>
    c.title.toLowerCase().includes(contentSearch.toLowerCase())
  );

  const openAddContent = () => {
    setEditingContent(null);
    setContentForm({ title: "", description: "", stream_url: "", thumbnail_url: "" });
    setContentFormOpen(true);
  };

  const openEditContent = (item: ContentItem) => {
    setEditingContent(item);
    setContentForm({ title: item.title, description: item.description || "", stream_url: item.stream_url, thumbnail_url: item.thumbnail_url || "" });
    setContentFormOpen(true);
  };

  const convertToEmbedUrl = (url: string): string => {
    // youtube.com/watch?v=ID
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    // youtu.be/ID
    const shortMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
    // youtube.com/shorts/ID
    const shortsMatch = url.match(/(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]+)/);
    if (shortsMatch) return `https://www.youtube.com/embed/${shortsMatch[1]}`;
    return url;
  };

  const saveContent = async () => {
    if (!contentForm.title || !contentForm.stream_url) {
      toast({ title: "Preencha os campos obrigatórios", description: "Título e URL de streaming são obrigatórios.", variant: "destructive" });
      return;
    }
    const tableName = tableMap[activeSection];
    if (!tableName) return;

    const embedUrl = convertToEmbedUrl(contentForm.stream_url.trim());

    if (editingContent) {
      const { error } = await supabase.from(tableName as any).update({
        title: contentForm.title,
        description: contentForm.description,
        stream_url: embedUrl,
        thumbnail_url: contentForm.thumbnail_url,
      } as any).eq("id", editingContent.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from(tableName as any).insert({
        title: contentForm.title,
        description: contentForm.description,
        stream_url: embedUrl,
        thumbnail_url: contentForm.thumbnail_url,
      });
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    }
    toast({ title: editingContent ? "Conteúdo atualizado" : "Conteúdo adicionado" });
    setContentFormOpen(false);
    fetchContent();
  };

  const deleteContentItem = async (id: string) => {
    const tableName = tableMap[activeSection];
    if (!tableName) return;
    const { error } = await supabase.from(tableName as any).delete().eq("id", id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Conteúdo excluído" });
    fetchContent();
  };

  // ── Stats ──
  const stats = [
    { label: "Online Agora", value: onlineCount, icon: Wifi, highlight: true },
    { label: "Total Usuários", value: users.length, icon: Users },
    { label: "Ativos", value: users.filter((u) => u.status === "active").length, icon: Shield },
    { label: "Bloqueados", value: users.filter((u) => u.status === "blocked").length, icon: Ban },
    { label: "Conteúdos", value: content.length, icon: Film },
  ];

  // ── Render Sections ──
  const renderOverview = () => (
    <div className="animate-fade-in space-y-8">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Painel Administrativo</h2>
        <p className="text-muted-foreground">Visão geral da plataforma CartPlay.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s) => (
          <div key={s.label} className={`bg-card border rounded-xl p-5 hover:border-primary/20 transition-colors ${"highlight" in s && s.highlight ? "border-emerald-500/40 bg-emerald-500/5" : "border-border"}`}>
            <div className="flex items-center gap-3 mb-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${"highlight" in s && s.highlight ? "bg-emerald-500/15" : "bg-primary/10"}`}>
                <s.icon className={`w-5 h-5 ${"highlight" in s && s.highlight ? "text-emerald-400" : "text-primary"}`} />
              </div>
              {"highlight" in s && s.highlight && (
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
              )}
            </div>
            <p className="text-2xl font-display font-bold">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
          </div>
        ))}
      </div>
      <div>
        <h3 className="text-lg font-display font-semibold mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {contentCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveSection(cat.id)}
              className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-colors group"
            >
              <cat.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-display font-semibold">Últimos Usuários</h3>
          <Button variant="ghost" size="sm" onClick={() => setActiveSection("users")} className="text-primary">
            Ver todos <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden sm:table-cell">Email</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 5).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                      {user.status === "active" ? "Ativo" : "Bloqueado"}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold mb-1">Gerenciar Usuários</h2>
          <p className="text-muted-foreground text-sm">{users.length} usuários cadastrados</p>
        </div>
      </div>
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input placeholder="Buscar por nome, email ou celular..." value={userSearch} onChange={(e) => setUserSearch(e.target.value)} className="pl-10" />
      </div>
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">Celular</TableHead>
                <TableHead className="hidden lg:table-cell">Cadastro</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{user.phone}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{new Date(user.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                        {user.status === "active" ? "Ativo" : "Bloqueado"}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => { setSelectedUser(user); setDetailsOpen(true); }}>
                            <Eye className="w-4 h-4 mr-2" /> Ver Detalhes
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive focus:text-destructive"
                            onClick={() => { setUserToDelete(user.id); setDeleteConfirmOpen(true); }}
                          >
                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const renderContentManager = () => {
    const catInfo = contentCategories.find((c) => c.id === activeSection);
    return (
      <div className="animate-fade-in space-y-6 min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold mb-1">Gerenciar {catInfo?.label}</h2>
            <p className="text-muted-foreground text-sm">{content.length} itens cadastrados</p>
          </div>
          <Button variant="hero" size="sm" onClick={openAddContent}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar conteúdo..." value={contentSearch} onChange={(e) => setContentSearch(e.target.value)} className="pl-10" />
        </div>

        {/* Mobile: card list / Desktop: table */}
        <div className="block sm:hidden space-y-3">
          {filteredContent.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum conteúdo encontrado.</p>
          ) : (
            filteredContent.map((item) => (
              <div key={item.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="w-12 h-16 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0">
                  {item.thumbnail_url ? (
                    <img src={item.thumbnail_url} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Film className="w-5 h-5 text-muted-foreground/30" /></div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{item.title}</h4>
                  <p className="text-[10px] text-muted-foreground truncate">{item.stream_url}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(item.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditContent(item)}>
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteContentItem(item.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden sm:block bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="hidden md:table-cell">Data</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum conteúdo encontrado.</TableCell>
                  </TableRow>
                ) : (
                  filteredContent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs font-mono truncate block max-w-[200px]">{item.stream_url}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{new Date(item.created_at).toLocaleDateString("pt-BR")}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditContent(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteContentItem(item.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };

  const uploadBannerImage = async (file: File) => {
    setBannerUploading(true);
    const ext = file.name.split(".").pop();
    const filePath = `banners/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("thumbnails").upload(filePath, file);
    if (error) {
      toast({ title: "Erro no upload", description: error.message, variant: "destructive" });
      setBannerUploading(false);
      return;
    }
    const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(filePath);
    setBannerForm((f) => ({ ...f, banner_url: urlData.publicUrl }));
    setBannerUploading(false);
    toast({ title: "Imagem do banner enviada!" });
  };

  const saveBanner = async () => {
    const convertTrailer = (url: string): string => {
      const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
      if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
      const shortMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]+)/);
      if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
      return url;
    };
    const payload = {
      title: bannerForm.title,
      description: bannerForm.description,
      banner_url: bannerForm.banner_url,
      trailer_url: bannerForm.trailer_url ? convertTrailer(bannerForm.trailer_url.trim()) : "",
      is_active: bannerForm.is_active,
    };
    if (bannerId) {
      const { error } = await supabase.from("dashboard_banner" as any).update(payload as any).eq("id", bannerId);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { data, error } = await supabase.from("dashboard_banner" as any).insert(payload).select();
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
      if (data && data.length > 0) setBannerId((data[0] as any).id);
    }
    toast({ title: "Banner salvo com sucesso!" });
  };

  const renderBannerManager = () => (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Banner / Trailer</h2>
        <p className="text-muted-foreground text-sm">Configure o banner ou trailer que aparece no topo do Dashboard.</p>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <div>
          <label className="text-sm font-medium mb-1.5 block">Título</label>
          <Input placeholder="Título do destaque" value={bannerForm.title} onChange={(e) => setBannerForm(f => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Descrição</label>
          <Input placeholder="Descrição curta (opcional)" value={bannerForm.description} onChange={(e) => setBannerForm(f => ({ ...f, description: e.target.value }))} />
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">URL do Trailer (YouTube)</label>
          <Input placeholder="https://youtube.com/watch?v=..." value={bannerForm.trailer_url} onChange={(e) => setBannerForm(f => ({ ...f, trailer_url: e.target.value }))} />
          <p className="text-xs text-muted-foreground mt-1">Se preenchido, o trailer será exibido como vídeo de fundo. Caso contrário, a imagem será usada.</p>
        </div>
        <div>
          <label className="text-sm font-medium mb-1.5 block">Imagem de Banner</label>
          <input type="file" ref={bannerFileRef} accept="image/*" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadBannerImage(file); }} />
          <div className="flex gap-2 mb-2">
            <Button type="button" variant="outline" size="sm" disabled={bannerUploading} onClick={() => bannerFileRef.current?.click()} className="flex-1">
              <Upload className="w-4 h-4 mr-1" /> {bannerUploading ? "Enviando..." : "Enviar Imagem"}
            </Button>
          </div>
          {bannerForm.banner_url && (
            <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
              <img src={bannerForm.banner_url} alt="Banner preview" className="w-full h-32 object-cover" />
              <button onClick={() => setBannerForm(f => ({ ...f, banner_url: "" }))} className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-1.5">Ou cole uma URL:</p>
          <Input placeholder="https://... (opcional)" value={bannerForm.banner_url} onChange={(e) => setBannerForm(f => ({ ...f, banner_url: e.target.value }))} className="mt-1" />
        </div>
        <div className="flex items-center gap-3 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={bannerForm.is_active} onChange={(e) => setBannerForm(f => ({ ...f, is_active: e.target.checked }))} className="rounded border-border" />
            <span className="text-sm font-medium">Ativo (visível no Dashboard)</span>
          </label>
        </div>
        <div className="pt-2">
          <Button variant="hero" onClick={saveBanner}><Save className="w-4 h-4" /> Salvar Banner</Button>
        </div>
      </div>
    </div>
  );

  const renderTvInstructions = () => (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Instruções - App para TV</h2>
        <p className="text-muted-foreground text-sm">Guia para ajudar seus usuários a instalar o aplicativo na Smart TV.</p>
      </div>

      <div className="space-y-4">
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" /> Android TV / TV Box
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Na TV, vá em <strong className="text-foreground">Configurações → Segurança</strong> e ative <strong className="text-foreground">"Fontes desconhecidas"</strong>.</li>
            <li>Abra o navegador da TV e acesse o link de download do APK que você disponibilizou.</li>
            <li>Baixe e instale o arquivo APK.</li>
            <li>Após a instalação, abra o app e faça login com email e senha.</li>
            <li>Caso a TV não tenha navegador, use um pendrive USB para transferir o APK.</li>
          </ol>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
            <Tv className="w-5 h-5 text-primary" /> Amazon Fire TV Stick
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Na Fire TV, vá em <strong className="text-foreground">Configurações → Minha Fire TV → Opções do desenvolvedor</strong>.</li>
            <li>Ative <strong className="text-foreground">"Apps de fontes desconhecidas"</strong>.</li>
            <li>Instale o app <strong className="text-foreground">"Downloader"</strong> pela loja da Amazon.</li>
            <li>Abra o Downloader e digite a URL do APK.</li>
            <li>Instale e abra o aplicativo.</li>
          </ol>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
            <Monitor className="w-5 h-5 text-primary" /> Samsung / LG Smart TV (via navegador)
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Abra o navegador nativo da Smart TV.</li>
            <li>Acesse o endereço do seu site/app (ex: <strong className="text-foreground">seusite.com</strong>).</li>
            <li>Faça login com suas credenciais.</li>
            <li>Para melhor experiência, adicione o site aos favoritos para acesso rápido.</li>
          </ol>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="font-display font-semibold text-lg mb-3 flex items-center gap-2">
            📱 Enviar pelo celular (Chromecast / Miracast)
          </h3>
          <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
            <li>Abra o app no celular e inicie o conteúdo.</li>
            <li>Toque no ícone de <strong className="text-foreground">espelhar tela / cast</strong>.</li>
            <li>Selecione sua TV na lista de dispositivos.</li>
            <li>O conteúdo será transmitido diretamente para a TV.</li>
          </ol>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 border-primary/20 bg-primary/5">
          <h3 className="font-display font-semibold text-lg mb-2">💡 Dicas para o suporte ao usuário</h3>
          <ul className="list-disc list-inside space-y-1.5 text-sm text-muted-foreground">
            <li>Peça ao usuário o modelo exato da TV para orientar melhor.</li>
            <li>Envie prints/vídeos dos passos para facilitar.</li>
            <li>Se o APK não instalar, peça para verificar a versão do Android (mínimo 5.0).</li>
            <li>Para TVs sem loja de apps, a melhor opção é via pendrive ou navegador.</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const isContentSection = contentCategories.some((c) => c.id === activeSection);

  return (
    <div className="min-h-screen bg-background flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={`fixed lg:sticky top-0 left-0 z-50 lg:z-auto h-screen w-64 bg-sidebar border-r border-sidebar-border flex flex-col transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-center gap-2 px-5 h-16 border-b border-sidebar-border">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <Shield className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-display font-bold text-foreground">Admin</span>
          <button className="ml-auto lg:hidden text-muted-foreground" onClick={() => setSidebarOpen(false)}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {adminMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveSection(item.id); setSidebarOpen(false); setContentSearch(""); }}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-colors ${activeSection === item.id ? "bg-sidebar-accent text-foreground font-medium" : "text-sidebar-foreground hover:bg-sidebar-accent/50"}`}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button onClick={() => navigate("/dashboard")} className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <ArrowLeft className="w-5 h-5" /> Voltar ao Painel
          </button>
          <button onClick={async () => { await signOut(); navigate("/"); }} className="w-full flex items-center gap-3 px-4 py-5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors">
            <LogOut className="w-5 h-5" /> Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 min-h-screen min-w-0 w-full overflow-x-hidden">
        <header className="h-16 border-b border-border flex items-center px-4 lg:px-8 sticky top-0 bg-background/80 backdrop-blur-md z-30">
          <button className="lg:hidden mr-4 text-muted-foreground" onClick={() => setSidebarOpen(true)}>
            <Menu className="w-6 h-6" />
          </button>
          <h1 className="font-display font-semibold text-lg">
            {adminMenu.find((m) => m.id === activeSection)?.label || "Admin"}
          </h1>
        </header>
        <div className="p-4 lg:p-8">
          {activeSection === "overview" && renderOverview()}
          {activeSection === "users" && renderUsers()}
          {activeSection === "banner" && renderBannerManager()}
          {activeSection === "tv-instructions" && renderTvInstructions()}
          {isContentSection && renderContentManager()}
        </div>
      </main>

      {/* User Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Detalhes do Usuário</DialogTitle>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Nome</p>
                  <p className="font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Status</p>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedUser.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                    {selectedUser.status === "active" ? "Ativo" : "Bloqueado"}
                  </span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Email</p>
                  <p className="font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Celular</p>
                  <p className="font-medium">{selectedUser.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Data de Cadastro</p>
                  <p className="font-medium">{new Date(selectedUser.created_at).toLocaleDateString("pt-BR")}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ID</p>
                  <p className="font-mono text-xs text-muted-foreground">{selectedUser.user_id}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="destructive" size="sm" onClick={() => { setUserToDelete(selectedUser.id); setDetailsOpen(false); setDeleteConfirmOpen(true); }}>
                  <Trash2 className="w-4 h-4 mr-1" /> Excluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">Confirmar Exclusão</DialogTitle>
            <DialogDescription>Tem certeza que deseja excluir este usuário? Esta ação não pode ser desfeita.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
            <Button variant="destructive" onClick={deleteUser}>Excluir</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Form Dialog */}
      <Dialog open={contentFormOpen} onOpenChange={setContentFormOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingContent ? "Editar Conteúdo" : "Adicionar Conteúdo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Título</label>
              <Input placeholder="Nome do conteúdo" value={contentForm.title} onChange={(e) => setContentForm((f) => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Descrição</label>
              <Input placeholder="Descrição (opcional)" value={contentForm.description} onChange={(e) => setContentForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">URL de Streaming</label>
              <Input placeholder="https://..." value={contentForm.stream_url} onChange={(e) => setContentForm((f) => ({ ...f, stream_url: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Imagem / Thumbnail</label>
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadThumbnail(file);
                }}
              />
              <div className="flex gap-2 mb-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex-1"
                >
                  <Upload className="w-4 h-4 mr-1" />
                  {uploading ? "Enviando..." : "Enviar Imagem"}
                </Button>
              </div>
              {contentForm.thumbnail_url && (
                <div className="relative mt-2 rounded-lg overflow-hidden border border-border">
                  <img src={contentForm.thumbnail_url} alt="Preview" className="w-full h-32 object-cover" />
                  <button
                    onClick={() => setContentForm((f) => ({ ...f, thumbnail_url: "" }))}
                    className="absolute top-1 right-1 bg-background/80 rounded-full p-1 hover:bg-destructive hover:text-destructive-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-1.5">Ou cole uma URL:</p>
              <Input placeholder="https://... (opcional)" value={contentForm.thumbnail_url} onChange={(e) => setContentForm((f) => ({ ...f, thumbnail_url: e.target.value }))} className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContentFormOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={saveContent}>
              <Save className="w-4 h-4" /> Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Admin;
