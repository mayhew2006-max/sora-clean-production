"use client";

import { useEffect, useState } from "react";

const STRIPE_LINK = "https://buy.stripe.com/14A3cw1AZfbd2bM6Pc1gs00";
const FREE_LIMIT = 20;

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey, I'm here. What's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [count, setCount] = useState(0);
  const [paid, setPaid] = useState(false);
  const [voiceon, setVoiceon] = useState(true);
  const [listening, setListening] = useState(false);

  const freeLeft = FREE_LIMIT - count;
  const locked = !paid && freeLeft <= 0;

  async function sendMessage(text?: string) {
    const msg = text || input;
    if (!msg.trim()) return;

    if (locked) {
      window.location.href = STRIPE_LINK;
      return;
    }

    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setInput("");
    setCount((c) => c + 1);

    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: newMessages }),
    });

    const data = await res.json();

    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: data.reply },
    ]);

    speak(data.reply);
  }

  function speak(text: string) {
    if (!voiceon) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  function startListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech not supported");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);

    recognition.onresult = (e: any) => {
      const text = e.results[0][0].transcript;
      sendMessage(text);
    };

    recognition.start();
  }

  useEffect(() => {
    if (!listening) return;

    const interval = setInterval(() => {
      startListening();
    }, 4000);

    return () => clearInterval(interval);
  }, [listening]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-5 flex justify-between">
        <h1 className="text-2xl font-bold">Sora</h1>
        <div className="flex gap-3 text-sm">
          <button onClick={() => setVoiceon(!voiceon)}>
            Voice {voiceon ? "On" : "Off"}
          </button>
          <button onClick={() => setListening(!listening)}>
            Always Listening {listening ? "On" : "Off"}
          </button>
        </div>
      </header>

      <section className="flex-1 p-5 space-y-4 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-xl p-4 rounded-xl ${
              m.role === "user"
                ? "ml-auto bg-white text-black"
                : "bg-zinc-800"
            }`}
          >
            {m.content}
          </div>
        ))}
      </section>

      {locked && (
        <div className="p-4 text-center border-t border-white/10">
          <p>You used your free messages.</p>
          <button
            onClick={() => (window.location.href = STRIPE_LINK)}
            className="mt-2 bg-white text-black px-4 py-2 rounded"
          >
            Upgrade
          </button>
        </div>
      )}

      <div className="p-4 flex gap-2">
        <button onClick={startListening}>🎤</button>
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 bg-zinc-900 p-3 rounded"
          placeholder="Talk to Sora..."
          disabled={locked}
        />
        <button onClick={() => sendMessage()}>Send</button>
      </div>
    </main>
  );
}
