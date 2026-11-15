import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const stripeClient = () => new Stripe(process.env.STRIPE_SECRET_KEY || "");
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

async function setStripeStatus(
  userId: string,
  email: string,
  stripePaid: boolean,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
) {
  const admin = getSupabaseAdmin();
  const { data: existing, error: queryError } = await admin.from("grace_user_usage")
    .select("free_messages_used,founder,play_paid,manual_paid")
    .eq("user_id", userId).maybeSingle();
  if (queryError) throw queryError;

  const { error } = await admin.from("grace_user_usage").upsert({
    user_id: userId,
    email,
    free_messages_used: existing?.free_messages_used || 0,
    founder: Boolean(existing?.founder),
    stripe_paid: stripePaid,
    paid: stripePaid || Boolean(existing?.play_paid) || Boolean(existing?.manual_paid),
    stripe_customer_id: stripeCustomerId || null,
    stripe_subscription_id: stripeSubscriptionId || null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "user_id" });
  if (error) throw error;
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  let event: Stripe.Event;
  try {
    event = stripeClient().webhooks.constructEvent(
      await req.text(), signature, process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch {
    return NextResponse.json({ error: "Invalid Stripe webhook signature" }, { status: 400 });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.grace_user_id || "";
      const email = session.metadata?.grace_email || session.customer_details?.email || "";
      if (userId && email && typeof session.subscription === "string") {
        const subscription = await stripeClient().subscriptions.retrieve(session.subscription);
        await setStripeStatus(
          userId, email, ["active", "trialing"].includes(subscription.status),
          typeof session.customer === "string" ? session.customer : undefined,
          session.subscription
        );
      }
    }
    if (event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.grace_user_id || "";
      const email = subscription.metadata?.grace_email || "";
      if (userId && email) {
        await setStripeStatus(
          userId, email, ["active", "trialing"].includes(subscription.status),
          typeof subscription.customer === "string" ? subscription.customer : undefined,
          subscription.id
        );
      }
    }
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing failed:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
