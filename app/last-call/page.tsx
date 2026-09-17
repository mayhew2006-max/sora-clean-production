"use client";

import { useState } from "react";

const encounters = [
  {
    customer: "Tony",
    problem:
      "Grace, my wife kicked me out again. She says I spend too much time here.",
    grace:
      "Jesus Christ, Tony. At this point you should just have your mail forwarded to stool number three.",
  },
  {
    customer: "Mikey",
    problem:
      "Some guy outside says he'll sell me his truck for $2,000 cash tonight.",
    grace:
      "Two grand and he needs the money tonight? Oh good, nothing suspicious about that shit at all.",
  },
  {
    customer: "Deb",
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
  const [message, setMessage] = useState(
    "Alright, boss. Doors are open. Let's see what kind of idiots wander in tonight."
  );

  const encounter = encounters[encounterIndex];

  function takeAction(type: string) {
    if (actions <= 0) {
      setMessage("You're outta Grace actions, boss. Bar's still open, but my brain ain't free. 😂");
      return;
    }

    setActions((v) => v - 1);

    if (type === "roast") {
      setReputation((v) => v + 2);
      setMessage(
        `${encounter.customer} looks offended. Grace looks delighted. Reputation +2.`
      );
    }

    if (type === "advice") {
      setReputation((v) => v + 1);
      setMessage(
        `Grace actually gives ${encounter.customer} decent advice. Miracles do happen. Reputation +1.`
      );
    }

    if (type === "drink") {
      setCash((v) => v + 8);
      setMessage(
        `${encounter.customer} buys another round. Cash +$8. Probably not solving the problem, but fuck it.`
      );
    }

    if (type === "listen") {
      setMessage(
        `You let ${encounter.customer} keep talking. Grace stares at you like this was a terrible decision.`
      );
    }
  }

  function nextCustomer() {
    setEncounterIndex((v) => (v + 1) % encounters.length);
    setMessage("Door opens. Here comes another problem.");
  }

  return (
    <main className="min-h-screen bg-[#140d0a] text-[#fff6e8]">
      <div className="max-w-md mx-auto min-h-screen relative overflow-hidden bg-gradient-to-b from-[#2a1710] via-[#160d09] to-black">

        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,#ff9f43,transparent_32%),radial-gradient(circle_at_bottom,#8b1e1e,transparent_35%)]" />

        <div className="relative z-10 px-5 pt-6 pb-10">

          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs tracking-[0.35em] text-[#e9b977] uppercase">
                Volume One
              </p>
              <h1 className="text-4xl font-black italic leading-none">
                LAST CALL
              </h1>
              <p className="text-xl font-bold text-[#e5554f]">
                with Grace
              </p>
            </div>

            <div className="text-right text-sm">
              <div className="font-bold">💵 ${cash}</div>
              <div className="font-bold">👑 Rep {reputation}</div>
            </div>
          </div>

          <div className="mt-6 rounded-3xl border border-[#7b4a2d] bg-black/40 shadow-2xl overflow-hidden">

            <div className="relative h-72 bg-gradient-to-b from-[#55331e] to-[#1d100b] flex items-end justify-center">

              <div className="absolute top-4 left-4 text-xs uppercase tracking-widest text-[#f2c994]">
                Saturday • 9:17 PM
              </div>

              <div className="absolute top-4 right-4 rounded-full bg-black/60 px-3 py-1 text-xs">
                🍺 Bar Open
              </div>

              <img
                src="/grace-avatar.png"
                alt="Grace"
                className="w-44 h-44 rounded-full object-cover border-4 border-[#d38b55] shadow-2xl mb-8"
              />

              <div className="absolute bottom-3 left-0 right-0 text-center text-sm text-[#d7b18c]">
                Grace is behind the bar judging everybody.
              </div>
            </div>

            <div className="p-5">

              <div className="mb-4">
                <p className="text-xs uppercase tracking-widest text-[#d99862]">
                  {encounter.customer}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  “{encounter.problem}”
                </p>
              </div>

              <div className="rounded-2xl bg-[#28150f] border border-[#70432d] p-4">
                <p className="text-xs font-black uppercase text-[#f0a06b]">
                  Grace
                </p>
                <p className="mt-1 leading-relaxed">
                  “{encounter.grace}”
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 mt-5">
                <button
                  onClick={() => takeAction("roast")}
                  className="rounded-2xl bg-[#632420] px-3 py-4 font-black"
                >
                  🥊 Bust Their Balls
                </button>

                <button
                  onClick={() => takeAction("drink")}
                  className="rounded-2xl bg-[#31573c] px-3 py-4 font-black"
                >
                  🍺 Pour a Drink
                </button>

                <button
                  onClick={() => takeAction("advice")}
                  className="rounded-2xl bg-[#49305b] px-3 py-4 font-black"
                >
                  💬 Give Advice
                </button>

                <button
                  onClick={() => takeAction("listen")}
                  className="rounded-2xl bg-[#70521e] px-3 py-4 font-black"
                >
                  👂 Hear Them Out
                </button>
              </div>

              <div className="mt-5 min-h-[76px] rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">
                {message}
              </div>

              <button
                onClick={nextCustomer}
                className="mt-4 w-full rounded-2xl border border-[#d49a62] py-3 font-black"
              >
                NEXT CUSTOMER →
              </button>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between">
            <div className="text-sm text-[#d7b18c]">
              Tonight's Grace Actions
            </div>

            <div className="w-16 h-16 rounded-full border-4 border-[#d39558] bg-black flex flex-col items-center justify-center shadow-lg">
              <span className="text-2xl font-black">{actions}</span>
              <span className="text-[8px] uppercase tracking-wider">
                actions
              </span>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2 mt-6 text-center text-xs text-[#cfae92]">
            <div>📍<br />Bar</div>
            <div>👥<br />Regulars</div>
            <div>🔧<br />Upgrades</div>
            <div>📖<br />Journal</div>
          </div>

        </div>
      </div>
    </main>
  );
}
