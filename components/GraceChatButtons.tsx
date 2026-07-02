"use client";

import { usePathname } from "next/navigation";

export default function GraceChatButtons() {
  const pathname = usePathname();

  if (pathname !== "/chat") return null;

  return (
    <div className="fixed left-4 right-4 top-4 z-50 flex items-center justify-between pointer-events-none">
      <a
        href="/account"
        className="pointer-events-auto rounded-full border border-white/20 bg-black/80 px-5 py-3 text-sm font-semibold text-white shadow-lg backdrop-blur hover:bg-white hover:text-black transition"
      >
        My Account
      </a>

      <a
        href="/tools"
        className="pointer-events-auto rounded-full bg-fuchsia-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-fuchsia-500/40 hover:bg-fuchsia-400 transition"
      >
        Grace Tools
      </a>
    </div>
  );
}
