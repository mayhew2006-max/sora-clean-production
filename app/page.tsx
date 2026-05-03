"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const FREE_LIMIT = 6;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey. I'm here. What's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [listening, setListening] = useState(false);

  const messagesRef = useRef<Message[]>(messages);

  useEffect(() => {
    setPaid(localStorage.getItem("sora_paid") === "true");
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const userCount = messages.filter((m) => m.role === "user").length;
  const freeLeft = Math.max(FREE_LIMIT - userCount, 0);
  const locked = !paid && freeLeft <= 0;

  function speak(text: string) {
    if (!voiceOn) return;
    const voice = new SpeechSynthesisUtterance(text);
    voice.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(voice);
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || loading) return;

    if (locked) {
      window.location.href = "/pay";
      return;
    }

    setLoading(true);

    const nextMessages: Message[] = [
      ...messagesRef.current,
      { role: "user", content: clean },
    ];

    setMessages(nextMessages);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: nextMessages }),
      });

      const data = await res.json();
      const reply = data.reply || "I'm here with you. Tell me more.";

      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      speak(reply);
    } catch {
      const reply = "Something glitched, but I'm still here with you.";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      speak(reply);
    }

    setLoading(false);
  }

  function startMic() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition works best in Chrome with microphone permission allowed.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      sendMessage(text);
    };

    recognition.start();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#262626,#09090b_45%,#000)] text-white flex flex-col">
      <header className="p-5 border-b border-white/10 flex justify-between items-start">
        <div>
          <h1 className="text-5xl font-bold tracking-tight">Sora</h1>
          <p className="text-zinc-400 mt-2">Someone to talk to without judgment.</p>
          <p className="text-xs text-zinc-500 mt-2">
            {paid ? "Sora Pro unlocked" : `${freeLeft} free messages left`}
          </p>
        </div>

        <button
          onClick={() => setVoiceOn(!voiceOn)}
          className="border border-white/10 rounded-full px-4 py-2 text-sm"
        >
          Voice {voiceOn ? "On" : "Off"}
        </button>
      </header>

      <section className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-2xl bg-white text-black rounded-3xl px-5 py-4 shadow-xl"
                : "mr-auto max-w-2xl bg-zinc-900 border border-white/10 rounded-3xl px-5 py-4"
            }
          >
            {message.content}
          </div>
        ))}

        {loading && <p className="text-zinc-500 animate-pulse">Sora is thinking...</p>}
        {listening && <p className="text-blue-400 animate-pulse">Listening...</p>}
      </section>

      {locked && (
        <div className="p-4 border-t border-white/10 text-center bg-zinc-950">
          <p className="text-zinc-300 mb-3">Your free trial is over. Upgrade to keep talking.</p>
          <a
            href="/pay"
            className="inline-block bg-white text-black rounded-2xl px-8 py-4 font-bold"
          >
            Upgrade Sora Pro
          </a>
        </div>
      )}

      <footer className="p-4 border-t border-white/10 flex gap-3">
        <button
          onClick={startMic}
          disabled={locked}
          className="bg-blue-600 text-white px-5 py-4 rounded-2xl font-bold disabled:opacity-40"
        >
          🎤 Talk
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          disabled={locked}
          placeholder="Talk to Sora..."
          className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white outline-none disabled:opacity-40"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={locked}
          className="bg-white text-black rounded-2xl px-6 font-semibold disabled:opacity-40"
        >
          Send
        </button>
      </footer>
    </main>
  );
}
