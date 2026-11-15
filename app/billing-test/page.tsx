"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type AccountStatus = "loading" | "signed-out" | "founder" | "premium" | "free" | "error";

export default function BillingTestPage() {
  const [status, setStatus] = useState<AccountStatus>("loading");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [inAndroid, setInAndroid] = useState(false);

  useEffect(() => {
    let mounted = true;
    setInAndroid(navigator.userAgent.includes("GraceFieldAndroid/"));

    async function load() {
      try {
        const { data: userResult, error: userError } = await supabase.auth.getUser();
        if (!mounted) return;
        if (userError || !userResult.user) {
          setStatus("signed-out");
          return;
        }
        const user = userResult.user;
        setEmail(user.email || "(no email)");
        const { data: usage, error: usageError } = await supabase
          .from("grace_user_usage")
          .select("founder,paid,play_paid,stripe_paid")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!mounted) return;
        if (usageError) {
          setStatus("error");
          setMessage("Unable to read this account's billing status. Don't start a test purchase yet.");
          return;
        }
        setStatus(usage?.founder ? "founder" : usage?.paid ? "premium" : "free");
      } catch {
        if (mounted) {
          setStatus("error");
          setMessage("Could not check the current account. Try again with a connection.");
        }
      }
    }
    load();
    return () => { mounted = false; };
  }, []);

  async function switchAccount() {
    setBusy(true);
    setMessage("");
    try {
      // Keep other devices signed in. This only signs out this browser / Android WebView.
      const { error } = await supabase.auth.signOut({ scope: "local" });
      if (error) throw error;
      // Clear legacy access display flags, NOT waypoints or offline maps.
      localStorage.removeItem("sora_paid");
      localStorage.removeItem("grace_founder");
      window.location.assign("/login");
    } catch {
      setMessage("Sign out failed. Please try again.");
      setBusy(false);
    }
  }

  const isCustomer = status === "free";
  const isSignedIn = status === "free" || status === "founder" || status === "premium";
  const statusLabel = status === "loading" ? "Checking..."
    : status === "signed-out" ? "Not signed in"
    : status === "founder" ? "Founder — no payment required"
    : status === "premium" ? "Premium — already unlocked"
    : status === "free" ? "Free — eligible to test purchase"
    : "Unable to verify account";

  return (
    <main className="min-h-screen bg-[#0b1b16] text-[#f3e9d2] flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-[#a68b5c] bg-[#12291f] p-6 sm:p-8 shadow-2xl">
        <div className="text-center mb-6">
          <div className="text-[#d7ba79] font-bold tracking-[.2em] text-xs">GRACE FIELD GPS</div>
          <h1 className="text-3xl font-bold mt-2">Billing Test & Account Switch</h1>
          <p className="text-sm text-[#c5d1c2] mt-3">
            Test as an ordinary customer without changing your founder privileges.
          </p>
        </div>

        <section className="rounded-2xl border border-[#456251] bg-[#091b14] p-4 mb-5">
          <p className="text-xs text-[#d9bf83] uppercase tracking-widest">Current Grace account</p>
          <p className="mt-2 font-semibold break-all">{email || "—"}</p>
          <p className="mt-2 text-sm text-[#dce9d8]">{statusLabel}</p>
        </section>

        {isSignedIn ? (
          <button type="button" onClick={switchAccount} disabled={busy}
            className="w-full rounded-xl bg-[#d4b57b] text-[#102019] font-bold py-4 disabled:opacity-50">
            {busy ? "Signing out..." : "Sign out on this device / Switch account"}
          </button>
        ) : status === "signed-out" ? (
          <a href="/login" className="block text-center rounded-xl bg-[#d4b57b] text-[#102019] font-bold py-4">
            Sign in or create a test account
          </a>
        ) : null}

        {status === "founder" && (
          <p className="text-sm text-[#d5ddd0] mt-4">
            Founder accounts bypass the paywall. Switch to a different email to test the normal free-to-paid flow.
          </p>
        )}
        {status === "free" && (
          <div className="mt-5">
            <p className="text-sm text-[#d5ddd0] mb-3">
              {inAndroid
                ? "Free account detected. Use the Version 12 app from Google Play internal testing to try the purchase."
                : "You're in a web browser. Web checkout uses Stripe. To test Google Play, open this page inside the Version 12 Android app."}
            </p>
            {inAndroid && (
              <a href="/pay" className="block text-center rounded-xl bg-[#276e49] border border-[#a6c69e] font-bold py-4">
                Continue to Google Play checkout — $14.99/month
              </a>
            )}
          </div>
        )}
        {status === "premium" && (
          <p className="text-sm text-[#d5ddd0] mt-4">
            This account already has Premium. Switch to a new free account to test the paywall.
          </p>
        )}
        {message && <p role="alert" className="mt-4 rounded-xl bg-[#3a261d] p-3 text-sm">{message}</p>}

        <p className="mt-6 text-xs leading-relaxed text-[#b2bda9]">
          Changing accounts does not erase saved GPS spots stored on this device.
          It never changes your founder status or grants Premium for free. Use a Google Play
          license tester for a test transaction; a regular purchase can charge real money.
        </p>
        <a href="/field" className="block text-center mt-6 text-[#e0c38c] underline">
          Back to Grace Field
        </a>
      </div>
    </main>
  );
}
