"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const [checkingRecovery, setCheckingRecovery] = useState(true);

  useEffect(() => {
    let alive = true;

    async function checkRecoverySession() {
      const { data } = await supabase.auth.getSession();

      if (!alive) return;

      // A password-recovery link creates a temporary authenticated session.
      // If one exists on this page, let the user choose a new password.
      if (data.session) {
        setRecoveryMode(true);
      }

      setCheckingRecovery(false);
    }

    checkRecoverySession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!alive) return;

      if (event === "PASSWORD_RECOVERY") {
        setRecoveryMode(true);
        setCheckingRecovery(false);
        setMessage("");
      }

      if (session && window.location.hash.includes("type=recovery")) {
        setRecoveryMode(true);
        setCheckingRecovery(false);
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  async function sendResetEmail() {
    setBusy(true);
    setMessage("");

    try {
      if (!email.trim()) {
        setMessage("Enter your email.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(
        email.trim(),
        {
          redirectTo: `${window.location.origin}/reset-password`,
        }
      );

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage(
        "Password reset email sent. Open the link in that email to choose a new password."
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveNewPassword() {
    setBusy(true);
    setMessage("");

    try {
      if (newPassword.length < 6) {
        setMessage("Password must be at least 6 characters.");
        return;
      }

      if (newPassword !== confirmPassword) {
        setMessage("Passwords do not match.");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Password updated successfully. Returning to Grace...");

      window.setTimeout(() => {
        window.location.href = "/chat";
      }, 1500);
    } finally {
      setBusy(false);
    }
  }

  if (checkingRecovery) {
    return (
      <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-5 py-10">
        <div className="w-full max-w-md rounded-[2rem] bg-white/80 border border-black/10 shadow-2xl p-7 text-center">
          <h1 className="text-4xl font-black mb-3">Grace</h1>
          <p className="text-zinc-600">Checking your reset link...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-white/80 border border-black/10 shadow-2xl p-7 text-center">
        <img
          src="/grace-avatar.png"
          alt="Grace"
          className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg mb-4"
        />

        <h1 className="text-4xl font-black mb-3">
          {recoveryMode ? "Choose New Password" : "Reset Password"}
        </h1>

        {!recoveryMode ? (
          <>
            <p className="text-zinc-600 mb-6">
              Enter your email and Grace will send a reset link.
            </p>

            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="Email"
              autoComplete="email"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 mb-4 outline-none text-left"
              onKeyDown={(e) => {
                if (e.key === "Enter") sendResetEmail();
              }}
            />

            <button
              disabled={busy}
              onClick={sendResetEmail}
              className="w-full rounded-2xl bg-zinc-950 text-white py-4 font-black disabled:opacity-60"
            >
              {busy ? "Sending..." : "Send Reset Email"}
            </button>
          </>
        ) : (
          <>
            <p className="text-zinc-600 mb-6">
              Enter the new password you want to use for Grace.
            </p>

            <input
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              type="password"
              placeholder="New password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 mb-3 outline-none text-left"
            />

            <input
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              type="password"
              placeholder="Confirm new password"
              autoComplete="new-password"
              className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 mb-4 outline-none text-left"
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNewPassword();
              }}
            />

            <button
              disabled={busy}
              onClick={saveNewPassword}
              className="w-full rounded-2xl bg-zinc-950 text-white py-4 font-black disabled:opacity-60"
            >
              {busy ? "Saving..." : "Save New Password"}
            </button>
          </>
        )}

        {message && (
          <p className="text-sm text-zinc-700 bg-black/5 rounded-2xl p-3 mt-4">
            {message}
          </p>
        )}

        <a
          href={recoveryMode ? "/chat" : "/login"}
          className="block text-sm text-zinc-500 mt-6"
        >
          {recoveryMode ? "Back to Grace" : "Back to sign in"}
        </a>
      </div>
    </main>
  );
}
