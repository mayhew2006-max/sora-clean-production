"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey. I'm here. What's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  async function sendMessage(msg?: string) {
    const text = msg || input;
    if (!text.trim()) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(newMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: newMessages }),
      });

      const data = await res.json();

      setMessages([
        ...newMessages,
        { role: "assistant", content: data.reply },
      ]);
    } catch (err) {
      setMessages([
        ...newMessages,
        { role: "assistant", content: "Something went wrong." },
      ]);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between">
        <h1 className="text-xl font-bold">Sora</h1>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-xl px-4 py-3 rounded-2xl ${
              m.role === "user"
                ? "ml-auto bg-white text-black"
                : "mr-auto bg-zinc-900 border border-white/10"
            }`}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <p className="text-zinc-500 text-sm">Sora is thinking...</p>
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-white/10 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          placeholder="Talk to Sora..."
          className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-3 text-white outline-none"
        />

        <button
          onClick={() => sendMessage()}
          className="px-4 py-2 bg-white text-black rounded-xl"
        >
          Send
        </button>
      </div>
    </main>
  );
}
