import { useState } from "react";
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
  Clapperboard, Baby, Dribbble, ChevronRight, ArrowLeft,
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────
type UserStatus = "active" | "blocked";

interface MockUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  registeredAt: string;
  status: UserStatus;
}

interface ContentItem {
  id: string;
  title: string;
  category: string;
  url: string;
  thumbnail: string;
  addedAt: string;
}

// ─── Mock Data ──────────────────────────────────────────────────
const initialUsers: MockUser[] = [
  { id: "1", name: "João Silva", email: "joao@email.com", phone: "(11) 99999-1234", registeredAt: "2025-01-15", status: "active" },
  { id: "2", name: "Maria Santos", email: "maria@email.com", phone: "(21) 98888-5678", registeredAt: "2025-02-03", status: "active" },
  { id: "3", name: "Pedro Costa", email: "pedro@email.com", phone: "(31) 97777-9012", registeredAt: "2025-02-10", status: "blocked" },
  { id: "4", name: "Ana Oliveira", email: "ana@email.com", phone: "(41) 96666-3456", registeredAt: "2025-03-01", status: "active" },
  { id: "5", name: "Carlos Souza", email: "carlos@email.com", phone: "(51) 95555-7890", registeredAt: "2025-03-15", status: "active" },
  { id: "6", name: "Fernanda Lima", email: "fernanda@email.com", phone: "(61) 94444-2345", registeredAt: "2025-04-02", status: "active" },
  { id: "7", name: "Lucas Mendes", email: "lucas@email.com", phone: "(71) 93333-6789", registeredAt: "2025-04-20", status: "blocked" },
  { id: "8", name: "Juliana Rocha", email: "juliana@email.com", phone: "(81) 92222-0123", registeredAt: "2025-05-05", status: "active" },
];

const contentCategories = [
  { id: "movies", label: "Filmes", icon: Film },
  { id: "series", label: "Séries", icon: Clapperboard },
  { id: "cartoons", label: "Desenhos", icon: Baby },
  { id: "live", label: "Canais ao Vivo", icon: Radio },
  { id: "football", label: "Futebol", icon: Dribbble },
  { id: "tv", label: "TV Aberta", icon: Tv },
];

const initialContent: ContentItem[] = [
  { id: "1", title: "Ação Total", category: "movies", url: "https://stream.example.com/movie1", thumbnail: "", addedAt: "2025-01-10" },
  { id: "2", title: "Drama Intenso", category: "movies", url: "https://stream.example.com/movie2", thumbnail: "", addedAt: "2025-01-12" },
  { id: "3", title: "Aventura Épica - T1", category: "series", url: "https://stream.example.com/series1", thumbnail: "", addedAt: "2025-02-01" },
  { id: "4", title: "Desenho Kids", category: "cartoons", url: "https://stream.example.com/cartoon1", thumbnail: "", addedAt: "2025-02-15" },
  { id: "5", title: "Canal Esportes HD", category: "live", url: "https://stream.example.com/live1", thumbnail: "", addedAt: "2025-03-01" },
  { id: "6", title: "Futebol Premium", category: "football", url: "https://stream.example.com/football1", thumbnail: "", addedAt: "2025-03-10" },
];

// ─── Sidebar Items ──────────────────────────────────────────────
const adminMenu = [
  { icon: Home, label: "Visão Geral", id: "overview" },
  { icon: Users, label: "Usuários", id: "users" },
  { icon: Film, label: "Filmes", id: "movies" },
  { icon: Clapperboard, label: "Séries", id: "series" },
  { icon: Baby, label: "Desenhos", id: "cartoons" },
  { icon: Radio, label: "Canais ao Vivo", id: "live" },
  { icon: Dribbble, label: "Futebol", id: "football" },
  { icon: Tv, label: "TV Aberta", id: "tv" },
];

