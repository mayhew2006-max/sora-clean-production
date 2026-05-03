export default function Pay() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center px-6">
        <h1 className="text-4xl font-bold mb-4">Unlock Sora Pro</h1>
        <p className="text-zinc-400 mb-8">
          Unlimited conversations with Sora.
        </p>

        <a
          href="https://buy.stripe.com/14A3cw1AZfbD2bM6Pc1gs00"
          className="px-8 py-4 bg-white text-black rounded-xl font-semibold"
        >
          Subscribe Now
        </a>
      </div>
    </main>
  );
}
