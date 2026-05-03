"use client";

import { useState, useEffect } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey. I'm here. What's on your mind?" },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const isPaid = localStorage.getItem("sora_paid") === "true";
    setPaid(isPaid);
  }, []);

  async function sendMessage(text) {
    if (!text.trim()) return;

    if (!paid && messages.length > 4) {
      window.location.href = "/pay";
      return;
    }

    const updated = [...messages, { role: "user", content: text }];
    setMessages(updated);
    setInput("");
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: updated }),
    });

    const data = await res.json();

    setMessages([
      ...updated,
      { role: "assistant", content: data.reply },
    ]);

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <div className="max-w-2xl mx-auto space-y-4">
        {messages.map((m, i) => (
          <div key={i} className="p-3 rounded-xl bg-zinc-800">
            {m.content}
          </div>
        ))}

        <div className="flex gap-2">
          <input
            className="flex-1 p-2 bg-zinc-900 rounded"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Talk to Sora..."
          />
          <button
            onClick={() => sendMessage(input)}
            className="px-4 bg-white text-black rounded"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
