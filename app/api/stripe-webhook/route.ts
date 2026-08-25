import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || "",
    process.env.SUPABASE_SERVICE_ROLE_KEY || ""
  );
}

async function setPaidStatus(
  userId: string,
  email: string,
  paid: boolean,
  stripeCustomerId?: string,
  stripeSubscriptionId?: string
) {
  const supabaseAdmin = getSupabaseAdmin();

  const { data: existing } = await supabaseAdmin
    .from("grace_user_usage")
    .select("free_messages_used, founder")
    .eq("user_id", userId)
    .maybeSingle();

  const { error } = await supabaseAdmin
    .from("grace_user_usage")
    .upsert(
      {
        user_id: userId,
        email,
        free_messages_used: existing?.free_messages_used || 0,
        founder: Boolean(existing?.founder),
        paid,
        stripe_customer_id: stripeCustomerId || null,
        stripe_subscription_id: stripeSubscriptionId || null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

  if (error) {
    console.error("Supabase paid sync error", error);
    throw error;
  }
}

export async function POST(req: NextRequest) {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  const body = await req.text();

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (error) {
    console.error("Stripe webhook signature error", error);

    return NextResponse.json(
      { error: "Invalid Stripe webhook signature." },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;

      const userId = session.metadata?.grace_user_id || "";
      const email =
        session.metadata?.grace_email ||
        session.customer_details?.email ||
        "";

      if (userId && email) {
        await setPaidStatus(
          userId,
          email,
          true,
          typeof session.customer === "string" ? session.customer : undefined,
          typeof session.subscription === "string"
            ? session.subscription
            : undefined
        );
      }
    }

    if (
      event.type === "customer.subscription.updated" ||
      event.type === "customer.subscription.deleted"
    ) {
      const subscription = event.data.object as Stripe.Subscription;

      const userId = subscription.metadata?.grace_user_id || "";
      const email = subscription.metadata?.grace_email || "";

      if (userId && email) {
        const paid =
          subscription.status === "active" ||
          subscription.status === "trialing";

        await setPaidStatus(
          userId,
          email,
          paid,
          typeof subscription.customer === "string"
            ? subscription.customer
            : undefined,
          subscription.id
        );
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook processing error", error);

    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}
