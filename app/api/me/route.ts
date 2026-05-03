import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function POST(req: Request) {
  const { accessToken } = await req.json();

  if (!accessToken) {
    return Response.json({ user: null, isPremium: false });
  }

  const { data } = await supabaseAdmin.auth.getUser(accessToken);
  const user = data.user;

  if (!user) {
    return Response.json({ user: null, isPremium: false });
  }

  await supabaseAdmin.from("profiles").upsert({
    id: user.id,
    email: user.email,
  });

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("is_premium")
    .eq("id", user.id)
    .single();

  return Response.json({
    user: { id: user.id, email: user.email },
    isPremium: !!profile?.is_premium,
  });
}
