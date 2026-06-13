import { NextResponse } from "next/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function GET(req: Request) {
try {

const url = new URL(req.url);
const email = url.searchParams.get("email");

if (!email) {
return NextResponse.redirect(
new URL("/account", req.url)
);
}

const customers = await stripe.customers.list({
email,
limit:1
});

if (!customers.data.length) {
return NextResponse.redirect(
new URL("/account", req.url)
);
}

const session =
await stripe.billingPortal.sessions.create({
customer: customers.data[0].id,
return_url:
process.env.NEXT_PUBLIC_SITE_URL ||
"https://sora-clean-production.vercel.app"
});

return NextResponse.redirect(session.url);

} catch {

return NextResponse.redirect(
new URL("/account", req.url)
);

}
}
