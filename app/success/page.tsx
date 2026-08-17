"use client";

import { useEffect } from "react";

export default function Success() {
  useEffect(() => {
    localStorage.setItem("sora_paid", "true");
    window.location.href = "/chat";
  }, []);

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center">
      <h1>Payment successful. Unlocking Grace...</h1>
    </main>
  );
}
