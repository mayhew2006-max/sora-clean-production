"use client";

import { useEffect, useRef, useState } from "react";
import { jsPDF } from "jspdf";

type Message = {
  role: "user" | "assistant" | "assistant-image";
  content?: string;
  image?: string;
};

type SavedGraceReport = {
  id: string;
  title: string;
  answer: string;
  createdAt: string;
  preparedFor?: string;
  businessName?: string;
  projectName?: string;
  jobLocation?: string;
  reportTitle?: string;
};

const FREE_LIMIT = 50;

const toolTypes = [
  "Deal Check",
  "Photo Analysis",
  "Project Plan",
  "Work Scope",
  "Site Report",
  "Maintenance Checklist",
  "Landscaping Concept",
  "Client Proposal",
  "Business Plan",
  "Personal Goal Plan",
  "Custom PDF",
];

function trackEvent(name: string) {
  if (typeof window !== "undefined" && (window as any).gtag) {
    (window as any).gtag("event", name);
  }
}

function graceSystemPrompt() {
  return `
You are Grace.

You are warm, useful, direct, conversational, and practical.
You help people talk things out, plan projects, organize ideas, make decisions, create reports, build checklists, analyze photos, and move forward.

You are not robotic.
You are not a dating app.
You are not a gimmick.
You are Grace.

Match the user's tone naturally:
- If they want calm support, be calm.
- If they want business help, be sharp and practical.
- If they ask for direct advice, be honest and blunt but still caring.
- Mild casual language is okay when it fits the user's tone.
- Never be hateful, unsafe, sexually explicit, or abusive.

When the user asks for plans, reports, PDFs, photos, checklists, scopes, or business help, guide them like Grace can do it inside the conversation.
`.trim();
}

async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();

    reader.onload = () => {
      img.onload = () => {
        const maxDimension = 1280;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDimension) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else if (height > width && height > maxDimension) {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        } else if (width === height && width > maxDimension) {
          width = maxDimension;
          height = maxDimension;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not process image."));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };

      img.onerror = () => reject(new Error("Could not load image."));
      img.src = String(reader.result);
    };

    reader.onerror = () => reject(new Error("Could not read image."));
    reader.readAsDataURL(file);
  });
}

