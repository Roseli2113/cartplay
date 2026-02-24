import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface SubscriptionPlan {
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

export function usePlans() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPlans = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("subscription_plans" as any)
      .select("*")
      .order("sort_order", { ascending: true });
    if (data) setPlans(data as unknown as SubscriptionPlan[]);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  return { plans, loading, refetch: fetchPlans };
}
