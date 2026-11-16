import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { checkGracePlayServerAuthorization } from "@/lib/googlePlayBilling";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** A no-purchase credential check restricted to the account owner with founder access. */
export async function GET(request: NextRequest) {
  const header = request.headers.get("authorization") || "";
  if (!header.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(header.slice(7).trim());
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  }
  const { data: usage, error: usageError } = await supabaseAdmin
    .from("grace_user_usage")
    .select("founder")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (usageError) return NextResponse.json({ error: "Unable to check founder access" }, { status: 503 });
  if (!usage?.founder) return NextResponse.json({ error: "Founder access required" }, { status: 403 });
  try {
    await checkGracePlayServerAuthorization();
    return NextResponse.json({ ok: true });
  } catch (error) {
    // Error categories are sanitized in googlePlayBilling; never log key/token contents.
    console.error("Google Play credential self-check:", error instanceof Error ? error.message : "unknown");
    return NextResponse.json({
      ok: false,
      error: "Google rejected the server credentials. The diagnostic was recorded for troubleshooting.",
    }, { status: 503 });
  }
}
