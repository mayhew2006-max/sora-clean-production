import Stripe from "stripe";

export async function POST() {
  const secret = process.env.STRIPE_SECRET_KEY;
  const price = process.env.STRIPE_PRICE_ID;
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://sora-app-taupe.vercel.app";

  if (!secret || !price) {
    return Response.json(
      { error: "Missing Stripe env vars" },
      { status: 500 }
    );
  }

  const stripe = new Stripe(secret);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price, quantity: 1 }],
    success_url: `${site}/success`,
    cancel_url: `${site}/pay`,
  });

  return Response.json({ url: session.url });
}
