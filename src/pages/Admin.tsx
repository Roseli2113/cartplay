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
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

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
];

const Admin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  const saveContent = async () => {
    if (!contentForm.title || !contentForm.stream_url) return;
    const tableName = tableMap[activeSection];
    if (!tableName) return;

    if (editingContent) {
      const { error } = await supabase.from(tableName as any).update({
        title: contentForm.title,
        description: contentForm.description,
        stream_url: contentForm.stream_url,
        thumbnail_url: contentForm.thumbnail_url,
      } as any).eq("id", editingContent.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from(tableName as any).insert({
        title: contentForm.title,
        description: contentForm.description,
        stream_url: contentForm.stream_url,
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
        <p className="text-muted-foreground">Visão geral da plataforma StreamMax.</p>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="bg-card border border-border rounded-xl p-5 hover:border-primary/20 transition-colors">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <s.icon className="w-5 h-5 text-primary" />
              </div>
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
      <div className="animate-fade-in space-y-6">
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
        <div className="bg-card border border-border rounded-xl overflow-hidden">
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

      <main className="flex-1 min-h-screen">
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
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editingContent ? "Editar Conteúdo" : "Adicionar Conteúdo"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
