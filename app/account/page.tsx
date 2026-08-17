"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AccountPage() {
  const [email, setEmail] = useState("");
  const [paid, setPaid] = useState(false);
  const [founder, setFounder] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.auth.getUser();

      if (!data.user) {
        window.location.href = "/login";
        return;
      }

      setEmail(data.user.email || "");

      const { data: usage } = await supabase
        .from("grace_user_usage")
        .select("paid, founder")
        .eq("user_id", data.user.id)
        .maybeSingle();

      setPaid(Boolean(usage?.paid));
      setFounder(Boolean(usage?.founder));
    }

    load();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    localStorage.removeItem("sora_paid");
    localStorage.removeItem("grace_founder");
    window.location.href = "/login";
  }

  return (
    <main className="min-h-screen bg-[#f7e3d3] text-zinc-950 flex items-center justify-center px-6 py-10">
      <div className="max-w-md w-full rounded-[2rem] border border-black/10 bg-white/80 shadow-2xl p-8 text-center">
        <img
          src="/grace-avatar.png"
          alt="Grace"
          className="w-24 h-24 rounded-full object-cover mx-auto border-4 border-white shadow-lg mb-4"
        />

        <h1 className="text-4xl font-black mb-2">Grace Account</h1>

        <p className="text-zinc-600 mb-4 break-all">{email || "Loading..."}</p>

        <div className="rounded-2xl bg-black/5 p-4 mb-5 text-left">
          <p className="font-bold">Status</p>
          <p className="text-sm text-zinc-600">
            {founder ? "Founder access active" : paid ? "Grace Pro active" : "Free account"}
          </p>
        </div>

        <a
          href="https://billing.stripe.com/p/login/14A3cw1AZfbD2bM6Pc1gs00"
          target="_blank"
          className="block w-full bg-zinc-950 text-white rounded-2xl py-4 font-bold mb-3"
        >
          Manage Subscription
        </a>

        <button
          onClick={logout}
          className="block w-full bg-white border border-black/10 text-zinc-950 rounded-2xl py-4 font-bold mb-3"
        >
          Sign Out
        </button>

        <a href="/chat" className="block text-zinc-500 text-sm mt-5">
          Back to Grace
        </a>
      </div>
    </main>
  );
}
