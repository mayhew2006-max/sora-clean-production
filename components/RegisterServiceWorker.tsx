"use client";

import { useEffect } from "react";

export default function RegisterServiceWorker() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    async function registerGraceWorker() {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch (error) {
        console.error("Grace service worker registration failed:", error);
      }
    }

    if (document.readyState === "complete") {
      registerGraceWorker();
    } else {
      window.addEventListener("load", registerGraceWorker, { once: true });

      return () => {
        window.removeEventListener("load", registerGraceWorker);
      };
    }
  }, []);

  return null;
}
