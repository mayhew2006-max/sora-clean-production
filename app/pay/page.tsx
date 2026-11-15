"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

declare global {
  interface Window {
    GracePlayBilling?: { purchase: (userId: string) => void; restore: () => void };
  }
}

type BillingEvent = { purchaseToken?: string; productId?: string; message?: string };

export default function Pay() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [ready, setReady] = useState(false);
  const [androidPlay, setAndroidPlay] = useState(false);

  useEffect(() => {
    const native = navigator.userAgent.includes("GraceFieldAndroid/");
    setAndroidPlay(native);
    if (!native) return;

    const onReady = () => {
      if (window.GracePlayBilling) {
        setReady(true);
        window.GracePlayBilling.restore();
      }
    };
    const onPurchase = async (event: Event) => {
      const token = (event as CustomEvent<BillingEvent>).detail?.purchaseToken;
      if (!token) return;
      setBusy(true);
      setMessage("Verifying your Google Play payment...");
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session?.access_token) {
          setMessage("Sign in to Grace and tap Restore Purchases.");
          return;
        }
        const res = await fetch("/api/google-play/verify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + data.session.access_token,
          },
          body: JSON.stringify({ purchaseToken: token }),
        });
        const result = await res.json();
        if (!res.ok || !result.active) {
          setMessage(result.error || "Payment not confirmed yet. Tap Restore Purchases to retry.");
          return;
        }
        setMessage("Premium activated. Opening Grace...");
        window.location.href = "/chat";
      } catch {
        setMessage("Connection issue. Tap Restore Purchases to finish activation.");
      } finally {
        setBusy(false);
      }
    };
    const onError = (event: Event) => {
      setBusy(false);
      setMessage((event as CustomEvent<BillingEvent>).detail?.message || "Google Play is unavailable.");
    };
    const onCanceled = () => {
      setBusy(false);
      setMessage("Checkout canceled.");
    };
    window.addEventListener("grace-play-ready", onReady);
    window.addEventListener("grace-play-purchase", onPurchase);
    window.addEventListener("grace-play-error", onError);
    window.addEventListener("grace-play-canceled", onCanceled);
    onReady();

    return () => {
      window.removeEventListener("grace-play-ready", onReady);
      window.removeEventListener("grace-play-purchase", onPurchase);
      window.removeEventListener("grace-play-error", onError);
      window.removeEventListener("grace-play-canceled", onCanceled);
    };
  }, []);

  async function subscribe() {
    setBusy(true);
    setMessage("");
    try {
      const { data } = await supabase.auth.getSession();
      if (!data.session?.access_token || !data.session.user) {
        window.location.href = "/login";
        return;
      }
      if (androidPlay) {
        if (!ready || !window.GracePlayBilling) {
          setMessage("Google Play is still connecting. Try again.");
          return;
        }
        window.GracePlayBilling.purchase(data.session.user.id);
        return;
      }
      // Keep website customers on Stripe; Android uses Play Billing.
      const res = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { Authorization: "Bearer " + data.session.access_token },
      });
      const json = await res.json();
      if (!res.ok || !json.url) {
        setMessage(json.error || "Unable to start secure checkout.");
        return;
      }
      window.location.href = json.url;
    } catch {
      setMessage("Unable to start checkout. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function restore() {
    if (window.GracePlayBilling) {
      setMessage("Checking your Google Play purchases...");
      window.GracePlayBilling.restore();
    }
  }

  return (
    <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/85 border border-black/10 rounded-[2rem] p-8 text-center shadow-2xl">
        <img src="/grace-avatar.png" alt="Grace" className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg mb-4" />
        <h1 className="text-4xl font-black mb-4">Unlock Grace Pro</h1>
        <p className="text-zinc-600 mb-8">
          Conversations, voice, memory, tools, reports, PDFs, and more. Subscription renews monthly. Cancel anytime.
        </p>
        <button
          disabled={busy || (androidPlay && !ready)}
          onClick={subscribe}
          className="block w-full bg-zinc-950 text-white py-4 rounded-2xl font-black disabled:opacity-60"
        >
          {busy ? "Opening secure checkout..." :
            androidPlay
              ? (ready ? "Subscribe with Google Play — $14.99/mo" : "Connecting to Google Play...")
              : "Subscribe Now — $14.99/mo"}
        </button>
        {androidPlay && (
          <button onClick={restore} disabled={!ready || busy}
            className="block mx-auto mt-4 underline text-sm text-zinc-700 disabled:opacity-60">
            Restore Google Play purchase
          </button>
        )}
        {message && (
          <p className="text-sm text-zinc-700 bg-black/5 rounded-2xl p-3 mt-4">{message}</p>
        )}
        <a href="/field" className="block text-zinc-500 text-sm mt-5">Back to Grace</a>
      </div>
    </main>
  );
}
