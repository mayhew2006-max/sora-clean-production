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
  const [input, setInput] = useState("");
  const [listening, setListening] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    setPaid(localStorage.getItem("sora_paid") === "true");
  }, []);

  function speak(text: string) {
    const voice = new SpeechSynthesisUtterance(text);
    voice.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(voice);
  }

  function sendMessage(text: string) {
    if (!text.trim()) return;

    const userCount = messages.filter((m) => m.role === "user").length;

    if (!paid && userCount >= 4) {
      window.location.href = "/pay";
      return;
    }

    const reply =
      "I hear you. Stay with me for a second — what part of that is weighing on you the most?";

    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: reply },
    ]);

    setInput("");
    speak(reply);
  }

  function startTalking() {
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#27272a,#09090b_45%,#000)] text-white flex flex-col">
      <header className="p-5 border-b border-white/10">
        <h1 className="text-5xl font-bold">Sora</h1>
        <p className="text-zinc-400 mt-2">Someone to talk to without judgment.</p>
        <p className="text-xs text-zinc-500 mt-2">
          {paid ? "Sora Pro unlocked" : "Free trial active"}
        </p>
      </header>

      <section className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-2xl bg-white text-black rounded-3xl px-5 py-4"
                : "mr-auto max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl px-5 py-4"
            }
          >
            {message.content}
          </div>
        ))}

        {listening && <p className="text-zinc-400 animate-pulse">Listening...</p>}
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
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          placeholder="Talk to Sora..."
          className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white outline-none"
        />

        <button
          onClick={() => sendMessage(input)}
          className="bg-white text-black rounded-2xl px-6 font-semibold"
        >
          Send
        </button>
      </footer>
    </main>
  );
}
