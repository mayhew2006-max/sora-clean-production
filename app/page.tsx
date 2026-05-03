"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey… I’m here. Talk to me." },
  ]);

  const [user, setUser] = useState<any>(null);
  const [listening, setListening] = useState(false);

  // 🔐 Check auth
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
  }, []);

  // 🎤 Auto voice (no button needed)
  useEffect(() => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;

    recognition.onresult = async (event: any) => {
      const text =
        event.results[event.results.length - 1][0].transcript;

      sendMessage(text);
    };

    if (listening) recognition.start();
    else recognition.stop();

    return () => recognition.stop();
  }, [listening]);

  async function sendMessage(text: string) {
    if (!text.trim()) return;

    const updated: Message[] = [
      ...messages,
      { role: "user", content: text },
    ];

    setMessages(updated);

    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: updated }),
    });

    const data = await res.json();

    setMessages([
      ...updated,
      { role: "assistant", content: data.reply },
    ]);

    speak(data.reply);
  }

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }

  // 🚫 Not logged in
  if (!user) {
    return (
      <main className="h-screen flex items-center justify-center bg-black text-white">
        <button
          onClick={() =>
            supabase.auth.signInWithOtp({
              email: prompt("Enter your email")!,
            })
          }
          className="bg-white text-black px-6 py-3 rounded-xl"
        >
          Sign In
        </button>
      </main>
    );
  }

  return (
    <main className="h-screen bg-black text-white flex flex-col p-6">
      <h1 className="text-xl mb-4">Sora</h1>

      <div className="flex-1 overflow-y-auto space-y-2">
        {messages.map((m, i) => (
          <div key={i}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
      </div>

      <button
        onClick={() => setListening(!listening)}
        className="mt-4 bg-white text-black p-3 rounded-xl"
      >
        {listening ? "Listening…" : "Start Talking"}
      </button>
    </main>
  );
}
