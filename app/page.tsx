"use client";

import { useState, useEffect } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey, I'm here. What's on your mind?" },
  ]);

  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);

  // 🎤 Voice recognition
  const startTalking = () => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);

    recognition.onend = () => setListening(false);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      sendMessage(text);
    };

    recognition.start();
  };

  // 💬 MAIN FUNCTION (FIXED)
  async function sendMessage(text: string) {
    if (!text.trim()) return;

    // 🔒 PAYWALL CHECK
    const isPaid =
      typeof window !== "undefined" &&
      localStorage.getItem("sora_paid") === "true";

    if (!isPaid && messages.length > 4) {
      window.location.href = "/pay";
      return;
    }

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(newMessages);
    setInput("");

    // 🤖 FAKE AI REPLY (replace later with API)
    const reply = "I hear you. Tell me more about that.";

    setMessages([
      ...newMessages,
      { role: "assistant", content: reply },
    ]);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-5 border-b border-white/10">
        <h1 className="text-xl font-bold">Sora</h1>
      </header>

      <section className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-xl bg-white text-black rounded-3xl px-5 py-4"
                : "mr-auto max-w-xl bg-zinc-900 border border-white/10 rounded-3xl px-5 py-4"
            }
          >
            {m.content}
          </div>
        ))}

        {listening && (
          <p className="text-zinc-400 animate-pulse">Listening...</p>
        )}
      </section>

      <footer className="p-4 border-t border-white/10 flex gap-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Talk to Sora..."
          className="flex-1 bg-zinc-900 border border-white/10 px-4 py-2 rounded-xl"
        />

        <button
          onClick={() => sendMessage(input)}
          className="bg-white text-black px-4 py-2 rounded-xl"
        >
          Send
        </button>

        <button
          onClick={startTalking}
          className="bg-zinc-800 border border-white/10 px-4 py-2 rounded-xl"
        >
          🎤
        </button>
      </footer>
    </main>
  );
}
