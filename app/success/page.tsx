"use client";

import { useEffect } from "react";

export default function Success() {
  useEffect(() => {
    const timer = setTimeout(() => {
      window.location.href = "/chat";
    }, 2500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-6">
      <div className="max-w-md w-full bg-white/85 border border-black/10 rounded-[2rem] p-8 text-center shadow-2xl">
        <h1 className="text-3xl font-black mb-3">Payment successful</h1>
        <p className="text-zinc-600">
          Grace is activating your Pro account now. You’ll return to Grace in a moment.
        </p>
      </div>
    </main>
  );
}
