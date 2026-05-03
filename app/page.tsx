"use client";

import { useEffect, useRef, useState } from "react";

const STRIPE_LINK = "https://buy.stripe.com/14A3cw1AZfbD2bM6Pc1gs00";
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
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [alwaysListening, setAlwaysListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem("sora_messages");
    const savedCount = localStorage.getItem("sora_count");
    const savedPaid = localStorage.getItem("sora_paid");

    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedCount) setCount(Number(savedCount));
    if (savedPaid === "true") setPaid(true);
  }, []);

  useEffect(() => {
    localStorage.setItem("sora_messages", JSON.stringify(messages));
    localStorage.setItem("sora_count", String(count));
  }, [messages, count]);

  const freeLeft = Math.max(FREE_LIMIT - count, 0);
  const locked = !paid && freeLeft <= 0;

  function speak(text: string) {
    if (!voiceOn) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  function startListening(auto = false) {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported on this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.continuous = auto;

    recognition.onresult = (event: any) => {
      const text = event.results[event.results.length - 1][0].transcript;
      setInput(text);
      if (auto) setTimeout(() => sendMessage(text), 300);
    };

    recognition.onend = () => {
      if (alwaysListening && auto) recognition.start();
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function toggleAlwaysListening() {
    if (alwaysListening) {
      recognitionRef.current?.stop();
      setAlwaysListening(false);
    } else {
      setAlwaysListening(true);
      startListening(true);
    }
  }

  async function sendMessage(forcedText?: string) {
    const text = (forcedText || input).trim();
    if (!text || loading || locked) return;

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setInput("");
    setMessages(newMessages);
    setCount((prev) => prev + 1);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: newMessages }),
    });

    const data = await res.json();
    const reply = data.reply || "I'm here with you. Tell me more.";

    setMessages([...newMessages, { role: "assistant", content: reply }]);
    speak(reply);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-5 border-b border-white/10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold">Sora</h1>
          <p className="text-sm text-zinc-400">
            {paid ? "Premium unlocked" : `${freeLeft} free messages left`}
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setVoiceOn(!voiceOn)} className="border border-white/20 px-4 py-2 rounded-full">
            Voice {voiceOn ? "On" : "Off"}
          </button>

          <button onClick={toggleAlwaysListening} className="border border-white/20 px-4 py-2 rounded-full">
            {alwaysListening ? "Always Listening On" : "Always Listening Off"}
          </button>
        </div>
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
        <div className="p-4 border-t border-white/10">
          <p className="text-center text-zinc-300 mb-3">
            You used your free messages. Upgrade to keep talking with Sora.
          </p>
          <a href={STRIPE_LINK} className="block text-center bg-white text-black py-4 rounded-xl font-semibold">
            Upgrade Now
          </a>
        </div>
      )}

      <div className="p-4 border-t border-white/10 flex gap-3">
        <button onClick={() => startListening(false)} disabled={locked} className="bg-zinc-800 px-4 rounded-xl">
          🎙️
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          disabled={locked}
          placeholder={locked ? "Upgrade to continue..." : "Talk to Sora..."}
          className="flex-1 bg-zinc-900 border border-white/10 rounded-xl px-4 py-4 text-white"
        />

        <button onClick={() => sendMessage()} disabled={locked} className="bg-white text-black rounded-xl px-6 font-semibold">
          Send
        </button>
      </div>
    </main>
  );
}
