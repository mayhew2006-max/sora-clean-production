"use client";

import { useEffect, useState } from "react";

export default function GraceLandingPage() {
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hideBrowserWarning, setHideBrowserWarning] = useState(false);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const lower = ua.toLowerCase();

    const isInApp =
      lower.includes("tiktok") ||
      lower.includes("musical_ly") ||
      lower.includes("bytedance") ||
      lower.includes("instagram") ||
      lower.includes("fbav") ||
      lower.includes("fban") ||
      lower.includes("fb_iab") ||
      lower.includes("messenger");

    setInAppBrowser(isInApp);
  }, []);

  async function copyGraceLink() {
    const url = window.location.origin + "/chat";

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      alert("Copy this link: " + url);
    }
  }

  const features = [
    {
      title: "Talk things out",
      text: "Use Grace for real conversations, ideas, decisions, goals, stress, work, and life.",
      icon: "💬",
    },
    {
      title: "Analyze photos",
      text: "Upload a photo and Grace can give observations, ideas, risks, next steps, and reports.",
      icon: "📷",
    },
    {
      title: "Create plans",
      text: "Turn rough thoughts into project plans, business ideas, checklists, scopes, and next steps.",
      icon: "📋",
    },
    {
      title: "Download PDFs",
      text: "Create clean reports with your name, business, project, and location details.",
      icon: "📄",
    },
  ];

  const tools = [
    ["Photo Analysis", "Upload or take a photo and ask Grace what she sees."],
    ["Project Plans", "Turn ideas into steps, priorities, phases, and action."],
    ["Reports", "Create clean summaries, observations, concerns, and next steps."],
    ["PDF Downloads", "Save Grace’s work as a professional document."],
    ["Voice", "Talk to Grace and let her read results out loud."],
    ["Memory", "Grace can keep useful context so you do not start over every time."],
    ["Business Help", "Offers, service ideas, reports, checklists, proposals, and planning."],
    ["Personal Help", "Goals, routines, decisions, schedules, and life organization."],
  ];

  const useCases = [
    ["🏠", "Home Projects", "Upload a project photo and get ideas, steps, and a PDF report."],
    ["💼", "Small Business", "Create offers, plans, service packages, and customer-ready notes."],
    ["🛠️", "Contractors", "Build scopes, checklists, material ideas, and client summaries."],
    ["🐾", "Cause Work", "Plan fundraisers, updates, reports, and community posts."],
    ["🚀", "Side Hustles", "Turn ideas into action plans, content, and next steps."],
    ["🧠", "Life Stuff", "Talk it out and turn a messy thought into a clear next move."],
  ];

  return (
    <main className="min-h-screen overflow-hidden bg-[#fff7f1] text-[#2f2723]">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.22),transparent_38%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.12),transparent_40%),linear-gradient(180deg,#fff7f1_0%,#fffaf6_45%,#fff3ea_100%)]" />

      <header className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="/" className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[#f3a683] text-2xl text-white shadow-lg">
            ✦
          </div>
          <div>
            <div className="text-2xl font-black tracking-tight">Grace</div>
            <div className="text-xs font-semibold text-[#8b6a5f]">
              Personal command center
            </div>
          </div>
        </a>

        <nav className="hidden items-center gap-8 text-sm font-semibold text-[#6f3b2a] md:flex">
          <a href="#features" className="hover:text-[#2f2723]">Features</a>
          <a href="#tools" className="hover:text-[#2f2723]">Tools</a>
          <a href="#pricing" className="hover:text-[#2f2723]">Pricing</a>
        </nav>

        <div className="flex items-center gap-3">
          <a
            href="/account"
            className="hidden rounded-xl border border-[#efb99f] bg-white/70 px-4 py-3 text-sm font-bold text-[#6f3b2a] shadow-sm hover:bg-white sm:block"
          >
            My Account
          </a>
          <a
            href="/chat"
            className="rounded-xl bg-[#2f2723] px-4 py-3 text-sm font-black text-white shadow-lg hover:opacity-90"
          >
            Try Free
          </a>
        </div>
      </header>

      {inAppBrowser && !hideBrowserWarning && (
        <section className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="rounded-[1.5rem] border border-[#efb99f] bg-white/90 p-4 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="text-2xl">⚠️</div>
              <div className="flex-1">
                <p className="text-sm font-black text-[#6f3b2a]">
                  Open Grace in your browser for full features
                </p>
                <p className="mt-1 text-xs leading-5 text-[#8b6a5f]">
                  TikTok, Facebook, and Instagram sometimes block photo upload,
                  voice, and PDF downloads inside their app browser. Tap the
                  three dots and choose <strong>Open in browser</strong>, or copy
                  the Grace link below.
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  <button
                    onClick={copyGraceLink}
                    className="rounded-2xl bg-[#2f2723] px-3 py-3 text-xs font-black text-white"
                  >
                    {copiedLink ? "Copied" : "Copy Grace Link"}
                  </button>

                  <a
                    href="/chat"
                    className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-3 py-3 text-center text-xs font-black text-[#6f3b2a]"
                  >
                    Continue Here
                  </a>

                  <button
                    onClick={() => setHideBrowserWarning(true)}
                    className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-3 py-3 text-xs font-black text-[#6f3b2a]"
                  >
                    Hide Notice
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto grid max-w-7xl items-center gap-10 px-5 pb-8 pt-8 sm:px-8 lg:grid-cols-2 lg:pb-16 lg:pt-12">
        <div>
          <div className="mb-5 inline-flex rounded-full border border-[#efb99f] bg-white/75 px-4 py-2 text-sm font-black text-[#8b4b34] shadow-sm">
            50 free messages/actions included
          </div>

          <h1 className="max-w-3xl text-5xl font-black leading-[0.95] tracking-tight sm:text-6xl lg:text-7xl">
            Meet Grace.
            <span className="mt-3 block text-[#d97757]">
              Your personal command center for real life.
            </span>
          </h1>

          <p className="mt-7 max-w-2xl text-lg leading-8 text-[#6f3b2a] sm:text-xl">
            Talk things out. Use voice. Upload photos. Get ideas. Build plans.
            Create reports. Download PDFs. Grace helps turn thoughts, problems,
            projects, and photos into something useful.
          </p>

          <div className="mt-8 flex flex-col gap-4 sm:flex-row">
            <a
              href="/chat"
              className="rounded-2xl bg-[#f3a683] px-7 py-4 text-center font-black text-white shadow-lg hover:opacity-90"
            >
              Start Grace Free →
            </a>
            <a
              href="#tools"
              className="rounded-2xl border border-[#efb99f] bg-white/70 px-7 py-4 text-center font-black text-[#6f3b2a] shadow-sm hover:bg-white"
            >
              See What Grace Can Do
            </a>
          </div>

          <div className="mt-6 grid gap-2 text-sm font-semibold text-[#8b6a5f] sm:grid-cols-3">
            <div className="rounded-2xl border border-[#efb99f] bg-white/70 px-4 py-3">
              No obligation
            </div>
            <div className="rounded-2xl border border-[#efb99f] bg-white/70 px-4 py-3">
              No risk
            </div>
            <div className="rounded-2xl border border-[#efb99f] bg-white/70 px-4 py-3">
              Cancel anytime
            </div>
          </div>

          <p className="mt-5 text-sm text-[#8b6a5f]">
            Try Grace first. After 50 free messages/actions, continue for{" "}
            <strong className="text-[#2f2723]">$5/month</strong>.
          </p>
        </div>

        <div className="relative mx-auto w-full max-w-[560px]">
          <div className="absolute -inset-4 rounded-[2.5rem] bg-[#f3a683]/25 blur-3xl" />
          <img
            src="/grace-avatar.png"
            alt="Grace"
            className="relative w-full rounded-[2.2rem] border border-white/80 object-cover object-top shadow-2xl"
          />
        </div>
      </section>

      <section id="features" className="mx-auto max-w-7xl px-5 py-6 sm:px-8">
        <div className="grid overflow-hidden rounded-[2rem] border border-[#efb99f] bg-white/80 shadow-xl backdrop-blur md:grid-cols-4">
          {features.map((item, index) => (
            <div
              key={item.title}
              className={`p-7 text-center ${
                index !== 3
                  ? "border-b border-[#efb99f] md:border-b-0 md:border-r"
                  : ""
              }`}
            >
              <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-[#fff7f1] text-3xl shadow-sm">
                {item.icon}
              </div>
              <h3 className="text-lg font-black">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#8b6a5f]">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="tools" className="mx-auto max-w-7xl px-5 py-16 text-center sm:px-8">
        <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
          Grace does more than answer.
          <span className="block text-[#d97757]">
            She helps you get things done.
          </span>
        </h2>
        <p className="mx-auto mt-5 max-w-3xl text-lg leading-8 text-[#6f3b2a]">
          Upload a photo, ask a question, explain an idea, or talk through a
          problem. Grace can turn it into a plan, checklist, report, PDF, or next
          step — inside the same conversation.
        </p>

        <div className="mt-10 grid gap-4 text-left md:grid-cols-2 lg:grid-cols-4">
          {tools.map(([title, text]) => (
            <div
              key={title}
              className="rounded-3xl border border-[#efb99f] bg-white/75 p-6 shadow-sm transition hover:bg-white"
            >
              <div className="mb-4 text-2xl text-[#d97757]">✓</div>
              <h3 className="text-xl font-black">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-[#8b6a5f]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="use-cases" className="mx-auto max-w-7xl px-5 py-10 text-center sm:px-8">
        <h2 className="text-3xl font-black tracking-tight sm:text-4xl">
          Use Grace for whatever you’re trying to figure out.
        </h2>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
          {useCases.map(([icon, title, text]) => (
            <div
              key={title}
              className="rounded-3xl border border-[#efb99f] bg-white/70 p-5 shadow-sm"
            >
              <div className="mb-4 text-4xl">{icon}</div>
              <h3 className="font-black">{title}</h3>
              <p className="mt-3 text-xs leading-6 text-[#8b6a5f]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="pricing" className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <div className="rounded-[2rem] border border-[#efb99f] bg-white/85 p-6 shadow-xl sm:p-9">
          <div className="grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div>
              <div className="mb-4 inline-flex rounded-full border border-[#efb99f] bg-[#fff7f1] px-4 py-2 text-sm font-black uppercase tracking-wider text-[#8b4b34]">
                Simple pricing
              </div>

              <h2 className="text-4xl font-black">
                Try Grace first. Pay only if she helps.
              </h2>

              <p className="mt-5 text-[#6f3b2a]">
                Everyone gets 50 free messages/actions. Use chat, voice, photos,
                reports, and PDFs before deciding.
              </p>

              <div className="mt-8 flex items-end gap-2">
                <span className="text-6xl font-black text-[#d97757]">$5</span>
                <span className="pb-2 text-[#8b6a5f]">/month after free use</span>
              </div>

              <p className="mt-3 text-sm font-semibold text-[#8b6a5f]">
                No obligation. No risk. Cancel anytime.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <PriceItem title="50 Free Messages/Actions" text="Try Grace with real use before paying." />
              <PriceItem title="Photo Analysis" text="Upload photos and get ideas, reports, and next steps." />
              <PriceItem title="Reports + PDFs" text="Create clean PDFs with your name, business, project, and location." />
              <PriceItem title="Voice" text="Talk with Grace and let her read results out loud." />

              <a
                href="/chat"
                className="grid place-items-center rounded-2xl bg-[#f3a683] px-6 py-5 text-center font-black text-white shadow-lg hover:opacity-90 sm:col-span-2"
              >
                Start Grace Free →
              </a>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12 sm:px-8">
        <h2 className="text-center text-3xl font-black tracking-tight sm:text-4xl">
          Why Grace feels different.
        </h2>

        <div className="mt-8 grid overflow-hidden rounded-[2rem] border border-[#efb99f] bg-white/75 md:grid-cols-5">
          {[
            ["🔎", "Search gives links.", "Grace helps you act."],
            ["💬", "Chatbots reply.", "Grace helps you build."],
            ["📓", "Notes get forgotten.", "Grace turns them into plans."],
            ["📷", "Photos sit in your phone.", "Grace turns them into observations and reports."],
            ["📄", "Ideas fade.", "Grace turns them into PDFs and next steps."],
          ].map(([icon, title, text], index) => (
            <div
              key={title}
              className={`p-6 text-center ${
                index !== 4
                  ? "border-b border-[#efb99f] md:border-b-0 md:border-r"
                  : ""
              }`}
            >
              <div className="mb-3 text-3xl">{icon}</div>
              <h3 className="font-black">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-[#8b6a5f]">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16 pt-8 sm:px-8">
        <div className="rounded-[2rem] border border-[#efb99f] bg-white/85 p-8 shadow-xl sm:p-10">
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <h2 className="text-4xl font-black tracking-tight sm:text-5xl">
                Stop letting ideas sit in your head.
              </h2>
              <p className="mt-5 max-w-2xl text-lg leading-8 text-[#6f3b2a]">
                Talk to Grace. Show her what you’re working on. Turn it into a
                plan, report, checklist, or PDF.
              </p>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <a
                  href="/chat"
                  className="rounded-2xl bg-[#f3a683] px-7 py-4 text-center font-black text-white hover:opacity-90"
                >
                  Start Free →
                </a>
                <a
                  href="#pricing"
                  className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-7 py-4 text-center font-black text-[#6f3b2a] hover:bg-white"
                >
                  See Pricing
                </a>
              </div>
            </div>

            <div className="rounded-3xl border border-[#efb99f] bg-[#fff7f1] p-5">
              <div className="rounded-2xl border border-[#efb99f] bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center justify-between">
                  <span className="font-black">Grace Report</span>
                  <span className="rounded-lg bg-[#f3a683]/20 px-3 py-1 text-xs font-black text-[#8b4b34]">
                    PDF
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="h-3 rounded bg-[#efb99f]/55" />
                  <div className="h-3 w-5/6 rounded bg-[#efb99f]/40" />
                  <div className="h-3 w-2/3 rounded bg-[#efb99f]/30" />
                  <div className="mt-5 h-32 rounded-2xl bg-gradient-to-br from-[#f3a683]/35 to-[#fff7f1]" />
                </div>
                <div className="mt-5 rounded-xl bg-[#2f2723] px-4 py-3 text-center text-sm font-black text-white">
                  Download PDF
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function PriceItem({
  title,
  text,
}: {
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] p-5">
      <div className="mb-2 flex items-center gap-3">
        <span className="text-[#d97757]">✓</span>
        <h3 className="font-black">{title}</h3>
      </div>
      <p className="text-sm leading-6 text-[#8b6a5f]">{text}</p>
    </div>
  );
}
