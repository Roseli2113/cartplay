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
    console.log("Webhook received payload:", JSON.stringify(body));

    // Normalize fields from different payment platforms (Lowify, Mercado Pago, etc.)
    const event = body.event || body.status || body.type || body.action || null;
    const email = body.email || body.customer_email || body.payer?.email || body.buyer?.email || body.customer?.email || null;
    const user_id = body.user_id || null;
    const plan = body.plan || body.product || "monthly";
    const customerName = body.name || body.customer_name || body.payer?.name || body.buyer?.name || body.customer?.name || null;

    // If no recognizable event, log everything and accept it
    if (!event) {
      // Log the raw payload for debugging
      await supabase.from("payment_transactions").insert({
        email: email || "unknown",
        event: "unknown_format",
        plan: plan,
        status: "pending",
        payload: body,
      });
      return new Response(
        JSON.stringify({ success: true, message: "Payload received and logged (no event field detected)", received_fields: Object.keys(body) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          event: String(event),
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
      // Log even if no user found
      await supabase.from("payment_transactions").insert({
        email: email || "unknown",
        event: String(event),
        plan: selectedPlan,
        status: "pending",
        payload: body,
      });
      return new Response(
        JSON.stringify({ success: true, message: "Event logged but no user matched. Provide 'email' or 'user_id'.", received_fields: Object.keys(body) }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const selectedPlan = plan || "monthly";

    // Normalize event to lowercase for matching
    const normalizedEvent = String(event).toLowerCase().replace(/[^a-z0-9_.-]/g, '');

    const isPaid = ["payment_approved", "payment.approved", "paid", "approved", "completed", "confirmed", "pix_paid", "pix.paid", "boleto_paid"].includes(normalizedEvent);
    const isRefused = ["payment_refused", "payment.refused", "refunded", "refused", "cancelled", "canceled", "expired", "chargeback"].includes(normalizedEvent);
    const isPending = ["pix_generated", "pix.generated", "pending", "waiting", "processing", "in_process", "boleto_generated", "boleto.generated"].includes(normalizedEvent);

    if (isPaid) {
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

    if (isRefused) {
      await supabase
        .from("subscriptions")
        .update({ status: "inactive" })
        .eq("user_id", targetUserId);

      await supabase.from("payment_transactions").insert({
        user_id: targetUserId, email, event: String(event), plan: selectedPlan, status: "refused", payload: body,
      });

      return new Response(
        JSON.stringify({ success: true, message: "Subscription deactivated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isPending) {
      await supabase.from("payment_transactions").insert({
        user_id: targetUserId, email, event: String(event), plan: selectedPlan, status: "pending", payload: body,
      });

      return new Response(
        JSON.stringify({ success: true, message: `Pending event '${event}' logged` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log unknown event
    await supabase.from("payment_transactions").insert({
      user_id: targetUserId, email, event: String(event), plan: selectedPlan, status: "pending", payload: body,
    });

    return new Response(
      JSON.stringify({ success: true, message: `Event '${event}' received and logged` }),
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