export default function GraceChat() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hey, I’m Grace. Tell me what you’re working on, upload a photo, or ask me to turn something into a plan, report, checklist, or PDF.",
    },
  ]);

  const [input, setInput] = useState("");
  const [memory, setMemory] = useState("");
  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toolLoading, setToolLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [savedReportsOpen, setSavedReportsOpen] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedGraceReport[]>([]);
  const [webMode, setWebMode] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [hideBrowserWarning, setHideBrowserWarning] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const [toolType, setToolType] = useState("Photo Analysis");
  const [images, setImages] = useState<string[]>([]);
  const imagesRef = useRef<string[]>([]);
  const [imageStatus, setImageStatus] = useState("");
  const [lastToolAnswer, setLastToolAnswer] = useState("");

  const [preparedFor, setPreparedFor] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [projectName, setProjectName] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [reportTitle, setReportTitle] = useState("");

  const graceAvatar = "/grace-avatar.png";

  const messagesRef = useRef<Message[]>(messages);
  const memoryRef = useRef("");
  const loadingRef = useRef(false);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
 const speakingRunRef = useRef(0);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

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

    try {
      const savedDetails = localStorage.getItem("grace_report_details");
      if (savedDetails) {
        const details = JSON.parse(savedDetails);
        setReportTitle(details.reportTitle || "");
        setPreparedFor(details.preparedFor || "");
        setBusinessName(details.businessName || "");
        setProjectName(details.projectName || "");
        setJobLocation(details.jobLocation || "");
      }
    } catch {}

    try {
      const saved = localStorage.getItem("grace_saved_reports_inside");
      if (saved) setSavedReports(JSON.parse(saved));
    } catch {}
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
    localStorage.setItem("grace_messages", JSON.stringify(messages.slice(-40)));

    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  }, [messages, loading, toolLoading, listening]);

  useEffect(() => {
    localStorage.setItem(
      "grace_saved_reports_inside",
      JSON.stringify(savedReports.slice(0, 100))
    );
  }, [savedReports]);

  useEffect(() => {
    const ua = navigator.userAgent || "";
    const lower = ua.toLowerCase();

    const isInApp =
      lower.includes("tiktok") ||
      lower.includes("musical_ly") ||
      lower.includes("bytedance") ||
      lower.includes("instagram") ||
      lower.includes("fbav") ||
      lower.includes("fban") ||
      lower.includes("fb_iab") ||
      lower.includes("messenger");

    setInAppBrowser(isInApp);
  }, []);

  async function openInBrowser() {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 3500);
    } catch {}

    const ua = navigator.userAgent.toLowerCase();
    const isAndroid = ua.includes("android");
    const cleanUrl = url.replace(/^https?:\/\//, "");

    try {
      if (isAndroid) {
        window.location.href =
          "intent://" +
          cleanUrl +
          "#Intent;scheme=https;package=com.android.chrome;end";
        return;
      }

      window.open(url, "_blank", "noopener,noreferrer");

      setTimeout(() => {
        alert(
          "TikTok may block this button. I copied the Grace link for you. Tap the three dots in TikTok and choose Open in browser, or paste the copied link into Safari/Chrome."
        );
      }, 700);
    } catch {
      alert(
        "TikTok blocked opening your browser. I copied the Grace link for you. Tap the three dots in TikTok and choose Open in browser, or paste the link into Safari/Chrome."
      );
    }
  }

  async function copyGraceLink() {
    const url = window.location.href;

    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      alert("Copy this link: " + url);
    }
  }

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

  function splitForSpeech(text: string) {
    const clean = text
      .replaceAll("###", "")
      .replaceAll("##", "")
      .replaceAll("**", "")
      .replace(/\n{3,}/g, "\n\n")
      .trim();

    if (!clean) return [];

    const chunks: string[] = [];
    const paragraphs = clean.split(/\n\n+/);

    for (const paragraph of paragraphs) {
      const part = paragraph.trim();
      if (!part) continue;

      if (part.length <= 800) {
        chunks.push(part);
        continue;
      }

      const sentences = part.match(/[^.!?]+[.!?]+|\S.+$/g) || [part];
      let current = "";

      for (const sentence of sentences) {
        const next = `${current} ${sentence}`.trim();

        if (next.length > 800 && current) {
          chunks.push(current);
          current = sentence.trim();
        } else {
          current = next;
        }
      }

      if (current) chunks.push(current);
    }

    return chunks;
  }

  async function playSpeechChunk(text: string, runId: number) {
    try {
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

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          URL.revokeObjectURL(url);
          resolve();
        };

        audio.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error("Audio playback failed"));
        };

        audio.play().catch(reject);
      });
    } catch {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        await new Promise<void>((resolve) => {
          const fallback = new SpeechSynthesisUtterance(text);
          fallback.rate = 0.9;
          fallback.onend = () => resolve();
          fallback.onerror = () => resolve();

          if (speakingRunRef.current === runId) {
            speechSynthesis.speak(fallback);
          } else {
            resolve();
          }
        });
      }
    }
  }

  async function speak(text: string) {
    if (!voiceOn) return;

    const chunks = splitForSpeech(text);
    if (chunks.length === 0) return;

    const runId = speakingRunRef.current + 1;
    speakingRunRef.current = runId;

    audioRef.current?.pause();

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechSynthesis.cancel();
    }

    setIsSpeaking(true);

    try {
      for (const chunk of chunks) {
        if (speakingRunRef.current !== runId) break;

        await playSpeechChunk(chunk, runId);

        if (speakingRunRef.current !== runId) break;

        await new Promise((resolve) => setTimeout(resolve, 120));
      }
    } finally {
      if (speakingRunRef.current === runId) {
        setIsSpeaking(false);
      }
    }
  }

  function stopSpeaking() {
    speakingRunRef.current += 1;
    setIsSpeaking(false);

    audioRef.current?.pause();
    audioRef.current = null;

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
  }


 async function handleImages(files: FileList | null) {
    if (!files) return;

    const selected = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 4);

    if (selected.length === 0) {
      setImageStatus("Please choose a valid image.");
      return;
    }

    setImageStatus("Preparing photo for Grace...");

    try {
      const converted = await Promise.all(selected.map((file) => compressImage(file)));
      setImages((prev) => {
        const next = [...prev, ...converted].slice(0, 4);
        imagesRef.current = next;
        return next;
      });
      setImageStatus("Photo attached. Grace can analyze it now.");
      // Keep Grace clean: photo attaches without opening the tools menu.
    } catch {
      setImageStatus("Grace could not prepare that image. Try a different photo.");
    }
  }

  function removeImage(index: number) {
    setImages((prev) => {
      const next = prev.filter((_, i) => i !== index);
      imagesRef.current = next;
      return next;
    });
  }

  function buildEnhancedPrompt(request: string) {
    return `
Prepared for: ${preparedFor || "Not provided"}
Business name: ${businessName || "Not provided"}
Project name: ${projectName || "Not provided"}
Report title: ${reportTitle || "Untitled"}
Job/location: ${jobLocation || "Not provided"}

User request:
${request || input || "Analyze this and create a useful response."}

Instructions:
Create the result as Grace inside the conversation.
Be practical, clear, and useful.
If a report is requested, make it PDF-ready.
If a photo is included, describe visible details, useful observations, risks/concerns, ideas, and next steps.
Do not mention OTG.
Do not put any business name on the report except the user's provided business/name fields above.
`.trim();
  }

  async function runGraceTool(actionPrompt?: string, selectedTool?: string) {
    if (locked || toolLoading || loadingRef.current) {
      if (locked) window.location.href = "/pay";
      return;
    }

    const request = (actionPrompt || input || "").trim();

    const attachedImages = imagesRef.current.length ? imagesRef.current : images;

    if (!request && attachedImages.length === 0) {
      alert("Type what you need or add a photo first.");
      return;
    }

    const activeTool = selectedTool || toolType;

    if (
      activeTool.toLowerCase().includes("photo") &&
      attachedImages.length === 0
    ) {
      alert("Add or take a photo first so Grace can actually analyze it.");
      setToolsOpen(true);
      return;
    }

    trackEvent("grace_tool_used");
    updateMemory(request);

    loadingRef.current = true;
    setToolLoading(true);
    setLoading(true);
    setToolsOpen(false);

    const userLabel =
      attachedImages.length > 0
        ? `${activeTool}: ${request || "Use the attached photo and give me useful ideas, notes, and next steps."}`
        : `${activeTool}: ${request}`;

    const nextMessages: Message[] = [
      ...messagesRef.current,
      { role: "user", content: userLabel },
    ];

    setMessages(nextMessages);
    setInput("");

    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-grace-paid": paid || !locked ? "true" : "false",
        },
        body: JSON.stringify({
          toolType: activeTool,
          userPrompt: buildEnhancedPrompt(request),
          images: attachedImages,
        }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(text || "Grace could not run this tool.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      setMessages([
        ...nextMessages,
        { role: "assistant", content: "I’m working on it..." },
      ]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const data = line.replace("data: ", "").trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const token = parsed?.choices?.[0]?.delta?.content || "";
            if (token) fullText += token;
          } catch {}
        }
      }

      const reply =
        fullText.trim() ||
        "I finished, but the response came back empty. Try asking again with a little more detail.";

      setLastToolAnswer(reply);
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
      speak(reply).catch(() => console.log("voice playback failed"));
    } catch (err: any) {
      const reply =
        "Grace ran into an issue with that tool: " +
        (err?.message || "Unknown error");
      setMessages([...nextMessages, { role: "assistant", content: reply }]);
    }

    loadingRef.current = false;
    setToolLoading(false);
    setLoading(false);
  }

 
 
  async function runGraceWebSearch(query: string) {
    if (locked || loadingRef.current || toolLoading) return;

    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    trackEvent("grace_web_search_used");

    setLoading(true);
    loadingRef.current = true;

    setMessages((prev) => [
      ...prev,
      { role: "user", content: cleanQuery },
    ]);

    try {
      const res = await fetch("/api/web", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-grace-paid": paid || !locked ? "true" : "false",
        },
        body: JSON.stringify({
          query: cleanQuery,
          memory,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.reply || "Grace web search failed.");
      }

      const reply = data?.reply || "Grace searched, but did not get a useful answer.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);

      setLastToolAnswer(reply);

      if (voiceOn) {
        speak(reply).catch(() => console.log("voice playback failed"));
      }
    } catch (error: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Grace web search hit a glitch: " +
            (error?.message || "Unknown error"),
        },
      ]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

 function shouldUseWebQuery(text: string) {
    const clean = text.trim().toLowerCase();

    if (webMode) return true;

    const webWords = [
      "search",
      "look up",
      "current",
      "latest",
      "today",
      "price",
      "worth",
      "value",
      "compare prices",
      "market price",
      "near me",
      "reviews",
      "specs",
      "law",
      "rules",
      "news",
      "weather",
      "stock",
      "available",
      "sale",
      "deal",
      "facebook marketplace",
      "marketplace",
    ];

    return webWords.some((word) => clean.includes(word));
  }

 function shouldUsePhotoTool(text: string) {
    const hasAttachedPhoto =
      (imagesRef.current.length ? imagesRef.current : images).length > 0;

    if (!hasAttachedPhoto) return false;

    const clean = text.trim().toLowerCase();

    // If a photo is attached, Grace should use it for almost any real question.
    // The user should not have to say "analyze photo" exactly.
    if (clean.length > 0) return true;

    return true;
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || loadingRef.current) return;

    if (locked) {
      trackEvent("paywall_hit");
      window.location.href = "/pay";
      return;
    }

    const lower = clean.toLowerCase();

 if (
      lower === "stop" ||
      lower === "stop talking" ||
      lower === "stop reading" ||
      lower === "pause reading" ||
      lower === "pause voice" ||
      lower === "be quiet"
    ) {
      stopSpeaking();
      setInput("");
      return;
    }

    if (
      lastToolAnswer &&
      (lower.includes("make a plan") ||
        lower.includes("turn this into a plan") ||
        lower.includes("turn that into a plan") ||
        lower.includes("action plan") ||
        lower.includes("next steps"))
    ) {
      await runGraceTool(
        `Turn this into a clear action plan with steps, priorities, and next moves:\n\n${lastToolAnswer}`,
        "Project Plan"
      );
      return;
    }

    if (
      lastToolAnswer &&
      (lower.includes("compare") ||
        lower.includes("pros and cons") ||
        lower.includes("pros/cons") ||
        lower.includes("which is better"))
    ) {
      await runGraceTool(
        `Compare the main options, pros, cons, best use cases, and give a recommendation based on this:\n\n${lastToolAnswer}`,
        "Custom PDF"
      );
      return;
    }

    if (
      lastToolAnswer &&
      (lower.includes("checklist") ||
        lower.includes("to do list") ||
        lower.includes("todo list") ||
        lower.includes("task list"))
    ) {
      await runGraceTool(
        `Turn this into a practical checklist I can follow:\n\n${lastToolAnswer}`,
        "Maintenance Checklist"
      );
      return;
    }

    if (
      lastToolAnswer &&
      (lower.includes("pdf") ||
        lower.includes("download") ||
        lower.includes("save this") ||
        lower.includes("make that a pdf") ||
        lower.includes("turn that into a pdf"))
    ) {
      const nextMessages: Message[] = [
        ...messagesRef.current,
        { role: "user", content: clean },
        {
          role: "assistant",
          content:
            "Done — I’m turning the last report into a PDF for you now.",
        },
      ];

      setMessages(nextMessages);
      setInput("");
      setTimeout(() => downloadPDF(), 250);
      return;
    }

    if (
      lastToolAnswer &&
      (lower.includes("read it") ||
        lower.includes("read that") ||
        lower.includes("read this") ||
        lower.includes("say it out loud") ||
        lower.includes("explain it out loud"))
    ) {
      const nextMessages: Message[] = [
        ...messagesRef.current,
        { role: "user", content: clean },
        {
          role: "assistant",
          content:
            "Absolutely. I’ll read the latest report out loud and keep it simple.",
        },
      ];

      setMessages(nextMessages);
      setInput("");
      speak(lastToolAnswer).catch(() =>
        console.log("voice playback failed")
      );
      return;
    }

    if (
      (imagesRef.current.length ? imagesRef.current : images).length > 0 &&
      (lower.includes("deal") ||
        lower.includes("marketplace") ||
        lower.includes("seller") ||
        lower.includes("asking price") ||
        lower.includes("worth it") ||
        lower.includes("red flags"))
    ) {
      await runDealCheck(clean);
      return;
    }

    if (shouldUsePhotoTool(clean)) {
      await runGraceTool(clean, "Photo Analysis");
      return;
    }

    if (shouldUseWebQuery(clean)) {
      await runGraceWebSearch(clean);
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

  function saveCurrentResult() {
    const answer = lastToolAnswer.trim();

    if (!answer) {
      alert("Ask Grace to create something first.");
      return;
    }

    const title =
      reportTitle.trim() ||
      projectName.trim() ||
      businessName.trim() ||
      `Grace Report - ${new Date().toLocaleDateString()}`;

    const report: SavedGraceReport = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      title,
      answer,
      createdAt: new Date().toISOString(),
      preparedFor,
      businessName,
      projectName,
      jobLocation,
      reportTitle,
    };

    setSavedReports((prev) => [report, ...prev].slice(0, 100));

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: `Saved "${title}" to your Grace reports.`,
      },
    ]);
  }

  function openSavedReport(report: SavedGraceReport) {
    setLastToolAnswer(report.answer);
    setReportTitle(report.reportTitle || report.title || "");
    setPreparedFor(report.preparedFor || "");
    setBusinessName(report.businessName || "");
    setProjectName(report.projectName || "");
    setJobLocation(report.jobLocation || "");
    setSavedReportsOpen(false);
    setToolsOpen(false);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: report.answer,
      },
    ]);
  }

  function deleteSavedReport(id: string) {
    const ok = window.confirm("Delete this saved Grace report?");
    if (!ok) return;
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
  }

 function saveReportDetails() {
    localStorage.setItem(
      "grace_report_details",
      JSON.stringify({
        reportTitle,
        preparedFor,
        businessName,
        projectName,
        jobLocation,
      })
    );

    setDetailsOpen(false);

    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content:
          "Got it. I saved those report details and I’ll use them on your PDFs.",
      },
    ]);
  }


  async function copyLastAnswer() {
    const answer =
      lastToolAnswer ||
      [...messages].reverse().find((m) => m.role === "assistant")?.content ||
      "";

    if (!answer.trim()) {
      alert("Ask Grace something first.");
      return;
    }

    try {
      await navigator.clipboard.writeText(answer);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Copied Grace’s last answer to your clipboard.",
        },
      ]);
    } catch {
      alert("Copy failed. You can press and hold the answer to copy it.");
    }
  }

 function downloadPDF(overrideAnswer?: string, overrideTitle?: string) {
    const answer =
      overrideAnswer ||
      lastToolAnswer ||
      [...messages].reverse().find((m) => m.role === "assistant")?.content ||
      "";

    if (!answer.trim()) {
      alert("Ask Grace to create a report or plan first.");
      return;
    }

    localStorage.setItem(
      "grace_report_details",
      JSON.stringify({
        reportTitle,
        preparedFor,
        businessName,
        projectName,
        jobLocation,
      })
    );

    const doc = new jsPDF({
      unit: "pt",
      format: "letter",
    });

    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;

    const title =
      overrideTitle ||
      reportTitle ||
      projectName ||
      businessName ||
      preparedFor ||
      "Grace Report";

    doc.setFillColor(255, 247, 241);
    doc.rect(0, 0, pageWidth, 120, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(21);
    doc.setTextColor(47, 39, 35);
    doc.text(title, margin, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(120, 75, 55);
    doc.text("Prepared with Grace", margin, 72);

    let headerY = 95;

    doc.setFontSize(11);
    doc.setTextColor(65, 55, 50);

    if (preparedFor) {
      doc.text(`Prepared for: ${preparedFor}`, margin, headerY);
      headerY += 16;
    }

    if (businessName) {
      doc.text(`Business: ${businessName}`, margin, headerY);
      headerY += 16;
    }

    if (projectName) {
      doc.text(`Project: ${projectName}`, margin, headerY);
      headerY += 16;
    }

    if (jobLocation) {
      doc.text(`Location: ${jobLocation}`, margin, headerY);
      headerY += 16;
    }

    doc.text(`Created: ${new Date().toLocaleString()}`, margin, headerY);

    doc.setDrawColor(239, 185, 159);
    doc.line(margin, headerY + 18, pageWidth - margin, headerY + 18);

    doc.setFontSize(12);
    doc.setTextColor(47, 39, 35);

    const clean = answer
      .replaceAll("**", "")
      .replaceAll("###", "")
      .replaceAll("##", "")
      .replaceAll("#", "");

    const lines = doc.splitTextToSize(clean, usableWidth);
    let y = headerY + 48;

    for (const line of lines) {
      if (y > pageHeight - 55) {
        doc.addPage();
        y = 55;
      }
      doc.text(line, margin, y);
      y += 16;
    }

    const fileName = (reportTitle || projectName || "grace-report")
      .toLowerCase()
      .replaceAll(" ", "-")
      .replace(/[^a-z0-9-_]/g, "");

    doc.save(`${fileName || "grace-report"}.pdf`);
  }

  function runDealCheck(customPrompt?: string) {
    const attachedImages = imagesRef.current.length ? imagesRef.current : images;

    const prompt = `
Deal Check Mode.

The user wants to know if something looks like a good deal.

Use any attached marketplace screenshot/photo and the user's text.

User request:
${customPrompt || input || "Analyze this listing/photo and tell me if it looks like a good deal."}

Give the answer in this structure:

1. Quick Verdict:
Good deal / Fair deal / Risky deal / Bad deal / Not enough information.

2. What I can see:
Describe the visible item, condition, listing details, price if visible, and anything important in the photo.

3. Estimated fair value:
Give a practical estimated fair price range if possible.
If you cannot verify current market pricing from the photo alone, say so clearly and recommend using Grace Web Search for current comps.

4. Red flags:
List visible concerns, missing information, suspicious details, condition issues, or things that need verification.

5. Questions to ask the seller:
Give specific questions the buyer should ask.

6. Negotiation advice:
Suggest a reasonable offer, a max price, and a walk-away point if enough information exists.

7. Next move:
Tell the user what to do before buying.

Be practical, direct, and useful.
Do not pretend certainty.
Do not say you cannot see the photo if images are attached.
`.trim();

    runGraceTool(prompt, "Deal Check");
  }

 const quickActions = [
    {
      label: "Photo",
      helper: "Upload a photo",
      action: () => uploadInputRef.current?.click(),
    },
    {
      label: "Marketplace",
      helper: "Buy or sell smarter",
      action: () => runDealCheck(),
    },
    {
      label: "Plan",
      helper: "Turn an idea into steps",
      action: () =>
        runGraceTool(
          "Turn this into a clear project plan with phases, priorities, and next steps.",
          "Project Plan"
        ),
    },
    {
      label: "Report",
      helper: "Create a clean report",
      action: () =>
        runGraceTool(
          "Create a clean PDF-ready report with summary, observations, priorities, concerns, and next steps.",
          "Site Report"
        ),
    },
    {
      label: "Checklist",
      helper: "Make a checklist",
      action: () =>
        runGraceTool(
          "Create a practical checklist I can follow.",
          "Maintenance Checklist"
        ),
    },
    {
      label: "Web",
      helper: webMode ? "Web mode is on" : "Use current web lookup",
      action: () => {
        setWebMode((v) => !v);
      },
    },
    {
      label: "PDF",
      helper: "Download last result",
      action: () => downloadPDF(),
    },
    {
      label: "Saved",
      helper: `${savedReports.length} saved`,
      action: () => setSavedReportsOpen(!savedReportsOpen),
    },
    {
      label: "Details",
      helper: "Name/business fields",
      action: () => setDetailsOpen(!detailsOpen),
    },
  ];

  return (
    <main className="min-h-[100dvh] bg-[#fff7f1] text-[#2f2723] flex flex-col overflow-hidden">
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(e) => handleImages(e.target.files)}
        className="hidden"
      />

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleImages(e.target.files)}
        className="hidden"
      />

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

              {webMode && (
                <p className="mt-2 inline-flex items-center rounded-full border border-[#efb99f] bg-[#fff1e8] px-4 py-2 text-xs font-black uppercase tracking-wide text-[#8b4b34] shadow-sm">
                  Web mode on
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
            </div>
          </header>

          {inAppBrowser && !hideBrowserWarning && (
            <div className="relative z-20 mt-4 rounded-[1.5rem] border border-[#efb99f] bg-white/95 p-4 shadow-xl">
              <div className="flex items-start gap-3">
                <div className="text-2xl">⚠️</div>

                <div className="flex-1">
                  <p className="text-sm font-black text-[#6f3b2a]">
                    Open Grace in your browser for full features
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[#8b6a5f]">
                   TikTok, Facebook, and Instagram sometimes block photo upload, voice, and PDF downloads inside their app browser. If the button does not open, use the three dots and choose Open in browser.
                  </p>

                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <button
                      onClick={openInBrowser}
                      className="rounded-2xl bg-[#2f2723] px-3 py-3 text-xs font-black text-white"
                    >
                      Open / Copy
                    </button>

                    <button
                      onClick={copyGraceLink}
                      className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-3 py-3 text-xs font-black text-[#6f3b2a]"
                    >
                      {copiedLink ? "Copied" : "Copy Link"}
                    </button>

                    <button
                      onClick={() => setHideBrowserWarning(true)}
                      className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-3 py-3 text-xs font-black text-[#6f3b2a]"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

 <div className="relative z-10 mt-5 flex flex-col items-center text-center">
            <div
              className={`relative w-[31vh] max-w-[310px] aspect-square rounded-[2.4rem] overflow-hidden border border-white/80 bg-white shadow-2xl ${
                listening || loading || toolLoading
                  ? "shadow-[0_0_70px_rgba(251,146,60,0.65)] animate-pulse"
                  : "shadow-[0_18px_60px_rgba(120,60,30,0.25)]"
              }`}
            >
              <img
                src={graceAvatar}
                alt="Grace"
                className="w-full h-full object-cover object-top scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
            </div>

            <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/80 border border-[#efb99f] px-5 py-3 text-sm font-semibold text-[#6f3b2a] shadow-sm backdrop-blur">
              <span
                className={`w-3 h-3 rounded-full ${
                  listening
                    ? "bg-green-500"
                    : loading || toolLoading
                    ? "bg-[#f3a683]"
                    : "bg-[#d97757]"
                }`}
              />
              {toolLoading
                ? "Grace is building it..."
                : loading
                ? "Grace is thinking..."
                : listening
                ? "Grace is listening..."
                : "Ready when you are"}
            </p>
          </div>

          {images.length > 0 && (
            <div className="relative z-10 mt-3 rounded-[1.5rem] border border-[#efb99f] bg-white/85 p-3 shadow-lg">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-xs font-black text-[#6f3b2a]">
                  Photos attached
                </p>
                <button
                  onClick={() => {
                    imagesRef.current = [];
                    setImages([]);
                    setImageStatus("");
                  }}
                  className="text-xs font-bold text-[#9a6b5a]"
                >
                  Clear
                </button>
              </div>

              <div className="grid grid-cols-4 gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img
                      src={img}
                      alt={`Attached photo ${i + 1}`}
                      className="h-20 w-full rounded-xl object-cover border border-[#efb99f]"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -right-1 -top-1 rounded-full bg-[#2f2723] px-2 py-0.5 text-xs text-white"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {lastToolAnswer && !locked && (
            <div className="relative z-20 mt-3 rounded-[1.5rem] border border-[#efb99f] bg-white/90 p-3 shadow-xl backdrop-blur">
              <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#8b4b34]">
                Grace actions
              </p>

              <div className="grid grid-cols-4 gap-2">
                <button
                  onClick={copyLastAnswer}
                  disabled={loading || toolLoading}
                  className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-3 py-3 text-sm font-black text-[#6f3b2a] shadow-sm disabled:opacity-40"
                >
                  Copy
                </button>

                <button
                  onClick={() => downloadPDF()}
                  disabled={loading || toolLoading}
                  className="rounded-2xl bg-[#2f2723] px-3 py-3 text-sm font-black text-white shadow-sm disabled:opacity-40"
                >
                  PDF
                </button>

                <button
                  onClick={() =>
                    speak(lastToolAnswer).catch(() =>
                      console.log("voice playback failed")
                    )
                  }
                  disabled={loading || toolLoading}
                  className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-3 py-3 text-sm font-black text-[#6f3b2a] shadow-sm disabled:opacity-40"
                >
                  Read
                </button>

                <button
                  onClick={saveCurrentResult}
                  disabled={loading || toolLoading}
                  className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-3 py-3 text-sm font-black text-[#6f3b2a] shadow-sm disabled:opacity-40"
                >
                  Save
                </button>
              </div>

              <p className="mt-2 text-xs text-[#9a6b5a]">
                You can also ask Grace: “make that a PDF,” “copy that,” “read that out loud,” or “save that.”
              </p>
            </div>
          )}

 {/* Tools are now command-based and hidden behind Grace. */}

 {savedReportsOpen && (
            <div className="relative z-20 mt-3 rounded-[2rem] border border-[#efb99f] bg-white/95 p-4 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#6f3b2a]">
                    Saved Reports
                  </p>
                  <p className="mt-1 text-xs text-[#9a6b5a]">
                    Reopen, read, download, or delete reports Grace has saved on this device.
                  </p>
                </div>

                <button
                  onClick={() => setSavedReportsOpen(false)}
                  className="text-sm font-bold text-[#9a6b5a]"
                >
                  Close
                </button>
              </div>

              {savedReports.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-[#efb99f] bg-[#fff7f1] p-4 text-sm font-semibold text-[#8b6a5f]">
                  No saved reports yet. Create a result with Grace, then tap Save.
                </div>
              ) : (
                <div className="mt-4 max-h-[42vh] space-y-3 overflow-y-auto pr-1">
                  {savedReports.map((report) => (
                    <div
                      key={report.id}
                      className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-black text-[#2f2723]">
                            {report.title}
                          </p>
                          <p className="mt-1 text-xs text-[#9a6b5a]">
                            {new Date(report.createdAt).toLocaleString()}
                          </p>
                          {report.projectName ? (
                            <p className="mt-1 text-xs font-semibold text-[#8b6a5f]">
                              Project: {report.projectName}
                            </p>
                          ) : null}
                        </div>

                        <button
                          onClick={() => deleteSavedReport(report.id)}
                          className="rounded-full bg-white px-3 py-1 text-xs font-black text-[#8b4b34]"
                        >
                          Delete
                        </button>
                      </div>

                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#6f3b2a]">
                        {report.answer}
                      </p>

                      <div className="mt-3 grid grid-cols-3 gap-2">
                        <button
                          onClick={() => openSavedReport(report)}
                          className="rounded-2xl bg-[#f3a683] px-3 py-3 text-xs font-black text-white"
                        >
                          Open
                        </button>

                        <button
                          onClick={() =>
                            speak(report.answer).catch(() =>
                              console.log("voice playback failed")
                            )
                          }
                          className="rounded-2xl border border-[#efb99f] bg-white px-3 py-3 text-xs font-black text-[#6f3b2a]"
                        >
                          Read
                        </button>

                        <button
                          onClick={() => downloadPDF(report.answer, report.title)}
                          className="rounded-2xl bg-[#2f2723] px-3 py-3 text-xs font-black text-white"
                        >
                          PDF
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

 {detailsOpen && (
            <div className="relative z-20 mt-3 rounded-[2rem] border border-[#efb99f] bg-white/95 p-4 shadow-xl">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-[#6f3b2a]">
                    PDF / Report Details
                  </p>
                  <p className="mt-1 text-xs text-[#9a6b5a]">
                    These appear at the top of the PDF. Leave anything blank that you do not need.
                  </p>
                </div>

                <button
                  onClick={() => setDetailsOpen(false)}
                  className="text-sm font-bold text-[#9a6b5a]"
                >
                  Close
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2">
                <label className="text-xs font-bold text-[#8b6a5f]">
                  Report Title
                  <input
                    value={reportTitle}
                    onChange={(e) => setReportTitle(e.target.value)}
                    placeholder="Example: Backyard Project Report"
                    className="mt-1 w-full rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-4 py-3 text-[#2f2723] outline-none"
                  />
                </label>

                <label className="text-xs font-bold text-[#8b6a5f]">
                  Prepared For
                  <input
                    value={preparedFor}
                    onChange={(e) => setPreparedFor(e.target.value)}
                    placeholder="Customer, client, or personal name"
                    className="mt-1 w-full rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-4 py-3 text-[#2f2723] outline-none"
                  />
                </label>

                <label className="text-xs font-bold text-[#8b6a5f]">
                  Business Name
                  <input
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="Optional company name"
                    className="mt-1 w-full rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-4 py-3 text-[#2f2723] outline-none"
                  />
                </label>

                <label className="text-xs font-bold text-[#8b6a5f]">
                  Project Name
                  <input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Example: Patio Drainage Plan"
                    className="mt-1 w-full rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-4 py-3 text-[#2f2723] outline-none"
                  />
                </label>

                <label className="text-xs font-bold text-[#8b6a5f]">
                  Location
                  <input
                    value={jobLocation}
                    onChange={(e) => setJobLocation(e.target.value)}
                    placeholder="Optional job or project location"
                    className="mt-1 w-full rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-4 py-3 text-[#2f2723] outline-none"
                  />
                </label>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={saveReportDetails}
                  className="rounded-2xl bg-[#f3a683] px-4 py-3 font-black text-white shadow-sm"
                >
                  Save Details
                </button>

                <button
                  onClick={() => {
                    setReportTitle("");
                    setPreparedFor("");
                    setBusinessName("");
                    setProjectName("");
                    setJobLocation("");
                    localStorage.removeItem("grace_report_details");
                  }}
                  className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-4 py-3 font-black text-[#6f3b2a]"
                >
                  Clear
                </button>
              </div>
            </div>
          )}

          <div className="relative z-10 mt-4 bg-white/70 border border-[#efb99f] rounded-[2rem] p-3 backdrop-blur shadow-xl">
            <div className="max-h-[58vh] overflow-y-auto space-y-3 pr-1">
              {messages.slice(-10).map((message, index) => (
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
                        className="w-11 h-11 rounded-full object-cover object-top border border-[#efb99f] shadow-sm"
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

              {(loading || toolLoading) && (
                <p className="text-[#9a6b5a] animate-pulse pl-14">
                  Grace is working...
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

      {isSpeaking && (
        <div className="fixed bottom-[6.7rem] left-0 right-0 z-40 flex justify-center px-4">
          <button
            onClick={stopSpeaking}
            className="rounded-full border border-[#efb99f] bg-[#2f2723] px-5 py-3 text-sm font-black text-white shadow-xl"
          >
            Stop Reading
          </button>
        </div>
      )}

 <footer className="grace-input-bar fixed bottom-0 left-0 right-0 z-30 p-3 pb-[calc(0.5rem+env(safe-area-inset-bottom))] border-t border-[#efb99f] bg-[#fff7f1]/95 backdrop-blur flex gap-2 items-end">
        <button
          onClick={() => uploadInputRef.current?.click()}
          disabled={locked || loading || toolLoading}
          aria-label="Upload photo"
          className="bg-white border border-[#efb99f] text-[#6f3b2a] px-4 py-3 rounded-2xl text-xl leading-none font-black disabled:opacity-40 shadow-sm"
        >
          +
        </button>

        <button
          onClick={tapToTalk}
          disabled={locked || loading || toolLoading}
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
          disabled={locked || loading || toolLoading}
          rows={1}
          placeholder="Ask Grace anything..."
          className="flex-1 min-w-0 max-h-40 resize-none bg-white border border-[#efb99f] rounded-2xl px-4 py-3 text-[#2f2723] placeholder:text-[#a98273] outline-none disabled:opacity-40 shadow-sm"
        />

        <button
          onClick={() => sendMessage(input)}
          disabled={locked || loading || toolLoading}
          className="bg-[#2f2723] text-white rounded-2xl px-4 py-3 font-black disabled:opacity-40 shadow-sm"
        >
          Send
        </button>
      </footer>
    </main>
  );
}
