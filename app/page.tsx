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
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);
  const [paid, setPaid] = useState(false);

  useEffect(() => {
    const isPaid = localStorage.getItem("sora_paid") === "true";
    setPaid(isPaid);
  }, []);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    if (!paid && messages.length > 4) {
      window.location.href = "/pay";
      return;
    }

    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(newMessages);
    setLoading(true);

    const res = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: newMessages }),
    });

    const data = await res.json();

    const updated = [
      ...newMessages,
      { role: "assistant", content: data.reply },
    ];

    setMessages(updated);
    speak(data.reply);
    setLoading(false);
  }

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
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
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const text =
        event.results[event.results.length - 1][0].transcript;
      sendMessage(text);
    };

    recognition.start();
    setListening(true);
  }

  function stopListening() {
    setListening(false);
    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex justify-between">
        <h1 className="text-xl font-bold">Sora</h1>

        <button
          onClick={() =>
            listening ? stopListening() : startListening()
          }
          className="px-3 py-1 border border-white/20 rounded-full text-sm"
        >
          {listening ? "Stop Listening" : "Always Listening"}
        </button>
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
    </main>
  );
}
