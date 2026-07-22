"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export default function HomePage() {
  const [copied, setCopied] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const graceUrl = "https://grace-assistant.vercel.app";

  useEffect(() => {
    const ua = navigator.userAgent.toLowerCase();
    setInAppBrowser(
      ua.includes("tiktok") ||
        ua.includes("musical_ly") ||
        ua.includes("bytedance") ||
        ua.includes("instagram") ||
        ua.includes("fbav") ||
        ua.includes("fban") ||
        ua.includes("fb_iab") ||
        ua.includes("messenger")
    );
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
    <main className="min-h-screen bg-[#fff7f1] text-[#2f2723] overflow-hidden">
      <section className="relative px-5 py-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.13),transparent_38%)] pointer-events-none" />

        <div className="relative z-10 mx-auto max-w-6xl">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-[#d97757]">
                Grace
              </p>
              <h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
                Your personal command center
              </h1>
            </div>

            <Link
              href="/chat"
              className="rounded-full bg-[#2f2723] px-5 py-3 text-sm font-black text-white shadow-xl"
            >
              Try Grace
            </Link>
          </header>

          {inAppBrowser && (
            <div className="mt-5 rounded-[1.5rem] border border-[#efb99f] bg-white/95 p-4 shadow-xl">
              <p className="text-sm font-black text-[#6f3b2a]">
                Open Grace in your browser for full features
              </p>
              <p className="mt-1 text-sm leading-6 text-[#8b6a5f]">
                TikTok, Facebook, and Instagram browsers can block photo upload,
                voice, and PDF downloads. Copy the link and open it in Chrome or
                your phone browser.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  onClick={copyGraceLink}
                  className="rounded-full bg-[#f3a683] px-4 py-2 text-sm font-black text-white"
                >
                  {copied ? "Copied" : "Copy Grace Link"}
                </button>

                <Link
                  href="/chat"
                  className="rounded-full border border-[#efb99f] bg-white px-4 py-2 text-sm font-black text-[#6f3b2a]"
                >
                  Continue Here
                </Link>
              </div>
            </div>
          )}

          <div className="grid gap-8 py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex rounded-full border border-[#efb99f] bg-white/80 px-4 py-2 text-sm font-black text-[#8b4b34] shadow-sm">
                50 free messages/actions included
              </div>

              <h2 className="mt-6 text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
                Screenshot a listing.
                <span className="block text-[#e88967]">
                  Ask Grace if it is a good deal.
                </span>
              </h2>

              <p className="mt-6 max-w-2xl text-lg font-semibold leading-8 text-[#6f3b2a]">
                Grace helps buyers and sellers make smarter real-life decisions.
                Upload photos, screenshots, notes, or ideas. Grace can analyze
                them, search the web, build plans, create reports, save results,
                and download PDFs.
              </p>

              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/chat"
                  className="rounded-full bg-[#f3a683] px-7 py-4 text-base font-black text-white shadow-xl"
                >
                  Try Grace Free
                </Link>

                <a
                  href="#how"
                  className="rounded-full border border-[#efb99f] bg-white/80 px-7 py-4 text-base font-black text-[#6f3b2a] shadow-sm"
                >
                  See What She Does
                </a>
              </div>

              <p className="mt-4 text-sm font-semibold text-[#9a6b5a]">
                After your free messages/actions, continue for $5/month. Cancel anytime.
              </p>
            </div>

            <div className="rounded-[2.2rem] border border-[#efb99f] bg-white/85 p-5 shadow-2xl backdrop-blur">
              <div className="rounded-[1.7rem] bg-[#fff7f1] p-4">
                <div className="rounded-3xl border border-[#efb99f] bg-white p-4 shadow-sm">
                  <p className="text-xs font-black uppercase tracking-wide text-[#d97757]">
                    Marketplace Helper
                  </p>
                  <h3 className="mt-2 text-2xl font-black">
                    Buying or selling? Grace helps both.
                  </h3>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] p-4">
                      <p className="text-lg font-black">I am buying</p>
                      <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#6f3b2a]">
                        <li>Check if the price looks fair</li>
                        <li>Spot visible red flags</li>
                        <li>Estimate value range</li>
                        <li>Get questions to ask the seller</li>
                        <li>Find a smart offer and walk-away price</li>
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] p-4">
                      <p className="text-lg font-black">I am selling</p>
                      <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-[#6f3b2a]">
                        <li>Find a fair asking price</li>
                        <li>Write a better listing title</li>
                        <li>Create a clean description</li>
                        <li>Know what flaws to disclose</li>
                        <li>Get negotiation replies for buyers</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-3xl bg-[#2f2723] p-5 text-white shadow-xl">
                  <p className="text-sm font-black uppercase tracking-wide text-[#ffd5c3]">
                    Example
                  </p>
                  <p className="mt-2 text-xl font-black leading-7">
                    “Grace, I am looking at this boat on Marketplace. Is this a
                    good deal and what should I ask the seller?”
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="how" className="px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-black uppercase tracking-[0.28em] text-[#d97757]">
              What Grace can do
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
              Real help, not just chat.
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base font-semibold leading-7 text-[#6f3b2a]">
              Grace is built for real situations: buying, selling, planning,
              fixing, comparing, researching, and turning messy thoughts into
              useful next steps.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Marketplace Helper",
                text: "Upload a listing screenshot or item photo. Grace can help with fair price, red flags, questions, offers, and seller listing help.",
              },
              {
                title: "Photo Analysis",
                text: "Show Grace a photo and she can point out useful details, concerns, ideas, and next steps.",
              },
              {
                title: "Web Search",
                text: "Ask Grace to look something up, compare options, summarize what matters, and include sources.",
              },
              {
                title: "Plans & Checklists",
                text: "Turn an idea, project, repair, goal, or problem into clear steps and priorities.",
              },
              {
                title: "Reports & PDFs",
                text: "Create clean reports, scopes, proposals, checklists, and downloadable PDFs.",
              },
              {
                title: "Saved Reports",
                text: "Save useful answers, reopen them later, read them out loud, or download them as PDFs.",
              },
              {
                title: "Voice",
                text: "Talk to Grace, hear responses out loud, and stop reading whenever you are done listening.",
              },
              {
                title: "Memory",
                text: "Grace can remember helpful context on your device so future answers feel more personal.",
              },
              {
                title: "Everyday Decisions",
                text: "Use Grace for purchases, projects, home ideas, work notes, business planning, and personal goals.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-[1.7rem] border border-[#efb99f] bg-white/85 p-5 shadow-sm"
              >
                <h3 className="text-xl font-black text-[#2f2723]">
                  {item.title}
                </h3>
                <p className="mt-3 text-sm font-semibold leading-6 text-[#6f3b2a]">
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-6xl rounded-[2.2rem] border border-[#efb99f] bg-white/85 p-6 shadow-2xl">
          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.28em] text-[#d97757]">
                How to use Grace
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-tight">
                Simple steps.
              </h2>
              <p className="mt-4 text-base font-semibold leading-7 text-[#6f3b2a]">
                You do not need to learn complicated commands. Tell Grace what
                you are trying to do, upload a photo when needed, and ask for the
                result you want.
              </p>
            </div>

            <div className="grid gap-3">
              {[
                {
                  step: "1",
                  title: "Open Grace",
                  text: "Start with a question, idea, screenshot, or photo.",
                },
                {
                  step: "2",
                  title: "Choose what you need",
                  text: "Use the three-dot menu for Marketplace Helper, photo analysis, web search, reports, PDFs, saved reports, and more.",
                },
                {
                  step: "3",
                  title: "Ask naturally",
                  text: "Try: Is this a good deal? What should I sell this for? Make me a plan. Create a report. Read this out loud.",
                },
                {
                  step: "4",
                  title: "Save or download",
                  text: "Save useful results, reopen them later, or turn them into a PDF.",
                },
              ].map((item) => (
                <div
                  key={item.step}
                  className="flex gap-4 rounded-2xl border border-[#efb99f] bg-[#fff7f1] p-4"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f3a683] font-black text-white">
                    {item.step}
                  </div>
                  <div>
                    <p className="font-black">{item.title}</p>
                    <p className="mt-1 text-sm font-semibold leading-6 text-[#6f3b2a]">
                      {item.text}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-12 sm:px-8 lg:px-12">
        <div className="mx-auto max-w-5xl rounded-[2.2rem] bg-[#2f2723] p-8 text-center text-white shadow-2xl">
          <p className="text-sm font-black uppercase tracking-[0.28em] text-[#ffd5c3]">
            Try Grace free
          </p>
          <h2 className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">
            Make smarter moves before you buy, sell, build, or decide.
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-base font-semibold leading-7 text-[#ffe8dc]">
            50 free messages/actions included. After that, Grace is $5/month.
            No obligation. Cancel anytime.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/chat"
              className="rounded-full bg-[#f3a683] px-8 py-4 text-base font-black text-white shadow-xl"
            >
              Start Using Grace
            </Link>

            <button
              onClick={copyGraceLink}
              className="rounded-full border border-[#ffd5c3] bg-white/10 px-8 py-4 text-base font-black text-white"
            >
              {copied ? "Copied" : "Copy Link"}
            </button>
          </div>
        </div>
      </section>
    </main>
  );
}
