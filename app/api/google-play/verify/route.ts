import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyGracePlayPurchase, refreshGracePlay } from "@/lib/googlePlayBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getUser(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(header.slice(7).trim());
  return error ? null : data.user;
}

export async function POST(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const payload = await request.json().catch(() => ({}));
  const purchaseToken = typeof payload.purchaseToken === "string" ? payload.purchaseToken : "";
  if (!purchaseToken || purchaseToken.length > 4096) {
    return NextResponse.json({ error: "Invalid purchase token" }, { status: 400 });
  }
  try {
    return NextResponse.json(await verifyGracePlayPurchase(user.id, purchaseToken));
  } catch (error) {
    console.error("Google Play receipt verification:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({
      error: "Google couldn't verify your payment yet. If charged, tap Restore Purchases or contact support.",
    }, { status: 400 });
  }
}

export async function GET(request: NextRequest) {
  const user = await getUser(request);
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  try {
    return NextResponse.json(await refreshGracePlay(user.id, true));
  } catch (error) {
    console.error("Google Play subscription refresh:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({ error: "Cannot check Google Play subscription now" }, { status: 503 });
  }
}
