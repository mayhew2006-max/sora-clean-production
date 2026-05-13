"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const FREE_LIMIT = 50;

export default function GraceChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey… I’m Grace. I’m here with you." },
  ]);

  const [input, setInput] = useState("");
  const [memory, setMemory] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const [wakeMode, setWakeMode] = useState(false);
  const [listening, setListening] = useState(false);

  const messagesRef = useRef<Message[]>(messages);
  const memoryRef = useRef("");
  const loadingRef = useRef(false);

  const wakeModeRef = useRef(false);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
const bottomRef = useRef<HTMLDivElement | null>(null);

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

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "end",
      });
    }, 100);
  }, [messages, loading, listening]);

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
      lower.includes("i struggle") ||
      lower.includes("i miss");

    if (!important) return;

    const updated =
      `${memoryRef.current}\nUser said: ${text}`
        .trim()
        .slice(-3500);

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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) throw new Error("voice failed");

      const blob = await res.blob();

      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);

      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);

        // wake loop removed for stability
      };

      await audio.play();
    } catch {
      const fallback = new SpeechSynthesisUtterance(text);

      fallback.rate = 0.92;

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

    recognitionRef.current?.stop();

    updateMemory(clean);

    loadingRef.current = true;

    setLoading(true);

    const nextMessages: Message[] = [
      ...messagesRef.current,
      {
        role: "user",
        content: clean,
      },
    ];

    setMessages(nextMessages);

    setInput("");

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          memory: memoryRef.current,
        }),
      });

      const data = await res.json();

      const reply =
        data.reply ||
        "I’m here with you.";

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: reply,
        },
      ]);

      await speak(reply);
    } catch {
      const reply =
        "Something glitched, but I’m still here.";

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: reply,
        },
      ]);

      await speak(reply);
    }

    loadingRef.current = false;

    setLoading(false);
  }

  function startWakeListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Chrome microphone permission required.");
      return;
    }

    if (loadingRef.current) return;

    recognitionRef.current?.stop();

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = async (event: any) => {
      const text =
        event.results[0][0].transcript;

      const lower = text.toLowerCase();

      if (
        lower.includes("grace") ||
        lower.includes("hey grace")
      ) {
        await speak(
          getGreeting()
        );

        setTimeout(() => {
          startConversationCapture();
        }, 1500);
      } else {
        // wake loop removed for stability
      }
    };

    recognition.onerror = () => {
      setListening(false);

      if (wakeModeRef.current) {
        setTimeout(() => {
          startWakeListening();
        }, 1500);
      }
    };

    recognition.onend = () => {
      setListening(false);

      if (
        wakeModeRef.current &&
        !loadingRef.current
      ) {
        setTimeout(() => {
          startWakeListening();
        }, 1000);
      }
    };

    recognitionRef.current = recognition;

    recognition.start();
  }

  function startConversationCapture() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";

    recognition.continuous = false;

    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const text =
        event.results[0][0].transcript;

      sendMessage(text);
    };

    recognition.onerror = () => {
      if (wakeModeRef.current) {
        startWakeListening();
      }
    };

    recognition.onend = () => {
      if (
        wakeModeRef.current &&
        !loadingRef.current
      ) {
        startWakeListening();
      }
    };

    recognition.start();
  }

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour < 12) {
      return "Good morning. I’m here.";
    }

    if (hour < 18) {
      return "Good afternoon. What’s on your mind?";
    }

    return "Good evening. I’m listening.";
  }

  function toggleWakeMode() {
    if (wakeModeRef.current) {
      wakeModeRef.current = false;

      setWakeMode(false);

      setListening(false);

      recognitionRef.current?.stop();

      audioRef.current?.pause();

      speechSynthesis.cancel();

      return;
    }

    wakeModeRef.current = false;

    setWakeMode(false);

    speak(
      "Talk to Grace is now active."
    );

    setTimeout(() => {
      startWakeListening();
    }, 1500);
  }

  function resetGrace() {
    localStorage.removeItem(
      "grace_messages"
    );

    localStorage.removeItem(
      "grace_memory"
    );

    localStorage.removeItem(
      "sora_paid"
    );

    window.location.reload();
  }

  return (
    <main className="min-h-[100dvh] bg-[radial-gradient(circle_at_top,#312e81_0%,#140f2d_35%,#09090f_100%)] text-white flex flex-col">

      <header className="p-5 border-b border-white/10 flex justify-between items-start">

        <div>
          <h1 className="text-5xl font-bold">
            Grace
          </h1>

          <p className="text-zinc-300 mt-2">
            Technology that feels more human.
          </p>

          <p className="text-xs text-zinc-400 mt-2">
            {paid
              ? "Grace Pro unlocked"
              : `${freeLeft} free messages left`}
          </p>

          {memory && (
            <p className="text-xs text-cyan-300 mt-1">
              Memory active
            </p>
          )}
        </div>

        <div className="flex gap-2">

          <button
            onClick={() =>
              setVoiceOn(!voiceOn)
            }
            className="border border-white/10 bg-white/70 rounded-full px-4 py-2 text-sm shadow-sm"
          >
            Voice {voiceOn ? "On" : "Off"}
          </button>

          <button
            onClick={startConversationCapture}
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              wakeMode
                ? "bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 text-black"
                : "border border-white/10 bg-white/70 shadow-sm"
            }`}
          >
            "Talk to Grace"
          </button>

        </div>
      </header>

      <section className="flex-1 min-w-0 bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-zinc-400 outline-none disabled:opacity-40">

        {messages.map((message, index) => (
          <div
            key={index}
            className={
              message.role === "user"
                ? "ml-auto max-w-2xl bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 text-black rounded-3xl px-5 py-4 shadow-xl"
                : "mr-auto max-w-2xl bg-white/10 backdrop-blur border border-white/10 text-white rounded-3xl px-5 py-4 shadow-xl"
            }
          >
            {message.content}
          </div>
        ))}

        {loading && (
          <p className="text-zinc-300 animate-pulse">
            Grace is thinking...
          </p>
        )}

        {listening && (
          <p className="text-cyan-300 animate-pulse">
            Ready when you are.
          </p>
        )}

      <div ref={bottomRef} />
      </section>

      {locked && (
        <div className="p-4 border-t border-white/10 text-center bg-black/30 backdrop-blur">
          <p className="text-zinc-300 mb-3">
            You used your free messages.
            Upgrade to keep talking with Grace.
          </p>

          <a
            href="/pay"
            className="inline-block bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 text-black rounded-2xl px-8 py-4 font-bold"
          >
            Upgrade Grace Pro
          </a>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 z-20 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] border-t border-white/10 bg-[#09090f]/95 backdrop-blur flex gap-2 items-end">

        <button
          onClick={startConversationCapture}
          disabled={locked}
          className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 text-black px-4 py-3 rounded-2xl font-bold disabled:opacity-40"
        >
          🎤 Talk
        </button>

        <textarea
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          disabled={locked}
          rows={1}
          placeholder="Say anything to Grace..."
          className="flex-1 min-w-0 max-h-32 resize-none bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-zinc-400 outline-none disabled:opacity-40"
        />

        <button
          onClick={() =>
            sendMessage(input)
          }
          disabled={locked}
          className="bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 text-black rounded-2xl px-4 py-3 font-semibold disabled:opacity-40"
        >
          Send
        </button>

      </footer>
    </main>
  );
}
