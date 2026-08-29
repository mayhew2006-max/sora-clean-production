"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [paid, setPaid] = useState(false);
  const [founder, setFounder] = useState(false);
  const [billingBusy, setBillingBusy] = useState(false);
  const [billingMessage, setBillingMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      setEmail(data.user.email || "");

      const { data: usage } = await supabase
        .from("grace_user_usage")
        .select("paid, founder")
        .eq("user_id", data.user.id)
        .maybeSingle();

      setPaid(Boolean(usage?.paid));
      setFounder(Boolean(usage?.founder));
    }

    load();
  }, []);

  async function manageSubscription() {
    setBillingBusy(true);
    setBillingMessage("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;

      if (!token) {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const json = await res.json();

      if (!res.ok || !json.url) {
        setBillingMessage(
          json.error || "Unable to open subscription management."
        );
        return;
      }

      window.location.href = json.url;
    } catch {
      setBillingMessage(
        "Unable to open subscription management right now."
      );
    } finally {
      setBillingBusy(false);
    }
  }

  async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem("sora_paid");
    localStorage.removeItem("grace_founder");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full rounded-[2rem] border border-black/10 bg-white/80 shadow-2xl p-8 text-center">
        <img
          src="/grace-avatar.png"
          alt="Grace"
          className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg mb-4"
        />

        <h1 className="text-4xl font-black mb-2">Grace Account</h1>

        <p className="text-zinc-600 mb-4 break-all">{email || "Loading..."}</p>

        <div className="rounded-2xl bg-black/5 p-4 mb-5 text-left">
          <p className="font-bold">Status</p>
          <p className="text-sm text-zinc-600">
            {founder ? "Founder access active" : paid ? "Grace Pro active" : "Free account"}
          </p>
        </div>

        {founder ? (
          <div className="block w-full bg-black/5 text-zinc-700 rounded-2xl py-4 font-bold mb-3">
            Founder access — no subscription needed
          </div>
        ) : paid ? (
          <button
            onClick={manageSubscription}
            disabled={billingBusy}
            className="block w-full bg-zinc-950 text-white rounded-2xl py-4 font-bold mb-3 disabled:opacity-60"
          >
            {billingBusy ? "Opening billing..." : "Manage Subscription"}
          </button>
        ) : (
          <a
            href="/pay"
            className="block w-full bg-zinc-950 text-white rounded-2xl py-4 font-bold mb-3"
          >
            Upgrade to Grace Pro
          </a>
        )}

        {billingMessage && (
          <p className="text-sm text-zinc-700 bg-black/5 rounded-2xl p-3 mb-3">
            {billingMessage}
          </p>
        )}

        <button
          onClick={logout}
          className="block w-full bg-white border border-black/10 text-zinc-950 rounded-2xl py-4 font-bold mb-3"
        >
          Sign Out
        </button>

        <a href="/chat" className="block text-zinc-500 text-sm mt-5">
          Back to Grace
        </a>
      </div>
    </main>
  );
}
