"use client";

import { useEffect, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const FREE_LIMIT = 5;

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey. I'm here. What's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    setPaid(localStorage.getItem("sora_paid") === "true");
  }, []);

  const userMessages = messages.filter((m) => m.role === "user").length;
  const locked = !paid && userMessages >= FREE_LIMIT;

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    if (locked) {
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
      const reply = data.reply || "I'm here with you.";

      setMessages([
        ...updated,
        { role: "assistant", content: reply },
      ]);

      speak(reply);
    } catch {
      setMessages([
        ...updated,
        {
          role: "assistant",
          content: "Something glitched, but I'm still here with you.",
        },
      ]);
    }

    setLoading(false);
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported on this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      sendMessage(text);
    };

    recognition.start();
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-5 border-b border-white/10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Sora</h1>
          <p className="text-sm text-zinc-400">
            {paid ? "Premium unlocked" : `${Math.max(FREE_LIMIT - userMessages, 0)} free messages left`}
          </p>
        </div>

        <button
          onClick={startListening}
          className="border border-white/20 px-4 py-2 rounded-full text-sm"
        >
          {listening ? "Listening..." : "Talk 🎤"}
        </button>
      </header>

      <section className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-2xl px-5 py-4 rounded-2xl ${
              m.role === "user"
                ? "ml-auto bg-white text-black"
                : "mr-auto bg-zinc-900 border border-white/10"
            }`}
          >
            {m.content}
          </div>
        ))}

        {loading && <p className="text-zinc-500">Sora is thinking...</p>}
      </section>

      {locked && (
        <div className="p-4 border-t border-white/10 text-center">
          <p className="mb-3">You used your free messages. Upgrade to keep talking.</p>
          <a
            href="/pay"
            className="inline-block bg-white text-black px-6 py-3 rounded-xl font-semibold"
          >
            Upgrade Now
          </a>
        </div>
      )}

      <div className="p-4 border-t border-white/10 flex gap-3">
        <button
          onClick={startListening}
          disabled={locked}
          className="bg-zinc-800 px-4 rounded-xl disabled:opacity-50"
        >
          🎤
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          disabled={locked}
          placeholder={locked ? "Upgrade to continue..." : "Talk to Sora..."}
          className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-4 text-white disabled:opacity-50"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={locked}
          className="bg-white text-black rounded-xl px-6 font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </main>
  );
}
