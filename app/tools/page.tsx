"use client";

import { useState } from "react";
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
  "Custom PDF"
];

export default function GraceToolsPage() {
  const [toolType, setToolType] = useState("Business Plan");
  const [userPrompt, setUserPrompt] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleImages(files: FileList | null) {
    if (!files) return;

    const selected = Array.from(files).slice(0, 4);

    const converted = await Promise.all(
      selected.map(
        (file) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = reject;
            reader.readAsDataURL(file);
          })
      )
    );

    setImages(converted);
  }

  async function runGraceTool() {
    if (!userPrompt.trim() && images.length === 0) {
      alert("Add a request or upload photos first.");
      return;
    }

    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/tools", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          } catch {
            // Ignore partial stream parsing errors.
          }
        }
      }
    } catch (err: any) {
      setAnswer("Grace ran into an issue: " + (err?.message || "Unknown error"));
    } finally {
      setLoading(false);
    }
  }

  function downloadPDF() {
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

  return (
    <main className="min-h-screen bg-black text-white px-4 py-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
              Grace Tools
            </h1>
            <p className="text-white/70 mt-2">
              Plan ideas, analyze photos, build scopes, and create PDF-ready reports.
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
            <label className="block text-sm text-white/70 mb-2">
              Choose what Grace should create
            </label>

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

            <label className="block text-sm text-white/70 mt-5 mb-2">
              Tell Grace what you need
            </label>

            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Example: I want to start a small property consulting business. Make me a 30-day plan and a PDF-ready business outline."
              className="w-full min-h-[180px] rounded-xl bg-black border border-white/20 px-4 py-3 text-white outline-none"
            />

            <label className="block text-sm text-white/70 mt-5 mb-2">
              Upload photos for Grace to analyze
            </label>

            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => handleImages(e.target.files)}
              className="w-full rounded-xl border border-white/20 p-3 text-sm"
            />

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Upload ${i + 1}`}
                    className="h-20 w-full object-cover rounded-lg border border-white/10"
                  />
                ))}
              </div>
            )}

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
