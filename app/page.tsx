"use client";

import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const STRIPE_LINK = "PASTE_YOUR_STRIPE_LINK_HERE";
const FREE_LIMIT = 5;

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Home() {
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey, I'm here. What's on your mind?" },
  ]);
  const [input, setInput] = useState("");
  const [count, setCount] = useState(0);
  const [paid, setPaid] = useState(false);
  const [listening, setListening] = useState(false);
  const [loading, setLoading] = useState(false);

  const freeLeft = FREE_LIMIT - count;
  const locked = !paid && freeLeft <= 0;

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));

    const { data } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });

    return () => data.subscription.unsubscribe();
  }, []);

  async function login() {
    if (!email.trim()) return alert("Enter email");

    await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });

    alert("Check your email for login link");
  }

  function speak(text: string) {
    const utter = new SpeechSynthesisUtterance(text);
    speechSynthesis.cancel();
    speechSynthesis.speak(utter);
  }

  async function sendMessage(text?: string) {
    const msg = text || input;
    if (!msg.trim() || locked) return;

    setLoading(true);

    const newMessages = [...messages, { role: "user", content: msg }];
    setMessages(newMessages);
    setInput("");

    const res = await fetch("/api/chat", {
      method: "POST",
      body: JSON.stringify({ messages: newMessages }),
    });

    const data = await res.json();

    const reply =
      data.reply ||
      "I'm here with you. Tell me what's really going on.";

    setMessages([...newMessages, { role: "assistant", content: reply }]);
    speak(reply);

    setCount((c) => c + 1);
    setLoading(false);
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
    recognition.interimResults = true;

    let finalText = "";
    let timer: any;

    recognition.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0].transcript;

        if (e.results[i].isFinal) {
          finalText += transcript;
        }
      }

      clearTimeout(timer);

      timer = setTimeout(() => {
        if (finalText.trim()) {
          sendMessage(finalText.trim());
          finalText = "";
        }
      }, 1200);
    };

    recognition.onend = () => {
      if (listening) recognition.start();
    };

    recognition.start();
  }

  useEffect(() => {
    if (listening) startListening();
  }, [listening]);

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-4 border-b border-white/10 flex justify-between">
        <h1 className="text-xl font-bold">Sora</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setListening(!listening)}
            className="border px-3 py-1 rounded"
          >
            {listening ? "Listening ON" : "Listening OFF"}
          </button>

          <button
            onClick={() => (window.location.href = STRIPE_LINK)}
            className="border px-3 py-1 rounded"
          >
            Upgrade
          </button>
        </div>
      </header>

      {!user && (
        <div className="p-4">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter email"
            className="p-2 text-black w-full mb-2"
          />
          <button onClick={login} className="bg-white text-black px-4 py-2">
            Login
          </button>
        </div>
      )}

      <section className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i}>
            <b>{m.role}:</b> {m.content}
          </div>
        ))}
        {loading && <p>Sora is thinking...</p>}
      </section>

      {locked && (
        <div className="p-3 text-center">
          Free limit reached. Upgrade to continue.
        </div>
      )}

      <div className="p-3 flex gap-2 border-t border-white/10">
        <button onClick={() => startListening()} className="px-3">
          🎤
        </button>

        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1 p-2 text-black"
          placeholder="Talk to Sora..."
        />

        <button onClick={() => sendMessage()} className="px-4">
          Send
        </button>
      </div>
    </main>
  );
}
