"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Pay() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function subscribe() {
    setBusy(true);
    setMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok || !json.url) {
        setMessage(json.error || "Unable to start checkout.");
        return;
      }

      window.location.href = json.url;
    } catch {
      setMessage("Unable to start checkout.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/85 border border-black/10 rounded-[2rem] p-8 text-center shadow-2xl">
        <img
          src="/grace-avatar.png"
          alt="Grace"
          className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg mb-4"
        />

        <h1 className="text-4xl font-black mb-4">Unlock Grace Pro</h1>

        <p className="text-zinc-600 mb-8">
          Unlimited conversations, voice, memory, tools, reports, PDFs, and more.
        </p>

        <button
          disabled={busy}
          onClick={subscribe}
          className="block w-full bg-zinc-950 text-white py-4 rounded-2xl font-black disabled:opacity-60"
        >
          {busy ? "Opening secure checkout..." : "Subscribe Now — $4.99/mo"}
        </button>

        {message && (
          <p className="text-sm text-zinc-700 bg-black/5 rounded-2xl p-3 mt-4">
            {message}
          </p>
        )}

        <a href="/chat" className="block text-zinc-500 text-sm mt-5">
          Back to Grace
        </a>
      </div>
    </main>
  );
}
