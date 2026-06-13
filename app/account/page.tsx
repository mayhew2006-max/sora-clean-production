"use client";

export default function AccountPage() {
return (
<main className="min-h-screen bg-black text-white flex items-center justify-center px-6">

<div className="max-w-md w-full rounded-3xl border border-white/10 bg-zinc-950 p-8 text-center">

<h1 className="text-4xl font-black mb-4">
Grace Account
</h1>

<p className="text-white/60 mb-8">
Manage your subscription safely.
Cancel anytime.
</p>

<a
href="https://billing.stripe.com/p/login/14A3cw1AZfbD2bM6Pc1gs00"
target="_blank"
className="block w-full bg-white text-black rounded-2xl py-4 font-bold"
>

Manage Subscription

</a>

<p className="mt-5 text-xs text-white/40">
No refunds • No admin access • Secure Stripe billing
</p>

<a
href="/"
className="block mt-6 text-white/50"
>

Back to Grace

</a>

</div>

</main>
);
}
