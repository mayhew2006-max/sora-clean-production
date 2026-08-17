"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function reset() {
    setBusy(true);
    setMessage("");

    try {
      if (!email.trim()) {
        setMessage("Enter your email.");
        return;
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      setMessage("Password reset email sent.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-white/80 border border-black/10 shadow-2xl p-7 text-center">
        <h1 className="text-4xl font-black mb-3">Reset Password</h1>
        <p className="text-zinc-600 mb-6">Enter your email and Grace will send a reset link.</p>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 mb-4 outline-none text-left"
        />

        <button
          disabled={busy}
          onClick={reset}
          className="w-full rounded-2xl bg-zinc-950 text-white py-4 font-black disabled:opacity-60"
        >
          {busy ? "Sending..." : "Send Reset Email"}
        </button>

        {message && (
          <p className="text-sm text-zinc-700 bg-black/5 rounded-2xl p-3 mt-4">
            {message}
          </p>
        )}

        <a href="/login" className="block text-sm text-zinc-500 mt-6">
          Back to sign in
        </a>
      </div>
    </main>
  );
}
