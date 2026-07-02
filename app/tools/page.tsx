"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";

const tools = [
  "Business Plan",
  "Project Plan",
  "Work Scope",
  "Site Report",
  "Maintenance Checklist",
  "Landscaping Concept",
  "Client Proposal",
  "Personal Goal Plan",
  "Idea Generator",
  "Custom PDF",
];

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

export default function GraceToolsPage() {
  const [toolType, setToolType] = useState("Business Plan");
  const [userPrompt, setUserPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [imageStatus, setImageStatus] = useState("");
  const [paid, setPaid] = useState(false);
  const [checkingPremium, setCheckingPremium] = useState(true);

  useEffect(() => {
    const savedPaid = localStorage.getItem("sora_paid");
    const founderAccess = localStorage.getItem("grace_founder");
    setPaid(savedPaid === "true" || founderAccess === "true");
    setCheckingPremium(false);
  }, []);

  async function handleImages(files: FileList | null) {
    if (!files) return;

    const selected = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 4);

    if (selected.length === 0) {
      setImageStatus("Please choose a valid image.");
      return;
    }

    setImageStatus("Preparing photo...");

    try {
      const converted = await Promise.all(selected.map((file) => compressImage(file)));
      setImages((prev) => [...prev, ...converted].slice(0, 4));
      setImageStatus("Photo ready for Grace.");
    } catch {
      setImageStatus("Grace could not prepare that image. Try a different photo.");
    }
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  async function runGraceTool() {
    if (!paid) {
      window.location.href = "/pay";
      return;
    }

    if (!userPrompt.trim() && images.length === 0) {
      alert("Add a request, take a photo, or upload photos first.");
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-grace-paid": paid ? "true" : "false",
        },
        body: JSON.stringify({ toolType, userPrompt, images }),
      });

      if (!res.ok || !res.body) {
        const text = await res.text();
        throw new Error(text || "Grace could not generate this.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

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
            if (token) {
              fullText += token;
              setAnswer(fullText);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setAnswer("Grace ran into an issue: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
    if (!paid) {
      window.location.href = "/pay";
      return;
    }

    if (!answer.trim()) {
      alert("Generate something first.");
      return;
    }

    const doc = new jsPDF({
      unit: "pt",
      format: "letter",
    });

    const margin = 48;
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const usableWidth = pageWidth - margin * 2;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.text("Grace Assistant Report", margin, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.text(`Type: ${toolType}`, margin, 75);
    doc.text(`Created: ${new Date().toLocaleString()}`, margin, 92);

    doc.setFontSize(12);

    const clean = answer
      .replaceAll("**", "")
      .replaceAll("###", "")
      .replaceAll("##", "")
      .replaceAll("#", "");

    const lines = doc.splitTextToSize(clean, usableWidth);
    let y = 125;

    for (const line of lines) {
      if (y > pageHeight - 55) {
        doc.addPage();
        y = 55;
      }
      doc.text(line, margin, y);
      y += 16;
    }

    doc.save(`grace-${toolType.toLowerCase().replaceAll(" ", "-")}.pdf`);
  }

  if (checkingPremium) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-10">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-white/10 bg-white/[0.04] p-8 text-center">
          <h1 className="text-3xl font-black">Checking Grace Premium...</h1>
          <p className="mt-3 text-white/60">One moment while Grace loads your access.</p>
        </div>
      </main>
    );
  }

  if (!paid) {
    return (
      <main className="min-h-screen bg-black text-white px-4 py-10">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-[2rem] border border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/15 to-white/[0.04] p-8 shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <a
                href="/"
                className="rounded-full border border-white/20 px-5 py-3 text-center text-sm hover:bg-white hover:text-black transition"
              >
                ← Back to Grace
              </a>

              <a
                href="/account"
                className="rounded-full border border-white/20 px-5 py-3 text-center text-sm hover:bg-white hover:text-black transition"
              >
                My Account
              </a>
            </div>

            <div className="mt-10">
              <div className="mb-4 inline-flex rounded-full border border-fuchsia-400/30 bg-fuchsia-500/10 px-4 py-2 text-sm font-semibold text-fuchsia-200">
                Grace Premium
              </div>

              <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-tight">
                Unlock Grace Tools.
              </h1>

              <p className="mt-5 max-w-3xl text-lg sm:text-xl leading-8 text-white/70">
                Grace Tools turns photos, ideas, questions, and rough notes into plans,
                work scopes, reports, checklists, and downloadable PDFs.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {[
                  ["📷", "Photo Analysis", "Take or upload photos and get useful observations and next steps."],
                  ["💡", "Planning Tools", "Build business plans, project plans, goals, routines, and strategies."],
                  ["🧰", "Work Scopes", "Create scopes of work, material lists, safety notes, and client summaries."],
                  ["📄", "PDF Reports", "Turn Grace’s output into clean downloadable documents."],
                ].map(([icon, title, text]) => (
                  <div key={title} className="rounded-2xl border border-white/10 bg-white/[0.05] p-5">
                    <div className="text-3xl">{icon}</div>
                    <h2 className="mt-3 text-xl font-black">{title}</h2>
                    <p className="mt-2 text-sm leading-6 text-white/65">{text}</p>
                  </div>
                ))}
              </div>

              <div className="mt-10 rounded-3xl border border-white/10 bg-black/40 p-6">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <div className="text-sm font-bold uppercase tracking-wider text-fuchsia-300">
                      Grace Premium
                    </div>
                    <div className="mt-2 flex items-end gap-2">
                      <span className="text-6xl font-black text-fuchsia-300">$5</span>
                      <span className="pb-2 text-white/70">/month</span>
                    </div>
                    <p className="mt-2 text-sm text-white/60">
                      No tricks. No hidden upsell. Cancel anytime.
                    </p>
                  </div>

                  <a
                    href="/pay"
                    className="rounded-2xl bg-fuchsia-500 px-7 py-4 text-center font-black shadow-[0_0_35px_rgba(217,33,255,0.35)] hover:bg-fuchsia-400"
                  >
                    Unlock Grace Tools
                  </a>
                </div>
              </div>

              <p className="mt-6 text-center text-sm text-white/50">
                Already subscribed? Open Grace chat or My Account, then refresh this page.
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">Grace Tools</h1>
            <p className="text-white/70 mt-2">
              Take photos, upload images, plan ideas, build scopes, and create PDF-ready reports.
            </p>
          </div>

          <a
            href="/chat"
            className="rounded-full border border-white/20 px-5 py-3 text-sm hover:bg-white hover:text-black transition"
          >
            Back to Grace
          </a>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
            <label className="block text-sm text-white/70 mb-2">Choose what Grace should create</label>

            <select
              value={toolType}
              onChange={(e) => setToolType(e.target.value)}
              className="w-full rounded-xl bg-black border border-white/20 px-4 py-3 text-white"
            >
              {tools.map((tool) => (
                <option key={tool} value={tool}>
                  {tool}
                </option>
              ))}
            </select>

            <label className="block text-sm text-white/70 mt-5 mb-2">Tell Grace what you need</label>

            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Example: Look at this photo and create a scope of work, material list, safety concerns, and client-ready summary."
              className="w-full min-h-[180px] rounded-xl bg-black border border-white/20 px-4 py-3 text-white outline-none"
            />

            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <label className="block rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-4 text-center cursor-pointer hover:bg-fuchsia-500/25 transition">
                <span className="font-semibold">Take Photo</span>
                <span className="block text-xs text-white/60 mt-1">Opens camera on phone</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImages(e.target.files)}
                  className="hidden"
                />
              </label>

              <label className="block rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-center cursor-pointer hover:bg-white/10 transition">
                <span className="font-semibold">Upload Photo</span>
                <span className="block text-xs text-white/60 mt-1">Choose from gallery</span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={(e) => handleImages(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>

            {imageStatus && <p className="mt-3 text-sm text-white/60">{imageStatus}</p>}

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img
                      src={img}
                      alt={`Upload ${i + 1}`}
                      className="h-20 w-full object-cover rounded-lg border border-white/10"
                    />
                    <button
                      onClick={() => removeImage(i)}
                      className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white text-xs w-6 h-6"
                      type="button"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <p className="mt-3 text-xs text-white/45">
              Grace automatically resizes photos before analyzing them. Use 1-4 photos per report.
            </p>

            <button
              onClick={runGraceTool}
              disabled={loading}
              className="mt-5 w-full rounded-full bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 px-6 py-4 font-semibold text-white transition"
            >
              {loading ? "Grace is working..." : "Ask Grace"}
            </button>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-xl font-semibold">Grace Response</h2>

              <button
                onClick={downloadPDF}
                className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black transition"
              >
                Download PDF
              </button>
            </div>

            <div className="min-h-[500px] whitespace-pre-wrap rounded-2xl bg-black/70 border border-white/10 p-5 text-white/90 leading-relaxed overflow-auto">
              {answer || "Grace’s plan, analysis, or report will appear here in real time."}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
