"use client";

import { useEffect, useState } from "react";

type ScoutResponse = {
  reply?: string;
  error?: string;
  verifiedLocation?: {
    county: string;
    state: string;
    source: string;
  } | null;
};

type ScoutMode = "hunt" | "fish";

export default function FieldScoutPanel({
  mode,
}: {
  mode: ScoutMode;
}) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("grace-field-open-scout", show);
    const hide = () => setOpen(false);
    window.addEventListener("grace-field-close-scout", hide);
    return () => window.removeEventListener("grace-field-open-scout", show);
      window.removeEventListener("grace-field-close-scout", hide);
  }, []);
  const [question, setQuestion] = useState("");
  const [destination, setDestination] = useState("");
  const [reply, setReply] = useState("");
  const [location, setLocation] = useState("");
  const [busy, setBusy] = useState(false);

  async function askGrace() {
    if (busy) return;

    const text = question.trim();
    const place = destination.trim();

    if (!text && !place) {
      setReply("Tell me what you want to scout.");
      return;
    }

    setBusy(true);
    setReply("");
    setLocation("");

    try {
      let fieldContext = "";

      if (!place) {
        if (!navigator.geolocation) {
          throw new Error(
            "GPS is unavailable. Enter a destination instead."
          );
        }

        const gps = await new Promise<GeolocationPosition>(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              resolve,
              reject,
              {
                enableHighAccuracy: true,
                maximumAge: 0,
                timeout: 15000,
              }
            );
          }
        );

        fieldContext = JSON.stringify({
          source: "Grace Field",
          mode,
          capturedAt: new Date(gps.timestamp).toISOString(),
          location: {
            latitude: gps.coords.latitude,
            longitude: gps.coords.longitude,
            accuracyMeters: gps.coords.accuracy,
          },
          savedSpots: [],
        });
      }

      const response = await fetch("/api/field-scout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          question:
            text ||
            `Scout ${place} for ${mode === "hunt" ? "hunting" : "fishing"}.`,
          destination: place,
          fieldContext,
          mode,
        }),
      });

      const data: ScoutResponse = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || "Scouting is temporarily unavailable."
        );
      }

      setReply(data.reply || "No scouting response was returned.");

      if (data.verifiedLocation) {
        setLocation(
          `${data.verifiedLocation.county}, ${data.verifiedLocation.state}`
        );
      }
    } catch (error) {
      setReply(
        error instanceof Error
          ? error.message
          : "Grace couldn't complete that scouting request."
      );
    } finally {
      setBusy(false);
    }
  }

  const surface: React.CSSProperties = {
    background: "rgba(13,22,17,.97)",
    color: "#eef2eb",
    border: "1px solid rgba(212,189,131,.55)",
    boxShadow: "0 12px 40px rgba(0,0,0,.5)",
    backdropFilter: "blur(16px)",
  };

  const field: React.CSSProperties = {
    width: "100%",
    boxSizing: "border-box",
    borderRadius: 11,
    border: "1px solid #526356",
    background: "#1b2a20",
    color: "#fff",
    padding: "12px",
    fontSize: 14,
    outline: "none",
  };

  return (
    <div
      style={{
        position: "absolute",
        zIndex: 1300,
        right: 12,
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 88px)",
        width: "min(390px, calc(100vw - 24px))",
        pointerEvents: "auto",
      }}
    >
      {open && (
        <section
          style={{
            ...surface,
            borderRadius: 20,
            padding: 15,
            marginBottom: 10,
            maxHeight: "65dvh",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 12,
            }}
          >
            <div>
              <div
                style={{
                  color: "#C8AE79",
                  fontWeight: 900,
                  letterSpacing: 1,
                }}
              >
                GRACE / SCOUT
              </div>
              <div style={{ fontSize: 11, opacity: 0.7 }}>
                Your outdoor guide, wherever you explore
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{
                background: "transparent",
                border: 0,
                color: "#fff",
                fontSize: 22,
                cursor: "pointer",
              }}
              aria-label="Close Scout"
            >
              ×
            </button>
          </div>

          <label style={{ fontSize: 12, color: "#b8c8b9" }}>
            Destination (optional — blank uses live GPS)
          </label>

          <input
            value={destination}
            onChange={(event) => setDestination(event.target.value)}
            placeholder="Deep Creek Lake, Maryland"
            style={{ ...field, marginTop: 5, marginBottom: 12 }}
          />

          <label style={{ fontSize: 12, color: "#b8c8b9" }}>
            What would you like to know?
          </label>

          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="Where should I start fishing today?"
            rows={3}
            style={{
              ...field,
              marginTop: 5,
              resize: "vertical",
            }}
          />

          <button
            type="button"
            disabled={busy}
            onClick={askGrace}
            style={{
              width: "100%",
              marginTop: 12,
              padding: 13,
              borderRadius: 12,
              border: 0,
              background: busy ? "#697466" : "#C8AE79",
              color: "#101A15",
              fontWeight: 900,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Scouting..." : "Ask Grace"}
          </button>

          {location && (
            <div
              style={{
                marginTop: 13,
                color: "#C8AE79",
                fontSize: 12,
                fontWeight: 800,
              }}
            >
              Verified location: {location}
            </div>
          )}

          {reply && (
            <div
              aria-live="polite"
              style={{
                marginTop: 13,
                padding: 13,
                borderRadius: 12,
                background: "#1d2c22",
                lineHeight: 1.55,
                fontSize: 14,
                whiteSpace: "pre-wrap",
              }}
            >
              {reply}
            </div>
          )}
        </section>
      )}

     
    </div>
  );
}
