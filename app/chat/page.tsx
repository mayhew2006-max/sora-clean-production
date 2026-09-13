"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { jsPDF } from "jspdf";

type Message = {
  role: "user" | "user-image" | "assistant" | "assistant-image";
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

Talk with the user like a familiar, intelligent person, not a chatbot.

Match their tone and the actual reason they are talking to you.

For ordinary conversation:
- keep responses natural and proportionate,
- short messages usually deserve short replies,
- emotional comments usually deserve presence before advice,
- do not explain someone's feelings back to them,
- do not turn casual conversation into lists or lectures.

If they joke, joke with them.
If they vent, let them vent.
If they ask for advice, give honest advice.
If they ask a serious question, think it through.
If they need a task completed, help complete it.

You can be warm, blunt, funny, caring, sarcastic, or practical when appropriate.

Mild profanity is fine when it naturally fits the relationship and context.

Do not blindly agree with the user.
Do not sound scripted.
Do not force follow-up questions.
Do not pile unrelated information into the answer.

Grace should respond to the person first and the topic second.
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
  const [authReady, setAuthReady] = useState(false);
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [accountFreeUsed, setAccountFreeUsed] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toolLoading, setToolLoading] = useState(false);
  const [listening, setListening] = useState(false);
   const [isSpeaking, setIsSpeaking] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [savedReportsOpen, setSavedReportsOpen] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedGraceReport[]>([]);
  const [webMode, setWebMode] = useState(false);
  const [inAppBrowser, setInAppBrowser] = useState(false);
  const [hideBrowserWarning, setHideBrowserWarning] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
 const [sidebarOpen, setSidebarOpen] = useState(false);

  const [toolType, setToolType] = useState("Photo Analysis");
  const [images, setImages] = useState<string[]>([]);
  const imagesRef = useRef<string[]>([]);
  const [imageStatus, setImageStatus] = useState("");
  const [lastToolAnswer, setLastToolAnswer] = useState("");
  const [conversationId, setConversationId] = useState("");
  const [historyReady, setHistoryReady] = useState(false);

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
  const historySyncedCountRef = useRef(0);

  useEffect(() => {
    let alive = true;

    async function loadGraceAccount() {
      const { data: sessionData } = await supabase.auth.getSession();

      if (!alive) return;

      const session = sessionData.session;

      if (!session?.user) {
        window.location.href = "/login";
        return;
      }

      const user = session.user;

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: usage, error: usageError } = await supabase
        .from("grace_user_usage")
        .select("free_messages_used, paid, founder")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!alive) return;

      if (usageError) {
        console.error("Grace account usage load failed:", usageError);
      }

      if (!usage) {
        const { error: createError } = await supabase
          .from("grace_user_usage")
          .insert({
            user_id: user.id,
            email: user.email || "",
            free_messages_used: 0,
          });

        if (createError) {
          console.error("Grace account creation failed:", createError);
        }

        setAccountFreeUsed(0);
        setPaid(false);
      } else {
        setAccountFreeUsed(Number(usage.free_messages_used || 0));

        const accountPaid =
          Boolean(usage.paid) || Boolean(usage.founder);

        setPaid(accountPaid);
      }

      setAuthReady(true);
    }

    loadGraceAccount();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        window.location.href = "/login";
      }
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const graceBrandVersion = "grace-auth-v1";
    const savedBrandVersion = localStorage.getItem("grace_brand_version");

    if (savedBrandVersion !== graceBrandVersion) {
      localStorage.setItem("grace_brand_version", graceBrandVersion);
      localStorage.removeItem("grace_messages");
    }

    const savedMessages = localStorage.getItem("grace_messages");
    const savedMemory = localStorage.getItem("grace_memory");
    // Paid/founder status now comes from the signed-in Grace account.

    if (savedMessages) setMessages(JSON.parse(savedMessages));

    if (savedMemory) {
      setMemory(savedMemory);
      memoryRef.current = savedMemory;
    }

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
    if (!userId) return;

    let cancelled = false;

    async function loadConversationHistory() {
      setHistoryReady(false);

      const { data: existingConversation, error: conversationError } =
        await supabase
          .from("grace_conversations")
          .select("id, title")
          .eq("user_id", userId)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();

      if (cancelled) return;

      if (conversationError) {
        console.error(
          "Grace conversation load failed:",
          conversationError
        );
        setHistoryReady(true);
        return;
      }

      let currentConversation = existingConversation;

      if (!currentConversation) {
        const { data: createdConversation, error: createError } =
          await supabase
            .from("grace_conversations")
            .insert({
              user_id: userId,
              title: "New conversation",
            })
            .select("id, title")
            .single();

        if (cancelled) return;

        if (createError || !createdConversation) {
          console.error(
            "Grace conversation creation failed:",
            createError
          );
          setHistoryReady(true);
          return;
        }

        currentConversation = createdConversation;
      }

      const id = currentConversation.id;
      setConversationId(id);

      const { data: savedRows, error: messageError } =
        await supabase
          .from("grace_conversation_messages")
          .select("role, content, created_at")
          .eq("conversation_id", id)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(200);

      if (cancelled) return;

      if (messageError) {
        console.error(
          "Grace conversation messages failed:",
          messageError
        );
        setHistoryReady(true);
        return;
      }

      if (savedRows && savedRows.length > 0) {
        const loadedMessages: Message[] = [...savedRows]
          .reverse()
          .filter(
            (row) =>
              (row.role === "user" || row.role === "assistant") &&
              typeof row.content === "string" &&
              row.content.trim()
          )
          .map((row) => ({
            role: row.role as "user" | "assistant",
            content: row.content,
          }));

        historySyncedCountRef.current = loadedMessages.length;
        messagesRef.current = loadedMessages;
        setMessages(loadedMessages);

        try {
          localStorage.setItem(
            "grace_messages",
            JSON.stringify(loadedMessages.slice(-40))
          );
        } catch {}

        setHistoryReady(true);
        return;
      }

      // First account-history migration:
      // preserve the conversation already stored in this browser.
      let localMessages: Message[] = [];

      try {
        const saved = localStorage.getItem("grace_messages");

        if (saved) {
          const parsed = JSON.parse(saved);

          if (Array.isArray(parsed)) {
            localMessages = parsed
              .filter(
                (message: Message) =>
                  message &&
                  (message.role === "user" ||
                    message.role === "assistant") &&
                  typeof message.content === "string" &&
                  message.content.trim()
              )
              .slice(-40);
          }
        }
      } catch {}

      if (localMessages.length > 0) {
        const { error: migrationError } = await supabase
          .from("grace_conversation_messages")
          .insert(
            localMessages.map((message) => ({
              conversation_id: id,
              user_id: userId,
              role: message.role,
              content: message.content,
            }))
          );

        if (migrationError) {
          console.error(
            "Grace conversation migration failed:",
            migrationError
          );
        } else {
          historySyncedCountRef.current = localMessages.length;
          messagesRef.current = localMessages;
          setMessages(localMessages);
        }
      }

      setHistoryReady(true);
    }

    loadConversationHistory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  useEffect(() => {
    if (!historyReady || !conversationId || !userId) return;

    const persistentMessages = messages
      .filter(
        (message) =>
          (message.role === "user" ||
            message.role === "assistant") &&
          typeof message.content === "string" &&
          message.content.trim() &&
          message.content !== "I’m working on it..."
      )
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: message.content!.trim(),
      }));

    const alreadySaved = historySyncedCountRef.current;

    if (persistentMessages.length <= alreadySaved) return;

    const messagesToSave = persistentMessages.slice(alreadySaved);
    const targetCount = persistentMessages.length;

    const timer = window.setTimeout(async () => {
      // Claim these messages before the network request so fast
      // follow-up responses do not duplicate the user message.
      historySyncedCountRef.current = targetCount;

      const { error } = await supabase
        .from("grace_conversation_messages")
        .insert(
          messagesToSave.map((message) => ({
            conversation_id: conversationId,
            user_id: userId,
            role: message.role,
            content: message.content,
          }))
        );

      if (error) {
        console.error(
          "Grace conversation save failed:",
          error
        );

        historySyncedCountRef.current = alreadySaved;
        return;
      }

      const firstUserMessage = persistentMessages.find(
        (message) => message.role === "user"
      );

      const title =
        firstUserMessage?.content
          ?.replace(/\s+/g, " ")
          .trim()
          .slice(0, 60) || "Grace conversation";

      await supabase
        .from("grace_conversations")
        .update({
          title,
          updated_at: new Date().toISOString(),
        })
        .eq("id", conversationId)
        .eq("user_id", userId);
    }, 700);

    return () => window.clearTimeout(timer);
  }, [
    messages,
    historyReady,
    conversationId,
    userId,
  ]);

  useEffect(() => {
    messagesRef.current = messages;

    // Do not persist generated base64 images in localStorage.
    // They can exceed browser storage limits and crash the page.
    const messagesForStorage = messages
      .filter((message) => message.role !== "assistant-image")
      .slice(-40);

    try {
      localStorage.setItem(
        "grace_messages",
        JSON.stringify(messagesForStorage)
      );
    } catch (error) {
      console.warn("Grace message storage skipped:", error);
    }

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

  const freeLeft = Math.max(FREE_LIMIT - accountFreeUsed, 0);
  const locked = authReady && !paid && freeLeft <= 0;

  async function recordGraceUserMessage() {
    if (!userId || paid) return;

    const nextUsed = accountFreeUsed + 1;
    setAccountFreeUsed(nextUsed);

    const { error } = await supabase
      .from("grace_user_usage")
      .upsert({
        user_id: userId,
        email: userEmail,
        free_messages_used: nextUsed,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Grace usage update failed:", error);
      setAccountFreeUsed(accountFreeUsed);
    }
  }

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    async function loadAccountMemory() {
      const { data, error } = await supabase
        .from("grace_user_memory")
        .select("memory")
        .eq("user_id", userId)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Grace account memory load failed:", error);
        return;
      }

      const accountMemory =
        typeof data?.memory === "string" ? data.memory.trim() : "";

      const localMemory =
        (localStorage.getItem("grace_memory") || "").trim();

      // First migration: preserve an existing local Grace memory
      // by copying it into the user's account.
      if (!accountMemory && localMemory) {
        memoryRef.current = localMemory;
        setMemory(localMemory);

        const { error: saveError } = await supabase
          .from("grace_user_memory")
          .upsert(
            {
              user_id: userId,
              memory: localMemory,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (saveError) {
          console.error("Grace memory migration failed:", saveError);
        }

        return;
      }

      // Once account memory exists, it becomes the source of truth.
      if (accountMemory) {
        memoryRef.current = accountMemory;
        setMemory(accountMemory);
        localStorage.setItem("grace_memory", accountMemory);
      }
    }

    loadAccountMemory();

    return () => {
      cancelled = true;
    };
  }, [userId]);

 async function updateMemory(text: string) {
    const clean = text.trim();
    if (!clean) return;

    try {
      const res = await fetch("/api/memory", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: clean,
          memory: memoryRef.current,
        }),
      });

      if (!res.ok) return;

      const data = await res.json();

      if (
        !data?.changed ||
        typeof data?.memory !== "string" ||
        !data.memory.trim()
      ) {
        return;
      }

      const updated = data.memory.trim().slice(-6000);

      memoryRef.current = updated;
      setMemory(updated);
      localStorage.setItem("grace_memory", updated);

      if (userId) {
        const { error } = await supabase
          .from("grace_user_memory")
          .upsert(
            {
              user_id: userId,
              memory: updated,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id" }
          );

        if (error) {
          console.error("Grace account memory save failed:", error);
        }
      }
    } catch (error) {
      console.error("Grace smart memory skipped:", error);
    }
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
      const converted = await Promise.all(
        selected.map((file) => compressImage(file))
      );

      // A new upload becomes the active image context.
      // Older attached images do not leak into the new request.
      const newestImages = converted.slice(-4);

      imagesRef.current = newestImages;
      setImages(newestImages);

      const imageMessages: Message[] = newestImages.map((image) => ({
        role: "user-image",
        image,
      }));

      const nextChat = [
        ...messagesRef.current,
        ...imageMessages,
      ];

      messagesRef.current = nextChat;
      setMessages(nextChat);

      setImageStatus("Photo added to the conversation.");

      // If the user already typed a question, use it.
      // Otherwise Grace automatically recognizes/analyzes the new photo.
      const photoRequest =
        input.trim() ||
        "Look at the newest photo I uploaded. Tell me what you see, what is important, and anything useful I should know.";

      await recordGraceUserMessage();
      await runGraceTool(photoRequest, "Photo Analysis");
    } catch {
      setImageStatus(
        "Grace could not prepare that image. Try a different photo."
      );
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
Answer as Grace inside the normal conversation.
Be practical, clear, natural, and useful.
Answer the user's actual question first.
Do not automatically turn answers into reports, checklists, plans, summaries, or formal sections.
Only use report, checklist, plan, proposal, scope, or PDF-style formatting when the user explicitly asks for it.
For ordinary photo questions, answer conversationally and include only the details that actually help.
If a photo is included, use what is visibly relevant to the user's question.
Do not mention OTG.
Only use business/report fields when the user specifically requests a report or document.
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
    await updateMemory(request);

    loadingRef.current = true;
    setToolLoading(true);
    setLoading(true);
    setToolsOpen(false);

    const userLabel =
      request ||
      (attachedImages.length > 0
        ? "Analyze this photo."
        : activeTool);

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

    // The uploaded photo stays visible in chat, but it is no longer
    // active context after Grace finishes this response.
    imagesRef.current = [];
    setImages([]);
    setImageStatus("");

    loadingRef.current = false;
    setToolLoading(false);
    setLoading(false);
  }

 
 
 
  async function runGraceImageGeneration(prompt: string) {
    if (locked || loadingRef.current || toolLoading) return;

    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) return;

    trackEvent("grace_image_generated");

    setLoading(true);
    loadingRef.current = true;

    const nextMessages: Message[] = [
      ...messagesRef.current,
      { role: "user", content: cleanPrompt },
      {
        role: "assistant",
        content: "I’m creating that image for you now.",
      },
    ];

    setMessages(nextMessages);
    setInput("");

    try {
      const res = await fetch("/api/image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-grace-paid": paid || !locked ? "true" : "false",
        },
        body: JSON.stringify({
          prompt: cleanPrompt,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Grace could not create that image.");
      }

      const image = data?.image;

      if (!image) {
        throw new Error("Grace did not receive an image back.");
      }

      setMessages([
        ...nextMessages,
        { role: "assistant-image", image },
      ]);
    } catch (error: any) {
      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content:
            "Grace could not create that image: " +
            (error?.message || "Unknown error"),
        },
      ]);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

 async function runGraceSportsAnalysis(query: string) {
    if (locked || loadingRef.current || toolLoading) return;

    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    trackEvent("grace_sports_analysis_used");

    setLoading(true);
    loadingRef.current = true;
    setInput("");
    setToolsOpen(false);
    recognitionRef.current?.stop();

    const nextMessages: Message[] = [
      ...messagesRef.current,
      { role: "user", content: cleanQuery },
    ];

    setMessages(nextMessages);

    try {
      const res = await fetch("/api/sports-research", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cleanQuery,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.reply || "Grace sports analysis failed."
        );
      }

      const reply =
        data?.reply ||
        "I couldn't get enough solid evidence to rank that.";

      setMessages([
        ...nextMessages,
        { role: "assistant", content: reply },
      ]);

      speak(reply).catch(() =>
        console.log("voice playback failed")
      );
    } catch (error: any) {
      const reply =
        "Grace sports analysis hit a glitch: " +
        (error?.message || "Unknown error");

      setMessages([
        ...nextMessages,
        { role: "assistant", content: reply },
      ]);

      speak(reply).catch(() =>
        console.log("voice playback failed")
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }


 async function runGraceSportsData(query: string) {
    if (locked || loadingRef.current || toolLoading) return;

    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    trackEvent("grace_sports_data_used");

    setLoading(true);
    loadingRef.current = true;
    setInput("");
    setToolsOpen(false);
    recognitionRef.current?.stop();

    const nextMessages: Message[] = [
      ...messagesRef.current,
      { role: "user", content: cleanQuery },
    ];

    setMessages(nextMessages);

    try {
      const res = await fetch("/api/sports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: cleanQuery,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.reply || "Grace sports data failed.");
      }

      const reply =
        data?.reply || "I pulled the sports data, but I couldn't get a useful answer.";

      setMessages([
        ...nextMessages,
        { role: "assistant", content: reply },
      ]);

      speak(reply).catch(() =>
        console.log("voice playback failed")
      );
    } catch (error: any) {
      const reply =
        "Grace sports data hit a glitch: " +
        (error?.message || "Unknown error");

      setMessages([
        ...nextMessages,
        { role: "assistant", content: reply },
      ]);

      speak(reply).catch(() =>
        console.log("voice playback failed")
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }


 async function runGraceWebSearch(query: string) {
    if (locked || loadingRef.current || toolLoading) return;

    const cleanQuery = query.trim();
    if (!cleanQuery) return;

    trackEvent("grace_web_search_used");

    setLoading(true);
    loadingRef.current = true;
    setInput("");
    setToolsOpen(false);
    recognitionRef.current?.stop();

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
          conversation: messagesRef.current
            .filter((m) => m.role === "user" || m.role === "assistant")
            .slice(-8)
            .map((m) => ({
              role: m.role,
              content: m.content,
            })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.reply || "Grace web search failed.");
      }

      const reply =
        data?.reply ||
        "Grace searched, but did not get a useful answer.";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);

      setLastToolAnswer(reply);
      speak(reply).catch(() =>
        console.log("voice playback failed")
      );
    } catch (error: any) {
      const reply =
        "Grace web search hit a glitch: " +
        (error?.message || "Unknown error");

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply },
      ]);

      speak(reply).catch(() =>
        console.log("voice playback failed")
      );
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }

 function shouldUseSportsAnalysis(text: string) {
    const clean = text.trim().toLowerCase();

    const analysisPatterns = [
      /\bpicks?\b/,
      /\bbets?\b/,
      /\bpredictions?\b/,
      /\bpredict\b/,
      /\bmoney\s*line\b/,
      /\bmoneyline\b/,
      /\bspread\b/,
      /\brun\s*line\b/,
      /\bpuck\s*line\b/,
      /\bover\s*\/?\s*under\b/,
      /\btotals?\b/,
      /\bteam totals?\b/,
      /\bprops?\b/,
      /\bplayer props?\b/,
      /\bparlays?\b/,
      /\b\d+\s*[- ]?legs?\b/,
      /\bstrongest play\b/,
      /\bstrongest prediction\b/,
      /\bbest play\b/,
      /\bbest bet\b/,
      /\bscan the board\b/,
      /\bscan everything\b/,
      /\bany sport\b/,
      /\ball sports\b/,
      /\bevery sport\b/,
      /\bdaily sports report\b/,
      /\bsports report\b/,
      /\banything worth betting\b/,
      /\banything look good\b/,
      /\bconfidence\b/,
      /\bwho\s+(should|will)\s+win\b/,
    ];

    return analysisPatterns.some((pattern) =>
      pattern.test(clean)
    );
  }


 function shouldUseSportsQuery(text: string) {
    const clean = text.trim().toLowerCase();

    const sportsWords = [
      "nfl",
      "nba",
      "wnba",
      "mlb",
      "nhl",
      "ncaaf",
      "ncaam",
      "college football",
      "college basketball",
      "cfb",
      "march madness",
      "soccer",
      "premier league",
      "epl",
      "champions league",
      "ucl",
      "mls",
      "football game",
      "basketball game",
      "baseball game",
      "hockey game",
      "score",
      "scores",
      "standings",
      "schedule",
      "game tonight",
      "game today",
      "who won",
      "who plays",
      "who is playing",
      "record",
      "playoff seed",
      "starting pitcher",
      "starting quarterback",
    ];

    return sportsWords.some((word) => clean.includes(word));
  }


 function shouldUseWebQuery(text: string) {
    const clean = text.trim().toLowerCase();

    if (webMode) return true;

    const webWords = [
      "search",
      "look up",
      "current",
      "currently",
      "latest",
      "today",
      "tonight",
      "tomorrow",
      "yesterday",
      "this week",
      "this month",
      "this year",
      "right now",
      "now",
      "recent",
      "recently",
      "updated",
      "update",
      "breaking",
      "price",
      "worth",
      "value",
      "compare prices",
      "market price",
      "near me",
      "reviews",
      "specs",
      "law",
      "laws",
      "rules",
      "regulations",
      "news",
      "weather",
      "forecast",
      "temperature",
      "stock",
      "stocks",
      "market",
      "available",
      "availability",
      "sale",
      "deal",
      "facebook marketplace",
      "marketplace",
      "on the web",
      "web search",
      "online",
      "internet",
      "browse",
      "look online",
      "find online",
      "find me online",
      "listings",
      "for sale online",
      "score",
      "scores",
      "game",
      "schedule",
      "standings",
      "ranking",
      "rankings",
      "injury",
      "injuries",
      "starting lineup",
      "starter",
      "starting quarterback",
      "starting pitcher",
      "odds",
      "line",
      "spread",
      "moneyline",
      "over under",
      "who won",
      "who is playing",
      "who plays",
      "when does",
      "where can i buy",
      "how much is",
      "what is happening",
      "what happened",
    ];

    if (webWords.some((word) => clean.includes(word))) {
      return true;
    }

    const likelyCurrentQuestionPatterns = [
      /^who (is|are) .+ (now|today|currently)\??$/,
      /^what (is|are) .+ (now|today|currently)\??$/,
      /^where (is|are) .+ (now|today|currently)\??$/,
      /^when (is|are|does|do) .+\??$/,
      /^how much (is|are) .+\??$/,
      /^is .+ open\??$/,
      /^is .+ available\??$/,
      /^does .+ still .+\??$/,
      /^can i still .+\??$/,
    ];

    return likelyCurrentQuestionPatterns.some((pattern) =>
      pattern.test(clean)
    );
  }


 function isImageGenerationQuery(text: string) {
    const clean = text.trim().toLowerCase();

    const actionWords = [
      "generate",
      "create",
      "make",
      "draw",
      "design",
      "render",
      "visualize",
      "show me",
      "mock up",
      "mockup",
    ];

    const imageWords = [
      "image",
      "photo",
      "picture",
      "pic",
      "flyer",
      "poster",
      "logo",
      "ad",
      "graphic",
      "banner",
      "thumbnail",
      "mockup",
      "wallpaper",
      "cover",
    ];

    const hasAction = actionWords.some((word) => clean.includes(word));
    const hasImageWord = imageWords.some((word) => clean.includes(word));

    if (hasAction && hasImageWord) return true;

    if (
      clean.startsWith("show me ") ||
      clean.startsWith("generate me ") ||
      clean.startsWith("make me ") ||
      clean.startsWith("create me ")
    ) {
      return true;
    }

    return false;
  }

