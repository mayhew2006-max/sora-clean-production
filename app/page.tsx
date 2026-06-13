export default function GraceLandingPage() {
  return (
    
<div className="mx-auto mb-8 max-w-3xl rounded-3xl border border-white/10 bg-white/5 p-6 text-center">

<h2 className="text-4xl font-black mb-3">
Try Grace Free
</h2>

<p className="text-lg text-white/80">
Get <strong>50 free messages</strong> before upgrading.
</p>

<p className="mt-3 text-white/60">
Grace Premium is <strong>$4.99/month</strong>
</p>

<p className="text-green-300 font-semibold">
Cancel anytime from My Account.
</p>

<p className="mt-2 text-white/40 text-sm">
No hidden fees • No contracts • Come and go whenever you want
</p>

</div>

<main className="min-h-screen bg-black text-white overflow-hidden relative">

<a
href="/account"
className="fixed top-4 right-4 z-50 rounded-full border border-white/15 bg-black/70 px-4 py-2 text-sm font-bold text-white"
>

My Account

</a>

      <section className="relative z-10 flex flex-col items-center justify-center px-6 pt-12 pb-20 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-fuchsia-500/30 blur-3xl rounded-full scale-125" />
          <img
            src="/grace-avatar.png"
            alt="Grace"
            className="relative w-[320px] max-w-[82vw] rounded-[2.5rem] border border-white/10 shadow-[0_0_80px_rgba(217,70,239,0.45)] object-cover"
          />
        </div>

        <h1 className="mt-10 text-5xl md:text-7xl font-black tracking-tight leading-none">
          Meet Grace.
        </h1>

        <p className="mt-5 text-xl md:text-2xl text-white/75 leading-relaxed">
          More than a search engine. More than a chatbot.
        </p>

        <p className="mt-6 text-base md:text-lg text-white/55 max-w-2xl mx-auto leading-relaxed">
          Ask questions. Brainstorm ideas. Talk through problems. Laugh. Vent.
          Think out loud. Grace turns simple answers into real conversations.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
          <a
            href="/chat"
            className="px-8 py-4 rounded-2xl bg-fuchsia-500 hover:bg-fuchsia-400 transition-all duration-300 text-lg font-bold shadow-[0_0_40px_rgba(217,70,239,0.45)]"
          >
            Meet Grace
          </a>

          <a
            href="/chat?founder"
            className="px-8 py-4 rounded-2xl border border-white/15 bg-white/5 hover:bg-white/10 transition-all duration-300 text-lg font-semibold"
          >
            Talk Unfiltered
          </a>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-5 max-w-6xl w-full">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
            <img
              src="/grace-avatar.png"
              alt="Friendly Grace"
              className="w-full h-72 object-cover rounded-2xl mb-5"
            />
            <h2 className="text-2xl font-bold">🤍 Friendly Grace</h2>
            <p className="mt-3 text-white/65 leading-relaxed">
              Warm, helpful, and easy to talk to. Ask questions, bounce ideas
              around, learn something new, or just have someone to talk with.
            </p>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-left">
            <img
              src="/grace-avatar.png"
              alt="Creative Grace"
              className="w-full h-72 object-cover rounded-2xl mb-5"
            />
            <h2 className="text-2xl font-bold">💡 Creative Grace</h2>
            <p className="mt-3 text-white/65 leading-relaxed">
              For brainstorming, projects, content ideas, business thoughts,
              stories, plans, and helping you think through whatever is on your mind.
            </p>
          </div>

          <div className="rounded-3xl border border-fuchsia-500/30 bg-fuchsia-500/10 p-5 text-left relative overflow-hidden">
            <div className="relative">
              <img
                src="/grace-unfiltered.png"
                alt="Unfiltered Grace"
                className="w-full h-72 object-cover rounded-2xl mb-5 blur-sm scale-105"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="px-5 py-2 rounded-full bg-black/70 border border-white/15 text-sm font-bold">
                  LOCKED
                </span>
              </div>
            </div>
            <h2 className="text-2xl font-bold">🔥 Unfiltered Grace</h2>
            <p className="mt-3 text-white/65 leading-relaxed">
              The bold side of Grace. More playful, more direct, more curious,
              and waiting to be discovered when you're ready.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap justify-center gap-3 max-w-3xl">
          {[
            "Ask better questions",
            "Brainstorm ideas",
            "Talk through problems",
            "Go deeper than Google",
            "Real conversations",
            "Different sides of Grace",
          ].map((item) => (
            <div
              key={item}
              className="px-5 py-3 rounded-full border border-white/10 bg-white/5 text-white/75 text-sm md:text-base backdrop-blur-sm"
            >
              {item}
            </div>
          ))}
        </div>
      

<p className="mt-5 text-sm text-white/45 text-center">

$4.99/month • Cancel anytime inside Grace

</p>

</section>


      <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black to-transparent" />
    </main>
  );
}
