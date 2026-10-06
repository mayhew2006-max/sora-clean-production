"use client";

import { useState } from "react";

export default function GraceField() {
  const [mode, setMode] = useState<"hunt" | "fish">("hunt");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111814",
        color: "white",
        padding: "24px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: 700, margin: "0 auto" }}>
        <div style={{ fontSize: 14, opacity: 0.7 }}>GRACE</div>

        <h1 style={{ margin: "6px 0" }}>Field</h1>

        <p style={{ opacity: 0.8, marginTop: 0 }}>
          Hunting & Fishing Companion
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            marginTop: 24,
            marginBottom: 24,
          }}
        >
          <button
            onClick={() => setMode("hunt")}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              border: "1px solid #777",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🦌 Hunt
          </button>

          <button
            onClick={() => setMode("fish")}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              border: "1px solid #777",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            🎣 Fish
          </button>
        </div>

        <section
          style={{
            border: "1px solid #39443d",
            borderRadius: 16,
            padding: 20,
            background: "#18211b",
          }}
        >
          <h2 style={{ marginTop: 0 }}>
            {mode === "hunt" ? "Hunting Mode" : "Fishing Mode"}
          </h2>

          <p style={{ opacity: 0.8 }}>
            Field map coming online.
          </p>

          <div
            style={{
              height: 300,
              borderRadius: 14,
              background: "#26352b",
              display: "grid",
              placeItems: "center",
              marginTop: 18,
              fontSize: 18,
            }}
          >
            📍 Live Map
          </div>
        </section>
      </div>
    </main>
  );
}
