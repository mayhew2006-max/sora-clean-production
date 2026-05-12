export default function GraceWebsite() {
  return (
    <div className="min-h-screen bg-black text-white font-sans">
      {/* HERO */}
      <section className="flex flex-col items-center justify-center text-center px-6 py-24 bg-gradient-to-b from-black to-zinc-900">
        <div className="w-24 h-24 rounded-full border border-zinc-700 flex items-center justify-center mb-6 shadow-2xl">
          <div className="text-4xl">💓</div>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">
          Grace
        </h1>

        <p className="text-xl md:text-2xl text-zinc-300 max-w-2xl leading-relaxed mb-8">
          Technology that feels more human.
        </p>

        <p className="max-w-3xl text-zinc-400 text-lg leading-relaxed mb-10">
          Grace is a voice conversation app with memory, personality, and natural interaction.
          Talk naturally. Think out loud. Get help with everyday life.
        </p>

        <div className="flex flex-col sm:flex-row gap-4">
          <a
            href="/chat"
            className="px-8 py-4 rounded-2xl bg-white text-black font-semibold hover:scale-105 transition"
          >
            Talk to Grace
          </a>

          <a
            href="#features"
            className="px-8 py-4 rounded-2xl border border-zinc-700 hover:bg-zinc-900 transition"
          >
            Learn More
          </a>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="text-3xl mb-4">🎙️</div>

            <h3 className="text-2xl font-semibold mb-3">
              Natural Voice
            </h3>

            <p className="text-zinc-400 leading-relaxed">
              Grace talks naturally with real-time voice conversations that feel smooth and human.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="text-3xl mb-4">🧠</div>

            <h3 className="text-2xl font-semibold mb-3">
              Memory
            </h3>

            <p className="text-zinc-400 leading-relaxed">
              Grace remembers conversations and details over time, making every interaction feel personal.
            </p>
          </div>

          <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-xl">
            <div className="text-3xl mb-4">💬</div>

            <h3 className="text-2xl font-semibold mb-3">
              Conversation
            </h3>

            <p className="text-zinc-400 leading-relaxed">
              Talk through ideas, daily life, goals, recipes, stress, or just clear your thoughts.
            </p>
          </div>

        </div>
      </section>

      {/* EXPERIENCE */}
      <section className="px-6 py-24 bg-zinc-950 border-t border-zinc-900 border-b">
        <div className="max-w-4xl mx-auto text-center">

          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            More than a chatbot.
          </h2>

          <p className="text-zinc-300 text-xl leading-relaxed mb-6">
            Grace is designed to feel calm, useful, and natural.
          </p>

          <p className="text-zinc-500 text-lg leading-relaxed">
            Whether you’re driving, cooking, planning your day, thinking through ideas,
            or just talking things out late at night — Grace is always ready to listen.
          </p>

        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-24 text-center">

        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Talk to Grace Today
        </h2>

        <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
          Experience a more human way to interact with technology.
        </p>

        <a
          href="/chat"
          className="inline-block px-10 py-5 rounded-2xl bg-white text-black font-semibold text-lg hover:scale-105 transition"
        >
          Launch Grace
        </a>

      </section>

      {/* FOOTER */}
      <footer className="border-t border-zinc-900 px-6 py-10 text-center text-zinc-600 text-sm">
        Grace © 2026 • Technology that feels more human.
      </footer>
    </div>
  );
}
