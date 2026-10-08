"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import type { FieldMode } from "@/components/field/FieldMap";
import FieldScoutPanel from "@/components/field/FieldScoutPanel";

const FieldMap = dynamic(
  () => import("@/components/field/FieldMap"),
  {
    ssr: false,
    loading: () => (
      <div style={{
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "#101713",
        color: "#e9eee8"
      }}>
        Loading Grace Field...
      </div>
    )
  }
);

export default function GraceField() {
  const [mode, setMode] = useState<FieldMode>("hunt");
  const [heading, setHeading] = useState<number | null>(null);
  const [toolsVisible, setToolsVisible] = useState(true);

  useEffect(() => {
    function onOrientation(event: DeviceOrientationEvent) {
      const compassEvent = event as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
      };

      if (typeof compassEvent.webkitCompassHeading === "number") {
        setHeading(compassEvent.webkitCompassHeading);
      } else if (typeof event.alpha === "number" && event.absolute) {
        setHeading((360 - event.alpha) % 360);
      }
    }

    window.addEventListener("deviceorientationabsolute", onOrientation);
    window.addEventListener("deviceorientation", onOrientation);

    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, []);

  const buttonStyle: React.CSSProperties = {
    background: "rgba(12,20,16,.9)",
    color: "#f1f4ee",
    border: "1px solid rgba(225,234,220,.22)",
    borderRadius: 13,
    padding: "10px 12px",
    fontWeight: 700,
    backdropFilter: "blur(14px)",
    boxShadow: "0 6px 20px rgba(0,0,0,.3)",
    cursor: "pointer"
  };

  return (
    <main style={{
      position: "fixed",
      inset: 0,
      overflow: "hidden",
      background: "#101713",
      color: "#f1f4ee",
      fontFamily: "Arial, sans-serif"
    }}>
      <div style={{ position: "absolute", inset: 0 }}>
        <FieldMap mode={mode} />
 <FieldScoutPanel mode={mode} />
      </div>

      <header style={{
        position: "absolute",
        zIndex: 1200,
        top: "calc(env(safe-area-inset-top, 0px) + 10px)",
        left: 12,
        right: 12,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        pointerEvents: "none"
      }}>
        <div style={{
          pointerEvents: "auto",
          display: "flex",
          gap: 6
        }}>
          <button
            type="button"
            style={buttonStyle}
            onClick={() => window.location.href = "/chat"}
            aria-label="Return to Grace"
          >
            ←
          </button>

          <div style={{
            ...buttonStyle,
            display: "flex",
            gap: 7,
            alignItems: "center",
            letterSpacing: 1,
            fontSize: 12
          }}>
            GRACE FIELD
          </div>
        </div>

        <div style={{
          pointerEvents: "auto",
          background: "rgba(12,20,16,.94)",
          border: "1px solid rgba(225,234,220,.25)",
          borderRadius: 16,
          padding: "8px 12px",
          minWidth: 100,
          textAlign: "center",
          boxShadow: "0 6px 20px rgba(0,0,0,.35)"
        }}>
          <div style={{
            fontSize: 10,
            letterSpacing: 2,
            color: "#a6b5a9"
          }}>
            COMPASS
          </div>

          <div style={{
            fontSize: 23,
            fontWeight: 900,
            color: "#e9d59d"
          }}>
            {heading === null ? "—" : `${Math.round(heading)}°`}
          </div>

          <div style={{
            fontSize: 10,
            color: "#b4c4b5"
          }}>
            {heading === null ? "Sensor unavailable" : "LIVE HEADING"}
          </div>
        </div>
      </header>

      <div style={{
        position: "absolute",
        zIndex: 1200,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
        left: "50%",
        transform: "translateX(-50%)",
        pointerEvents: "auto"
      }}>
        {toolsVisible ? (
          <div style={{
            display: "flex",
            gap: 6,
            padding: 6,
            borderRadius: 18,
            background: "rgba(12,20,16,.94)",
            border: "1px solid rgba(225,234,220,.2)",
            backdropFilter: "blur(16px)",
            boxShadow: "0 8px 28px rgba(0,0,0,.4)"
          }}>
            <button
              type="button"
              style={{
                ...buttonStyle,
                background: mode === "hunt" ? "#d4bd83" : "transparent",
                color: mode === "hunt" ? "#152018" : "#f1f4ee"
              }}
              onClick={() => setMode("hunt")}
            >
              Hunt
            </button>

            <button
              type="button"
              style={{
                ...buttonStyle,
                background: mode === "fish" ? "#d4bd83" : "transparent",
                color: mode === "fish" ? "#152018" : "#f1f4ee"
              }}
              onClick={() => setMode("fish")}
            >
              Fish
            </button>

            <button
              type="button"
              style={buttonStyle}
              onClick={() => setToolsVisible(false)}
            >
              Hide
            </button>
          </div>
        ) : (
          <button
            type="button"
            style={buttonStyle}
            onClick={() => setToolsVisible(true)}
          >
            Tools ↑
          </button>
        )}
      </div>
    </main>
  );
}
