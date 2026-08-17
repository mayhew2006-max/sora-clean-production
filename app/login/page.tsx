"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) window.location.href = "/chat";
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

      window.location.href = "/chat";
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-md rounded-[2rem] bg-white/80 border border-black/10 shadow-2xl p-7">
        <div className="text-center mb-7">
          <img
            src="/grace-avatar.png"
            alt="Grace"
            className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg mb-4"
          />
          <h1 className="text-4xl font-black">Grace</h1>
          <p className="text-zinc-600 mt-2">Sign in to continue.</p>
        </div>

        <div className="grid grid-cols-2 bg-black/5 rounded-2xl p-1 mb-5">
          <button
            onClick={() => setMode("login")}
            className={`rounded-xl py-3 font-bold ${mode === "login" ? "bg-zinc-950 text-white" : "text-zinc-600"}`}
          >
            Sign In
          </button>
          <button
            onClick={() => setMode("signup")}
            className={`rounded-xl py-3 font-bold ${mode === "signup" ? "bg-zinc-950 text-white" : "text-zinc-600"}`}
          >
            Create
          </button>
        </div>

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 mb-3 outline-none"
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          placeholder="Password"
          className="w-full rounded-2xl border border-black/10 bg-white px-4 py-4 mb-4 outline-none"
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
        />

        <button
          disabled={busy}
          onClick={submit}
          className="w-full rounded-2xl bg-zinc-950 text-white py-4 font-black disabled:opacity-60"
        >
          {busy ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <a href="/reset-password" className="block text-center text-sm text-zinc-500 mt-4">
          Forgot password?
        </a>

        {message && (
          <p className="text-center text-sm text-zinc-700 bg-black/5 rounded-2xl p-3 mt-4">
            {message}
          </p>
        )}

        <a href="/" className="block text-center text-sm text-zinc-500 mt-6">
          Back to Grace
        </a>
      </div>
    </main>
  );
}
