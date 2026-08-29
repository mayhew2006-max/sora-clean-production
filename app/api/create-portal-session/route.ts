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

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const accessToken = authHeader.startsWith("Bearer ")
      ? authHeader.slice(7)
      : "";

    if (!accessToken) {
      return NextResponse.json(
        { error: "You must be signed in." },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();

    const { data, error } =
      await supabaseAdmin.auth.getUser(accessToken);

    if (error || !data.user) {
      return NextResponse.json(
        { error: "Unable to verify Grace account." },
        { status: 401 }
      );
    }

    const user = data.user;

    const { data: usage, error: usageError } =
      await supabaseAdmin
        .from("grace_user_usage")
        .select("paid, founder, stripe_customer_id")
        .eq("user_id", user.id)
        .maybeSingle();

    if (usageError) {
      console.error("Grace billing account lookup failed:", usageError);

      return NextResponse.json(
        { error: "Unable to load billing information." },
        { status: 500 }
      );
    }

    if (usage?.founder) {
      return NextResponse.json(
        { error: "Founder access does not require a subscription." },
        { status: 400 }
      );
    }

    if (!usage?.paid || !usage?.stripe_customer_id) {
      return NextResponse.json(
        { error: "No active Grace Pro subscription was found." },
        { status: 400 }
      );
    }

    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL ||
      req.nextUrl.origin;

    const portalSession =
      await stripe.billingPortal.sessions.create({
        customer: usage.stripe_customer_id,
        return_url: `${siteUrl}/account`,
      });

    return NextResponse.json({
      url: portalSession.url,
    });
  } catch (error) {
    console.error("create-portal-session error:", error);

    return NextResponse.json(
      { error: "Unable to open subscription management right now." },
      { status: 500 }
    );
  }
}
