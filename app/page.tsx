"use client";

import { useEffect, useState } from "react";

type ChatMessage = {
  role: string;
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey. I'm here. What's on your mind?" },
  ]);

  const [input, setInput] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setPaid(localStorage.getItem("sora_paid") === "true");
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    if (!paid && messages.length > 4) {
      window.location.href = "/pay";
      return;
    }

    const updated: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(updated);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      const data = await res.json();

      setMessages([
        ...updated,
        { role: "assistant", content: data.reply || "I'm here with you." },
      ]);
    } catch {
      setMessages([
        ...updated,
        { role: "assistant", content: "Something glitched, but I'm still here." },
      ]);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white p-4">
      <h1 className="text-3xl font-bold mb-6">Sora</h1>

      <div className="space-y-4 mb-6">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`p-4 rounded-xl max-w-xl ${
              m.role === "user" ? "ml-auto bg-white text-black" : "bg-zinc-800"
            }`}
          >
            {m.content}
          </div>
        ))}

        {loading && <p className="text-zinc-500">Sora is thinking...</p>}
      </div>

      <div className="flex gap-2">
        <input
          className="flex-1 p-3 bg-zinc-900 rounded text-white"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Talk to Sora..."
        />

        <button
          onClick={() => sendMessage(input)}
          className="px-5 bg-white text-black rounded"
        >
          Send
        </button>
      </div>
    </main>
  );
}
