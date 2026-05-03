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
  const [listening, setListening] = useState(false);

  function speak(text: string) {
    const voice = new SpeechSynthesisUtterance(text);
    voice.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(voice);
  }

  async function replyToUser(text: string) {
    if (!text.trim()) return;

    const userMessage: Message = { role: "user", content: text };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();

      const reply =
        data.reply ||
        "I hear you. Stay with me for a second — what’s weighing on you most?";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);

      speak(reply);
    } catch {
      const fallback =
        "Something glitched, but I’m still here with you.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: fallback },
      ]);

      speak(fallback);
    }
  }

  function startTalking() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      replyToUser(text);
    };

    recognition.start();
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-5 border-b border-white/10">
        <h1 className="text-4xl font-bold">Sora</h1>
      </header>

      <section className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((message, i) => (
          <div
            key={i}
            className={
              message.role === "user"
                ? "ml-auto max-w-2xl bg-white text-black rounded-3xl px-5 py-4"
                : "mr-auto max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl px-5 py-4"
            }
          >
            {message.content}
          </div>
        ))}

        {listening && (
          <p className="text-zinc-400 animate-pulse">Listening...</p>
        )}
      </section>

      <footer className="p-4 border-t border-white/10 flex gap-3">
        <button
          onClick={startTalking}
          className="bg-zinc-800 border border-white/10 px-4 rounded-2xl"
        >
          🎤
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") replyToUser(input);
          }}
          placeholder="Talk to Sora..."
          className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white"
        />

        <button
          onClick={() => replyToUser(input)}
          className="bg-white text-black rounded-2xl px-6 font-semibold"
        >
          Send
        </button>
      </footer>
    </main>
  );
}
