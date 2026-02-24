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
    const rawEmail = body.email || body.customer_email || body.payer?.email || body.buyer?.email || body.customer?.email || null;
    const email = rawEmail ? String(rawEmail).trim().toLowerCase() : null;
    const user_id = body.user_id || null;
    const plan = body.plan || body.product || "monthly";
    const customerName = body.name || body.customer_name || body.payer?.name || body.buyer?.name || body.customer?.name || null;

    const selectedPlan = plan || "monthly";

    // Normalize event to lowercase for matching (keep dots/underscores)
    const normalizedEvent = event
      ? String(event).toLowerCase().replace(/[^a-z0-9_.-]/g, "")
      : "";

    // Map known events to statuses (extended for Lowify: sale.pending / sale.paid)
    const isPaid = [
      "payment_approved",
      "payment.approved",
      "paid",
      "approved",
      "completed",
      "confirmed",
      "pix_paid",
      "pix.paid",
      "boleto_paid",
      "sale.paid",
    ].includes(normalizedEvent);

    const isRefused = [
      "payment_refused",
      "payment.refused",
      "refunded",
      "refused",
      "cancelled",
      "canceled",
      "expired",
      "chargeback",
      "sale.refused",
      "sale.cancelled",
      "sale.canceled",
    ].includes(normalizedEvent);

    const isPending = [
      "pix_generated",
      "pix.generated",
      "pending",
      "waiting",
      "processing",
      "in_process",
      "boleto_generated",
      "boleto.generated",
      "sale.pending",
    ].includes(normalizedEvent);

    const inferredStatus = isPaid ? "paid" : isRefused ? "refused" : isPending ? "pending" : "pending";

    const addMetaToPayload = (meta: Record<string, unknown>) => {
      if (typeof body !== "object" || body === null) return body;
      const b = body as Record<string, unknown>;
      const existingMeta =
        typeof b._meta === "object" && b._meta !== null ? (b._meta as Record<string, unknown>) : {};
      return { ...b, _meta: { ...existingMeta, ...meta } };
    };

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

    const statusPriority: Record<string, number> = {
      pending: 1,
      failed: 1,
      paid: 3,
      refused: 3,
    };

    // Helper: find latest transaction for this customer (email first, then user_id)
    const findLatestTransaction = async () => {
      if (email) {
        const { data } = await supabase
          .from("payment_transactions")
          .select("id, status")
          .eq("email", email)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) return data;
      }

      if (targetUserId) {
        const { data } = await supabase
          .from("payment_transactions")
          .select("id, status")
          .eq("user_id", targetUserId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) return data;
      }

      return null;
    };

    const shouldSkipDowngrade = (currentStatus: string, nextStatus: string) => {
      const currentRank = statusPriority[currentStatus] ?? 0;
      const nextRank = statusPriority[nextStatus] ?? 0;
      return nextRank < currentRank;
    };

    // Helper: keep one row per customer and update status progression
    const upsertTransaction = async (
      status: string,
      eventName: string,
      meta?: Record<string, unknown>,
    ) => {
      const existing = await findLatestTransaction();
      const payloadToSave = meta ? addMetaToPayload(meta) : body;

      if (existing) {
        if (shouldSkipDowngrade(existing.status, status)) {
          return;
        }

        await supabase
          .from("payment_transactions")
          .update({
            event: eventName,
            status,
            payload: payloadToSave,
            user_id: targetUserId,
            plan: selectedPlan,
            email,
          })
          .eq("id", existing.id);

        return;
      }

      await supabase.from("payment_transactions").insert({
        user_id: targetUserId,
        email: email || "unknown",
        event: eventName,
        plan: selectedPlan,
        status,
        payload: payloadToSave,
      });
    };

    if (!targetUserId && email) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id")
        .eq("email", email)
        .maybeSingle();

      if (!profile) {
        // Log transaction even if no user matched, but DO NOT fail the webhook
        await upsertTransaction(inferredStatus, String(event), {
          user_matched: false,
          reason: "profile_not_found",
          inferred_status: inferredStatus,
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Evento recebido e registrado, mas nenhum usuário foi encontrado com este email",
            user_matched: false,
            inferred_status: inferredStatus,
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      targetUserId = profile.user_id;
    }

    if (!targetUserId) {
      // Log even if no user found (but DO NOT fail the webhook)
      await upsertTransaction(inferredStatus, String(event), {
        user_matched: false,
        reason: "missing_email_or_user_id",
        inferred_status: inferredStatus,
      });
      return new Response(
        JSON.stringify({
          success: true,
          message: "Evento registrado, mas nenhum usuário foi vinculado. Envie 'email' ou 'user_id' no payload.",
          user_matched: false,
          inferred_status: inferredStatus,
          received_fields: Object.keys(body),
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

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
          await upsertTransaction("failed", String(event));
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
          await upsertTransaction("failed", String(event));
          return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      await upsertTransaction("paid", String(event));

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

      await upsertTransaction("refused", String(event));

      return new Response(
        JSON.stringify({ success: true, message: "Subscription deactivated" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (isPending) {
      await upsertTransaction("pending", String(event));

      return new Response(
        JSON.stringify({ success: true, message: `Pending event '${event}' logged` }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log unknown event
    await upsertTransaction("pending", String(event));

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
