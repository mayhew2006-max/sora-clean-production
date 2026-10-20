import { supabaseAdmin } from "@/lib/supabaseAdmin";

const FREE_LIMIT = 50;

// Call before any chargeable API work. The service role must never be exposed to the client.
export async function chargeGraceApiRequest(req: Request): Promise<Response | null> {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  const { data: auth, error: authError } = await supabaseAdmin.auth.getUser(authorization.slice(7).trim());
  if (authError || !auth.user) return Response.json({ error: "Invalid session" }, { status: 401 });
  const user = auth.user;
  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: usage, error } = await supabaseAdmin.from("grace_user_usage")
      .select("free_messages_used,paid,founder").eq("user_id", user.id).maybeSingle();
    if (error) return Response.json({ error: "Usage verification unavailable" }, { status: 503 });
    if (!usage) {
      const { error: createError } = await supabaseAdmin.from("grace_user_usage").upsert(
        { user_id: user.id, email: user.email || "", free_messages_used: 0 },
        { onConflict: "user_id", ignoreDuplicates: true }
      );
      if (createError) return Response.json({ error: "Account setup unavailable" }, { status: 503 });
      continue;
    }
    if (usage.paid || usage.founder) return null;
    const used = Math.max(0, Number(usage.free_messages_used) || 0);
    if (used >= FREE_LIMIT) return Response.json({ error: "Free actions exhausted", upgrade: "/pay" }, { status: 402 });
    const { data: changed, error: updateError } = await supabaseAdmin.from("grace_user_usage")
      .update({ free_messages_used: used + 1, updated_at: new Date().toISOString() })
      .eq("user_id", user.id).eq("free_messages_used", used)
      .select("free_messages_used").maybeSingle();
    if (updateError) return Response.json({ error: "Usage update unavailable" }, { status: 503 });
    if (changed) return null;
  }
  return Response.json({ error: "Account busy, retry" }, { status: 409 });
}
