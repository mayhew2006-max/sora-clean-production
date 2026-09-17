"use client";

import { useState } from "react";

const encounters = [
  {
    customer: "Tony",
    initials: "T",
    mood: "Recently homeless. Again.",
    problem:
      "Grace, my wife kicked me out again. She says I spend too much time here.",
    grace:
      "Jesus Christ, Tony. At this point you should just have your mail forwarded to stool number three.",
  },
  {
    customer: "Mikey",
    initials: "M",
    mood: "Definitely about to buy something stupid.",
    problem:
      "Some guy outside says he'll sell me his truck for $2,000 cash tonight.",
    grace:
      "Two grand and he needs the money tonight? Oh good. Nothing suspicious about that shit at all.",
  },
  {
    customer: "Deb",
    initials: "D",
    mood: "One text away from another disaster.",
    problem:
      "My ex just texted me at midnight asking if I'm awake.",
    grace:
      "Nope. Absolutely the fuck not. Put the phone down before we add another disaster to tonight's tab.",
  },
];

export default function LastCallPage() {
  const [encounterIndex, setEncounterIndex] = useState(0);
  const [cash, setCash] = useState(482);
  const [reputation, setReputation] = useState(42);
  const [actions, setActions] = useState(50);

  const [gameMessage, setGameMessage] = useState(
    "Doors are open. Try not to burn the place down."
  );

  const [playerInput, setPlayerInput] = useState("");
  const [playerLine, setPlayerLine] = useState("");

  const encounter = encounters[encounterIndex];

  function spendAction() {
    if (actions <= 0) {
      setGameMessage(
        "You're outta Grace actions, boss. Apparently even my sparkling personality has operating costs. 😂"
      );
      return false;
    }

    setActions((value) => value - 1);
    return true;
  }

  function takeAction(type: string) {
    if (!spendAction()) return;

    setPlayerLine("");

    if (type === "roast") {
      setReputation((value) => value + 2);
      setGameMessage(
        `${encounter.customer} looks offended. Grace looks absolutely delighted. Reputation +2.`
      );
    }

    if (type === "drink") {
      setCash((value) => value + 8);
      setGameMessage(
        `${encounter.customer} buys another round. Cash +$8. Problem solved? No. Profitable? Absolutely.`
      );
    }

    if (type === "advice") {
      setReputation((value) => value + 1);
      setGameMessage(
        `Against all odds, Grace gives ${encounter.customer} responsible advice. Reputation +1.`
      );
    }

    if (type === "listen") {
      setGameMessage(
        `You let ${encounter.customer} keep talking. Grace gives you the exact look of a woman questioning your leadership.`
      );
    }
  }

  function talkToGrace() {
    const line = playerInput.trim();
    if (!line) return;
    if (!spendAction()) return;

    setPlayerLine(line);
    setPlayerInput("");

    const lower = line.toLowerCase();

    if (lower.includes("throw") || lower.includes("kick him out")) {
      setGameMessage(
        `Grace: "Jesus Christ. I was gonna charge ${encounter.customer} double, but apparently we're doing felonies tonight."`
      );
      return;
    }

    if (
      lower.includes("drink") ||
      lower.includes("beer") ||
      lower.includes("shot")
    ) {
      setCash((value) => value + 8);
      setGameMessage(
        `Grace: "Now you're thinkin'. Bad decisions pay the electric bill." Cash +$8.`
      );
      return;
    }

    if (
      lower.includes("help") ||
      lower.includes("advice") ||
      lower.includes("talk")
    ) {
      setReputation((value) => value + 1);
      setGameMessage(
        `Grace: "Look at you bein' emotionally responsible and shit. I'm almost proud." Reputation +1.`
      );
      return;
    }

    setGameMessage(
      `Grace: "Alright, boss. '${line}' is apparently the plan. This oughta be a fuckin' adventure."`
    );
  }

  function nextCustomer() {
    setEncounterIndex((value) => (value + 1) % encounters.length);
    setPlayerLine("");
    setGameMessage("The door opens. Here comes another goddamn problem.");
  }

  return (
    <main className="min-h-[100dvh] bg-[#090706] text-[#fff7ed] overflow-x-hidden">
      <div className="relative mx-auto min-h-[100dvh] max-w-md overflow-hidden bg-[#170d09] shadow-2xl">

        {/* BAR ATMOSPHERE */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_15%,rgba(215,123,58,0.26),transparent_32%),radial-gradient(circle_at_10%_45%,rgba(146,38,33,0.24),transparent_32%),linear-gradient(to_bottom,#25140d_0%,#120a07_62%,#050303_100%)]" />

        <div className="absolute left-0 right-0 top-28 h-px bg-[#75452b]/60" />
        <div className="absolute left-0 right-0 top-44 h-px bg-[#75452b]/40" />

        {/* BAR SHELVES */}
        <div className="absolute left-5 right-5 top-32 opacity-70">
          <div className="h-[2px] bg-[#8a5738]" />

          <div className="flex h-16 items-end justify-around px-3">
            <div className="h-11 w-4 rounded-t-md bg-[#5f3f28] border border-[#b27c53]/40" />
            <div className="h-14 w-5 rounded-t-md bg-[#3b241a] border border-[#b27c53]/40" />
            <div className="h-9 w-5 rounded-t-md bg-[#78422b] border border-[#b27c53]/40" />
            <div className="h-16 w-4 rounded-t-md bg-[#45291d] border border-[#b27c53]/40" />
            <div className="h-12 w-6 rounded-t-md bg-[#6d4931] border border-[#b27c53]/40" />
            <div className="h-10 w-4 rounded-t-md bg-[#392219] border border-[#b27c53]/40" />
            <div className="h-15 w-5 rounded-t-md bg-[#744a30] border border-[#b27c53]/40" />
          </div>

          <div className="h-[3px] bg-gradient-to-r from-[#4a2819] via-[#a2643c] to-[#4a2819] shadow-lg" />
        </div>

        <div className="relative z-10 px-4 pb-44 pt-5">

          {/* HEADER */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-[#c89a73]">
                Volume One
              </p>

              <h1 className="text-4xl font-black italic leading-none tracking-tight">
                LAST CALL
              </h1>

              <div className="text-xl font-black text-[#e05d55]">
                with Grace
              </div>
            </div>

            <div className="space-y-1 text-right text-sm font-black">
              <div className="rounded-full bg-black/55 px-3 py-1">
                💵 ${cash}
              </div>

              <div className="rounded-full bg-black/55 px-3 py-1">
                👑 REP {reputation}
              </div>
            </div>
          </div>

          {/* NIGHT STATUS */}
          <div className="mt-5 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-[#d8b495]">
            <span>Saturday • 9:17 PM</span>

            <span className="rounded-full border border-[#866046] bg-black/45 px-3 py-1">
              🍺 Bar Open
            </span>
          </div>

          {/* GRACE BAR SCENE */}
          <div className="relative mt-4 overflow-hidden rounded-[28px] border border-[#835234] bg-black/35 shadow-2xl">

            <div className="relative h-[395px] overflow-hidden">

              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(239,157,90,0.22),transparent_38%),linear-gradient(to_bottom,rgba(64,33,20,0.25),rgba(10,5,4,0.94))]" />

              <div className="absolute left-4 top-5 rounded-xl border border-[#845331]/60 bg-black/45 px-3 py-2 text-[10px] uppercase tracking-widest text-[#d0aa8e]">
                Boston, MA
                <br />
                Same People.
                <br />
                Different Problems.
              </div>

              <div className="absolute right-4 top-6 rotate-2 rounded-lg border border-[#68452f] bg-[#21120c]/90 px-3 py-2 text-center text-[10px] font-bold uppercase tracking-wider text-[#d9b08d]">
                Bad Decisions
                <br />
                Welcome Here
              </div>

              {/* GRACE BEHIND THE BAR */}
              <div className="absolute bottom-8 left-1/2 w-[285px] -translate-x-1/2">
                <div className="relative overflow-hidden rounded-t-[145px] bg-[#24130d] shadow-[0_0_70px_rgba(220,132,71,0.25)]">
                  <div className="absolute inset-0 z-10 bg-gradient-to-b from-transparent via-transparent to-[#24130d]/80 pointer-events-none" />

                  <img
                    src="/grace-avatar.png"
                    alt="Grace"
                    className="h-[285px] w-full object-cover object-top scale-[1.03]"
                  />
                </div>
              </div>

              {/* BAR COUNTER */}
              <div className="absolute bottom-0 left-0 right-0 z-20 h-20 border-t-4 border-[#a06a43] bg-gradient-to-b from-[#5b351f] via-[#3d2115] to-[#1b0d08] shadow-[0_-18px_35px_rgba(0,0,0,0.72)]">
                <div className="absolute inset-x-0 top-2 h-[3px] bg-[#bc7a4c]/50" />

                <div className="absolute left-6 top-4 h-8 w-8 rounded-full border border-white/10 bg-[#d39a5c]/20" />
                <div className="absolute right-7 top-5 h-9 w-7 rounded-b-lg border border-white/10 bg-[#d39a5c]/15" />

                <div className="absolute bottom-2 left-0 right-0 text-center text-[10px] font-black uppercase tracking-[0.35em] text-[#cf9e79]">
                  Grace's Bar
                </div>
              </div>
            </div>

            {/* GRACE DIALOG */}
            <div className="border-t border-[#75472e] bg-[#170d09]/95 p-4">
              <div className="text-[10px] font-black uppercase tracking-[0.25em] text-[#e28c61]">
                Grace
              </div>

              <div className="mt-1 text-[17px] font-semibold leading-relaxed">
                “{encounter.grace}”
              </div>
            </div>
          </div>

          {/* CUSTOMER */}
          <div className="mt-4 rounded-3xl border border-[#744a31] bg-gradient-to-b from-[#24140e] to-black/70 p-4 shadow-xl">
            <div className="flex items-center gap-3">

              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-[#c18a61] bg-[#3b251a] text-xl font-black">
                {encounter.initials}
              </div>

              <div>
                <div className="font-black uppercase tracking-wider">
                  {encounter.customer}
                </div>

                <div className="text-xs text-[#bfa28e]">
                  {encounter.mood}
                </div>
              </div>
            </div>

            <div className="mt-3 text-lg font-semibold leading-relaxed">
              “{encounter.problem}”
            </div>
          </div>

          {/* PLAYER LINE */}
          {playerLine && (
            <div className="mt-3 rounded-2xl border border-[#52749b]/50 bg-[#172637] p-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#92b8dc]">
                You
              </div>

              <div className="mt-1">
                “{playerLine}”
              </div>
            </div>
          )}

          {/* CHOICES */}
          <div className="mt-4 grid grid-cols-2 gap-3">
            <button
              onClick={() => takeAction("roast")}
              className="min-h-[78px] rounded-2xl border border-[#a7483f] bg-gradient-to-b from-[#6f2d28] to-[#3b1715] px-3 font-black shadow-lg active:scale-[0.98]"
            >
              🥊
              <br />
              Bust Their Balls
            </button>

            <button
              onClick={() => takeAction("drink")}
              className="min-h-[78px] rounded-2xl border border-[#5c8e63] bg-gradient-to-b from-[#375d3d] to-[#1d3321] px-3 font-black shadow-lg active:scale-[0.98]"
            >
              🍺
              <br />
              Pour a Drink
            </button>

            <button
              onClick={() => takeAction("advice")}
              className="min-h-[78px] rounded-2xl border border-[#79528e] bg-gradient-to-b from-[#50365f] to-[#2a1b33] px-3 font-black shadow-lg active:scale-[0.98]"
            >
              💬
              <br />
              Give Advice
            </button>

            <button
              onClick={() => takeAction("listen")}
              className="min-h-[78px] rounded-2xl border border-[#9e7945] bg-gradient-to-b from-[#674c28] to-[#362714] px-3 font-black shadow-lg active:scale-[0.98]"
            >
              👂
              <br />
              Hear Them Out
            </button>
          </div>

          {/* FREE TEXT */}
          <div className="mt-4 rounded-3xl border border-[#73503a] bg-black/55 p-3">
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#caa78f]">
              Or tell Grace what you wanna do
            </div>

            <div className="flex gap-2">
              <input
                value={playerInput}
                onChange={(event) => setPlayerInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    talkToGrace();
                  }
                }}
                placeholder="Tell Grace anything..."
                className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-[#261711] px-4 py-3 text-sm outline-none placeholder:text-[#907568]"
              />

              <button
                onClick={talkToGrace}
                className="rounded-2xl bg-[#d86b4d] px-4 font-black text-white active:scale-[0.98]"
              >
                SAY IT
              </button>
            </div>
          </div>

          {/* RESULT */}
          <div className="mt-4 min-h-[84px] rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm leading-relaxed text-[#e8d7ca]">
            {gameMessage}
          </div>

          <button
            onClick={nextCustomer}
            className="mt-4 w-full rounded-2xl border border-[#ca8a5c] bg-[#2a1710] py-4 font-black uppercase tracking-widest active:scale-[0.99]"
          >
            Next Customer →
          </button>
        </div>

        {/* FIXED GAME HUD */}
        <div className="fixed bottom-0 left-1/2 z-30 flex w-full max-w-md -translate-x-1/2 items-end justify-between border-t border-[#68452e] bg-[#0d0806]/95 px-4 pb-5 pt-3 backdrop-blur-xl shadow-[0_-15px_40px_rgba(0,0,0,0.75)]">

          <div className="w-12 text-center text-[9px] uppercase text-[#c8a58e]">
            📍
            <br />
            Bar
          </div>

          <div className="w-12 text-center text-[9px] uppercase text-[#c8a58e]">
            👥
            <br />
            Regulars
          </div>

          <div className="-mt-8">
            <div className="flex h-[78px] w-[78px] flex-col items-center justify-center rounded-full border-4 border-[#d08b52] bg-[#17100b] shadow-[0_0_22px_rgba(208,139,82,0.25)]">
              <div className="text-3xl font-black">
                {actions}
              </div>

              <div className="text-[8px] font-black uppercase tracking-wider text-[#d2a985]">
                Actions
              </div>
            </div>
          </div>

          <div className="w-12 text-center text-[9px] uppercase text-[#c8a58e]">
            🔧
            <br />
            Upgrade
          </div>

          <div className="w-12 text-center text-[9px] uppercase text-[#c8a58e]">
            📖
            <br />
            Journal
          </div>
        </div>
      </div>
    </main>
  );
}
