"use client";

import { useEffect, useRef, useState } from "react";

export default function ChatPage() {
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const [personality, setPersonality] = useState("Friendly");

  const bottomRef = useRef<HTMLDivElement | null>(null);

  const paid =
    typeof window !== "undefined" &&
    window.location.href.includes("founder");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({
      behavior: "smooth",
    });
  }, [messages]);

  function wantsGracePhoto(text: string) {
    const lower = text.toLowerCase();

    return (
      lower.includes("photo") ||
      lower.includes("picture") ||
      lower.includes("image") ||
      lower.includes("generate") ||
      lower.includes("show me") ||
      lower.includes("pic of")
    );
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const clean = input.trim();

    const userMessage = {
      role: "user",
      content: clean,
    };

    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);

    setInput("");

    if (
      personality === "Unfiltered" &&
      paid &&
      wantsGracePhoto(clean)
    ) {
      setLoading(true);

      try {
        const res = await fetch(
          "/api/unfiltered-image",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              prompt: clean,
            }),
          }
        );

        const data = await res.json();

        if (data.image) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant-image",
              image:
                "data:image/png;base64," +
                data.image,
            },
          ]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              content:
                "The image glitched, but I’m still here.",
            },
          ]);
        }
      } catch {
        setMessages((prev) => [
          ...prev,
          {
            role: "assistant",
            content:
              "The image glitched, but I’m still here.",
          },
        ]);
      }

      setLoading(false);

      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          messages: nextMessages,
          personality,
        }),
      });

      const data = await res.json();

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something glitched.",
        },
      ]);
    }

    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center px-4 pb-40">

      <div className="w-full max-w-5xl flex flex-col items-center pt-10">

        <img
          src="/grace-avatar.png"
          className="w-44 h-44 rounded-3xl object-cover shadow-2xl border border-white/10"
        />

        <h1 className="text-4xl font-bold mt-5">
          {personality} Grace ♥
        </h1>

        <div className="mt-3 bg-white/10 border border-white/10 rounded-full px-6 py-3">
          Ready when you are
        </div>

        <div className="flex gap-3 flex-wrap justify-center mt-8">
          {[
            "Friendly",
            "Chill",
            "Motivational",
            "Late Night",
            "Real Talk",
            "Unfiltered",
          ].map((p) => (
            <button
              key={p}
              onClick={() =>
                setPersonality(p)
              }
              className={`px-5 py-3 rounded-2xl border ${
                personality === p
                  ? "bg-white text-black"
                  : "bg-white/5 text-white border-white/10"
              }`}
            >
              {p}
            </button>
          ))}
        </div>

        <div className="w-full max-w-3xl mt-10 flex flex-col gap-6">

          {messages.map((m, i) => (
            <div
              key={i}
              className={`flex ${
                m.role === "user"
                  ? "justify-end"
                  : "justify-start"
              }`}
            >
              {m.role === "assistant-image" ? (
                <div className="w-full flex justify-center">
                  <img
                    src={m.image}
                    className="w-full max-w-xl rounded-3xl shadow-2xl border border-white/10"
                  />
                </div>
              ) : (
                <div
                  className={`max-w-[85%] rounded-3xl px-5 py-4 ${
                    m.role === "user"
                      ? "bg-purple-500"
                      : "bg-white/10 border border-white/10"
                  }`}
                >
                  {m.content}
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="text-white/60">
              Grace is thinking...
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-4 bg-black/90 backdrop-blur border-t border-white/10">
        <div className="max-w-4xl mx-auto flex gap-3">
          <input
            value={input}
            onChange={(e) =>
              setInput(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter")
                sendMessage();
            }}
            placeholder="Say anything to Grace..."
            className="flex-1 rounded-2xl bg-white/10 border border-white/10 px-5 py-4 outline-none"
          />

          <button
            onClick={sendMessage}
            className="px-6 rounded-2xl bg-white text-black font-semibold"
          >
            Send
          </button>
        </div>
      </div>
    </main>
  );
}
