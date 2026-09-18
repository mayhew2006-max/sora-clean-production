"use client";

import { useState } from "react";

const encounters = [
  {
    customer: "Tony",
    mood: "Recently homeless. Again.",
    problem:
      "Grace, my wife kicked me out again. She says I spend too much time here.",
    grace:
      "Jesus Christ, Tony. At this point you should just have your mail forwarded to stool number three.",
  },
  {
    customer: "Mikey",
    mood: "About to make another terrible financial decision.",
    problem:
      "Some guy outside says he'll sell me his truck for $2,000 cash tonight.",
    grace:
      "Two grand cash tonight? Oh yeah, nothing suspicious about that shit whatsoever.",
  },
  {
    customer: "Deb",
    mood: "One text away from disaster.",
    problem:
      "My ex just texted me asking if I'm awake.",
    grace:
      "Nope. Put the goddamn phone down, Deb. We've already got enough bad decisions in this building.",
  },
];

export default function LastCallPage() {
  const [encounterIndex, setEncounterIndex] = useState(0);
  const [cash, setCash] = useState(482);
  const [reputation, setReputation] = useState(42);
  const [actions, setActions] = useState(50);

  const [playerInput, setPlayerInput] = useState("");
  const [playerLine, setPlayerLine] = useState("");

  const [graceReply, setGraceReply] = useState(
    encounters[0].grace
  );

  const [customerMood, setCustomerMood] = useState(
    encounters[0].mood
  );

  const [gameMessage, setGameMessage] = useState(
    "Doors are open. Let's see what kinda bullshit walks in tonight."
  );

  const [thinking, setThinking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const encounter = encounters[encounterIndex];

  async function speakGrace(text: string) {
    if (!voiceOn || !text.trim()) return;

    try {
      const res = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) return;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audio.onended = () => {
        URL.revokeObjectURL(url);
      };

      await audio.play();
    } catch {
      console.log("Last Call voice playback failed");
    }
  }

  function useAction() {
    if (actions <= 0) {
      const reply =
        "That's it, boss. You're outta Grace actions for tonight.";

      setGraceReply(reply);
      speakGrace(reply);
      return false;
    }

    setActions((v) => v - 1);
    return true;
  }

  function quickAction(
    type: "roast" | "drink" | "advice" | "listen"
  ) {
    if (!useAction()) return;

    setPlayerLine("");

    let reply = "";
    let result = "";

    if (type === "roast") {
      reply =
        `Jesus Christ, ${encounter.customer}, I've seen smarter decisions written on bathroom walls.`;
      setReputation((v) => v + 2);
      result = "Reputation +2";
    }

    if (type === "drink") {
      reply =
        "Now you're thinkin'. Problems don't disappear, but eight bucks is eight bucks.";
      setCash((v) => v + 8);
      result = "Cash +$8";
    }

    if (type === "advice") {
      reply =
        `Alright ${encounter.customer}, here's a wild idea: maybe don't make the exact same dumbass decision again.`;
      setReputation((v) => v + 1);
      result = "Reputation +1";
    }

    if (type === "listen") {
      reply =
        "Fine. Keep talkin'. I already regret agreeing to this.";
      result = "Grace hears them out.";
    }

    setGraceReply(reply);
    setGameMessage(result);
    speakGrace(reply);
  }

  async function talkToGrace() {
    const line = playerInput.trim();

    if (!line || thinking) return;
    if (!useAction()) return;

    setPlayerLine(line);
    setPlayerInput("");
    setThinking(true);
    setGraceReply("Hold on, I'm thinkin'...");

    try {
      const res = await fetch("/api/last-call", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          playerText: line,
          customer: encounter.customer,
          problem: encounter.problem,
          mood: customerMood,
          previousGraceReply: graceReply,
          cash,
          reputation,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Grace hit a glitch."
        );
      }

      const reply =
        String(data?.reply || "").trim() ||
        "Jesus Christ, my brain just took the night off.";

      const cashDelta = Number(data?.cashDelta) || 0;
      const repDelta = Number(data?.repDelta) || 0;

      setGraceReply(reply);

      if (data?.mood) {
        setCustomerMood(String(data.mood));
      }

      if (cashDelta !== 0) {
        setCash((v) => Math.max(0, v + cashDelta));
      }

      if (repDelta !== 0) {
        setReputation((v) =>
          Math.max(0, v + repDelta)
        );
      }

      const effects = [];

      if (cashDelta > 0) {
        effects.push(`Cash +$${cashDelta}`);
      }

      if (cashDelta < 0) {
        effects.push(`Cash -$${Math.abs(cashDelta)}`);
      }

      if (repDelta > 0) {
        effects.push(`Reputation +${repDelta}`);
      }

      if (repDelta < 0) {
        effects.push(
          `Reputation -${Math.abs(repDelta)}`
        );
      }

      setGameMessage(
        effects.length
          ? effects.join(" • ")
          : "The conversation continues."
      );

      speakGrace(reply);
    } catch (error: any) {
      const reply =
        "Ah, fuck. Something glitched. Say that again.";

      setGraceReply(reply);
      setGameMessage(
        error?.message || "Grace hit a glitch."
      );
    } finally {
      setThinking(false);
    }
  }

  function nextCustomer() {
    const next =
      (encounterIndex + 1) % encounters.length;

    setEncounterIndex(next);
    setCustomerMood(encounters[next].mood);
    setGraceReply(encounters[next].grace);
    setPlayerLine("");
    setPlayerInput("");
    setGameMessage(
      "The door opens. Here comes another goddamn problem."
    );
  }

  return (
    <main
      className="bg-[#070910] text-white"
      style={{
        height: "100dvh",
        overflowY: "scroll",
        overflowX: "hidden",
      }}
    >
      <div className="mx-auto w-full max-w-md min-h-full bg-[#0b0d15]">

        {/* HEADER */}
        <header className="px-5 pt-6 pb-4">
          <div className="flex items-start justify-between">

            <div>
              <div className="text-[10px] uppercase tracking-[0.4em] text-[#9296a2]">
                Volume One
              </div>

              <h1 className="mt-1 text-4xl font-black italic leading-none">
                LAST CALL
              </h1>

              <div className="mt-1 text-xl font-black text-[#df5c62]">
                with Grace
              </div>
            </div>

            <div className="space-y-2 text-right font-black">
              <div>💵 ${cash}</div>
              <div>👑 REP {reputation}</div>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between rounded-xl border border-white/10 px-3 py-3">
            <span className="text-xs font-black tracking-wider">
              SATURDAY • 9:17 PM
            </span>

            <span className="rounded-full border border-green-800 px-3 py-1 text-xs font-black">
              🍺 BAR OPEN
            </span>
          </div>
        </header>

        {/* BAR SCENE */}
        <section className="relative overflow-hidden border-y border-white/10">

          <img
            src="/last-call-bar.png"
            alt="Grace behind the bar"
            className="h-[330px] w-full object-cover object-center"
          />

          <div className="absolute left-3 top-3 rounded-xl bg-black/75 px-3 py-2 text-[10px] font-bold uppercase tracking-wider">
            Boston, MA
            <br />
            Same people.
            <br />
            Different problems.
          </div>

          <div className="absolute right-3 top-3 rounded-xl bg-black/75 px-3 py-2 text-[10px] font-bold uppercase tracking-wider">
            Bad decisions
            <br />
            welcome here.
          </div>
        </section>

        {/* GRACE */}
        <section className="border-b border-white/10 bg-[#171018] px-5 py-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-[0.25em] text-[#e66b6f]">
              Grace
            </span>

            <button
              onClick={() =>
                setVoiceOn((v) => !v)
              }
              className="rounded-full border border-white/10 px-3 py-1 text-xs"
            >
              {voiceOn
                ? "🔊 Sage On"
                : "🔇 Sage Off"}
            </button>
          </div>

          <p className="mt-2 text-[17px] font-semibold leading-7">
            “{graceReply}”
          </p>
        </section>

        {/* CUSTOMER */}
        <section className="px-5 pt-5">
          <div className="rounded-3xl border border-white/10 bg-[#13151d] p-4">

            <div className="flex items-start justify-between">
              <div>
                <div className="font-black uppercase tracking-wider">
                  {encounter.customer}
                </div>

                <div className="mt-1 text-xs text-[#a6a8b0]">
                  {customerMood}
                </div>
              </div>

              <button
                onClick={nextCustomer}
                className="rounded-full border border-white/10 px-3 py-2 text-xs font-black"
              >
                NEXT →
              </button>
            </div>

            <p className="mt-4 text-lg font-semibold leading-7">
              “{encounter.problem}”
            </p>
          </div>

          {playerLine && (
            <div className="mt-3 rounded-2xl border border-[#39567a] bg-[#101b29] p-4">
              <div className="text-[10px] font-black uppercase tracking-widest text-[#83b1e3]">
                You
              </div>

              <div className="mt-1">
                “{playerLine}”
              </div>
            </div>
          )}
        </section>

        {/* QUICK ACTIONS */}
        <section className="grid grid-cols-2 gap-3 px-5 pt-4">

          <button
            disabled={thinking}
            onClick={() =>
              quickAction("roast")
            }
            className="rounded-2xl border border-[#96484b] bg-[#4b2226] py-4 font-black"
          >
            🥊
            <br />
            BUST THEIR BALLS
          </button>

          <button
            disabled={thinking}
            onClick={() =>
              quickAction("drink")
            }
            className="rounded-2xl border border-[#477a58] bg-[#203e2a] py-4 font-black"
          >
            🍺
            <br />
            POUR A DRINK
          </button>

          <button
            disabled={thinking}
            onClick={() =>
              quickAction("advice")
            }
            className="rounded-2xl border border-[#664b85] bg-[#302342] py-4 font-black"
          >
            💬
            <br />
            GIVE ADVICE
          </button>

          <button
            disabled={thinking}
            onClick={() =>
              quickAction("listen")
            }
            className="rounded-2xl border border-[#8c683e] bg-[#44331d] py-4 font-black"
          >
            👂
            <br />
            HEAR THEM OUT
          </button>

        </section>

        {/* REAL FREE TEXT */}
        <section className="px-5 pt-4">
          <div className="rounded-3xl border border-white/10 bg-[#11131b] p-4">

            <div className="text-xs font-black uppercase tracking-wider text-[#aaaeb8]">
              Tell Grace what you wanna do
            </div>

            <div className="mt-3 flex gap-2">

              <input
                value={playerInput}
                disabled={thinking}
                onChange={(e) =>
                  setPlayerInput(e.target.value)
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    talkToGrace();
                  }
                }}
                placeholder="Say anything..."
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-[#1a1d27] px-4 py-3 outline-none"
              />

              <button
                disabled={thinking}
                onClick={talkToGrace}
                className="rounded-xl bg-[#df615f] px-4 font-black disabled:opacity-50"
              >
                {thinking ? "..." : "SAY IT"}
              </button>

            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
            {gameMessage}
          </div>
        </section>

        {/* ACTION COUNTER */}
        <section className="px-5 py-8">
          <div className="mx-auto flex h-24 w-24 flex-col items-center justify-center rounded-full border-4 border-[#efcfad] bg-[#0a0c13]">
            <span className="text-4xl font-black">
              {actions}
            </span>

            <span className="text-[9px] font-black uppercase">
              Actions
            </span>
          </div>
        </section>

        {/* BOTTOM NAV - IN THE PAGE FLOW, NOT FIXED */}
        <nav className="grid grid-cols-4 border-t border-white/10 bg-[#080a10] px-3 py-5 text-center text-[10px] font-black uppercase">

          <div>
            🍸
            <br />
            Bar
          </div>

          <div>
            👥
            <br />
            Regulars
          </div>

          <div>
            🔧
            <br />
            Upgrade
          </div>

          <div>
            📖
            <br />
            Journal
          </div>

        </nav>

      </div>
    </main>
  );
}