function isMarketplaceQuery(text: string) {
    const clean = text.trim().toLowerCase();

    const words = [
      "marketplace",
      "facebook marketplace",
      "good deal",
      "bad deal",
      "fair deal",
      "worth buying",
      "should i buy",
      "what should i offer",
      "offer for this",
      "red flags",
      "seller",
      "buyer",
      "listing",
      "list this",
      "sell this",
      "what should i list",
      "asking price",
      "fair price",
      "price this",
      "write a listing",
      "write my listing",
      "compare listings",
      "negotiate",
      "walk away",
      "scam",
    ];

    return words.some((word) => clean.includes(word));
  }

 function shouldUsePhotoTool(text: string) {
    const hasAttachedPhoto =
      (imagesRef.current.length ? imagesRef.current : images).length > 0;

    if (!hasAttachedPhoto) return false;

    const clean = text.trim().toLowerCase();
    if (!clean) return true;

    // Use an attached photo when the user's message actually appears
    // to refer to the image or something visible in it.
    const photoReferences = [
      "photo",
      "picture",
      "image",
      "pic",
      "screenshot",
      "what do you see",
      "what do you notice",
      "tell me what you notice",
      "look at this",
      "look at that",
      "what is this",
      "what's this",
      "what is that",
      "what's that",
      "this machine",
      "this vehicle",
      "this truck",
      "this car",
      "this equipment",
      "this item",
      "this listing",
      "the machine",
      "the vehicle",
      "the truck",
      "the car",
      "the equipment",
      "the item",
      "the listing",
      "tires",
      "tire",
      "leak",
      "leaks",
      "damage",
      "rust",
      "wear",
      "condition",
      "red flags",
    ];

    return photoReferences.some((phrase) => clean.includes(phrase));
  }

  function isAmbiguousMarketplaceQuery(text: string) {
    const hasAttachedPhoto =
      (imagesRef.current.length ? imagesRef.current : images).length > 0;

    if (hasAttachedPhoto) return false;

    const clean = text.trim().toLowerCase();

    // Grace should ask what the user means before launching Deal Check
    // when words like "this" or "it" have no item or photo attached.
    const ambiguousEndings = [
      "fair price for this",
      "fair price for that",
      "worth this",
      "worth that",
      "worth it",
      "good deal for this",
      "good deal for that",
      "should i buy this",
      "should i buy that",
      "what should i offer for this",
      "what should i offer for that",
    ];

    const normalized = clean.replace(/[?.!]+$/g, "").trim();

    return ambiguousEndings.some((phrase) => normalized.endsWith(phrase));
  }

  async function sendMessage(text: string) {
    const clean = text.trim();
    if (!clean || loadingRef.current) return;

    if (locked) {
      trackEvent("paywall_hit");
      window.location.href = "/pay";
      return;
    }

    await recordGraceUserMessage();

    const lower = clean.toLowerCase();

    const wantsPdfFromLastThing =
      lower.includes("pdf") ||
      lower.includes("put that into a pdf") ||
      lower.includes("put this into a pdf") ||
      lower.includes("make that a pdf") ||
      lower.includes("make this a pdf") ||
      lower.includes("turn that into a pdf") ||
      lower.includes("turn this into a pdf") ||
      lower.includes("download that") ||
      lower.includes("save that as pdf");

    const lastGeneratedImage = [...messagesRef.current]
      .reverse()
      .find((msg) => msg.role === "assistant-image" && msg.image)?.image;

    if (lastGeneratedImage && wantsPdfFromLastThing) {
      const nextMessages: Message[] = [
        ...messagesRef.current,
        { role: "user", content: clean },
        {
          role: "assistant",
          content: "Done — I’m turning that image into a PDF for you now.",
        },
      ];

      setMessages(nextMessages);
      setInput("");
      setTimeout(() => downloadGeneratedImagePDF(lastGeneratedImage), 250);
      return;
    }


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

    if (isImageGenerationQuery(clean)) {
      await runGraceImageGeneration(clean);
      return;
    }

    if (shouldUsePhotoTool(clean)) {
      await runGraceTool(clean, isMarketplaceQuery(clean) ? "Deal Check" : "Photo Analysis");
      return;
    }

    if (isMarketplaceQuery(clean) && !isAmbiguousMarketplaceQuery(clean)) {
      await runGraceTool(clean, "Deal Check");
      return;
    }

    if (shouldUseSportsAnalysis(clean)) {
      await runGraceSportsAnalysis(clean);
      return;
    }

    if (shouldUseSportsQuery(clean)) {
      await runGraceSportsData(clean);
      return;
    }

    if (shouldUseWebQuery(clean)) {
      await runGraceWebSearch(clean);
      return;
    }

    trackEvent("message_sent");
    await updateMemory(clean);

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


  function downloadGeneratedImagePDF(image: string) {
    try {
      const pdf = new jsPDF("p", "pt", "letter");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 36;

      const img = new Image();

      img.onload = () => {
        const maxWidth = pageWidth - margin * 2;
        const maxHeight = pageHeight - 120;
        const ratio = Math.min(maxWidth / img.width, maxHeight / img.height);

        const imgWidth = img.width * ratio;
        const imgHeight = img.height * ratio;
        const x = (pageWidth - imgWidth) / 2;
        const y = 78;

        pdf.setFontSize(20);
        pdf.text("Grace Image", margin, 42);

        pdf.setFontSize(10);
        pdf.text("Created by Grace", margin, 60);

        const format = image.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
        pdf.addImage(image, format, x, y, imgWidth, imgHeight);

        pdf.save(`grace-image-${Date.now()}.pdf`);
      };

      img.onerror = () => {
        alert("Grace could not turn that image into a PDF.");
      };

      img.src = image;
    } catch {
      alert("Grace could not turn that image into a PDF.");
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

  if (!authReady) {
    return (
      <main className="min-h-[100dvh] bg-[#fff7f1] text-[#2f2723] flex items-center justify-center">
        <div className="text-center">
          <img
            src="/grace-avatar.png"
            alt="Grace"
            className="w-20 h-20 rounded-full object-cover mx-auto mb-4 shadow-lg"
          />
          <p className="font-black">Opening Grace...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="h-[100dvh] bg-[#fff7f1] text-[#2f2723] flex flex-col overflow-hidden">
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

          <header className="relative z-30 h-16 shrink-0 border-b border-[#efb99f] bg-[#fff7f1]/95 backdrop-blur px-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(true)}
                aria-label="Open Grace memory"
                className="rounded-xl border border-[#efb99f] bg-white px-3 py-2 text-lg font-black text-[#6f3b2a] shadow-sm"
              >
                ☰
              </button>

              <img
                src={graceAvatar}
                alt="Grace"
                className="w-10 h-10 rounded-full object-cover object-top border border-[#efb99f] shadow-sm"
              />

              <div className="leading-tight">
                <h1 className="text-lg font-black tracking-tight text-[#2f2723]">
                  Grace
                </h1>

                {!paid && (
                  <p className="text-[11px] font-semibold text-[#8b4b34]">
                    {freeLeft} free left
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {webMode && (
                <span className="hidden sm:inline-flex rounded-full border border-[#efb99f] bg-[#fff1e8] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-[#8b4b34]">
                  Web on
                </span>
              )}

              <a
                href="/account"
                className="rounded-xl border border-[#efb99f] bg-white px-3 py-2 text-sm font-black text-[#6f3b2a] shadow-sm"
              >
                Account
              </a>
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


 {/* Grace actions are command-based and hidden. */}



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

          <div className="relative z-10 h-[calc(100%-4rem)] overflow-hidden">
            <div className="grace-message-scroll h-full overflow-y-auto px-4 sm:px-6 py-5 pb-32 space-y-4">
              {messages.slice(-10).map((message, index) => (
                <div
                  key={index}
                  className={
                    message.role === "user" ||
                    message.role === "user-image"
                      ? "ml-auto max-w-[85%]"
                      : "mr-auto max-w-[88%] flex gap-3 items-start"
                  }
                >
                  {message.role === "user-image" ? (
                    <div className="rounded-3xl bg-[#f3a683] p-2 shadow-lg">
                      <img
                        src={message.image}
                        alt="Uploaded photo"
                        className="max-h-80 w-auto max-w-full rounded-2xl object-contain"
                      />
                    </div>
                  ) : message.role === "assistant-image" ? (
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
                        className="w-8 h-8 rounded-full object-cover object-top border border-[#efb99f] shadow-sm shrink-0"
                      />

                      <div className="text-[#2f2723] px-1 py-2 whitespace-pre-wrap leading-7 max-w-3xl">
                        {message.content}
                      </div>
                    </>
                  ) : (
                    <div className="bg-[#f3a683] text-white rounded-3xl px-5 py-4 shadow-lg whitespace-pre-wrap">
                      {message.content}
                    </div>
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

      {sidebarOpen && (
        <div className="fixed inset-0 z-50">
          <button
            aria-label="Close sidebar"
            onClick={() => setSidebarOpen(false)}
            className="absolute inset-0 bg-black/30"
          />

          <aside className="absolute left-0 top-0 h-full w-[88%] max-w-sm bg-[#fff7f1] border-r border-[#efb99f] shadow-2xl flex flex-col">
            <div className="h-16 border-b border-[#efb99f] px-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={graceAvatar}
                  alt="Grace"
                  className="w-9 h-9 rounded-full object-cover object-top border border-[#efb99f]"
                />
                <div>
                  <p className="font-black text-[#2f2723]">Grace</p>
                  <p className="text-xs text-[#9a6b5a]">Memory & saved items</p>
                </div>
              </div>

              <button
                onClick={() => setSidebarOpen(false)}
                className="rounded-xl border border-[#efb99f] bg-white px-3 py-2 font-black text-[#6f3b2a]"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <section>
                <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#8b4b34]">
                  Memory
                </p>

                <div className="rounded-2xl border border-[#efb99f] bg-white p-4 text-sm leading-6 text-[#6f3b2a] whitespace-pre-wrap">
                  {memory.trim() || "Grace has not saved any long-term memory yet."}
                </div>
              </section>

              <section>
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-black uppercase tracking-wide text-[#8b4b34]">
                    Saved reports
                  </p>
                  <span className="text-xs text-[#9a6b5a]">{savedReports.length}</span>
                </div>

                {savedReports.length === 0 ? (
                  <div className="rounded-2xl border border-[#efb99f] bg-white p-4 text-sm text-[#8b6a5f]">
                    No saved reports yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {savedReports.map((report) => (
                      <button
                        key={report.id}
                        onClick={() => {
                          openSavedReport(report);
                          setSidebarOpen(false);
                        }}
                        className="w-full rounded-2xl border border-[#efb99f] bg-white p-3 text-left shadow-sm"
                      >
                        <p className="font-black text-[#2f2723]">
                          {report.title}
                        </p>
                        <p className="mt-1 text-xs text-[#9a6b5a]">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </aside>
        </div>
      )}

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
            Upgrade — $4.99/month
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
            Stop reading
          </button>
        </div>
      )}


      {toolsOpen && !locked && (
        <div className="fixed bottom-[5.7rem] left-3 z-40 w-56 rounded-[1.5rem] border border-[#efb99f] bg-white/95 p-3 shadow-2xl backdrop-blur">
          {/* Photo source menu */}
          <p className="mb-2 text-xs font-black uppercase tracking-wide text-[#8b4b34]">
            Add photo
          </p>

          <div className="grid grid-cols-1 gap-2">
            <button
              onClick={() => {
                setToolsOpen(false);
                cameraInputRef.current?.click();
              }}
              disabled={loading || toolLoading}
              className="rounded-2xl bg-[#f3a683] px-4 py-3 text-left text-sm font-black text-white shadow-sm disabled:opacity-40"
            >
              Camera
              <span className="block text-xs font-semibold opacity-85">
                Take a new photo
              </span>
            </button>

            <button
              onClick={() => {
                setToolsOpen(false);
                uploadInputRef.current?.click();
              }}
              disabled={loading || toolLoading}
              className="rounded-2xl border border-[#efb99f] bg-[#fff7f1] px-4 py-3 text-left text-sm font-black text-[#6f3b2a] shadow-sm disabled:opacity-40"
            >
              Gallery
              <span className="block text-xs font-semibold opacity-80">
                Choose existing photo
              </span>
            </button>
          </div>
        </div>
      )}

 <footer className="grace-input-bar fixed bottom-0 left-0 right-0 z-30 px-3 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#fff7f1] via-[#fff7f1]/98 to-transparent">
        <div className="mx-auto max-w-3xl rounded-[1.6rem] border border-[#efb99f] bg-white p-2 shadow-xl flex gap-2 items-end">
        <button
          onClick={() => setToolsOpen((v) => !v)}
          disabled={locked || loading || toolLoading}
          aria-label="Add photo"
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
        </div>
      </footer>
    </main>
  );
}
