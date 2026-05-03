"use client";

import { useEffect, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey. I'm here. What's on your mind?" },
  ]);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const isPaid = localStorage.getItem("sora_paid") === "true";
    setPaid(isPaid);
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    if (!paid && messages.length > 4) {
      window.location.href = "/pay";
      return;
    }

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(newMessages);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
export default function Pay() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-black text-white">
      <div className="text-center">
        <h1 className="text-2xl mb-4">Unlock Sora</h1>

        <a
          href="https://buy.stripe.com/3cI4gAcfD3sVaIiflI1gs02"
          className="px-6 py-3 bg-white text-black rounded-xl"
        >
          Subscribe Now
        </a>
      </div>
    </main>
  );
}
