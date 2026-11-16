import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { refreshGracePlay } from "@/lib/googlePlayBilling";

export const GRACE_FREE_LIMIT = 50;

type GraceUser = { id: string; email: string };

async function authenticateGraceRequest(req: Request): Promise<GraceUser | Response> {
  const auth = req.headers.get("authorization") || "";
  if (!auth.startsWith("Bearer ")) {
    return Response.json({ error: "Sign in required" }, { status: 401 });
  }
  const { data, error } = await supabaseAdmin.auth.getUser(auth.slice(7).trim());
  if (error || !data.user) return Response.json({ error: "Invalid session" }, { status: 401 });
  return { id: data.user.id, email: data.user.email || "" };
}

/** Revalidate existing Play subscriptions before allowing metered or companion AI calls.
 * Preserve independent Stripe/manual/founder access during cancellation or outages.
 * If an expired purchase cannot be refreshed, revoke Play-only access, never extend it.
 */
export async function reconcileGracePlayForUser(userId: string): Promise<Response | null> {
  const { data: subscription, error } = await supabaseAdmin
    .from("grace_play_subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) return Response.json({ error: "Subscription check unavailable" }, { status: 503 });
  if (!subscription) return null;
  try {
    await refreshGracePlay(userId);
    return null;
  } catch (reason) {
    console.error("Grace subscription refresh:", reason instanceof Error ? reason.message : "unknown");
    const expiration = Date.parse(subscription.expires_at || "");
    if (Number.isFinite(expiration) && expiration > Date.now()) return null;
    const { data: usage, error: usageError } = await supabaseAdmin.from("grace_user_usage")
      .select("stripe_paid,manual_paid")
      .eq("user_id", userId)
      .maybeSingle();
    if (usageError) return Response.json({ error: "Subscription status unavailable" }, { status: 503 });
    const { error: updateError } = await supabaseAdmin.from("grace_user_usage")
      .update({
        play_paid: false,
        paid: Boolean(usage?.stripe_paid) || Boolean(usage?.manual_paid),
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
    if (updateError) return Response.json({ error: "Subscription status unavailable" }, { status: 503 });
    return null;
  }
}

/** Only cron-authenticated backend calls can avoid counting the internal sports sub-request. */
function isTrustedCronRequest(req: Request, allowCron: boolean): boolean {
  const secret = process.env.CRON_SECRET;
  return Boolean(allowCron && secret && req.headers.get("authorization") === "Bearer " + secret);
}

/** One free action per chargeable AI API request; atomic and account-wide across devices. */
export async function chargeGraceApiRequest(
  req: Request,
  options: { allowCron?: boolean } = {}
): Promise<Response | null> {
  if (isTrustedCronRequest(req, Boolean(options.allowCron))) return null;
  const user = await authenticateGraceRequest(req);
  if (user instanceof Response) return user;
  const subscriptionError = await reconcileGracePlayForUser(user.id);
  if (subscriptionError) return subscriptionError;

  for (let attempt = 0; attempt < 10; attempt++) {
    const { data: usage, error } = await supabaseAdmin.from("grace_user_usage")
      .select("free_messages_used,paid,founder")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return Response.json({ error: "Usage verification unavailable" }, { status: 503 });
    if (!usage) {
      const { error: createError } = await supabaseAdmin.from("grace_user_usage")
        .upsert({ user_id: user.id, email: user.email, free_messages_used: 0 },
          { onConflict: "user_id", ignoreDuplicates: true });
      if (createError) return Response.json({ error: "Account setup unavailable" }, { status: 503 });
      continue;
    }
    if (usage.paid || usage.founder) return null;
    const used = Math.max(0, Number(usage.free_messages_used) || 0);
    if (used >= GRACE_FREE_LIMIT) {
      return Response.json({ error: "Free actions exhausted", upgrade: "/pay" }, { status: 402 });
    }
    const { data: changed, error: updateError } = await supabaseAdmin
      .from("grace_user_usage")
      .update({ free_messages_used: used + 1, updated_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("free_messages_used", used)
      .select("free_messages_used")
      .maybeSingle();
    if (updateError) return Response.json({ error: "Usage update unavailable" }, { status: 503 });
    if (changed) return null;
  }
  return Response.json({ error: "Account busy, retry" }, { status: 409 });
}

/** Companion voice/memory calls are bundled with an already-metered user action.
 * They cannot be made anonymously, used before a charged action, or used after an
 * extended idle period on a free account. Never trust client-provided paid flags.
 */
const companionWindows = new Map<string, { started: number; count: number }>();
export async function checkGraceCompanionRequest(
  req: Request,
  kind: "voice" | "memory"
): Promise<Response | null> {
  const user = await authenticateGraceRequest(req);
  if (user instanceof Response) return user;
  const subscriptionError = await reconcileGracePlayForUser(user.id);
  if (subscriptionError) return subscriptionError;
  const { data: usage, error } = await supabaseAdmin.from("grace_user_usage")
    .select("free_messages_used,paid,founder,updated_at")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error) return Response.json({ error: "Usage verification unavailable" }, { status: 503 });
  if (!usage) return Response.json({ error: "No free actions recorded yet" }, { status: 402 });
  if (usage.paid || usage.founder) return null;

  const used = Math.max(0, Number(usage.free_messages_used) || 0);
  const lastAction = Date.parse(usage.updated_at || "");
  if (used < 1 || used > GRACE_FREE_LIMIT ||
      !Number.isFinite(lastAction) || Date.now() - lastAction > 3 * 60_000) {
    return Response.json({ error: "Free actions exhausted or no recent action", upgrade: "/pay" }, { status: 402 });
  }

  // Defense-in-depth for browser-driven extra calls. This is per server process,
  // not a substitute for the authoritative database-backed 50-action counter.
  const key = user.id + ":" + kind;
  const now = Date.now();
  if (companionWindows.size > 3000) companionWindows.clear();
  const previous = companionWindows.get(key);
  const windowEntry = !previous || now - previous.started >= 60_000
    ? { started: now, count: 0 } : previous;
  windowEntry.count++;
  companionWindows.set(key, windowEntry);
  const perMinute = kind === "voice" ? 12 : 5;
  if (windowEntry.count > perMinute) {
    return Response.json({ error: "Too many requests, try again shortly" }, { status: 429 });
  }
  return null;
}

/** Premium-only legacy endpoint: eligibility comes from Supabase, not the JSON body. */
export async function requireGracePremiumRequest(req: Request): Promise<Response | null> {
  const user = await authenticateGraceRequest(req);
  if (user instanceof Response) return user;
  const subscriptionError = await reconcileGracePlayForUser(user.id);
  if (subscriptionError) return subscriptionError;
  const { data: usage, error } = await supabaseAdmin.from("grace_user_usage")
    .select("paid,founder").eq("user_id", user.id).maybeSingle();
  if (error) return Response.json({ error: "Usage verification unavailable" }, { status: 503 });
  if (!usage?.paid && !usage?.founder) {
    return Response.json({ error: "Premium account required", upgrade: "/pay" }, { status: 402 });
  }
  return null;
}
