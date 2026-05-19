"use client";

import { useState } from "react";

const FOUNDER_CODE = "mayhew-founder-777";

export default function FounderAccess() {
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");

  function unlock() {
    if (code.trim() === FOUNDER_CODE) {
      localStorage.setItem("grace_founder", "true");
      localStorage.setItem("sora_paid", "true");
      setMessage("Founder Access unlocked. Redirecting...");
      setTimeout(() => {
        window.location.href = "/chat";
      }, 800);
    } else {
      setMessage("Wrong code.");
    }
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#2e1065,#09090f)] text-white flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white/10 border border-white/10 rounded-3xl p-8 text-center backdrop-blur">
        <h1 className="text-4xl font-bold mb-4">Grace Founder Access</h1>
        <p className="text-zinc-300 mb-6">
          Enter your founder code to unlock unlimited Grace Pro on this device.
        </p>

        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Founder code"
          className="w-full bg-black/30 border border-white/10 rounded-2xl px-4 py-4 text-white outline-none mb-4"
        />

        <button
          onClick={unlock}
          className="w-full bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 text-black rounded-2xl px-6 py-4 font-bold"
        >
          Unlock Founder Access
        </button>

        {message && <p className="mt-4 text-sm text-zinc-300">{message}</p>}
      </div>
    </main>
  );
}
