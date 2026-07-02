"use client";

import { usePathname } from "next/navigation";

export default function GraceChatButtons() {
  const pathname = usePathname();

  if (pathname !== "/chat") return null;

  return (
    <div className="w-full bg-black px-4 pt-4 pb-2">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
        <a
          href="/account"
          className="rounded-full border border-white/20 bg-black/70 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-md backdrop-blur hover:bg-white hover:text-black transition"
        >
          My Account
        </a>

        <a
          href="/tools"
          className="rounded-full bg-fuchsia-500 px-4 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-fuchsia-500/30 hover:bg-fuchsia-400 transition"
        >
          Grace Tools
        </a>
      </div>
    </div>
  );
}
