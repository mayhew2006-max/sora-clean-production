import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const LIMIT = 50;

// This endpoint is the authoritative counter for browser-driven actions.
// The conditional update prevents two devices from spending the same free credit.
export async function POST(req: NextRequest) {
  const bearer = req.headers.get("authorization") || "";
  if (!bearer.startsWith("Bearer ")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const token = bearer.slice(7).trim();
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(token);
  if (authError || !auth.user) return NextResponse.json({ error: "Session expired" }, { status: 401 });
  const user = auth.user;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action || "").slice(0, 60);
  if (!["chat", "field_save", "field_track"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  for (let attempt = 0; attempt < 8; attempt++) {
    const { data: row, error } = await supabaseAdmin.from("grace_user_usage")
      .select("free_messages_used,paid,founder").eq("user_id", user.id).maybeSingle();
    if (error) return NextResponse.json({ error: "Account check unavailable" }, { status: 503 });
    if (!row) {
      const { error: createError } = await supabaseAdmin.from("grace_user_usage")
        .upsert({ user_id: user.id, email: user.email || "", free_messages_used: 0 },
          { onConflict: "user_id", ignoreDuplicates: true });
      if (createError) return NextResponse.json({ error: "Account setup unavailable" }, { status: 503 });
      continue;
    }
    const used = Math.max(0, Number(row.free_messages_used) || 0);
    if (row.paid || row.founder) return NextResponse.json({ allowed: true, paid: true, used, remaining: LIMIT });
    if (used >= LIMIT) return NextResponse.json({ allowed: false, paid: false, used, remaining: 0 }, { status: 402 });
    const { data: updated, error: updateError } = await supabaseAdmin.from("grace_user_usage")
      .update({ free_messages_used: used + 1, updated_at: new Date().toISOString() })
      .eq("user_id", user.id).eq("free_messages_used", used)
      .select("free_messages_used").maybeSingle();
    if (updateError) return NextResponse.json({ error: "Unable to record action" }, { status: 503 });
    if (updated) return NextResponse.json({ allowed: true, paid: false, used: used + 1, remaining: LIMIT - used - 1 });
  }
  return NextResponse.json({ error: "Account is busy, retry" }, { status: 409 });
}
