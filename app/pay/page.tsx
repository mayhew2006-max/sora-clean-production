"use client";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Pay() {
  async function subscribe() {
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;

    if (!accessToken) {
      alert("Log in first, then upgrade.");
      window.location.href = "/";
      return;
    }

    const res = await fetch("/api/create-checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken }),
    });

    const checkout = await res.json();

    if (checkout.url) {
      window.location.href = checkout.url;
    } else {
      alert(checkout.error || "Checkout failed.");
    }
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white px-6">
      <div className="max-w-md text-center bg-zinc-900 border border-white/10 rounded-3xl p-8">
        <h1 className="text-4xl font-bold mb-4">Unlock Sora Pro</h1>
        <p className="text-zinc-400 mb-8">
          Unlimited conversations, voice replies, and hands-free companion mode.
        </p>

        <button
          onClick={subscribe}
          className="block w-full bg-white text-black py-4 rounded-2xl font-semibold"
        >
          Subscribe Now
        </button>

        <a href="/" className="block text-zinc-500 text-sm mt-5">
          Back to Sora
        </a>
      </div>
    </main>
  );
}
