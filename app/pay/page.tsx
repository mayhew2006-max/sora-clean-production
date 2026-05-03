const STRIPE_LINK = "https://buy.stripe.com/14A3cw1AZfbD2bM6Pc1gs00";

export default function Pay() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="max-w-md text-center bg-zinc-900 border border-white/10 rounded-3xl p-8">
        <h1 className="text-4xl font-bold mb-4">Unlock Sora Pro</h1>
        <p className="text-zinc-400 mb-8">
          Unlimited conversations, voice replies, and hands-free companion mode.
        </p>

        <a
          href={STRIPE_LINK}
          className="block bg-white text-black py-4 rounded-2xl font-semibold"
        >
          Subscribe Now
        </a>

        <a href="/" className="block text-zinc-500 text-sm mt-5">
          Back to Sora
        </a>
      </div>
    </main>
  );
}
