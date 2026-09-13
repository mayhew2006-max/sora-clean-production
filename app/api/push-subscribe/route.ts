import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace("Bearer ", "").trim();

    if (!token) {
      return Response.json(
        { error: "Missing auth token." },
        { status: 401 }
      );
    }

    const supabaseUrl =
      process.env.SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceKey) {
      return Response.json(
        { error: "Supabase server configuration missing." },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const {
      data: { user },
      error: userError,
    } = await admin.auth.getUser(token);

    if (userError || !user) {
      return Response.json(
        { error: "Invalid Grace session." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const subscription = body?.subscription;

    const endpoint = subscription?.endpoint;
    const p256dh = subscription?.keys?.p256dh;
    const auth = subscription?.keys?.auth;

    if (!endpoint || !p256dh || !auth) {
      return Response.json(
        { error: "Invalid push subscription." },
        { status: 400 }
      );
    }

    const { error } = await admin
      .from("grace_push_subscriptions")
      .upsert(
        {
          user_id: user.id,
          endpoint,
          p256dh,
          auth,
        },
        {
          onConflict: "endpoint",
        }
      );

    if (error) {
      console.error("Push subscription save failed:", error);

      return Response.json(
        { error: "Could not save push subscription." },
        { status: 500 }
      );
    }

    return Response.json({ ok: true });
  } catch (error: any) {
    return Response.json(
      {
        error:
          error?.message ||
          "Grace push subscription failed.",
      },
      { status: 500 }
    );
  }
}
