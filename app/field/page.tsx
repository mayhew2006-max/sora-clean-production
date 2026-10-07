"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { FieldMode } from "@/components/field/FieldMap";

const FieldMap = dynamic(
  () => import("@/components/field/FieldMap"),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: "100%",
          display: "grid",
          placeItems: "center",
          background: "#111814",
          color: "white",
          fontWeight: 800,
        }}
      >
        Loading Grace Outdoors...
      </div>
    ),
  }
);

export default function GraceField() {
  const [mode, setMode] = useState<FieldMode>("hunt");

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        overflow: "hidden",
        background: "#111814",
        color: "white",
        fontFamily: "Arial, sans-serif",
      }}
    >
      {/* Full-screen Field map */}
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        <FieldMap mode={mode} />
      </div>

      {/* Top Grace bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          padding:
            "calc(env(safe-area-inset-top, 0px) + 10px) 12px 10px",
          pointerEvents: "none",
        }}
      >
        <button
          type="button"
          onClick={() => {
            window.location.href = "/chat";
          }}
          style={{
            pointerEvents: "auto",
            padding: "10px 14px",
            borderRadius: 999,
            border: "1px solid rgba(244,210,122,.65)",
            background: "rgba(17,24,20,.92)",
            color: "white",
            fontWeight: 900,
            boxShadow: "0 4px 16px rgba(0,0,0,.35)",
          }}
        >
          ← Grace
        </button>

        <div
          style={{
            pointerEvents: "auto",
            display: "flex",
            padding: 4,
            borderRadius: 999,
            background: "rgba(17,24,20,.92)",
            border: "1px solid rgba(244,210,122,.55)",
            boxShadow: "0 4px 16px rgba(0,0,0,.35)",
          }}
        >
          <button
            type="button"
            onClick={() => setMode("hunt")}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "9px 13px",
              background:
                mode === "hunt" ? "#f4d27a" : "transparent",
              color: mode === "hunt" ? "#111814" : "white",
              fontWeight: 900,
            }}
          >
            🦌 Hunt
          </button>

          <button
            type="button"
            onClick={() => setMode("fish")}
            style={{
              border: 0,
              borderRadius: 999,
              padding: "9px 13px",
              background:
                mode === "fish" ? "#f4d27a" : "transparent",
              color: mode === "fish" ? "#111814" : "white",
              fontWeight: 900,
            }}
          >
            🎣 Fish
          </button>
        </div>
      </div>
    </main>
  );
}
