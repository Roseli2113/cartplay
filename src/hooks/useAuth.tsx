import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

type AccessReason = "blocked" | "trial_expired" | "subscription_inactive" | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
  profile: { name: string; email: string; phone: string } | null;
  accessBlocked: boolean;
  accessReason: AccessReason;
  subscriptionPlan: string | null;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshAccess: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ name: string; email: string; phone: string } | null>(null);
  const [accessBlocked, setAccessBlocked] = useState(false);
  const [accessReason, setAccessReason] = useState<AccessReason>(null);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string | null>(null);

  const resetAccessState = useCallback(() => {
    setProfile(null);
    setIsAdmin(false);
    setAccessBlocked(false);
    setAccessReason(null);
    setSubscriptionPlan(null);
  }, []);

  const loadUserAccess = useCallback(async (userId: string) => {
    const [profileRes, rolesRes, subscriptionRes] = await Promise.all([
      supabase.from("profiles").select("name, email, phone, is_blocked").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase
        .from("subscriptions")
        .select("plan, status, trial_hours, trial_started_at, expires_at")
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

    const profileData = profileRes.data;
    const hasAdmin = rolesRes.data?.some((r: any) => r.role === "admin") ?? false;
    const subscription = subscriptionRes.data;

    setProfile(
      profileData
        ? {
            name: profileData.name ?? "",
            email: profileData.email ?? "",
            phone: profileData.phone ?? "",
          }
        : null
    );
    setIsAdmin(hasAdmin);
    setSubscriptionPlan(subscription?.plan ?? null);

    if (profileData?.is_blocked) {
      setAccessBlocked(true);
      setAccessReason("blocked");
      return;
    }

    // Admin permanece com acesso ao sistema de gestão mesmo sem assinatura ativa.
    if (hasAdmin) {
      setAccessBlocked(false);
      setAccessReason(null);
      return;
    }

    if (!subscription) {
      setAccessBlocked(false);
      setAccessReason(null);
      return;
    }

    const now = Date.now();
    const isInactive = subscription.status === "inactive";
    const paidExpired = subscription.expires_at
      ? now > new Date(subscription.expires_at).getTime()
      : false;

    const trialStartedAt = subscription.trial_started_at ? new Date(subscription.trial_started_at).getTime() : null;
    const trialHours = Number(subscription.trial_hours ?? 0);
    const trialExpired =
      subscription.plan === "trial" &&
      trialStartedAt !== null &&
      Number.isFinite(trialStartedAt) &&
      trialHours > 0 &&
      (now - trialStartedAt) / (1000 * 60 * 60) >= trialHours;

    if (trialExpired || isInactive || paidExpired) {
      setAccessBlocked(true);
      setAccessReason(trialExpired ? "trial_expired" : "subscription_inactive");
      return;
    }

    setAccessBlocked(false);
    setAccessReason(null);
  }, []);

  const refreshAccess = useCallback(async () => {
    if (!user) return;
    await loadUserAccess(user.id);
  }, [loadUserAccess, user]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);

      if (nextSession?.user) {
        setLoading(true);
        setTimeout(() => {
          void loadUserAccess(nextSession.user.id).finally(() => setLoading(false));
        }, 0);
      } else {
        resetAccessState();
        setLoading(false);
      }
    });

    void supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      setSession(initialSession);
      setUser(initialSession?.user ?? null);

      if (initialSession?.user) {
        await loadUserAccess(initialSession.user.id);
      } else {
        resetAccessState();
      }

      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [loadUserAccess, resetAccessState]);

  useEffect(() => {
    if (!user) return;

    const interval = window.setInterval(() => {
      void loadUserAccess(user.id);
    }, 15000);

    return () => window.clearInterval(interval);
  }, [loadUserAccess, user]);

  const signUp = async (email: string, password: string, name: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetAccessState();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        isAdmin,
        loading,
        profile,
        accessBlocked,
        accessReason,
        subscriptionPlan,
        signUp,
        signIn,
        signOut,
        refreshAccess,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
