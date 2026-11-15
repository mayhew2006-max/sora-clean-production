"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

const PLAY_MANAGE =
  "https://play.google.com/store/account/subscriptions?sku=grace_premium_monthly&package=com.graceai.assistant";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [paid, setPaid] = useState(false);
  const [playPaid, setPlayPaid] = useState(false);
  const [stripePaid, setStripePaid] = useState(false);
  const [founder, setFounder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/login";
        return;
      }
      setEmail(data.user.email || "");
      if (navigator.userAgent.includes("GraceFieldAndroid/")) {
        const session = await supabase.auth.getSession();
        if (session.data.session?.access_token) {
          await fetch("/api/google-play/verify", {
            headers: { Authorization: "Bearer " + session.data.session.access_token },
          }).catch(() => undefined);
        }
      }
      const { data: usage } = await supabase.from("grace_user_usage")
        .select("paid,founder,play_paid,stripe_paid")
        .eq("user_id", data.user.id).maybeSingle();
      setPaid(Boolean(usage?.paid));
      setFounder(Boolean(usage?.founder));
      setPlayPaid(Boolean(usage?.play_paid));
      setStripePaid(Boolean(usage?.stripe_paid));
    }
    load();
  }, []);

  async function manageWebsiteSubscription() {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token) {
        window.location.href = "/login";
        return;
      }
      const res = await fetch("/api/create-portal-session", {
        method: "POST",
        headers: { Authorization: "Bearer " + data.session.access_token },
      });
      const result = await res.json();
      if (!res.ok || !result.url) {
        setMessage(result.error || "Unable to open Stripe subscription management.");
        return;
      }
      window.location.href = result.url;
    } catch {
      setMessage("Unable to open subscription management right now.");
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
    localStorage.removeItem("sora_paid");
    localStorage.removeItem("grace_founder");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full rounded-[2rem] border border-black/10 bg-white/80 shadow-2xl p-8 text-center">
        <img src="/grace-avatar.png" alt="Grace"
          className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg mb-4" />
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
          <>
            {playPaid && (
              <a href={PLAY_MANAGE}
                className="block w-full bg-zinc-950 text-white rounded-2xl py-4 font-bold mb-3">
                Manage Google Play Subscription
              </a>
            )}
            {stripePaid && (
              <button onClick={manageWebsiteSubscription} disabled={busy}
                className="block w-full bg-zinc-950 text-white rounded-2xl py-4 font-bold mb-3 disabled:opacity-60">
                {busy ? "Opening billing..." : "Manage Website Subscription"}
              </button>
            )}
          </>
        ) : (
          <a href="/pay"
            className="block w-full bg-zinc-950 text-white rounded-2xl py-4 font-bold mb-3">
            Upgrade to Grace Pro
          </a>
        )}
        {message && <p className="text-sm text-zinc-700 bg-black/5 rounded-2xl p-3 mb-3">{message}</p>}
        <button onClick={signOut}
          className="block w-full bg-white border border-black/10 text-zinc-950 rounded-2xl py-4 font-bold mb-3">
          Sign Out
        </button>
        <a href="/chat" className="block text-zinc-500 text-sm mt-5">Back to Grace</a>
      </div>
    </main>
  );
}
