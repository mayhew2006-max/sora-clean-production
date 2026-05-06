"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const FREE_LIMIT = 30;

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey… I’m Grace. I’m here with you." },
  ]);

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [wakeMode, setWakeMode] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const loadingRef = useRef(false);
  const wakeModeRef = useRef(false);

  useEffect(() => {
    wakeModeRef.current = wakeMode;
  }, [wakeMode]);

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

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);

        if (wakeModeRef.current) {
          setTimeout(() => {
            startWakeListening();
          }, 800);
        }
      };

      await audio.play();
    } catch {
      console.log("voice failed");
    }
  }

  function getGreeting() {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      return "Good morning. I’m here with you.";
    }

    if (hour >= 12 && hour < 17) {
      return "Good afternoon. I’m here with you.";
    }

    if (hour >= 17 && hour < 22) {
      return "Good evening. I’m here with you.";
    }

    return "Hey… I’m here with you.";
  }

  async function sendMessage(text: string) {
    if (!text.trim() || loadingRef.current) return;

    loadingRef.current = true;
    setLoading(true);

    recognitionRef.current?.stop();

    const nextMessages: Message[] = [
      ...messages,
      {
        role: "user",
        content: text,
      },
    ];

    setMessages(nextMessages);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
        }),
      });

      const data = await res.json();

      const reply =
        data.reply || "I’m here with you.";

      const updated: Message[] = [
        ...nextMessages,
        {
          role: "assistant",
          content: reply,
        },
      ];

      setMessages(updated);

      await speak(reply);
    } catch {
      const updated: Message[] = [
        ...nextMessages,
        {
          role: "assistant",
          content: "Something glitched, but I’m still here.",
        },
      ];

      setMessages(updated);
    }

    loadingRef.current = false;
    setLoading(false);
  }

  function startWakeListening() {
    if (!wakeModeRef.current) return;

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Use Chrome for Wake Mode.");
      return;
    }

    recognitionRef.current?.stop();

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript =
        event.results[event.results.length - 1][0]
          .transcript
          .toLowerCase();

      console.log(transcript);

      const wakeDetected =
        transcript.includes("grace") ||
        transcript.includes("hey grace");

      if (wakeDetected) {
        recognition.stop();

        const greeting = getGreeting();

        await speak(greeting);

        setTimeout(() => {
          startConversationListening();
        }, 1200);
      }
    };

    recognition.onend = () => {
      setListening(false);

      if (wakeModeRef.current && !loadingRef.current) {
        setTimeout(() => {
          startWakeListening();
        }, 1200);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    recognition.start();
  }

  function startConversationListening() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    const recognition = new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setListening(true);
    };

    recognition.onresult = async (event: any) => {
      const transcript =
        event.results[0][0].transcript;

      await sendMessage(transcript);
    };

    recognition.onend = () => {
      setListening(false);

      if (wakeModeRef.current && !loadingRef.current) {
        setTimeout(() => {
          startWakeListening();
        }, 1200);
      }
    };

    recognition.onerror = () => {
      setListening(false);
    };

    recognitionRef.current = recognition;

    recognition.start();
  }

  function toggleWakeMode() {
    if (wakeModeRef.current) {
      wakeModeRef.current = false;
      setWakeMode(false);
      recognitionRef.current?.stop();
      return;
    }

    wakeModeRef.current = true;
    setWakeMode(true);

    speak("Wake mode activated.");

    setTimeout(() => {
      startWakeListening();
    }, 1200);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col">
      <header className="p-5 border-b border-white/10">
        <h1 className="text-5xl font-bold">
          Grace
        </h1>

        <p className="text-zinc-400 mt-2">
          Someone who listens when no one else is there.
        </p>

        <div className="flex gap-3 mt-5">
          <button
            onClick={toggleWakeMode}
            className={`px-5 py-3 rounded-2xl font-semibold ${
              wakeMode
                ? "bg-green-600"
                : "bg-zinc-800"
            }`}
          >
            {wakeMode
              ? "Wake Mode On"
              : "Wake Mode"}
          </button>

          <button
            onClick={() =>
              setVoiceOn(!voiceOn)
            }
            className="px-5 py-3 rounded-2xl bg-zinc-800"
          >
            Voice {voiceOn ? "On" : "Off"}
          </button>
        </div>

        {listening && (
          <p className="text-green-400 mt-4 animate-pulse">
            Listening…
          </p>
        )}
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

        {loading && (
          <p className="text-zinc-500 animate-pulse">
            Grace is thinking...
          </p>
        )}
      </section>

      <footer className="p-4 border-t border-white/10 flex gap-3">
        <input
          value={input}
          onChange={(e) =>
            setInput(e.target.value)
          }
          onKeyDown={(e) =>
            e.key === "Enter" &&
            sendMessage(input)
          }
          placeholder="Talk to Grace..."
          className="flex-1 bg-zinc-900 border border-white/10 rounded-2xl px-4 py-4 text-white outline-none"
        />

        <button
          onClick={() =>
            sendMessage(input)
          }
          className="bg-white text-black rounded-2xl px-6 font-semibold"
        >
          Send
        </button>
      </footer>
    </main>
  );
}
