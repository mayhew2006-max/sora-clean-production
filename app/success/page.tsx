"use client";

import { useEffect } from "react";

export default function Success() {
  useEffect(() => {
    localStorage.setItem("sora_paid", "true");
    setTimeout(() => {
      window.location.href = "/";
    }, 1000);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <h1>Payment successful. Unlocking Sora...</h1>
    </main>
  );
}
