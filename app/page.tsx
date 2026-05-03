"use client";

import { useEffect, useRef, useState } from "react";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const FREE_LIMIT = 20;
const STRIPE_LINK = "https://buy.stripe.com/14A3cw1AZfbD2bM6Pc1gs00";

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "assistant", content: "Hey. I'm here. What's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [alwaysListening, setAlwaysListening] = useState(false);
  const [listening, setListening] = useState(false);

  const messagesRef = useRef<ChatMessage[]>(messages);
  const loadingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const alwaysRef = useRef(false);

  useEffect(() => {
    const savedMessages = localStorage.getItem("sora_messages");
    const savedPaid = localStorage.getItem("sora_paid");

    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedPaid === "true") setPaid(true);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("sora_messages", JSON.stringify(messages));
  }, [messages]);

  const userMessages = messages.filter((m) => m.role === "user").length;
  const freeLeft = Math.max(FREE_LIMIT - userMessages, 0);
  const locked = !paid && freeLeft <= 0;

  function speak(text: string) {
    if (!voiceOn) return;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
  }

  async function sendMessage(text: string) {
    const cleanText = text.trim();
    if (!cleanText || loadingRef.current) return;

    if (locked) {
      window.location.href = "/pay";
      return;
    }

    loadingRef.current = true;
    setLoading(true);

    const updated: ChatMessage[] = [
      ...messagesRef.current,
      { role: "user", content: cleanText },
    ];

    setMessages(updated);
    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updated }),
      });

      const data = await res.json();
      const reply =
        data.reply || "I'm here with you. Tell me what's really going on.";

      const finalMessages: ChatMessage[] = [
        ...updated,
        { role: "assistant", content: reply },
      ];

      setMessages(finalMessages);
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

    loadingRef.current = false;
    setLoading(false);
  }

  function startVoice(continuous: boolean) {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Speech recognition is not supported on this browser.");
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = continuous;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const result = event.results[event.results.length - 1];
      if (!result?.isFinal) return;

      const text = result[0].transcript;
      sendMessage(text);
    };

    recognition.onerror = () => setListening(false);

    recognition.onend = () => {
      setListening(false);
      if (alwaysRef.current) {
        setTimeout(() => startVoice(true), 700);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function toggleAlwaysListening() {
    if (alwaysListening) {
      alwaysRef.current = false;
      setAlwaysListening(false);
      recognitionRef.current?.stop();
      setListening(false);
    } else {
      alwaysRef.current = true;
      setAlwaysListening(true);
      startVoice(true);
    }
  }

  function resetSora() {
    localStorage.removeItem("sora_messages");
    localStorage.removeItem("sora_paid");
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#27272a,#09090b_45%,#000)] text-white flex flex-col">
      <header className="p-5 border-b border-white/10 flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Sora</h1>
          <p className="text-sm text-zinc-400">
            {paid ? "Premium unlocked" : `${freeLeft} free messages left`}
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setVoiceOn(!voiceOn)}
            className="border border-white/15 bg-white/5 px-4 py-2 rounded-full text-sm"
          >
            Voice {voiceOn ? "On" : "Off"}
          </button>

          <button
            onClick={toggleAlwaysListening}
            className={`border px-4 py-2 rounded-full text-sm ${
              alwaysListening
                ? "bg-white text-black border-white"
                : "bg-white/5 border-white/15"
            }`}
          >
            {alwaysListening ? "Hands-Free On" : "Hands-Free"}
          </button>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-2xl px-5 py-4 rounded-3xl shadow ${
              m.role === "user"
                ? "ml-auto bg-white text-black"
                : "mr-auto bg-zinc-900/90 border border-white/10"
            }`}
          >
            {m.content}
          </div>
        ))}

        {loading && (
          <div className="text-zinc-500 text-sm">Sora is thinking...</div>
        )}

        {listening && (
          <div className="text-zinc-400 text-sm animate-pulse">
            Listening...
          </div>
        )}
      </section>

      {locked && (
        <div className="p-4 border-t border-white/10 bg-black/80 text-center">
          <p className="text-zinc-300 mb-3">
            You used your free messages. Upgrade to keep talking with Sora.
          </p>
          <a
            href="/pay"
            className="inline-block bg-white text-black px-8 py-4 rounded-2xl font-semibold"
          >
            Upgrade Now
          </a>
        </div>
      )}

      <div className="p-4 border-t border-white/10 flex gap-3">
        <button
          onClick={() => startVoice(false)}
          disabled={locked}
          className="bg-zinc-800 border border-white/10 px-4 rounded-2xl disabled:opacity-50"
        >
          🎤
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          disabled={locked}
          placeholder={locked ? "Upgrade to continue..." : "Talk to Sora..."}
          className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white outline-none disabled:opacity-50"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={locked}
          className="bg-white text-black rounded-2xl px-6 font-semibold disabled:opacity-50"
        >
          Send
        </button>

        <button
          onClick={resetSora}
          className="text-xs text-zinc-500 px-2"
        >
          Reset
        </button>
      </div>
    </main>
  );
}
