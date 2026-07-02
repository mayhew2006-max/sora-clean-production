"use client";

import { useEffect, useMemo, useState } from "react";
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

type SavedReport = {
  id: string;
  title: string;
  project: string;
  clientName: string;
  jobLocation: string;
  toolType: string;
  prompt: string;
  answer: string;
  createdAt: string;
  otgMode: boolean;
};

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

  const [project, setProject] = useState("General");
  const [newProject, setNewProject] = useState("");
  const [reportTitle, setReportTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [jobLocation, setJobLocation] = useState("");
  const [otgMode, setOtgMode] = useState(false);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);

  useEffect(() => {
    const savedPaid = localStorage.getItem("sora_paid");
    const founderAccess = localStorage.getItem("grace_founder");
    setPaid(savedPaid === "true" || founderAccess === "true");
    setCheckingPremium(false);

    const saved = localStorage.getItem("grace_saved_reports");
    if (saved) {
      try {
        setSavedReports(JSON.parse(saved));
      } catch {
        setSavedReports([]);
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("grace_saved_reports", JSON.stringify(savedReports));
  }, [savedReports]);

  const projects = useMemo(() => {
    const unique = Array.from(new Set(["General", ...savedReports.map((r) => r.project).filter(Boolean)]));
    return unique;
  }, [savedReports]);

  function activeProjectName() {
    return newProject.trim() || project || "General";
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

  function saveReport(finalAnswer?: string) {
    const textToSave = finalAnswer || answer;

    if (!textToSave.trim()) {
      alert("Generate a report first.");
      return;
    }

    const title =
      reportTitle.trim() ||
      `${toolType} - ${new Date().toLocaleDateString()}`;

    const report: SavedReport = {
      id: crypto.randomUUID(),
      title,
      project: activeProjectName(),
      clientName,
      jobLocation,
      toolType,
      prompt: userPrompt,
      answer: textToSave,
      createdAt: new Date().toISOString(),
      otgMode,
    };

    setSavedReports((prev) => [report, ...prev].slice(0, 100));
    setProject(report.project);
    setNewProject("");
  }

  function loadReport(report: SavedReport) {
    setReportTitle(report.title);
    setProject(report.project || "General");
    setClientName(report.clientName || "");
    setJobLocation(report.jobLocation || "");
    setToolType(report.toolType || "Custom PDF");
    setUserPrompt(report.prompt || "");
    setAnswer(report.answer || "");
    setOtgMode(Boolean(report.otgMode));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function deleteReport(id: string) {
    setSavedReports((prev) => prev.filter((r) => r.id !== id));
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
      const enhancedPrompt = `
Project folder: ${activeProjectName()}
Report title: ${reportTitle || "Untitled"}
Client name: ${clientName || "Not provided"}
Job/location: ${jobLocation || "Not provided"}
Brand mode: ${otgMode ? "OTG Site Consulting / Property & Landscaping Concepts" : "Grace standard report"}

User request:
${userPrompt}
`;

      const res = await fetch("/api/tools", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-grace-paid": paid ? "true" : "false",
        },
        body: JSON.stringify({ toolType, userPrompt: enhancedPrompt, images }),
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

      if (fullText.trim()) {
        const autoSave = window.confirm("Grace finished. Save this report to your history?");
        if (autoSave) saveReport(fullText);
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
    doc.text(otgMode ? "OTG Site Consulting" : "Grace Assistant Report", margin, 52);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);

    let headerY = 75;

    if (otgMode) {
      doc.text("Property & Landscaping Concepts", margin, headerY);
      headerY += 17;
      doc.text("Burlington, WV", margin, headerY);
      headerY += 17;
    }

    doc.text(`Type: ${toolType}`, margin, headerY);
    headerY += 17;

    if (reportTitle) {
      doc.text(`Title: ${reportTitle}`, margin, headerY);
      headerY += 17;
    }

    if (clientName) {
      doc.text(`Client: ${clientName}`, margin, headerY);
      headerY += 17;
    }

    if (jobLocation) {
      doc.text(`Location: ${jobLocation}`, margin, headerY);
      headerY += 17;
    }

    doc.text(`Project: ${activeProjectName()}`, margin, headerY);
    headerY += 17;
    doc.text(`Created: ${new Date().toLocaleString()}`, margin, headerY);

    doc.setDrawColor(180);
    doc.line(margin, headerY + 18, pageWidth - margin, headerY + 18);

    doc.setFontSize(12);

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

    const filePrefix = otgMode ? "otg" : "grace";
    const fileName = reportTitle || toolType;

    doc.save(`${filePrefix}-${fileName.toLowerCase().replaceAll(" ", "-")}.pdf`);
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
              <a href="/" className="rounded-full border border-white/20 px-5 py-3 text-center text-sm hover:bg-white hover:text-black transition">
                ← Back to Grace
              </a>

              <a href="/account" className="rounded-full border border-white/20 px-5 py-3 text-center text-sm hover:bg-white hover:text-black transition">
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

                  <a href="/pay" className="rounded-2xl bg-fuchsia-500 px-7 py-4 text-center font-black shadow-[0_0_35px_rgba(217,33,255,0.35)] hover:bg-fuchsia-400">
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
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">Grace Tools</h1>
            <p className="text-white/70 mt-2">
              Take photos, build plans, save reports, organize projects, and create PDFs.
            </p>
          </div>

          <a href="/chat" className="rounded-full border border-white/20 px-5 py-3 text-sm hover:bg-white hover:text-black transition">
            Back to Grace
          </a>
        </div>

        <div className="grid xl:grid-cols-[1.1fr_1fr_0.9fr] gap-6">
          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
            <h2 className="text-xl font-bold mb-4">Create</h2>

            <label className="block text-sm text-white/70 mb-2">Report title</label>
            <input
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              placeholder="Example: Garage Drainage Scope"
              className="w-full rounded-xl bg-black border border-white/20 px-4 py-3 text-white outline-none"
            />

            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Client name</label>
                <input
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl bg-black border border-white/20 px-4 py-3 text-white outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">Job/location</label>
                <input
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl bg-black border border-white/20 px-4 py-3 text-white outline-none"
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-3 mt-4">
              <div>
                <label className="block text-sm text-white/70 mb-2">Project folder</label>
                <select
                  value={project}
                  onChange={(e) => setProject(e.target.value)}
                  className="w-full rounded-xl bg-black border border-white/20 px-4 py-3 text-white"
                >
                  {projects.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/70 mb-2">New folder</label>
                <input
                  value={newProject}
                  onChange={(e) => setNewProject(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-xl bg-black border border-white/20 px-4 py-3 text-white outline-none"
                />
              </div>
            </div>

            <label className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-black/40 p-4">
              <input
                type="checkbox"
                checked={otgMode}
                onChange={(e) => setOtgMode(e.target.checked)}
              />
              <span>
                <span className="font-bold">OTG-branded PDF mode</span>
                <span className="block text-xs text-white/55">Adds OTG Site Consulting / Property & Landscaping Concepts to PDFs.</span>
              </span>
            </label>

            <label className="block text-sm text-white/70 mt-5 mb-2">Choose what Grace should create</label>
            <select
              value={toolType}
              onChange={(e) => setToolType(e.target.value)}
              className="w-full rounded-xl bg-black border border-white/20 px-4 py-3 text-white"
            >
              {tools.map((tool) => (
                <option key={tool} value={tool}>{tool}</option>
              ))}
            </select>

            <label className="block text-sm text-white/70 mt-5 mb-2">Tell Grace what you need</label>
            <textarea
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="Example: Look at this photo and create a scope of work, material list, safety concerns, and client-ready summary."
              className="w-full min-h-[160px] rounded-xl bg-black border border-white/20 px-4 py-3 text-white outline-none"
            />

            <div className="mt-5 grid sm:grid-cols-2 gap-3">
              <label className="block rounded-2xl border border-fuchsia-400/40 bg-fuchsia-500/15 px-4 py-4 text-center cursor-pointer hover:bg-fuchsia-500/25 transition">
                <span className="font-semibold">Take Photo</span>
                <span className="block text-xs text-white/60 mt-1">Opens camera on phone</span>
                <input type="file" accept="image/*" capture="environment" onChange={(e) => handleImages(e.target.files)} className="hidden" />
              </label>

              <label className="block rounded-2xl border border-white/20 bg-white/5 px-4 py-4 text-center cursor-pointer hover:bg-white/10 transition">
                <span className="font-semibold">Upload Photo</span>
                <span className="block text-xs text-white/60 mt-1">Choose from gallery</span>
                <input type="file" accept="image/*" multiple onChange={(e) => handleImages(e.target.files)} className="hidden" />
              </label>
            </div>

            {imageStatus && <p className="mt-3 text-sm text-white/60">{imageStatus}</p>}

            {images.length > 0 && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt={`Upload ${i + 1}`} className="h-20 w-full object-cover rounded-lg border border-white/10" />
                    <button onClick={() => removeImage(i)} className="absolute -top-2 -right-2 rounded-full bg-red-500 text-white text-xs w-6 h-6" type="button">×</button>
                  </div>
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

              <div className="flex gap-2">
                <button onClick={() => saveReport()} className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black transition">
                  Save
                </button>
                <button onClick={downloadPDF} className="rounded-full border border-white/20 px-4 py-2 text-sm hover:bg-white hover:text-black transition">
                  PDF
                </button>
              </div>
            </div>

            <div className="min-h-[650px] whitespace-pre-wrap rounded-2xl bg-black/70 border border-white/10 p-5 text-white/90 leading-relaxed overflow-auto">
              {answer || "Grace’s plan, analysis, or report will appear here in real time."}
            </div>
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/5 p-5 shadow-2xl">
            <h2 className="text-xl font-bold">Saved Reports</h2>
            <p className="mt-2 text-sm text-white/55">
              Reports save on this device for now. Account cloud sync comes next.
            </p>

            <div className="mt-5 space-y-3 max-h-[760px] overflow-auto pr-1">
              {savedReports.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-black/40 p-5 text-sm text-white/55">
                  No saved reports yet.
                </div>
              ) : (
                savedReports.map((report) => (
                  <div key={report.id} className="rounded-2xl border border-white/10 bg-black/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold">{report.title}</h3>
                        <p className="mt-1 text-xs text-white/50">
                          {report.project} • {report.toolType}
                        </p>
                        <p className="mt-1 text-xs text-white/40">
                          {new Date(report.createdAt).toLocaleString()}
                        </p>
                        {report.otgMode && (
                          <p className="mt-2 inline-block rounded-full bg-fuchsia-500/20 px-3 py-1 text-xs text-fuchsia-200">
                            OTG
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2">
                      <button onClick={() => loadReport(report)} className="rounded-full bg-white text-black px-4 py-2 text-xs font-bold">
                        Open
                      </button>
                      <button onClick={() => deleteReport(report.id)} className="rounded-full border border-red-400/40 px-4 py-2 text-xs text-red-200">
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
