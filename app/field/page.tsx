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

  useEffect(() => {
    function onOrientation(event: DeviceOrientationEvent) {
      const e = event as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
      };

      if (typeof e.webkitCompassHeading === "number") {
        setHeading((e.webkitCompassHeading + 360) % 360);
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
    border: "1px solid rgba(225,234,220,.24)",
    borderRadius: 13,
    background: "rgba(12,20,16,.94)",
    color: "#f1f4ee",
    padding: "10px 12px",
    fontWeight: 800,
    cursor: "pointer",
    backdropFilter: "blur(14px)",
    boxShadow: "0 5px 18px rgba(0,0,0,.32)"
  };

  const cardinal = heading === null
    ? "—"
    : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][
        Math.round(heading / 45) % 8
      ];

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
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: 8,
        pointerEvents: "none"
      }}>
        <div style={{
          display: "flex",
          gap: 6,
          alignItems: "center",
          pointerEvents: "auto"
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
            fontSize: 11,
            letterSpacing: 1.1,
            padding: "12px 10px"
          }}>
            GRACE FIELD
          </div>
        </div>

        <div style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          pointerEvents: "auto"
        }}>
          {(["hunt", "fish"] as const).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setMode(value)}
              style={{
                ...buttonStyle,
                padding: "11px 10px",
                background:
                  mode === value
                    ? "#d4bd83"
                    : "rgba(12,20,16,.94)",
                color:
                  mode === value ? "#152018" : "#f1f4ee",
                fontSize: 12
              }}
            >
              {value === "hunt" ? "Hunt" : "Fish"}
            </button>
          ))}
        </div>
      </header>

      <div style={{
        position: "absolute",
        zIndex: 1190,
        top: "calc(env(safe-area-inset-top, 0px) + 70px)",
        right: 12,
        width: 112,
        padding: "10px 8px",
        borderRadius: 18,
        border: "1px solid rgba(225,234,220,.3)",
        background: "rgba(12,20,16,.94)",
        boxShadow: "0 6px 24px rgba(0,0,0,.45)",
        textAlign: "center",
        pointerEvents: "none"
      }}>
        <div style={{
          fontSize: 9,
          letterSpacing: 2,
          color: "#b6c4b8",
          marginBottom: 7
        }}>
          COMPASS
        </div>

        <div style={{
          position: "relative",
          width: 82,
          height: 82,
          margin: "0 auto",
          borderRadius: "50%",
          border: "2px solid #d4bd83",
          background:
            "radial-gradient(circle, #26372b 0%, #111b15 75%)",
          boxShadow: "inset 0 0 14px rgba(0,0,0,.65)"
        }}>
          <div style={{
            position: "absolute",
            left: "50%",
            top: -7,
            transform: "translateX(-50%)",
            color: "#e9d59d",
            fontSize: 17,
            zIndex: 2
          }}>
            ▼
          </div>

          <div style={{
            position: "absolute",
            inset: 0,
            transform: `rotate(${- (heading ?? 0)}deg)`,
            transition: "transform .15s linear"
          }}>
            {(["N", "E", "S", "W"] as const).map(
              (direction, i) => {
                const positions = [
                  { top: 7, left: "50%", transform: "translateX(-50%)" },
                  { right: 7, top: "50%", transform: "translateY(-50%)" },
                  { bottom: 7, left: "50%", transform: "translateX(-50%)" },
                  { left: 7, top: "50%", transform: "translateY(-50%)" }
                ];

                return (
                  <span key={direction} style={{
                    position: "absolute",
                    ...positions[i],
                    color:
                      direction === "N" ? "#e5b76d" : "#dce7da",
                    fontWeight: 900,
                    fontSize: 13
                  }}>
                    {direction}
                  </span>
                );
              }
            )}
          </div>

          <div style={{
            position: "absolute",
            inset: 28,
            borderRadius: "50%",
            background: "#d4bd83",
            border: "2px solid #101713"
          }} />
        </div>

        <div style={{
          marginTop: 7,
          color: "#e9d59d",
          fontSize: 19,
          fontWeight: 900
        }}>
          {heading === null
            ? "—"
            : `${Math.round(heading)}°`}
        </div>

        <div style={{
          fontSize: 10,
          color: "#b4c4b5",
          letterSpacing: 1
        }}>
          {heading === null ? "NO SENSOR" : cardinal}
        </div>
      </div>
    </main>
  );
}
