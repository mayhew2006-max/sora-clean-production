"use client";

import { useEffect } from "react";

export default function Success() {
  useEffect(() => {
    localStorage.setItem("sora_paid", "true");
    window.location.href = "/";
  }, []);

  return <div className="text-white">Unlocking...</div>;
}
