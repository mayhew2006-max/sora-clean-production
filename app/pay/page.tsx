"use client";

export default function Pay() {
  async function subscribe() {
    const res = await fetch("/api/create-checkout", { method: "POST" });
    const data = await res.json();

    if (data.url) window.location.href = data.url;
    else alert("Checkout failed.");
  }

  return (
    <main className="min-h-screen bg-black text-white flex items-center justify-center px-6">
      <button
        onClick={subscribe}
        className="bg-white text-black px-8 py-4 rounded-2xl font-bold"
      >
        Subscribe to Sora Pro
      </button>
    </main>
  );
}
