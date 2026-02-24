import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { event, email, user_id, plan } = body;

    if (!event) {
      return new Response(
        JSON.stringify({ error: "Missing 'event' field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Find user
    let targetUserId = user_id;

    if (!targetUserId && email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (!profile) {
        // Log failed transaction
        await supabase.from("payment_transactions").insert({
          email,
          event,
          plan: plan || "monthly",
          status: "failed",
          payload: body,
        });
        return new Response(
          JSON.stringify({ error: "User not found with provided email" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserId = profile.user_id;
    }

    if (!targetUserId) {
      return new Response(
        JSON.stringify({ error: "Provide 'email' or 'user_id'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedPlan = plan || "monthly";

    if (event === "payment_approved" || event === "payment.approved" || event === "paid") {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

      const { data: existingSub } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("user_id", targetUserId)
        .maybeSingle();

      if (existingSub) {
        const { error } = await supabase
          .from("subscriptions")
          .update({
            plan: selectedPlan,
            status: "active",
            activated_at: now.toISOString(),
            expires_at: expiresAt.toISOString(),
          })
          .eq("user_id", targetUserId);

        if (error) {
          await supabase.from("payment_transactions").insert({
            user_id: targetUserId, email, event, plan: selectedPlan, status: "failed", payload: body,
          });
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } else {
        const { error } = await supabase.from("subscriptions").insert({
          user_id: targetUserId,
          plan: selectedPlan,
          status: "active",
          activated_at: now.toISOString(),
          expires_at: expiresAt.toISOString(),
          trial_hours: 0,
        });

        if (error) {
          await supabase.from("payment_transactions").insert({
            user_id: targetUserId, email, event, plan: selectedPlan, status: "failed", payload: body,
          });
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Log successful payment
      await supabase.from("payment_transactions").insert({
        user_id: targetUserId, email, event, plan: selectedPlan, status: "paid", payload: body,
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: `Subscription activated for user ${targetUserId}`,
          plan: selectedPlan,
          expires_at: expiresAt.toISOString(),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (event === "payment_refused" || event === "payment.refused" || event === "refunded") {
      await supabase
        .from("subscriptions")
        .update({ status: "inactive" })
        .eq("user_id", targetUserId);

      // Log refused/refunded
      await supabase.from("payment_transactions").insert({
        user_id: targetUserId, email, event, plan: selectedPlan, status: "refused", payload: body,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Subscription deactivated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log unknown event
    await supabase.from("payment_transactions").insert({
      user_id: targetUserId, email, event, plan: selectedPlan, status: "pending", payload: body,
    });

    return new Response(
      JSON.stringify({ success: true, message: `Event '${event}' received but no action taken` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
