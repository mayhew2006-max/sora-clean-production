"use client";

import { useEffect, useState } from "react";

type Position = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

const gold = "#cdb780";
const dark = "#101813";
const panel = "#15221b";

const button: React.CSSProperties = {
  background: "#213329",
  border: "1px solid rgba(205,183,128,.45)",
  color: "#f3f1e8",
  padding: "12px",
  borderRadius: 12,
  fontWeight: 750,
  cursor: "pointer",
};

const storageKey = "grace-field-weekend-notes-v1";

export default function FieldWeekendKit() {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<Position | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [notes, setNotes] = useState("");
  const [savedNotes, setSavedNotes] = useState<
    { text: string; time: string; location: string }[]
  >([]);
  const [started, setStarted] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [online, setOnline] = useState(true);
  const [battery, setBattery] = useState<string>("Unknown");
  const [checklist, setChecklist] = useState<boolean[]>(
    Array(7).fill(false)
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) setSavedNotes(JSON.parse(stored));
    } catch {}

    setOnline(navigator.onLine);

    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);

    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);

    let watchId: number | undefined;

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        result => {
          setPosition({
            lat: result.coords.latitude,
            lng: result.coords.longitude,
            accuracy: result.coords.accuracy,
            timestamp: result.timestamp,
          });
          setGpsError("");
        },
        error => setGpsError(error.message),
        {
          enableHighAccuracy: true,
          maximumAge: 5000,
          timeout: 20000,
        }
      );
    } else {
      setGpsError("GPS unavailable");
    }

    const batteryAPI = navigator as Navigator & {
      getBattery?: () => Promise<{
        level: number;
        charging: boolean;
        addEventListener: (
          event: string,
          listener: () => void
        ) => void;
        removeEventListener: (
          event: string,
          listener: () => void
        ) => void;
      }>;
    };

    let batteryCleanup = () => {};

    if (batteryAPI.getBattery) {
      batteryAPI.getBattery().then(b => {
        const update = () =>
          setBattery(
            `${Math.round(b.level * 100)}%${b.charging ? " · Charging" : ""}`
          );
        update();
        b.addEventListener("levelchange", update);
        b.addEventListener("chargingchange", update);
        batteryCleanup = () => {
          b.removeEventListener("levelchange", update);
          b.removeEventListener("chargingchange", update);
        };
      }).catch(() => {});
    }

    return () => {
      if (watchId !== undefined)
        navigator.geolocation.clearWatch(watchId);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      batteryCleanup();
    };
  }, []);

  useEffect(() => {
    if (!started) return;
    const timer = window.setInterval(
      () => setElapsed(Date.now() - started),
      1000
    );
    return () => window.clearInterval(timer);
  }, [started]);

  const coords = position
    ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
    : "Waiting for GPS";

  const mapURL = position
    ? `https://www.google.com/maps?q=${position.lat},${position.lng}`
    : "";

  const hours = Math.floor(elapsed / 3600000);
  const minutes = Math.floor((elapsed % 3600000) / 60000);
  const seconds = Math.floor((elapsed % 60000) / 1000);

  function saveNote() {
    const value = notes.trim();
    if (!value) return;

    const updated = [{
      text: value,
      time: new Date().toLocaleString(),
      location: position
        ? `${position.lat.toFixed(6)}, ${position.lng.toFixed(6)}`
        : "GPS unavailable",
    }, ...savedNotes].slice(0, 100);

    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSavedNotes(updated);
      setNotes("");
      setMessage("Field note saved on this device");
    } catch {
      setMessage("Storage unavailable. Note not saved.");
    }
  }

  async function copyLocation() {
    if (!position) return;
    try {
      await navigator.clipboard.writeText(`${coords}\n${mapURL}`);
      setMessage("Coordinates copied");
    } catch {
      setMessage("Copy unavailable on this device");
    }
  }

  async function shareLocation() {
    if (!position) {
      setMessage("Waiting for GPS before sharing");
      return;
    }

    const text =
      `My current GPS location:\n${coords}\n` +
      `Accuracy approximately ±${Math.round(position.accuracy * 3.28084)} ft\n` +
      `Recorded ${new Date(position.timestamp).toLocaleString()}\n` +
      mapURL;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "My GPS location",
          text,
        });
      } catch {}
    } else {
      try {
        await navigator.clipboard.writeText(text);
        setMessage("Location copied; paste into a message");
      } catch {
        setMessage("Sharing unavailable");
      }
    }
  }

  const checklistItems = [
    "Tell someone where I am going",
    "Agree on a return/check-in time",
    "Charge phone and power bank",
    "Download or verify offline maps",
    "Save truck location",
    "Test GPS and return navigation",
    "Pack water, light and first aid",
  ];

  return (
    <>
      <style>{`
        .gf-premium-map .leaflet-control-zoom {
          border: 1px solid rgba(205,183,128,.5) !important;
          border-radius: 12px !important;
          overflow: hidden;
          box-shadow: 0 5px 20px #0008 !important;
        }
        .gf-premium-map .leaflet-control-zoom a {
          background: #14221b !important;
          color: #d4bd83 !important;
          border-color: #34463a !important;
        }
        .gf-premium-map .leaflet-control-zoom a:hover {
          background: #263a2c !important;
        }
        .gf-premium-map .leaflet-control-attribution {
          background: rgba(10,19,14,.78) !important;
          color: #c5cec5 !important;
          font-size: 9px !important;
        }
        .gf-premium-map .leaflet-control-attribution a {
          color: #e0c98d !important;
        }
      `}</style>

      <div
        style={{
          position: "fixed",
          right: 12,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 185px)",
          zIndex: 1150,
        }}
      >
        <button
          type="button"
          onClick={() => setOpen(true)}
          style={{
            ...button,
            background: dark,
            borderColor: gold,
            boxShadow: "0 5px 22px #0009",
            fontSize: 12,
            letterSpacing: 1,
          }}
        >
          FIELD KIT
        </button>
      </div>

      {open && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 20000,
            background: "rgba(0,0,0,.7)",
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          <section
            style={{
              background: dark,
              color: "#f3f1e8",
              border: `1px solid ${gold}`,
              borderRadius: "22px 22px 0 0",
              padding: 18,
              width: "100%",
              maxWidth: 650,
              maxHeight: "83dvh",
              overflowY: "auto",
              boxShadow: "0 -10px 40px #000b",
              fontFamily: "Arial, sans-serif",
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}>
              <div>
                <div style={{
                  color: gold,
                  fontSize: 11,
                  letterSpacing: 2,
                }}>
                  GRACE FIELD
                </div>
                <h2 style={{
                  margin: "5px 0 0",
                  fontSize: 23,
                }}>
                  Weekend Field Kit
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={button}
              >
                CLOSE
              </button>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 9,
            }}>
              <div style={{
                background: panel,
                padding: 13,
                borderRadius: 12,
              }}>
                <small style={{color: gold}}>CONNECTION</small>
                <div>{online ? "Online" : "Offline"}</div>
              </div>
              <div style={{
                background: panel,
                padding: 13,
                borderRadius: 12,
              }}>
                <small style={{color: gold}}>BATTERY</small>
                <div>{battery}</div>
              </div>
            </div>

            <h3 style={{color: gold}}>GPS Position</h3>
            <div style={{
              background: panel,
              borderRadius: 12,
              padding: 13,
            }}>
              <div style={{fontWeight: 800}}>{coords}</div>
              <div style={{
                marginTop: 7,
                color: "#b8c5bb",
                fontSize: 13,
              }}>
                {position
                  ? `Accuracy ±${Math.round(position.accuracy * 3.28084)} ft · ${new Date(position.timestamp).toLocaleTimeString()}`
                  : gpsError || "Acquiring location"}
              </div>
            </div>

            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 9,
              marginTop: 10,
            }}>
              <button
                type="button"
                onClick={copyLocation}
                disabled={!position}
                style={button}
              >
                COPY GPS
              </button>
              <button
                type="button"
                onClick={shareLocation}
                disabled={!position}
                style={button}
              >
                SHARE LOCATION
              </button>
            </div>

            <h3 style={{color: gold}}>Trip Timer</h3>
            <div style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 2,
            }}>
              {String(hours).padStart(2, "0")}:
              {String(minutes).padStart(2, "0")}:
              {String(seconds).padStart(2, "0")}
            </div>
            <div style={{
              display: "flex",
              gap: 9,
              marginTop: 10,
            }}>
              <button
                type="button"
                style={button}
                onClick={() => {
                  setStarted(Date.now());
                  setElapsed(0);
                }}
              >
                START / RESET
              </button>
              <button
                type="button"
                style={button}
                onClick={() => setStarted(null)}
              >
                STOP
              </button>
            </div>

            <h3 style={{color: gold}}>Before You Go</h3>
            {checklistItems.map((item, i) => (
              <label key={item} style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "9px 2px",
                borderBottom: "1px solid #334237",
              }}>
                <input
                  type="checkbox"
                  checked={checklist[i]}
                  onChange={e => setChecklist(old =>
                    old.map((v, j) =>
                      i === j ? e.target.checked : v
                    )
                  )}
                />
                <span>{item}</span>
              </label>
            ))}

            <h3 style={{color: gold}}>Field Notes</h3>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Deer movement, tracks, wind, bedding, sightings..."
              rows={3}
              style={{
                width: "100%",
                boxSizing: "border-box",
                borderRadius: 12,
                padding: 12,
                background: panel,
                color: "white",
                border: "1px solid #647568",
                fontSize: 15,
              }}
            />
            <button
              type="button"
              onClick={saveNote}
              style={{...button, marginTop: 9, width: "100%"}}
            >
              SAVE FIELD NOTE
            </button>

            {savedNotes.slice(0, 10).map((note, i) => (
              <div key={i} style={{
                background: panel,
                padding: 12,
                borderRadius: 12,
                marginTop: 9,
              }}>
                <div style={{
                  color: gold,
                  fontSize: 11,
                  marginBottom: 6,
                }}>
                  {note.time} · {note.location}
                </div>
                <div style={{whiteSpace: "pre-wrap"}}>
                  {note.text}
                </div>
              </div>
            ))}

            {message && (
              <div style={{
                marginTop: 12,
                color: gold,
                fontSize: 13,
              }}>
                {message}
              </div>
            )}

            <p style={{
              fontSize: 11,
              color: "#aeb9b0",
              lineHeight: 1.5,
              marginTop: 18,
            }}>
              GPS accuracy varies. Sharing requires a working
              connection and an available app. This is not an
              emergency monitoring or rescue service.
              Notes are stored only in this browser.
            </p>
          </section>
        </div>
      )}
    </>
  );
}
