import { useState, useEffect, useCallback, useRef, useMemo } from "react";
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
  Clapperboard, Baby, Dribbble, ChevronRight, ChevronLeft, ArrowLeft, Upload, ImageIcon,
  Monitor, BookOpen, Image, Wifi, Flame, CreditCard, UserPlus, Clock,
  Link2, Copy, CheckCircle, History, ShoppingCart, Send, AlertCircle, RefreshCw,
  Calendar,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
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
  is_blocked: boolean;
  subscription_plan?: string;
  subscription_status?: string;
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

interface SubscriptionItem {
  id: string;
  user_id: string;
  plan: string;
  status: string;
  trial_hours: number;
  trial_started_at: string;
  activated_at: string;
  expires_at: string | null;
  user_name?: string;
  user_email?: string;
}

const tableMap: Record<string, string> = {
  movies: "movies",
  series: "series",
  cartoons: "cartoons",
  live: "live_channels",
  football: "football_channels",
  novos: "movies",
  novidades: "movies",
  doramas: "movies",
};

// Sections that auto-set category on save
const categoryForSection: Record<string, string> = {
  movies: "Filmes",
  series: "Séries",
  cartoons: "Desenhos",
  live: "Canais",
  football: "Futebol",
  novos: "Novos na CartPlay",
  novidades: "Novidades",
  doramas: "Doramas",
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
  { icon: Flame, label: "Novos na CartPlay", id: "novos" },
  { icon: Tv, label: "Novidades", id: "novidades" },
  { icon: Monitor, label: "Doramas", id: "doramas" },
  { icon: Image, label: "Banner / Trailer", id: "banner" },
  { icon: CreditCard, label: "Assinaturas", id: "subscriptions" },
  { icon: UserPlus, label: "+ Admin", id: "add-admin" },
  { icon: CreditCard, label: "Planos", id: "plans" },
  { icon: Link2, label: "Integração Pagamento", id: "payment-integration" },
  { icon: ShoppingCart, label: "Vendas", id: "sales" },
  { icon: History, label: "Histórico Transações", id: "transactions" },
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
  const [userDateFrom, setUserDateFrom] = useState("");
  const [userDateTo, setUserDateTo] = useState("");
  const [userPage, setUserPage] = useState(1);
  const USERS_PER_PAGE = 100;

  // Content pagination
  const [contentPage, setContentPage] = useState(1);
  const CONTENT_PER_PAGE = 100;

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

  // Subscription state
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [subSearch, setSubSearch] = useState("");
  const [extraHoursUserId, setExtraHoursUserId] = useState<string | null>(null);
  const [extraHours, setExtraHours] = useState("");

  // Admin management state
  const [adminEmail, setAdminEmail] = useState("");
  const [adminUsers, setAdminUsers] = useState<{ user_id: string; name: string; email: string }[]>([]);
  const [webhookCopied, setWebhookCopied] = useState(false);
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/payment-webhook`;

  // Transactions / Sales state
  interface TransactionItem {
    id: string;
    user_id: string | null;
    email: string | null;
    event: string;
    plan: string | null;
    status: string;
    payload: any;
    created_at: string;
    user_name?: string;
    user_email?: string;
  }
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txSearch, setTxSearch] = useState("");
  const [testEmail, setTestEmail] = useState("");
  const [testEvent, setTestEvent] = useState("payment_approved");
  const [testPlan, setTestPlan] = useState("monthly");
  const [sendingTest, setSendingTest] = useState(false);
  const [refreshingTransactions, setRefreshingTransactions] = useState(false);

  // Plans state
  interface PlanItem {
    id: string;
    slug: string;
    name: string;
    price: string;
    period: string;
    features: string[];
    payment_link: string;
    is_popular: boolean;
    sort_order: number;
    cta_text: string;
  }
  const [plansList, setPlansList] = useState<PlanItem[]>([]);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [planForm, setPlanForm] = useState({ name: "", price: "", period: "", features: "", payment_link: "", is_popular: false, cta_text: "" });

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
    const [{ data: profiles }, { data: subs }] = await Promise.all([
      supabase.from("profiles" as any).select("*"),
      supabase.from("subscriptions" as any).select("user_id, plan, status"),
    ]);
    if (profiles) {
      const subMap = new Map((subs || []).map((s: any) => [s.user_id, s]));
      setUsers(profiles.map((p: any) => {
        const sub = subMap.get(p.user_id) as any;
        return {
          id: p.id,
          user_id: p.user_id,
          name: p.name || "",
          email: p.email || "",
          phone: p.phone || "",
          created_at: p.created_at,
          is_blocked: p.is_blocked || false,
          subscription_plan: sub?.plan || "none",
          subscription_status: sub?.status || "inactive",
        };
      }));
    }
  }, []);

  // Fetch content for active section
  const fetchContent = useCallback(async () => {
    const tableName = tableMap[activeSection];
    if (!tableName) return;
    const cat = categoryForSection[activeSection];
    let query = supabase.from(tableName as any).select("*").order("created_at", { ascending: false });
    if (cat && ["novos", "novidades", "doramas"].includes(activeSection)) {
      query = query.eq("category", cat);
    }
    const { data } = await query;
    if (data) setContent(data as unknown as ContentItem[]);
  }, [activeSection]);

  // Fetch subscriptions
  const fetchSubscriptions = useCallback(async () => {
    const { data: subs } = await supabase.from("subscriptions" as any).select("*");
    if (!subs) return;
    // Merge with user profiles
    const { data: profiles } = await supabase.from("profiles" as any).select("user_id, name, email");
    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
    setSubscriptions((subs as any[]).map((s: any) => {
      const p = profileMap.get(s.user_id) as any;
      return { ...s, user_name: p?.name || "", user_email: p?.email || "" };
    }));
  }, []);

  // Fetch admin users
  const fetchAdminUsers = useCallback(async () => {
    const { data: roles } = await supabase.from("user_roles" as any).select("user_id").eq("role", "admin");
    if (!roles) return;
    const adminIds = (roles as any[]).map((r: any) => r.user_id);
    if (adminIds.length === 0) { setAdminUsers([]); return; }
    const { data: profiles } = await supabase.from("profiles" as any).select("user_id, name, email").in("user_id", adminIds);
    setAdminUsers((profiles || []).map((p: any) => ({ user_id: p.user_id, name: p.name, email: p.email })));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);
  useEffect(() => {
    if (tableMap[activeSection]) { setContentPage(1); fetchContent(); }
  }, [activeSection, fetchContent]);
  useEffect(() => {
    if (activeSection === "subscriptions") fetchSubscriptions();
  }, [activeSection, fetchSubscriptions]);
  useEffect(() => {
    if (activeSection === "add-admin") fetchAdminUsers();
  }, [activeSection, fetchAdminUsers]);

  // Fetch transactions
  const fetchTransactions = useCallback(async () => {
    setRefreshingTransactions(true);
    try {
      const { data: txs, error: txError } = await supabase
        .from("payment_transactions" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (txError) throw txError;
      if (!txs) {
        setTransactions([]);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles" as any)
        .select("user_id, name, email");

      if (profilesError) throw profilesError;

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
      setTransactions((txs as any[]).map((t: any) => {
        const p = profileMap.get(t.user_id) as any;
        return { ...t, user_name: p?.name || "", user_email: p?.email || t.email || "" };
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível atualizar as vendas.";
      toast({ title: "Erro ao atualizar vendas", description: message, variant: "destructive" });
    } finally {
      setRefreshingTransactions(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeSection === "sales" || activeSection === "transactions") fetchTransactions();
  }, [activeSection, fetchTransactions]);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    const { data } = await supabase.from("subscription_plans" as any).select("*").order("sort_order", { ascending: true });
    if (data) setPlansList(data as unknown as PlanItem[]);
  }, []);

  useEffect(() => {
    if (activeSection === "plans") fetchPlans();
  }, [activeSection, fetchPlans]);

  const openEditPlan = (plan: PlanItem) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      price: plan.price,
      period: plan.period,
      features: plan.features.join("\n"),
      payment_link: plan.payment_link || "",
      is_popular: plan.is_popular,
      cta_text: plan.cta_text || "Assinar agora",
    });
    setPlanFormOpen(true);
  };

  const savePlan = async () => {
    if (!editingPlan) return;
    const featuresArr = planForm.features.split("\n").map(f => f.trim()).filter(Boolean);
    const { error } = await supabase.from("subscription_plans" as any).update({
      name: planForm.name,
      price: planForm.price,
      period: planForm.period,
      features: featuresArr,
      payment_link: planForm.payment_link,
      is_popular: planForm.is_popular,
      cta_text: planForm.cta_text,
    } as any).eq("id", editingPlan.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Plano atualizado com sucesso!" });
    setPlanFormOpen(false);
    fetchPlans();
  };

  // Send test webhook event
  const sendTestEvent = async () => {
    if (!testEmail.trim()) {
      toast({ title: "Informe o email", variant: "destructive" });
      return;
    }
    setSendingTest(true);
    try {
      const res = await fetch(webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: testEvent, email: testEmail.trim(), plan: testPlan }),
      });
      const data = await res.json();
      if (res.ok) {
        toast({ title: "Evento de teste enviado! ✅", description: data.message || "Sucesso" });
        fetchTransactions();
        fetchSubscriptions();
      } else {
        toast({ title: "Erro no teste", description: data.error || "Falha", variant: "destructive" });
      }
    } catch (e) {
      toast({ title: "Erro de conexão", variant: "destructive" });
    }
    setSendingTest(false);
  };

  const deleteTransaction = async (id: string) => {
    const { error } = await supabase.from("payment_transactions" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Transação excluída" });
    fetchTransactions();
  };

  // ── User Actions ──
  const filteredUsers = useMemo(() => {
    let filtered = users.filter(
      (u) =>
        u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.phone.includes(userSearch)
    );
    if (userDateFrom) {
      const from = new Date(userDateFrom);
      filtered = filtered.filter(u => new Date(u.created_at) >= from);
    }
    if (userDateTo) {
      const to = new Date(userDateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(u => new Date(u.created_at) <= to);
    }
    return filtered;
  }, [users, userSearch, userDateFrom, userDateTo]);

  const totalUserPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));
  const paginatedUsers = filteredUsers.slice((userPage - 1) * USERS_PER_PAGE, userPage * USERS_PER_PAGE);

  const deleteUser = async () => {
    if (!userToDelete) return;
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

  const toggleBlockUser = async (user: ProfileUser) => {
    const newBlocked = !user.is_blocked;
    const { error } = await supabase.from("profiles" as any).update({ is_blocked: newBlocked } as any).eq("id", user.id);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: newBlocked ? "Usuário bloqueado" : "Usuário desbloqueado" });
    fetchUsers();
  };

  // ── Content Actions ──
  const filteredContent = content.filter((c) =>
    c.title.toLowerCase().includes(contentSearch.toLowerCase())
  );
  const totalContentPages = Math.max(1, Math.ceil(filteredContent.length / CONTENT_PER_PAGE));
  const paginatedContent = filteredContent.slice((contentPage - 1) * CONTENT_PER_PAGE, contentPage * CONTENT_PER_PAGE);

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
    const watchMatch = url.match(/(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]+)/);
    if (watchMatch) return `https://www.youtube.com/embed/${watchMatch[1]}`;
    const shortMatch = url.match(/(?:youtu\.be\/)([a-zA-Z0-9_-]+)/);
    if (shortMatch) return `https://www.youtube.com/embed/${shortMatch[1]}`;
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
    const cat = categoryForSection[activeSection] || "";

    if (editingContent) {
      const { error } = await supabase.from(tableName as any).update({
        title: contentForm.title,
        description: contentForm.description,
        stream_url: embedUrl,
        thumbnail_url: contentForm.thumbnail_url,
        category: cat,
      } as any).eq("id", editingContent.id);
      if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    } else {
      const { error } = await supabase.from(tableName as any).insert({
        title: contentForm.title,
        description: contentForm.description,
        stream_url: embedUrl,
        thumbnail_url: contentForm.thumbnail_url,
        category: cat,
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

  // ── Admin Actions ──
  const addAdmin = async () => {
    if (!adminEmail.trim()) return;
    // Find user by email
    const { data: profile } = await supabase.from("profiles" as any).select("user_id").eq("email", adminEmail.trim()).maybeSingle();
    if (!profile) {
      toast({ title: "Usuário não encontrado", description: "Nenhum usuário com esse email.", variant: "destructive" });
      return;
    }
    const userId = (profile as any).user_id;
    // Check if already admin
    const { data: existing } = await supabase.from("user_roles" as any).select("id").eq("user_id", userId).eq("role", "admin");
    if (existing && existing.length > 0) {
      toast({ title: "Já é admin", description: "Este usuário já possui permissão de administrador." });
      return;
    }
    const { error } = await supabase.from("user_roles" as any).insert({ user_id: userId, role: "admin" });
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Admin adicionado com sucesso! ✅" });
    setAdminEmail("");
    fetchAdminUsers();
  };

  const removeAdmin = async (userId: string) => {
    const { error } = await supabase.from("user_roles" as any).delete().eq("user_id", userId).eq("role", "admin");
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Permissão de admin removida" });
    fetchAdminUsers();
  };

  // ── Subscription Actions ──
  const toggleSubscriptionStatus = async (sub: SubscriptionItem) => {
    const newStatus = sub.status === "active" ? "inactive" : "active";
    const { error } = await supabase.from("subscriptions" as any).update({ status: newStatus } as any).eq("id", sub.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Assinatura ${newStatus === "active" ? "ativada" : "desativada"}` });
    fetchSubscriptions();
  };

  const changeSubscriptionPlan = async (sub: SubscriptionItem, newPlan: string) => {
    const { error } = await supabase.from("subscriptions" as any).update({ plan: newPlan } as any).eq("id", sub.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Plano alterado para ${newPlan}` });
    fetchSubscriptions();
  };

  const addExtraHours = async () => {
    if (!extraHoursUserId || !extraHours) return;
    const sub = subscriptions.find(s => s.id === extraHoursUserId);
    if (!sub) return;
    const newHours = sub.trial_hours + Number(extraHours);
    const { error } = await supabase.from("subscriptions" as any).update({ trial_hours: newHours } as any).eq("id", sub.id);
    if (error) { toast({ title: "Erro", description: error.message, variant: "destructive" }); return; }
    toast({ title: `${extraHours}h adicionadas ao teste do usuário` });
    setExtraHoursUserId(null);
    setExtraHours("");
    fetchSubscriptions();
  };

  const getTrialStatus = (sub: SubscriptionItem) => {
    if (sub.plan !== "trial") return null;
    const started = new Date(sub.trial_started_at).getTime();
    const elapsed = (Date.now() - started) / (1000 * 60 * 60);
    const remaining = Math.max(0, sub.trial_hours - elapsed);
    if (remaining <= 0) return "Teste expirado";
    return `${remaining.toFixed(1)}h restantes`;
  };

  // ── Stats ──
  const stats = [
    { label: "Online Agora", value: onlineCount, icon: Wifi, highlight: true },
    { label: "Total Usuários", value: users.length, icon: Users },
    { label: "Ativos", value: users.filter((u) => !u.is_blocked).length, icon: Shield },
    { label: "Bloqueados", value: users.filter((u) => u.is_blocked).length, icon: Ban },
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
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.slice(0, 5).map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">{user.email}</TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.subscription_plan === "none" || !user.subscription_plan
                        ? "bg-muted text-muted-foreground"
                        : user.subscription_status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-destructive/10 text-destructive"
                    }`}>
                      {user.subscription_plan === "none" || !user.subscription_plan ? "Não pagou" : user.subscription_plan}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!user.is_blocked ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                      {!user.is_blocked ? "Ativo" : "Bloqueado"}
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
          <p className="text-muted-foreground text-sm">{filteredUsers.length} de {users.length} usuários</p>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, email ou celular..." value={userSearch} onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }} className="pl-10" />
        </div>
        <div className="flex gap-2 items-center">
          <Calendar className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <Input type="date" value={userDateFrom} onChange={e => { setUserDateFrom(e.target.value); setUserPage(1); }} className="w-36 text-xs" />
          <span className="text-muted-foreground text-xs">até</span>
          <Input type="date" value={userDateTo} onChange={e => { setUserDateTo(e.target.value); setUserPage(1); }} className="w-36 text-xs" />
          {(userDateFrom || userDateTo) && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setUserDateFrom(""); setUserDateTo(""); setUserPage(1); }}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
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
                <TableHead>Plano</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedUsers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado.</TableCell>
                </TableRow>
              ) : (
                paginatedUsers.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell className="text-muted-foreground">{user.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{user.phone}</TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{new Date(user.created_at).toLocaleDateString("pt-BR")}</TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        user.subscription_plan === "none" || !user.subscription_plan
                          ? "bg-muted text-muted-foreground"
                          : user.subscription_status === "active"
                            ? "bg-primary/10 text-primary"
                            : "bg-destructive/10 text-destructive"
                      }`}>
                        {user.subscription_plan === "none" || !user.subscription_plan ? "Não pagou" : user.subscription_plan}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!user.is_blocked ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                        {!user.is_blocked ? "Ativo" : "Bloqueado"}
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
                          <DropdownMenuItem onClick={() => toggleBlockUser(user)}>
                            <Ban className="w-4 h-4 mr-2" /> {user.is_blocked ? "Desbloquear" : "Bloquear"}
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
      {totalUserPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">Página {userPage} de {totalUserPages}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={userPage <= 1} onClick={() => setUserPage(p => p - 1)}>
              <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={userPage >= totalUserPages} onClick={() => setUserPage(p => p + 1)}>
              Próximo <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  const renderContentManager = () => {
    const catInfo = contentCategories.find((c) => c.id === activeSection);
    const sectionLabel = catInfo?.label || adminMenu.find(m => m.id === activeSection)?.label || activeSection;
    return (
      <div className="animate-fade-in space-y-6 min-w-0 w-full">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-display font-bold mb-1">Gerenciar {sectionLabel}</h2>
            <p className="text-muted-foreground text-sm">{content.length} itens cadastrados</p>
          </div>
          <Button variant="hero" size="sm" onClick={openAddContent}>
            <Plus className="w-4 h-4" /> Adicionar
          </Button>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar conteúdo..." value={contentSearch} onChange={(e) => { setContentSearch(e.target.value); setContentPage(1); }} className="pl-10" />
        </div>

        {/* Mobile: card list / Desktop: table */}
        <div className="block sm:hidden space-y-3">
          {paginatedContent.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhum conteúdo encontrado.</p>
          ) : (
            paginatedContent.map((item) => (
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
                {paginatedContent.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Nenhum conteúdo encontrado.</TableCell>
                  </TableRow>
                ) : (
                  paginatedContent.map((item) => (
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
        {totalContentPages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Página {contentPage} de {totalContentPages} ({filteredContent.length} itens)</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={contentPage <= 1} onClick={() => setContentPage(p => p - 1)}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={contentPage >= totalContentPages} onClick={() => setContentPage(p => p + 1)}>
                Próximo <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
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

  const renderSubscriptions = () => {
    const filteredSubs = subscriptions.filter(s =>
      (s.user_name || "").toLowerCase().includes(subSearch.toLowerCase()) ||
      (s.user_email || "").toLowerCase().includes(subSearch.toLowerCase())
    );

    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold mb-1">Gerenciar Assinaturas</h2>
          <p className="text-muted-foreground text-sm">{subscriptions.length} assinaturas</p>
        </div>
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={subSearch} onChange={(e) => setSubSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="space-y-3">
          {filteredSubs.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">Nenhuma assinatura encontrada.</p>
          ) : (
            filteredSubs.map((sub) => {
              const trialStatus = getTrialStatus(sub);
              return (
                <div key={sub.id} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="min-w-0">
                      <h4 className="font-medium truncate">{sub.user_name || "Sem nome"}</h4>
                      <p className="text-xs text-muted-foreground truncate">{sub.user_email}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${sub.status === "active" ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                        {sub.status === "active" ? "Ativa" : "Inativa"}
                      </span>
                      <Switch checked={sub.status === "active"} onCheckedChange={() => toggleSubscriptionStatus(sub)} />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Plano</p>
                      <p className="font-medium capitalize">{sub.plan === "trial" ? "Teste Grátis" : sub.plan === "monthly" ? "Mensal" : sub.plan === "annual" ? "Anual" : sub.plan}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Horas de Teste</p>
                      <p className="font-medium">{sub.trial_hours}h</p>
                    </div>
                    {trialStatus && (
                      <div>
                        <p className="text-xs text-muted-foreground">Status do Teste</p>
                        <p className={`font-medium text-xs ${trialStatus.includes("expirado") ? "text-destructive" : "text-emerald-400"}`}>
                          <Clock className="w-3 h-3 inline mr-1" />{trialStatus}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-xs text-muted-foreground">Desde</p>
                      <p className="font-medium text-xs">{new Date(sub.activated_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm">Alterar Plano</Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem onClick={() => changeSubscriptionPlan(sub, "trial")}>Teste Grátis</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeSubscriptionPlan(sub, "monthly")}>Mensal</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => changeSubscriptionPlan(sub, "annual")}>Anual</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="outline" size="sm" onClick={() => { setExtraHoursUserId(sub.id); setExtraHours(""); }}>
                      <Plus className="w-3 h-3 mr-1" /> Dar Horas
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Extra hours dialog */}
        <Dialog open={!!extraHoursUserId} onOpenChange={() => setExtraHoursUserId(null)}>
          <DialogContent className="bg-card border-border">
            <DialogHeader>
              <DialogTitle className="font-display">Adicionar Horas de Teste</DialogTitle>
              <DialogDescription>Quantas horas extras deseja adicionar?</DialogDescription>
            </DialogHeader>
            <Input type="number" min="1" placeholder="Ex: 2" value={extraHours} onChange={(e) => setExtraHours(e.target.value)} />
            <DialogFooter>
              <Button variant="outline" onClick={() => setExtraHoursUserId(null)}>Cancelar</Button>
              <Button variant="hero" onClick={addExtraHours}>Adicionar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderAddAdmin = () => (
    <div className="animate-fade-in space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Gerenciar Administradores</h2>
        <p className="text-muted-foreground text-sm">Adicione ou remova permissões de administrador.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-display font-semibold">Adicionar Novo Admin</h3>
        <div className="flex gap-2">
          <Input placeholder="Email do usuário..." value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)} className="flex-1" />
          <Button variant="hero" onClick={addAdmin}>
            <UserPlus className="w-4 h-4 mr-1" /> Adicionar
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">O usuário precisa já estar cadastrado no sistema.</p>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-display font-semibold">Admins Atuais ({adminUsers.length})</h3>
        {adminUsers.length === 0 ? (
          <p className="text-muted-foreground text-sm">Nenhum administrador encontrado.</p>
        ) : (
          <div className="space-y-2">
            {adminUsers.map((a) => (
              <div key={a.user_id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                <div>
                  <p className="font-medium text-sm">{a.name || "Sem nome"}</p>
                  <p className="text-xs text-muted-foreground">{a.email}</p>
                </div>
                <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" onClick={() => removeAdmin(a.user_id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> Remover
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const copyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setWebhookCopied(true);
    toast({ title: "URL copiada!" });
    setTimeout(() => setWebhookCopied(false), 2000);
  };

  const renderPlans = () => (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Gerenciar Planos</h2>
        <p className="text-muted-foreground text-sm">Edite preços, nomes e links de pagamento dos planos.</p>
      </div>

      <div className="space-y-4">
        {plansList.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nenhum plano encontrado.</p>
        ) : (
          plansList.map((plan) => (
            <div key={plan.id} className={`bg-card border rounded-xl p-5 space-y-3 ${plan.is_popular ? "border-primary/40" : "border-border"}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-lg">{plan.name}</h3>
                    {plan.is_popular && (
                      <span className="bg-primary/10 text-primary text-[10px] font-bold px-2 py-0.5 rounded-full">POPULAR</span>
                    )}
                  </div>
                  <p className="text-2xl font-display font-bold mt-1">
                    {plan.price} <span className="text-sm font-normal text-muted-foreground">{plan.period}</span>
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => openEditPlan(plan)}>
                  <Edit className="w-4 h-4 mr-1" /> Editar
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {plan.features.map((f, i) => (
                  <span key={i} className="bg-muted/50 text-xs px-2.5 py-1 rounded-full">{f}</span>
                ))}
              </div>
              {plan.payment_link && (
                <p className="text-xs text-muted-foreground truncate">
                  <Link2 className="w-3 h-3 inline mr-1" />
                  {plan.payment_link}
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Plan edit dialog */}
      <Dialog open={planFormOpen} onOpenChange={setPlanFormOpen}>
        <DialogContent className="bg-card border-border max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="font-display">Editar Plano</DialogTitle>
            <DialogDescription>Altere os dados do plano. As mudanças serão aplicadas na Home e na página de Assinatura.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 overflow-y-auto flex-1 pr-2">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Nome do Plano</label>
              <Input placeholder="Ex: Mensal" value={planForm.name} onChange={e => setPlanForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">Preço</label>
                <Input placeholder="Ex: R$ 29,90" value={planForm.price} onChange={e => setPlanForm(f => ({ ...f, price: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">Período</label>
                <Input placeholder="Ex: /mês" value={planForm.period} onChange={e => setPlanForm(f => ({ ...f, period: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Link de Pagamento</label>
              <Input placeholder="https://pay.exemplo.com/checkout/..." value={planForm.payment_link} onChange={e => setPlanForm(f => ({ ...f, payment_link: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Ao clicar no botão, o usuário será redirecionado para este link.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Texto do Botão (CTA)</label>
              <Input placeholder="Ex: Assinar Mensal" value={planForm.cta_text} onChange={e => setPlanForm(f => ({ ...f, cta_text: e.target.value }))} />
              <p className="text-xs text-muted-foreground mt-1">Texto exibido no botão de ação na Home e na página de Assinatura.</p>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Recursos (um por linha)</label>
              <textarea
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                placeholder={"Acesso total ao catálogo\nAté 2 telas simultâneas\nQualidade HD"}
                value={planForm.features}
                onChange={e => setPlanForm(f => ({ ...f, features: e.target.value }))}
              />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" checked={planForm.is_popular} onChange={e => setPlanForm(f => ({ ...f, is_popular: e.target.checked }))} className="rounded border-border" />
              <label className="text-sm font-medium">Marcar como "Mais Popular"</label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanFormOpen(false)}>Cancelar</Button>
            <Button variant="hero" onClick={savePlan}><Save className="w-4 h-4" /> Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderPaymentIntegration = () => (
    <div className="animate-fade-in space-y-6 max-w-3xl">
      <div>
        <h2 className="text-2xl font-display font-bold mb-1">Integração de Pagamento</h2>
        <p className="text-muted-foreground text-sm">Configure sua plataforma de pagamento para ativar assinaturas automaticamente.</p>
      </div>

      <div className="bg-card border border-primary/20 rounded-xl p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-display font-semibold">URL do Webhook</h3>
            <p className="text-xs text-muted-foreground">Cole esta URL na sua plataforma de pagamento (Mercado Pago, PagSeguro, Stripe, etc.)</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Input value={webhookUrl} readOnly className="font-mono text-xs bg-muted/50" />
          <Button variant="outline" size="icon" onClick={copyWebhookUrl} className="flex-shrink-0">
            {webhookCopied ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </Button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-display font-semibold">Como funciona</h3>
        <ol className="list-decimal list-inside space-y-3 text-sm text-muted-foreground">
          <li>Copie a <strong className="text-foreground">URL do Webhook</strong> acima.</li>
          <li>Na sua plataforma de pagamento, configure um <strong className="text-foreground">webhook/notificação</strong> apontando para esta URL.</li>
          <li>Quando um pagamento for aprovado, a plataforma envia um evento para esta URL.</li>
          <li>O sistema <strong className="text-foreground">ativa automaticamente</strong> a assinatura do usuário por <strong className="text-foreground">30 dias</strong>.</li>
          <li>Após 30 dias, se nenhum novo pagamento for recebido, a assinatura é <strong className="text-foreground">pausada automaticamente</strong>.</li>
        </ol>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-4">
        <h3 className="font-display font-semibold">Formato do Payload (JSON)</h3>
        <p className="text-xs text-muted-foreground mb-2">O webhook aceita os seguintes formatos de evento:</p>
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-foreground">{`{
  "event": "payment_approved",
  "email": "usuario@email.com",
  "plan": "monthly"
}`}</pre>
        </div>
        <p className="text-xs text-muted-foreground">Ou usando o ID do usuário:</p>
        <div className="bg-muted/50 rounded-lg p-4 font-mono text-xs overflow-x-auto">
          <pre className="text-foreground">{`{
  "event": "payment_approved",
  "user_id": "uuid-do-usuario",
  "plan": "monthly"
}`}</pre>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <h3 className="font-display font-semibold">Eventos aceitos</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-lg">
            <p className="font-medium text-sm text-emerald-400">✅ Pagamento Aprovado</p>
            <p className="text-xs text-muted-foreground mt-1">Eventos: <code className="text-foreground">payment_approved</code>, <code className="text-foreground">paid</code></p>
            <p className="text-xs text-muted-foreground">Ativa assinatura por 30 dias.</p>
          </div>
          <div className="p-3 bg-destructive/5 border border-destructive/20 rounded-lg">
            <p className="font-medium text-sm text-destructive">❌ Pagamento Recusado</p>
            <p className="text-xs text-muted-foreground mt-1">Eventos: <code className="text-foreground">payment_refused</code>, <code className="text-foreground">refunded</code></p>
            <p className="text-xs text-muted-foreground">Desativa assinatura imediatamente.</p>
          </div>
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-3">
        <h3 className="font-display font-semibold">Planos disponíveis</h3>
        <p className="text-xs text-muted-foreground">Use o campo <code className="text-foreground">"plan"</code> com um destes valores:</p>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 bg-muted/50 rounded-full text-xs font-medium">monthly</span>
          <span className="px-3 py-1.5 bg-muted/50 rounded-full text-xs font-medium">annual</span>
          <span className="px-3 py-1.5 bg-muted/50 rounded-full text-xs font-medium">trial</span>
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

  const renderSales = () => {
    const filteredTx = transactions.filter(t =>
      (t.user_name || "").toLowerCase().includes(txSearch.toLowerCase()) ||
      (t.user_email || "").toLowerCase().includes(txSearch.toLowerCase()) ||
      (t.email || "").toLowerCase().includes(txSearch.toLowerCase())
    );

    const statusLabel = (s: string) => {
      if (s === "paid") return { text: "Pago", cls: "bg-emerald-500/10 text-emerald-400" };
      if (s === "refused") return { text: "Recusado", cls: "bg-destructive/10 text-destructive" };
      if (s === "failed") return { text: "Falhou", cls: "bg-destructive/10 text-destructive" };
      return { text: "Pendente", cls: "bg-yellow-500/10 text-yellow-400" };
    };

    return (
      <div className="animate-fade-in space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-display font-bold mb-1">Vendas</h2>
            <p className="text-muted-foreground text-sm">{transactions.length} registros de vendas</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={refreshingTransactions}
            onClick={() => void fetchTransactions()}
          >
            <RefreshCw className={`w-4 h-4 mr-1 ${refreshingTransactions ? "animate-spin" : ""}`} />
            {refreshingTransactions ? "Atualizando..." : "Atualizar"}
          </Button>
        </div>

        {/* Test event sender */}
        <div className="bg-card border border-primary/20 rounded-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Send className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Enviar Evento de Teste</h3>
              <p className="text-xs text-muted-foreground">Simule um evento de pagamento para testar a integração.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input placeholder="Email do usuário..." value={testEmail} onChange={e => setTestEmail(e.target.value)} />
            <select value={testEvent} onChange={e => setTestEvent(e.target.value)} className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm">
              <option value="payment_approved">payment_approved</option>
              <option value="paid">paid</option>
              <option value="payment_refused">payment_refused</option>
              <option value="refunded">refunded</option>
            </select>
            <select value={testPlan} onChange={e => setTestPlan(e.target.value)} className="bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm">
              <option value="monthly">Mensal</option>
              <option value="annual">Anual</option>
              <option value="trial">Trial</option>
            </select>
          </div>
          <Button variant="hero" size="sm" disabled={sendingTest} onClick={sendTestEvent}>
            <Send className="w-4 h-4" /> {sendingTest ? "Enviando..." : "Enviar Evento de Teste"}
          </Button>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome ou email..." value={txSearch} onChange={e => setTxSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Plano</TableHead>
                  <TableHead className="hidden lg:table-cell">Data</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTx.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma venda encontrada.</TableCell>
                  </TableRow>
                ) : (
                  filteredTx.map(tx => {
                    const st = statusLabel(tx.status);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="font-medium">{tx.user_name || "—"}</TableCell>
                        <TableCell className="text-muted-foreground">{tx.user_email || tx.email || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                            {st.text}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">{tx.plan || "—"}</TableCell>
                        <TableCell className="hidden lg:table-cell text-muted-foreground">{new Date(tx.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTransaction(tx.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };

  const renderTransactions = () => {
    const filteredTx = transactions.filter(t =>
      (t.user_name || "").toLowerCase().includes(txSearch.toLowerCase()) ||
      (t.user_email || "").toLowerCase().includes(txSearch.toLowerCase()) ||
      (t.event || "").toLowerCase().includes(txSearch.toLowerCase())
    );

    const statusLabel = (s: string) => {
      if (s === "paid") return { text: "Pago", cls: "bg-emerald-500/10 text-emerald-400" };
      if (s === "refused") return { text: "Recusado", cls: "bg-destructive/10 text-destructive" };
      if (s === "failed") return { text: "Falhou", cls: "bg-destructive/10 text-destructive" };
      return { text: "Pendente", cls: "bg-yellow-500/10 text-yellow-400" };
    };

    return (
      <div className="animate-fade-in space-y-6">
        <div>
          <h2 className="text-2xl font-display font-bold mb-1">Histórico de Transações</h2>
          <p className="text-muted-foreground text-sm">Todos os eventos de pagamento recebidos pelo webhook.</p>
        </div>

        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input placeholder="Buscar por nome, email ou evento..." value={txSearch} onChange={e => setTxSearch(e.target.value)} className="pl-10" />
        </div>

        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Evento</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTx.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Nenhuma transação encontrada.</TableCell>
                  </TableRow>
                ) : (
                  filteredTx.map(tx => {
                    const st = statusLabel(tx.status);
                    return (
                      <TableRow key={tx.id}>
                        <TableCell className="text-muted-foreground text-xs">{new Date(tx.created_at).toLocaleString("pt-BR")}</TableCell>
                        <TableCell className="font-medium">{tx.user_email || tx.email || "—"}</TableCell>
                        <TableCell>
                          <span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded">{tx.event}</span>
                        </TableCell>
                        <TableCell>{tx.plan || "—"}</TableCell>
                        <TableCell>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${st.cls}`}>
                            {st.text}
                          </span>
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => deleteTransaction(tx.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    );
  };

  const isContentSection = contentCategories.some((c) => c.id === activeSection) || ["novos", "novidades", "doramas"].includes(activeSection);

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
          {activeSection === "subscriptions" && renderSubscriptions()}
          {activeSection === "add-admin" && renderAddAdmin()}
          {activeSection === "payment-integration" && renderPaymentIntegration()}
          {activeSection === "plans" && renderPlans()}
          {activeSection === "sales" && renderSales()}
          {activeSection === "transactions" && renderTransactions()}
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
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${!selectedUser.is_blocked ? "bg-emerald-500/10 text-emerald-400" : "bg-destructive/10 text-destructive"}`}>
                    {!selectedUser.is_blocked ? "Ativo" : "Bloqueado"}
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
                <Button variant="outline" size="sm" onClick={() => { toggleBlockUser(selectedUser); setDetailsOpen(false); }}>
                  <Ban className="w-4 h-4 mr-1" /> {selectedUser.is_blocked ? "Desbloquear" : "Bloquear"}
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
