"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { FieldMode } from "@/components/field/FieldMap";

const FieldMap = dynamic(
  () => import("@/components/field/FieldMap"),
  {
    ssr: false,
    loading: () => (
      <div style={{ padding: 30 }}>
        Loading Grace Field...
      </div>
    ),
  }
);

export default function GraceField() {
  const [mode, setMode] =
    useState<FieldMode>("hunt");

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#111814",
        color: "white",
        padding: 18,
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            fontSize: 13,
            opacity: 0.65,
            letterSpacing: 2,
          }}
        >
          GRACE
        </div>

        <h1
          style={{
            margin: "4px 0",
            fontSize: 34,
          }}
        >
          Field
        </h1>

        <p
          style={{
            opacity: 0.75,
            marginTop: 0,
          }}
        >
          Your hunting & fishing companion.
        </p>

        <div
          style={{
            display: "flex",
            gap: 10,
            margin: "20px 0",
          }}
        >
          <button
            onClick={() => setMode("hunt")}
            style={{
              flex: 1,
              padding: 14,
              borderRadius: 12,
              border:
                mode === "hunt"
                  ? "2px solid #f4d27a"
                  : "1px solid #58635b",
              fontWeight: 800,
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
              border:
                mode === "fish"
                  ? "2px solid #f4d27a"
                  : "1px solid #58635b",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            🎣 Fish
          </button>
        </div>

        <FieldMap mode={mode} />
      </div>
    </main>
  );
}
