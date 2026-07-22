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

function personalityPrompt(mode: string) {
  switch (mode) {
    case "Chill":
      return "Chill Grace: calm, relaxed, easygoing, warm, simple.";
    case "Motivational":
      return "Motivational Grace: uplifting, confident, encouraging, energetic, positive, never fake.";
    case "Late Night":
      return "Late Night Grace: soft, thoughtful, calm, gentle, good for quiet late-night conversations.";
    case "Real Talk":
      return "Real Talk Grace: direct, casual, honest, blunt but caring. Mild adult language allowed sometimes. Never hateful or unsafe.";
    case "Unfiltered":
      return "Unfiltered Grace: adult 18+ tone, casual, sarcastic, funny, blunt, relaxed. Mild cussing and edgy jokes allowed, but never hateful, sexual with minors, violent, abusive, or unsafe.";
    default:
      return "Friendly Grace: warm, helpful, safe, conversational, and easy to talk to.";
  }
}

export default function GraceChat() {
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hey... I’m Grace. I’m here with you. 💜" },
  ]);
  const [input, setInput] = useState("");
  const [memory, setMemory] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [faceMode, setFaceMode] = useState(true);
  const [personality, setPersonality] = useState("Friendly");
 const [generatedPhoto, setGeneratedPhoto] = useState<string | null>(null);
 const [generatedImages, setGeneratedImages] = useState<string[]>([]);

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
    const savedPersonality = localStorage.getItem("grace_personality");

    if (savedMessages) setMessages(JSON.parse(savedMessages));

    if (savedMemory) {
      setMemory(savedMemory);
      memoryRef.current = savedMemory;
    }

    if (savedPaid === "true" || founderAccess === "true") setPaid(true);
    if (savedPersonality) setPersonality(savedPersonality);
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("grace_messages", JSON.stringify(messages.slice(-30)));

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  }, [messages, loading, listening]);

  useEffect(() => {
    localStorage.setItem("grace_personality", personality);
  }, [personality]);

  const userCount = messages.filter((m) => m.role === "user").length;
  const freeLeft = Math.max(FREE_LIMIT - userCount, 0);
  const locked = !paid && freeLeft <= 0;

  const freeModes = ["Friendly", "Chill", "Motivational", "Late Night"];
  const proModes = ["Real Talk", "Unfiltered"];

  function choosePersonality(mode: string) {
    if (proModes.includes(mode) && !paid) {
      trackEvent("pro_personality_clicked");
      window.location.href = "/pay";
      return;
    }

    setPersonality(mode);
    trackEvent("personality_changed");
  }

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

 
  function wantsGracePhoto(text: string) {
    const lower = text.toLowerCase();
    return (
      lower.includes("photo") ||
      lower.includes("picture") ||
      lower.includes("image") ||
      lower.includes("generate") ||
      lower.includes("show me") ||
      lower.includes("make a pic") ||
      lower.includes("make me a pic")
    );
  }

 
  function showGracePhotoModal(src: string) {
    if (typeof window === "undefined") return;

    const old = document.getElementById("grace-photo-modal");
    if (old) old.remove();

    const wrap = document.createElement("div");
    wrap.id = "grace-photo-modal";
    wrap.style.position = "fixed";
    wrap.style.inset = "0";
    wrap.style.zIndex = "999999";
    wrap.style.background = "rgba(0,0,0,.92)";
    wrap.style.display = "flex";
    wrap.style.alignItems = "center";
    wrap.style.justifyContent = "center";
    wrap.style.padding = "18px";

    wrap.innerHTML = `
      <div style="position:relative;max-width:520px;width:100%;">
        <button id="grace-close-photo" style="position:absolute;right:10px;top:10px;z-index:2;border:0;border-radius:999px;background:rgba(0,0,0,.7);color:white;font-size:22px;width:42px;height:42px;">×</button>
        <img src="${src}" style="width:100%;max-height:90vh;object-fit:contain;border-radius:24px;box-shadow:0 0 70px rgba(168,85,247,.75);" />
      </div>
    `;

    document.body.appendChild(wrap);

    document.getElementById("grace-close-photo")?.addEventListener("click", () => {
      wrap.remove();
    });
  }

 async function generateGracePhotoFromChat(text: string) {
    const res = await fetch("/api/unfiltered-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: text,
        personality,
        paid,
      }),
    });

    const data = await res.json();

    if (!res.ok || !data.image) {
      throw new Error("Grace image failed");
    }

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: "GRACE_IMAGE::" + data.image,
      },
    ]);
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
    recognitionRef.current?.stop();

    const nextMessages: Message[] = [
      ...messagesRef.current,
      { role: "user", content: clean },
    ];

    setMessages(nextMessages);
    setInput("");

    if (personality === "Unfiltered" && paid && wantsGracePhoto(clean)) {
      try {
        await generateGracePhotoFromChat(clean);
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: "I made that for you. Tap X to close the photo.",
          },
        ]);
      } catch {
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: "The photo generator glitched, but I’m still here.",
          },
        ]);
      }

      loadingRef.current = false;
      setLoading(false);
      return;
    }



    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.slice(-8),
          memory: memoryRef.current.slice(-1500),
          personality: personalityPrompt(personality),
        }),
      });

      const data = await res.json();
      const reply = data.reply || "I'm here with you. Tell me more.";

      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      speak(reply).catch(() => console.log("voice playback failed"));
    } catch {
      const reply = "Something glitched, but I'm still here with you.";
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

  const latestGrace =
    [...messages].reverse().find((m) => m.role === "assistant")?.content ||
    "I’m here with you.";

  return (
    <main className="h-[100dvh] max-h-[100dvh] bg-[radial-gradient(circle_at_top,#2e1065_0%,#120821_38%,#05050a_100%)] text-white flex flex-col overflow-hidden">
      <section className="flex-1 overflow-hidden pb-28">
        <div className="relative h-full px-5 pt-4 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(168,85,247,0.22),transparent_55%)] pointer-events-none" />

          <header className="relative z-10 flex justify-between items-start">
            <div>
              <h1 className="text-5xl font-bold tracking-tight text-white drop-shadow-lg">
                Grace
              </h1>
              <p className="text-zinc-300 mt-2 text-sm">
                {paid ? "Grace Pro unlocked" : `${freeLeft} free messages left`}
              </p>
              {memory && <p className="text-xs text-cyan-300 mt-1">Memory active</p>}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setVoiceOn(!voiceOn)}
                className="border border-white/10 bg-white/10 backdrop-blur rounded-2xl px-4 py-3 text-sm"
              >
                Voice<br />{voiceOn ? "On" : "Off"}
              </button>

              <button
                onClick={() => setFaceMode(!faceMode)}
                className="border border-white/10 bg-white/10 backdrop-blur rounded-2xl px-4 py-3 text-sm"
              >
                Face<br />{faceMode ? "On" : "Off"}
              </button>
            </div>
          </header>

          {faceMode && (
            <div className="relative z-10 mt-4 flex flex-col items-center text-center">
              <div
                className={`relative w-[34vh] max-w-[310px] aspect-square rounded-[2rem] overflow-hidden border border-white/10 ${
                  listening || loading
                    ? "shadow-[0_0_80px_rgba(168,85,247,0.95)] animate-pulse"
                    : "shadow-[0_0_50px_rgba(168,85,247,0.55)]"
                }`}
              >
                <img
                  src="/grace-avatar.png"
                  alt="Grace"
                  className="w-full h-full object-cover scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              </div>

              <div className="mt-2">
                <p className="text-2xl font-semibold">
                  {personality} Grace <span className="text-purple-300">♥</span>
                </p>
                <p className="mt-2 inline-flex items-center gap-2 rounded-full bg-black/35 border border-white/10 px-5 py-3 text-sm text-zinc-200 backdrop-blur">
                  <span className={`w-3 h-3 rounded-full ${listening ? "bg-green-400" : loading ? "bg-purple-400" : "bg-cyan-300"}`} />
                  {loading ? "Grace is thinking..." : listening ? "Grace is listening..." : "Ready when you are"}
                </p>
              </div>
            </div>
          )}

          <div className="relative z-10 mt-3">
            <p className="text-xs text-purple-200 mb-2 uppercase tracking-wider">
              Choose Grace
            </p>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {[...freeModes, ...proModes].map((mode) => {
                const lockedMode = proModes.includes(mode) && !paid;

                return (
                  <button
                    key={mode}
                    onClick={() => choosePersonality(mode)}
                    className={`min-w-[105px] whitespace-nowrap px-4 py-3 rounded-2xl text-sm border transition-all ${
                      personality === mode
                        ? "bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 text-black border-transparent"
                        : "bg-white/5 border-white/10 text-white"
                    }`}
                  >
                    <div className="font-semibold">{mode}</div>
                    {lockedMode && <div className="text-xs text-pink-300">Pro 18+</div>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="relative z-10 mt-2 bg-black/30 border border-white/10 rounded-[2rem] p-3 backdrop-blur shadow-2xl">
            <div className="max-h-[65vh] overflow-y-auto space-y-3 pr-1">
              {messages.slice(-6).map((message, index) => (
                <div
                  key={index}
                  className={
                    message.role === "user"
                      ? "ml-auto max-w-[85%] bg-gradient-to-r from-purple-600 to-violet-500 text-white rounded-3xl px-5 py-4 shadow-xl"
                      : "mr-auto max-w-[85%] flex gap-3 items-start"
                  }
                >
                  {message.role === "assistant-image" ? (
                    <img
                      src={message.image}
                      alt="Generated Grace"
                      className="w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl mx-auto"
                    />
                  ) : message.role === "assistant" ? (
                    <>
                      <img
                        src="/grace-avatar.png"
                        alt="Grace"
                        className="w-11 h-11 rounded-full object-cover border border-purple-300/40"
                      />

                      {(message.content || "").startsWith("GRACE_IMAGE::") ? (
                        <img
                          src={"data:image/png;base64," + (message.content || "").replace("GRACE_IMAGE::", "")}
                          alt="Generated Grace"
                          className="w-full max-w-[520px] rounded-3xl border border-white/10 shadow-2xl mx-auto"
                        />
                      ) : (
                        <div className="bg-white/10 backdrop-blur border border-white/10 text-white rounded-3xl px-5 py-4 shadow-xl">
                          {message.content}
                        </div>
                      )}
                    </>
                  ) : (
                    message.content
                  )}
                </div>
              ))}

             
              {loading && (
                <p className="text-zinc-400 animate-pulse pl-14">
                  Grace is thinking...
                </p>
              )}

              {listening && (
                <p className="text-cyan-300 animate-pulse pl-14">
                  Listening...
                </p>
              )}

              <div ref={bottomRef} className="h-10" />
            </div>
          </div>
        </div>
      </section>

      {locked && (
        <div className="p-4 border-t border-white/10 text-center bg-black/50 backdrop-blur">
          <p className="text-zinc-300 mb-3">
            You used your free messages. Upgrade to keep talking with Grace.
          </p>
          <a
            onClick={() => trackEvent("upgrade_clicked")}
            href="/pay"
            className="inline-block bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 text-black rounded-2xl px-8 py-4 font-bold"
          >
            Upgrade Grace Pro
          </a>
        </div>
      )}

      <footer className="fixed bottom-0 left-0 right-0 z-20 p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] border-t border-white/10 bg-[#09090f]/95 backdrop-blur flex gap-2 items-end">
        <button
          onClick={tapToTalk}
          disabled={locked}
          className="bg-gradient-to-r from-cyan-300 via-violet-300 to-pink-300 text-black px-4 py-3 rounded-2xl font-bold disabled:opacity-40"
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
          className="flex-1 min-w-0 max-h-40 resize-none bg-white/10 backdrop-blur border border-white/10 rounded-2xl px-4 py-3 text-white placeholder:text-zinc-400 outline-none disabled:opacity-40"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={locked}
          className="bg-gradient-to-r from-cyan-200 via-violet-200 to-pink-200 text-black rounded-2xl px-4 py-3 font-semibold disabled:opacity-40"
        >
          Send
        </button>
      </footer>
    </main>
  );
}
