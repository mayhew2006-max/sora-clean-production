"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/field";
    });
  }, []);

  async function submit() {
    setBusy(true);
    setMessage("");

    try {
      if (!email.trim() || !password.trim()) {
        setMessage("Enter your email and password.");
        return;
      }

      if (mode === "signup" && password.length < 6) {
        setMessage("Password must be at least 6 characters.");
        return;
      }

      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/chat`,
          },
        });

        if (error) {
          setMessage(error.message);
          return;
        }

        setMessage("Account created. Check your email if confirmation is required, then sign in.");
        setMode("login");
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setMessage(error.message);
        return;
      }

      window.location.href = "/field";
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-gradient-to-br from-[#10221b] via-[#0c1915] to-[#08130e] text-[#f2e9d7] flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-[#10221b]/95 border border-[#dfbf7f]/35 shadow-2xl shadow-black/40 p-7">
        <div className="text-center mb-7">
          <img
            src="/grace-avatar.png"
            alt="Grace"
            className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-[#dfbf7f] shadow-lg mb-4"
          />
          <h1 className="text-4xl font-black">Grace <span className="text-[#dfbf7f]">Field</span></h1>
          <p className="text-[#b6bba9] mt-2">Sign in to continue.</p>
        </div>

        <div className="grid grid-cols-2 bg-[#08130e] border border-[#dfbf7f]/20 rounded-2xl p-1 mb-5">
          <button
            onClick={() => setMode("login")}
            className={`rounded-xl py-3 font-bold ${mode === "login" ? "bg-[#dfbf7f] text-[#08130e]" : "text-[#b6bba9]"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-xl py-3 font-bold ${mode === "signup" ? "bg-[#dfbf7f] text-[#08130e]" : "text-[#b6bba9]"}`}
          >
            Create
          </button>
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-2xl border border-[#dfbf7f]/35 bg-[#08130e] text-[#f2e9d7] placeholder:text-[#b6bba9] px-4 py-4 mb-3 outline-none focus-visible:ring-2 focus-visible:ring-[#dfbf7f]"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type={showPassword ? "text" : "password"}
          placeholder="Password"
          className="w-full rounded-2xl border border-[#dfbf7f]/35 bg-[#08130e] text-[#f2e9d7] placeholder:text-[#b6bba9] px-4 py-4 mb-2 outline-none focus-visible:ring-2 focus-visible:ring-[#dfbf7f]"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />

        <label className="mb-4 flex items-center gap-2 text-sm text-[#b6bba9]">
          <input
            type="checkbox"
            checked={showPassword}
            onChange={(e) => setShowPassword(e.target.checked)}
            className="h-4 w-4"
          />
          Show password
        </label>

        <button
          disabled={busy}
          onClick={submit}
          className="w-full rounded-2xl bg-[#dfbf7f] hover:bg-[#ffda8b] text-[#08130e] py-4 font-black disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#dfbf7f] focus-visible:ring-offset-[#10221b]"
        >
          {busy ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <a href="/reset-password" className="block text-center text-sm text-[#dfbf7f] hover:text-[#ffda8b] mt-4">
          Forgot password?
        </a>
        {mode === "login" && (
          <p className="mt-2 text-center text-xs leading-relaxed text-[#c5b18a]">
            Reset email not showing up? Check your Spam or Promotions folder.
          </p>
        )}

        {message && (
          <p className="text-center text-sm text-[#f2e9d7] bg-[#08130e] border border-[#dfbf7f]/20 rounded-2xl p-3 mt-4">
            {message}
          </p>
        )}

        <a href="/" className="block text-center text-sm text-[#b6bba9] hover:text-[#dfbf7f] mt-6">
          Back to Grace
        </a>
      </div>
    </main>
  );
}
