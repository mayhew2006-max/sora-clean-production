"use client";

import { useEffect, useRef, useState } from "react";

type Message = {
  role: "user" | "assistant" | "assistant-image";
  content?: string;
  image?: string;
};

const FREE_LIMIT = 50;

function trackEvent(name: string) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", name);
  }
}

function graceSystemPrompt() {
  return `
You are Grace.

You are warm, useful, direct, conversational, and practical.
You help people talk things out, plan projects, organize ideas, make decisions, create reports, build checklists, and move forward.

You are not robotic.
You are not fake.
You do not advertise yourself as a dating app.
You are a personal command center for real life.

Match the user's tone naturally:
- If they want calm support, be calm.
- If they want business help, be sharp and practical.
- If they ask for direct advice, be honest and blunt but still caring.
- Mild casual language is okay when it fits the user's tone.
- Never be hateful, unsafe, sexually explicit, or abusive.

When the user asks for plans, reports, PDFs, photos, checklists, scopes, or business help, act like Grace can guide them inside the conversation.
`.trim();
}

export default function GraceChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey, I’m Grace. Tell me what you’re working on, what’s on your mind, or what you need help turning into a plan.",
    },
  ]);

  const [input, setInput] = useState("");
  const [memory, setMemory] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [toolsOpen, setToolsOpen] = useState(false);

  const graceAvatar = "/grace-avatar.png";

  const messagesRef = useRef<Message[]>(messages);
  const memoryRef = useRef("");
  const loadingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const savedMessages = localStorage.getItem("grace_messages");
    const savedMemory = localStorage.getItem("grace_memory");
    const savedPaid = localStorage.getItem("sora_paid");
    const founderAccess = localStorage.getItem("grace_founder");

    if (savedMessages) setMessages(JSON.parse(savedMessages));

    if (savedMemory) {
      setMemory(savedMemory);
      memoryRef.current = savedMemory;
    }

    if (savedPaid === "true" || founderAccess === "true") setPaid(true);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("grace_messages", JSON.stringify(messages.slice(-30)));

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  }, [messages, loading, listening]);

  useEffect(() => {
    function updateKeyboardOffset() {
      if (!window.visualViewport) return;

      const offset =
        window.innerHeight -
        window.visualViewport.height -
        window.visualViewport.offsetTop;

      document.documentElement.style.setProperty(
        "--grace-keyboard-offset",
        `${Math.max(0, offset)}px`
      );
    }

    window.visualViewport?.addEventListener("resize", updateKeyboardOffset);
    window.visualViewport?.addEventListener("scroll", updateKeyboardOffset);
    updateKeyboardOffset();

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardOffset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardOffset);
    };
  }, []);

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
      lower.includes("i miss") ||
      lower.includes("i love") ||
      lower.includes("my business") ||
      lower.includes("my company") ||
      lower.includes("my project");

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
      audio.onended = () => URL.revokeObjectURL(url);

      await audio.play();
    } catch {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        const fallback = new SpeechSynthesisUtterance(text);
        fallback.rate = 0.9;
        speechSynthesis.cancel();
        speechSynthesis.speak(fallback);
      }
    }
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || loadingRef.current) return;

    if (locked) {
      trackEvent("paywall_hit");
      window.location.href = "/pay";
      return;
    }

    trackEvent("message_sent");
    updateMemory(clean);

    loadingRef.current = true;
    setLoading(true);
    setToolsOpen(false);
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
        body: JSON.stringify({
          messages: nextMessages.slice(-8),
          memory: memoryRef.current.slice(-1500),
          personality: graceSystemPrompt(),
        }),
      });

      const data = await res.json();
      const reply = data.reply || "I’m here. Tell me what you want to do next.";

      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      speak(reply).catch(() => console.log("voice playback failed"));
    } catch {
      const reply = "Something glitched, but I’m still here. Try that again.";
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      speak(reply).catch(() => console.log("voice playback failed"));
    }

    loadingRef.current = false;
    setLoading(false);
  }

  function tapToTalk() {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input works best in Chrome with microphone permission allowed.");
      return;
    }

    trackEvent("talk_clicked");
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
    recognition.onend = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }

  const quickActions = [
    {
      label: "Photo",
      helper: "Analyze a photo",
      prompt:
        "Grace, I want to analyze a photo and turn it into useful ideas, notes, and next steps.",
    },
    {
      label: "Plan",
      helper: "Turn an idea into steps",
      prompt:
        "Grace, help me turn this idea into a clear plan with steps I can actually follow.",
    },
    {
      label: "Report",
      helper: "Create a clean report",
      prompt:
        "Grace, help me create a clean report with a summary, priorities, notes, and next steps.",
    },
    {
      label: "Checklist",
      helper: "Make a checklist",
      prompt:
        "Grace, make me a practical checklist for this project.",
    },
    {
      label: "PDF",
      helper: "Prepare PDF content",
      prompt:
        "Grace, help me format this into something I can save as a PDF.",
    },
    {
      label: "Business",
      helper: "Use my name/company",
      prompt:
        "Grace, help me create a report where I can add my name, business name, project name, and location.",
    },
  ];

  return (
    <main className="min-h-[100dvh] bg-[#fff7f1] text-[#2f2723] flex flex-col overflow-hidden">
      <section className="flex-1 overflow-hidden pb-32">
        <div className="relative h-full px-5 pt-4 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.22),transparent_42%),radial-gradient(circle_at_bottom_left,rgba(244,114,182,0.12),transparent_40%)] pointer-events-none" />

          <header className="relative z-10 flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black tracking-tight text-[#2f2723]">
                Grace
              </h1>

              {!paid && (
                <p className="mt-2 inline-flex items-center rounded-full border border-[#efb99f] bg-white/75 px-4 py-2 text-sm font-semibold text-[#8b4b34] shadow-sm">
                  {freeLeft} free messages/actions left
                </p>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setVoiceOn(!voiceOn)}
                className="border border-[#efb99f] bg-white/75 shadow-sm backdrop-blur rounded-2xl px-4 py-3 text-sm font-bold text-[#6f3b2a]"
              >
                Voice<br />{voiceOn ? "On" : "Off"}
              </button>

              <button
                onClick={() => setToolsOpen(!toolsOpen)}
                className="border border-[#efb99f] bg-[#f3a683] shadow-sm rounded-2xl px-4 py-3 text-sm font-black text-white"
              >
                Tools<br />Menu
              </button>
            </div>
          </header>

          <div className="relative z-10 mt-5 flex flex-col items-center text-center">
            <div
              className={`relative w-[25vh] max-w-[235px] aspect-square rounded-[2.2rem] overflow-hidden border border-white/80 bg-white shadow-2xl ${
                listening || loading
                  ? "shadow-[0_0_70px_rgba(251,146,60,0.65)] animate-pulse"
                  : "shadow-[0_18px_60px_rgba(120,60,30,0.25)]"
              }`}
            >
              <img
                src={graceAvatar}
                alt="Grace"
                className="w-full h-full object-cover scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>

            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 border border-[#efb99f] px-5 py-3 text-sm font-semibold text-[#6f3b2a] shadow-sm backdrop-blur">
              <span
                className={`w-3 h-3 rounded-full ${
                  listening
                    ? "bg-green-500"
                    : loading
                    ? "bg-[#f3a683]"
                    : "bg-[#d97757]"
                }`}
              />
              {loading
                ? "Grace is thinking..."
                : listening
                ? "Grace is listening..."
                : "Ready when you are"}
            </p>
          </div>

          {toolsOpen && (
            <div className="relative z-20 mt-4 rounded-[2rem] border border-[#efb99f] bg-white/90 p-4 shadow-2xl backdrop-blur">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-black text-[#6f3b2a]">
                  What do you want Grace to do?
                </p>
                <button
                  onClick={() => setToolsOpen(false)}
                  className="text-sm font-bold text-[#9a6b5a]"
                >
                  Close
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {quickActions.map((item) => (
                  <button
                    key={item.label}
                    disabled={locked}
                    onClick={() => sendMessage(item.prompt)}
                    className="rounded-2xl border border-[#f1c7b4] bg-[#fff7f1] px-3 py-3 text-left shadow-sm disabled:opacity-40"
                  >
                    <div className="font-black text-[#2f2723]">{item.label}</div>
                    <div className="text-xs text-[#8b6a5f] mt-1">
                      {item.helper}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="relative z-10 mt-4 bg-white/80 border border-[#efb99f] rounded-[2rem] p-3 backdrop-blur shadow-2xl">
            <div className="max-h-[47vh] overflow-y-auto space-y-3 pr-1">
              {messages.slice(-8).map((message, index) => (
                <div
                  key={index}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] bg-[#f3a683] text-white rounded-3xl px-5 py-4 shadow-lg whitespace-pre-wrap"
                      : "mr-auto max-w-[88%] flex gap-3 items-start"
                  }
                >
                  {message.role === "assistant-image" ? (
                    <img
                      src={message.image}
                      alt="Generated Grace"
                      className="w-full max-w-2xl rounded-3xl border border-[#efb99f] shadow-2xl mx-auto"
                    />
                  ) : message.role === "assistant" ? (
                    <>
                      <img
                        src={graceAvatar}
                        alt="Grace"
                        className="w-11 h-11 rounded-full object-cover border border-[#efb99f] shadow-sm"
                      />

                      <div className="bg-[#fffaf6] border border-[#f1c7b4] text-[#2f2723] rounded-3xl px-5 py-4 shadow-sm whitespace-pre-wrap leading-relaxed">
                        {message.content}
                      </div>
                    </>
                  ) : (
                    message.content
                  )}
                </div>
              ))}

              {loading && (
                <p className="text-[#9a6b5a] animate-pulse pl-14">
                  Grace is thinking...
                </p>
              )}

              {listening && (
                <p className="text-[#d97757] animate-pulse pl-14">
                  Listening...
                </p>
              )}

              <div ref={bottomRef} className="h-10" />
            </div>
          </div>
        </div>
      </section>

      {locked && (
        <div className="p-4 border-t border-[#efb99f] text-center bg-white/95 backdrop-blur">
          <p className="text-[#6f3b2a] mb-3 font-semibold">
            You used your 50 free messages/actions. Upgrade to keep using Grace.
          </p>
          <a
            onClick={() => trackEvent("upgrade_clicked")}
            href="/pay"
            className="inline-block bg-[#f3a683] text-white rounded-2xl px-8 py-4 font-black shadow-lg"
          >
            Upgrade — $5/month
          </a>
          <p className="text-xs text-[#9a6b5a] mt-2">Cancel anytime.</p>
        </div>
      )}

      <footer className="grace-input-bar fixed bottom-0 left-0 right-0 z-30 p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] border-t border-[#efb99f] bg-[#fff7f1]/95 backdrop-blur flex gap-2 items-end">
        <button
          onClick={tapToTalk}
          disabled={locked}
          className="bg-[#f3a683] text-white px-4 py-3 rounded-2xl font-black disabled:opacity-40 shadow-sm"
        >
          🎤
        </button>

        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage(input);
            }
          }}
          disabled={locked}
          rows={1}
          placeholder="Say anything to Grace..."
          className="flex-1 min-w-0 max-h-40 resize-none bg-white border border-[#efb99f] rounded-2xl px-4 py-3 text-[#2f2723] placeholder:text-[#a98273] outline-none disabled:opacity-40 shadow-sm"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={locked}
          className="bg-[#2f2723] text-white rounded-2xl px-4 py-3 font-black disabled:opacity-40 shadow-sm"
        >
          Send
        </button>
      </footer>
    </main>
  );
}
