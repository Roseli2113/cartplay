import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  price: string;
  period: string;
  features: string[];
  payment_link: string | null;
  is_popular: boolean;
  is_active: boolean;
  sort_order: number;
  cta_text: string;
}

export function usePlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("subscription_plans")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    console.log("usePlans fetch:", { data, error });
    if (data) setPlans(data as SubscriptionPlan[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  return { plans, loading, refetch: fetchPlans };
}
