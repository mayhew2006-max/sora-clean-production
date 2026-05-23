export default function GraceLandingPage() { return ( <main className="min-h-screen bg-black text-white overflow-hidden relative"> {/* Background Glow */} <div className="absolute inset-0 bg-gradient-to-b from-fuchsia-900/20 via-black to-black" />

{/* Hero Section */}
  <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-24 text-center">
    <div className="relative">
      <div className="absolute inset-0 bg-fuchsia-500/30 blur-3xl rounded-full scale-125" />

      <img
        src="/grace-avatar.png"
        alt="Grace"
        className="relative w-[320px] max-w-[82vw] rounded-[2.5rem] border border-white/10 shadow-[0_0_80px_rgba(217,70,239,0.45)] object-cover"
      />
    </div>

    <div className="mt-10 max-w-2xl">
      <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-none">
        Talk to Grace.
      </h1>

      <p className="mt-5 text-xl md:text-2xl text-white/75 leading-relaxed">
        Unfiltered. Funny. Flirty. Real.
      </p>

      <p className="mt-6 text-base md:text-lg text-white/55 max-w-xl mx-auto leading-relaxed">
        Not your therapist. Not your assistant.
        <br />
        Just Grace.
      </p>
    </div>

    {/* CTA Buttons */}
    <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
      <a
        href="/chat?founder"
        className="px-8 py-4 rounded-2xl bg-fuchsia-500 hover:bg-fuchsia-400 transition-all duration-300 text-lg font-bold shadow-[0_0_40px_rgba(217,70,239,0.45)]"
      >
        Talk Unfiltered
      </a>

      <a
        href="/chat"
        className="px-8 py-4 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all duration-300 text-lg font-semibold"
      >
        Meet Grace
      </a>
    </div>

    {/* Feature Pills */}
    <div className="mt-14 flex flex-wrap justify-center gap-3 max-w-3xl">
      {[
        "Voice Conversations",
        "Remembers You",
        "Real Reactions",
        "Unfiltered Mode",
        "Late Night Talks",
        "No Fake Corporate Vibes",
      ].map((item) => (
        <div
          key={item}
          className="px-5 py-3 rounded-full border border-white/10 bg-white/5 text-white/75 text-sm md:text-base backdrop-blur-sm"
        >
          {item}
        </div>
      ))}
    </div>
  </section>

  {/* Bottom Gradient */}
  <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
</main>

); }
