import Stripe from "stripe";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
  const { accessToken } = await req.json();

  const { data } = await supabaseAdmin.auth.getUser(accessToken);
  const user = data.user;

  if (!user) {
    return Response.json({ error: "Please log in first." }, { status: 401 });
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: user.email || undefined,
    client_reference_id: user.id,
    metadata: {
      user_id: user.id,
      email: user.email || "",
    },
    line_items: [
      {
        price: process.env.STRIPE_PRICE_ID!,
        quantity: 1,
      },
    ],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/pay`,
  });

  return Response.json({ url: session.url });
}
