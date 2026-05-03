"use client";

import { useEffect } from "react";

export default function Success() {
  useEffect(() => {
    localStorage.setItem("sora_paid", "true");
    window.location.href = "https://sora-app-taupe.vercel.app/";
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <h1>Unlocking Sora...</h1>
    </main>
  );
}
