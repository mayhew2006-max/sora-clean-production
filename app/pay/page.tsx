const STRIPE_LINK = "https://buy.stripe.com/14A3cw1AZfbD2bM6Pc1gs00";

export default function Pay() {
  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-zinc-900 border border-white/10 rounded-3xl p-8 text-center">
        <h1 className="text-4xl font-bold mb-4">Unlock Sora Pro</h1>
        <p className="text-zinc-400 mb-8">Keep talking with Sora without limits.</p>
        <a href={STRIPE_LINK} className="block w-full bg-white text-black py-4 rounded-2xl font-semibold">
          Subscribe Now
        </a>
      </div>
    </main>
  );
}
