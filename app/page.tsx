"use client";

import { useEffect, useState } from "react";

export default function Home() {
  const [messages, setMessages] = useState([
    { role: "assistant", content: "Hey… I’m here. Talk to me." },
  ]);

  const [listening, setListening] = useState(false);

  // 🎤 Voice recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).webkitSpeechRecognition ||
      (window as any).SpeechRecognition;

    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;

    recognition.onresult = (event: any) => {
      const text =
        event.results[event.results.length - 1][0].transcript;

      handleMessage(text);
    };

    if (listening) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => recognition.stop();
  }, [listening]);

  function handleMessage(text: string) {
    if (!text.trim()) return;

    const newMessages = [
      ...messages,
      { role: "user", content: text },
      {
        role: "assistant",
        content: "I hear you… tell me more.",
      },
    ];

    setMessages(newMessages);

    speak("I hear you… tell me more.");
  }

  function speak(text: string) {
    const utterance = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(utterance);
  }

  return (
    <main className="h-screen bg-black text-white flex flex-col p-6">
      <h1 className="text-2xl mb-4">Sora</h1>

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
