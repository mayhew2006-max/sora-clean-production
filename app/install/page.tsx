"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function InstallGracePage() {
  const [copied, setCopied] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const graceUrl = "https://grace-assistant.vercel.app";

  useEffect(() => {
    setIsAndroid(navigator.userAgent.toLowerCase().includes("android"));
  }, []);

  async function copyGraceLink() {
    try {
      await navigator.clipboard.writeText(graceUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      alert(graceUrl);
    }
  }

  return (
    <main className="min-h-screen bg-[#fff7f1] px-5 py-8 text-[#2f2723]">
      <section className="mx-auto max-w-3xl">
        <Link href="/" className="text-sm font-black text-[#d97757]">
          ← Back to Grace
        </Link>

        <div className="mt-6 rounded-[2rem] border border-[#efb99f] bg-white/90 p-6 shadow-2xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#d97757]">
            Install Grace
          </p>

          <h1 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Put Grace on your phone like a real app.
          </h1>

          <p className="mt-4 text-base font-semibold leading-7 text-[#6f3b2a]">
            Grace works best when opened from your phone browser or home screen.
            TikTok, Facebook, and Instagram browsers can block photo uploads,
            voice, and PDF downloads.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/chat"
              className="rounded-full bg-[#f3a683] px-6 py-4 text-base font-black text-white shadow-xl"
            >
              Open Grace
            </Link>

            <button
              onClick={copyGraceLink}
              className="rounded-full border border-[#efb99f] bg-[#fff7f1] px-6 py-4 text-base font-black text-[#6f3b2a]"
            >
              {copied ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>

        <div className="mt-5 rounded-[2rem] border border-[#efb99f] bg-white/90 p-6 shadow-xl">
          <h2 className="text-2xl font-black">
            {isAndroid ? "Android install steps" : "Install steps"}
          </h2>

          <div className="mt-4 space-y-3">
            {[
              "Open Grace in Chrome.",
              "Tap Chrome’s three-dot menu.",
              "Tap Install app or Add to Home screen.",
              "Open Grace from your phone home screen.",
            ].map((step, index) => (
              <div
                key={step}
                className="flex gap-4 rounded-2xl border border-[#efb99f] bg-[#fff7f1] p-4"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f3a683] font-black text-white">
                  {index + 1}
                </div>
                <p className="font-semibold leading-6 text-[#6f3b2a]">
                  {step}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-5 rounded-2xl bg-[#2f2723] p-4 text-sm font-semibold leading-6 text-white">
            Next phase: Grace will be packaged for Android so users can install
            her from Google Play and open her full-screen without TikTok’s
            browser getting in the way.
          </p>
        </div>
      </section>
    </main>
  );
}
