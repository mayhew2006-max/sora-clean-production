export default function GraceWebsite() {
  return (
    <div className="min-h-screen bg-[#080711] text-white font-sans overflow-hidden">
      <section className="relative flex flex-col items-center justify-center text-center px-6 py-24 min-h-screen">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,#5b4bff55,transparent_35%),radial-gradient(circle_at_bottom,#ff8bd155,transparent_35%)]" />
        <div className="absolute inset-0 bg-black/45" />

        <div className="relative z-10 max-w-4xl">
          <div className="mx-auto w-28 h-28 rounded-full bg-gradient-to-br from-cyan-300 via-violet-400 to-pink-300 p-[2px] shadow-[0_0_50px_rgba(168,85,247,0.6)] mb-8">
            <div className="w-full h-full rounded-full bg-[#11101c] flex items-center justify-center text-5xl">
              💓
            </div>
          </div>

          <h1 className="text-6xl md:text-8xl font-bold tracking-tight mb-6">
            Grace
          </h1>

          <p className="text-2xl md:text-3xl text-zinc-100 mb-6">
            Technology that feels more human.
          </p>

          <p className="text-zinc-300 text-lg md:text-xl leading-relaxed max-w-3xl mx-auto mb-10">
            Grace is a voice companion that listens, remembers, and talks naturally.
            Use her to think out loud, get ideas, plan your day, cook dinner, or just have a real conversation.
          </p>

          <div className="bg-white/10 border border-white/15 rounded-3xl p-6 max-w-2xl mx-auto mb-10 backdrop-blur">
            <p className="text-left text-zinc-300 text-sm mb-2">Grace says:</p>
            <p className="text-left text-xl text-white">
              “Hey… I’m here. Want to talk through what’s on your mind?”
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/chat"
              className="px-9 py-4 rounded-2xl bg-white text-black font-bold shadow-xl hover:scale-105 transition"
            >
              Talk to Grace
            </a>

            <a
              href="#features"
              className="px-9 py-4 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 transition"
            >
              See What She Can Do
            </a>
          </div>

          <p className="text-xs text-zinc-400 mt-6">
            Private. Calm. Built to feel human.
          </p>
        </div>
      </section>

      <section id="features" className="px-6 py-24 max-w-6xl mx-auto">
        <h2 className="text-4xl md:text-5xl font-bold text-center mb-14">
          More than another chatbot.
        </h2>

        <div className="grid md:grid-cols-3 gap-6">
          {[
            ["🎙️", "Natural Voice", "Grace talks back with a warmer, more human voice experience."],
            ["🧠", "Memory", "Grace remembers details so conversations feel personal over time."],
            ["💬", "Real Life Help", "Recipes, ideas, goals, overthinking, planning, or just talking things out."],
          ].map(([icon, title, text]) => (
            <div
              key={title}
              className="bg-white/7 border border-white/10 rounded-3xl p-8 shadow-xl hover:bg-white/10 transition"
            >
              <div className="text-4xl mb-5">{icon}</div>
              <h3 className="text-2xl font-semibold mb-3">{title}</h3>
              <p className="text-zinc-400 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-6 py-24 bg-white/[0.03] border-y border-white/10">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8">
            A calmer way to use your phone.
          </h2>
          <p className="text-zinc-300 text-xl leading-relaxed">
            Talk while driving. Talk while cooking. Talk while thinking out loud at 2am.
            Grace is designed to fit into real life — not replace it.
          </p>
        </div>
      </section>

      <section className="px-6 py-24 text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6">
          Start a conversation.
        </h2>
        <p className="text-zinc-400 text-lg max-w-2xl mx-auto mb-10">
          Try Grace free and see how different technology can feel when it listens.
        </p>
        <a
          href="/chat"
          className="inline-block px-10 py-5 rounded-2xl bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 text-black font-bold text-lg hover:scale-105 transition"
        >
          Talk to Grace
        </a>
      </section>

      <footer className="border-t border-white/10 px-6 py-10 text-center text-zinc-500 text-sm">
        Grace © 2026 • Technology that feels more human.
      </footer>
    </div>
  );
}