// ─── Component ──────────────────────────────────────────────────
const Admin = () => {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Users state
  const [users, setUsers] = useState<MockUser[]>(initialUsers);
  const [userSearch, setUserSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<MockUser | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  // Content state
  const [content, setContent] = useState<ContentItem[]>(initialContent);
  const [contentSearch, setContentSearch] = useState("");
  const [editingContent, setEditingContent] = useState<ContentItem | null>(null);
  const [contentFormOpen, setContentFormOpen] = useState(false);
  const [contentForm, setContentForm] = useState({ title: "", url: "", thumbnail: "", category: "" });

  // ── User Actions ──
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.phone.includes(userSearch)
  );

  const toggleBlock = (id: string) => {
    setUsers((prev) =>
      prev.map((u) =>
        u.id === id ? { ...u, status: u.status === "active" ? "blocked" : "active" } : u
      )
    );
  };

  const confirmDelete = () => {
    if (userToDelete) {
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete));
      setUserToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  // ── Content Actions ──
  const currentCategoryContent = content.filter((c) => c.category === activeSection);
  const filteredContent = currentCategoryContent.filter((c) =>
    c.title.toLowerCase().includes(contentSearch.toLowerCase())
  );

  const openAddContent = () => {
    setEditingContent(null);
    setContentForm({ title: "", url: "", thumbnail: "", category: activeSection });
    setContentFormOpen(true);
  };

  const openEditContent = (item: ContentItem) => {
    setEditingContent(item);
    setContentForm({ title: item.title, url: item.url, thumbnail: item.thumbnail, category: item.category });
    setContentFormOpen(true);
  };

  const saveContent = () => {
    if (!contentForm.title || !contentForm.url) return;
    if (editingContent) {
      setContent((prev) =>
        prev.map((c) => (c.id === editingContent.id ? { ...c, ...contentForm } : c))
      );
    } else {
      setContent((prev) => [
        ...prev,
        { id: Date.now().toString(), ...contentForm, addedAt: new Date().toISOString().split("T")[0] },
      ]);
    }
    setContentFormOpen(false);
  };

  const deleteContent = (id: string) => {
    setContent((prev) => prev.filter((c) => c.id !== id));
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

      {/* Quick actions */}
      <div>
        <h3 className="text-lg font-display font-semibold mb-4">Acesso Rápido</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {contentCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveSection(cat.id)}
              className="bg-card border border-border rounded-xl p-4 text-center hover:border-primary/30 transition-colors group"
            >
              <cat.icon className="w-6 h-6 mx-auto mb-2 text-muted-foreground group-hover:text-primary transition-colors" />
              <span className="text-sm font-medium">{cat.label}</span>
              <p className="text-xs text-muted-foreground mt-1">
                {content.filter((c) => c.category === cat.id).length} itens
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Recent users */}
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
        <Input
          placeholder="Buscar por nome, email ou celular..."
          value={userSearch}
          onChange={(e) => setUserSearch(e.target.value)}
          className="pl-10"
        />
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
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{user.phone}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{user.registeredAt}</TableCell>
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
                          <DropdownMenuItem onClick={() => toggleBlock(user.id)}>
                            <Ban className="w-4 h-4 mr-2" />
                            {user.status === "active" ? "Bloquear" : "Desbloquear"}
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
            <p className="text-muted-foreground text-sm">{currentCategoryContent.length} itens cadastrados</p>
          </div>
          <Button variant="hero" size="sm" onClick={openAddContent}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar conteúdo..."
            value={contentSearch}
            onChange={(e) => setContentSearch(e.target.value)}
            className="pl-10"
          />
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
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      Nenhum conteúdo encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredContent.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <span className="text-muted-foreground text-xs font-mono truncate block max-w-[200px]">{item.url}</span>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-muted-foreground">{item.addedAt}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEditContent(item)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteContent(item.id)}>
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
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
          <button
            onClick={() => navigate("/dashboard")}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" /> Voltar ao Painel
          </button>
          <button
            onClick={() => navigate("/")}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent/50 transition-colors"
          >
            <LogOut className="w-5 h-5" /> Sair
          </button>
        </div>
      </aside>

      {/* Main */}
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
                  <p className="font-medium">{selectedUser.registeredAt}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">ID</p>
                  <p className="font-mono text-xs text-muted-foreground">{selectedUser.id}</p>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => { toggleBlock(selectedUser.id); setDetailsOpen(false); }}>
                  <Ban className="w-4 h-4 mr-1" />
                  {selectedUser.status === "active" ? "Bloquear" : "Desbloquear"}
                </Button>
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
            <Button variant="destructive" onClick={confirmDelete}>Excluir</Button>
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
              <Input
                placeholder="Nome do conteúdo"
                value={contentForm.title}
                onChange={(e) => setContentForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">URL de Streaming</label>
              <Input
                placeholder="https://..."
                value={contentForm.url}
                onChange={(e) => setContentForm((f) => ({ ...f, url: e.target.value }))}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">URL da Thumbnail</label>
              <Input
                placeholder="https://... (opcional)"
                value={contentForm.thumbnail}
                onChange={(e) => setContentForm((f) => ({ ...f, thumbnail: e.target.value }))}
              />
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
