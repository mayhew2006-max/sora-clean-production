"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const FREE_LIMIT = 30;

export default function GraceChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey… I’m Grace. I’m here with you." },
  ]);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [conversationMode, setConversationMode] = useState(false);
  const [listening, setListening] = useState(false);

  const messagesRef = useRef<Message[]>(messages);
  const memoryRef = useRef("");
  const loadingRef = useRef(false);
  const conversationRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem("grace_messages");
    const savedMemory = localStorage.getItem("grace_memory");
    const savedPaid = localStorage.getItem("sora_paid");

    if (savedMessages) setMessages(JSON.parse(savedMessages));
    if (savedMemory) {
      setMemory(savedMemory);
      memoryRef.current = savedMemory;
    }
    if (savedPaid === "true") setPaid(true);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("grace_messages", JSON.stringify(messages));
  }, [messages]);

  const userCount = messages.filter((m) => m.role === "user").length;
  const freeLeft = Math.max(FREE_LIMIT - userCount, 0);
  const locked = !paid && freeLeft <= 0;

  function updateMemory(text: string) {
    const lower = text.toLowerCase();
    const important =
      lower.includes("my name is") ||
      lower.includes("remember") ||
      lower.includes("i lost") ||
      lower.includes("my dad") ||
      lower.includes("my mom") ||
      lower.includes("my daughter") ||
      lower.includes("my son") ||
      lower.includes("i feel") ||
      lower.includes("i like") ||
      lower.includes("i hate") ||
      lower.includes("i struggle") ||
      lower.includes("i miss") ||
      lower.includes("i love");

    if (!important) return;

    const updated = `${memoryRef.current}\nUser said: ${text}`.trim().slice(-3500);
    memoryRef.current = updated;
    setMemory(updated);
    localStorage.setItem("grace_memory", updated);
  }

  async function speak(text: string) {
    if (!voiceOn) return;

    try {
      audioRef.current?.pause();

      const res = await fetch("/api/speak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("Voice failed");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);

      audioRef.current = audio;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (conversationRef.current) {
          setTimeout(() => startConversationListening(), 1200);
        }
      };

      await audio.play();
    } catch {
      const fallback = new SpeechSynthesisUtterance(text);
      fallback.rate = 0.9;
      speechSynthesis.cancel();
      speechSynthesis.speak(fallback);
    }
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || loadingRef.current) return;

    if (locked) {
      window.location.href = "/pay";
      return;
    }

    updateMemory(clean);

    loadingRef.current = true;
    setLoading(true);
    recognitionRef.current?.stop();

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
        body: JSON.stringify({ messages: nextMessages, memory: memoryRef.current }),
      });

      const data = await res.json();
      const reply = data.reply || "I'm here with you. Tell me more.";

      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      await speak(reply);
    } catch {
      const reply = "Something glitched, but I'm still here with you.";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      await speak(reply);
    }

    loadingRef.current = false;
    setLoading(false);
  }

  function startConversationListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice works best in Chrome with microphone permission allowed.");
      return;
    }

    if (loadingRef.current) return;

    recognitionRef.current?.stop();

    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      sendMessage(text);
    };

    recognition.onerror = () => setListening(false);

    recognition.onend = () => {
      setListening(false);
      if (conversationRef.current && !loadingRef.current) {
        setTimeout(() => startConversationListening(), 1400);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  }

  function toggleConversationMode() {
    if (conversationRef.current) {
      conversationRef.current = false;
      setConversationMode(false);
      setListening(false);
      recognitionRef.current?.stop();
      audioRef.current?.pause();
      speechSynthesis.cancel();
      return;
    }

    conversationRef.current = true;
    setConversationMode(true);
    speak("Conversation mode is on. I’m here with you.");
  }

  function resetGrace() {
    localStorage.removeItem("grace_messages");
    localStorage.removeItem("grace_memory");
    localStorage.removeItem("sora_paid");
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-[#080711] text-white flex flex-col">
      <header className="p-5 border-b border-white/15 flex justify-between items-start">
        <div>
          <h1 className="text-5xl font-bold">Grace</h1>
          <p className="text-zinc-400 mt-2">Technology that feels more human.</p>
          <p className="text-xs text-zinc-500 mt-2">
            {paid ? "Grace Pro unlocked" : `${freeLeft} free messages left`}
          </p>
          {memory && <p className="text-xs text-blue-400 mt-1">Memory active</p>}
        </div>

        <div className="flex gap-2">
          <button onClick={() => setVoiceOn(!voiceOn)} className="border border-white/15 rounded-full px-4 py-2 text-sm">
            Voice {voiceOn ? "On" : "Off"}
          </button>

          <button
            onClick={toggleConversationMode}
            className={`rounded-full px-4 py-2 text-sm ${
              conversationMode ? "bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 text-black" : "border border-white/15"
            }`}
          >
            {conversationMode ? "Conversation On" : "Conversation Mode"}
          </button>
        </div>
      </header>

      <section className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-2xl bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 text-black rounded-3xl px-5 py-4"
                : "mr-auto max-w-2xl bg-white/10 border border-white/15 rounded-3xl px-5 py-4"
            }
          >
            {message.content}
          </div>
        ))}

        {loading && <p className="text-zinc-500 animate-pulse">Grace is thinking...</p>}
        {listening && <p className="text-blue-400 animate-pulse">Listening...</p>}
      </section>

      {locked && (
        <div className="p-4 border-t border-white/15 text-center bg-zinc-950">
          <p className="text-zinc-300 mb-3">You used your free messages. Upgrade to keep talking with Grace.</p>
          <a href="/pay" className="inline-block bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 text-black rounded-2xl px-8 py-4 font-bold">
            Upgrade Grace Pro
          </a>
        </div>
      )}

      <footer className="p-4 border-t border-white/15 flex gap-3">
        <button onClick={startConversationListening} disabled={locked} className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 text-black px-5 py-4 rounded-2xl font-bold disabled:opacity-40">
          🎤 Talk
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendMessage(input)}
          disabled={locked}
          placeholder="Say anything to Grace..."
          className="flex-1 bg-white/10 border border-white/15 rounded-2xl px-4 py-4 text-white outline-none disabled:opacity-40"
        />

        <button onClick={() => sendMessage(input)} disabled={locked} className="bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 text-black rounded-2xl px-6 font-semibold disabled:opacity-40">
          Send
        </button>

        <button onClick={resetGrace} className="text-xs text-zinc-500 px-2">
          Reset
        </button>
      </footer>
    </main>
  );
}
