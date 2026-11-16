"use client";

import { useEffect, useRef, useState } from "react";
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
  const [androidBrowser, setAndroidBrowser] = useState(false);
  const restorePending = useRef(false);
  const restoreTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const finishRestore = () => {
      restorePending.current = false;
      if (restoreTimeout.current) clearTimeout(restoreTimeout.current);
      restoreTimeout.current = null;
      setBusy(false);
    };
    const native = navigator.userAgent.includes("GraceFieldAndroid/");
    setAndroidBrowser(/Android/i.test(navigator.userAgent));
    setAndroidPlay(native || Boolean(window.GracePlayBilling));

    const onReady = () => {
      if (window.GracePlayBilling) {
        setAndroidPlay(true);
        setReady(true);
        window.GracePlayBilling.restore();
      }
    };
    const onPurchase = async (event: Event) => {
      const token = (event as CustomEvent<BillingEvent>).detail?.purchaseToken;
      if (!token) return;
      finishRestore();
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
      finishRestore();
      setMessage((event as CustomEvent<BillingEvent>).detail?.message || "Google Play is unavailable.");
    };
    const onCanceled = () => {
      finishRestore();
      setMessage("Checkout canceled.");
    };
    const onNoPurchases = () => {
      if (!restorePending.current) return;
      finishRestore();
      setMessage("No active Google Play purchase was found to restore. Test subscriptions expire quickly. Do not purchase again while we fix verification.");
    };
    window.addEventListener("grace-play-no-purchases", onNoPurchases);
    window.addEventListener("grace-play-ready", onReady);
    window.addEventListener("grace-play-purchase", onPurchase);
    window.addEventListener("grace-play-error", onError);
    window.addEventListener("grace-play-canceled", onCanceled);
    onReady();

    return () => {
      if (restoreTimeout.current) clearTimeout(restoreTimeout.current);
      window.removeEventListener("grace-play-no-purchases", onNoPurchases);
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
    if (!window.GracePlayBilling) return;
    if (restoreTimeout.current) clearTimeout(restoreTimeout.current);
    restorePending.current = true;
    setBusy(true);
    setMessage("Checking your Google Play purchases...");
    restoreTimeout.current = setTimeout(() => {
      if (!restorePending.current) return;
      restorePending.current = false;
      restoreTimeout.current = null;
      setBusy(false);
      setMessage("Google Play did not finish the restore check. No new payment is needed. Please contact support.");
    }, 15000);
    window.GracePlayBilling.restore();
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-gradient-to-br from-[#10221b] via-[#0c1915] to-[#08130e] text-[#f2e9d7] flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-[#10221b]/95 border border-[#dfbf7f]/35 rounded-[2rem] p-8 text-center shadow-2xl">
        <img src="/grace-avatar.png" alt="Grace" className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-[#dfbf7f] shadow-lg mb-4" />
        <h1 className="text-4xl font-black mb-4">Unlock Grace <span className="text-[#dfbf7f]">Pro</span></h1>
        <p className="text-[#b6bba9] mb-8">
          Conversations, voice, memory, tools, reports, PDFs, and more. Subscription renews monthly. Cancel anytime.
        </p>
        <button
          disabled={busy || (androidPlay && !ready)}
          onClick={subscribe}
          className="block w-full bg-[#dfbf7f] text-[#08130e] py-4 rounded-2xl font-black disabled:opacity-60"
        >
          {busy ? "Opening secure checkout..." :
            androidPlay
              ? (ready ? "Subscribe with Google Play — $14.99/mo" : "Connecting to Google Play...")
              : "Subscribe Now — $14.99/mo"}
        </button>
        {androidPlay && (
          <button onClick={restore} disabled={!ready || busy}
            className="block mx-auto mt-4 underline text-sm text-[#dfbf7f] disabled:opacity-60">
            Restore Google Play purchase
          </button>
        )}
        {androidBrowser && !androidPlay && (
          <p className="mt-4 text-xs text-[#c5b18a]">
            Have Grace Field installed from Google Play? Open it from the app icon to use Google Play billing. Browser checkout uses Stripe.
          </p>
        )}
        {message && (
          <p className="text-sm text-[#f2e9d7] bg-[#08130e] border border-[#dfbf7f]/20 rounded-2xl p-3 mt-4">{message}</p>
        )}
        <a href="/field" className="block text-[#c5b18a] text-sm mt-5">Back to Grace</a>
      </div>
    </main>
  );
}
