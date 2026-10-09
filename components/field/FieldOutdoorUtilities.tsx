"use client";

import { useEffect, useState } from "react";

type Point = {
  name: string;
  lat: number;
  lng: number;
  created: string;
};

type GPS = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

const KEY = "grace-field-outdoor-waypoints-v1";
const gold = "#cdb780";
const button: React.CSSProperties = {
  background: "#203329",
  border: "1px solid #8d805e",
  borderRadius: 12,
  color: "#f4f0e5",
  padding: "13px 12px",
  fontWeight: 750,
  cursor: "pointer",
  minHeight: 48,
};

const input: React.CSSProperties = {
  ...button,
  width: "100%",
  boxSizing: "border-box",
  textAlign: "left",
  fontWeight: 500,
};

function radians(n: number) {
  return n * Math.PI / 180;
}

function distance(a: GPS | Point, b: Point) {
  const x = radians(b.lat - a.lat);
  const y = radians(b.lng - a.lng);
  const h = Math.sin(x / 2) ** 2 +
    Math.cos(radians(a.lat)) *
    Math.cos(radians(b.lat)) *
    Math.sin(y / 2) ** 2;
  return 6371000 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}

function bearing(a: GPS | Point, b: Point) {
  const x = Math.sin(radians(b.lng - a.lng)) * Math.cos(radians(b.lat));
  const y = Math.cos(radians(a.lat)) * Math.sin(radians(b.lat)) -
    Math.sin(radians(a.lat)) * Math.cos(radians(b.lat)) *
    Math.cos(radians(b.lng - a.lng));
  return (Math.atan2(x, y) * 180 / Math.PI + 360) % 360;
}

function dms(n: number, positive: string, negative: string) {
  const a = Math.abs(n);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = ((a - d) * 60 - m) * 60;
  return `${d}° ${m}' ${s.toFixed(2)}" ${n >= 0 ? positive : negative}`;
}

function download(name: string, content: string, mime: string) {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function xml(s: string) {
  return s.replace(/[&<>"']/g, c => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    '"': "&quot;", "'": "&apos;"
  }[c] || c));
}

export default function FieldOutdoorUtilities() {
  const [open, setOpen] = useState(false);
  const [gps, setGps] = useState<GPS | null>(null);
  const [points, setPoints] = useState<Point[]>([]);
  const [name, setName] = useState("My location");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [selected, setSelected] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const show = () => setOpen(true);
    window.addEventListener("grace-field-open-utilities", show);
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || "[]");
      if (Array.isArray(saved)) setPoints(saved);
    } catch {}
    return () => window.removeEventListener("grace-field-open-utilities", show);
  }, []);

  useEffect(() => {
    if (!open || !navigator.geolocation) return;
    const id = navigator.geolocation.watchPosition(
      p => setGps({
        lat: p.coords.latitude,
        lng: p.coords.longitude,
        accuracy: p.coords.accuracy,
        timestamp: p.timestamp
      }),
      e => setMessage("GPS: " + e.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, [open]);

  function save(list: Point[]) {
    setPoints(list);
    try {
      localStorage.setItem(KEY, JSON.stringify(list));
    } catch {
      setMessage("Device storage failed. Export a backup.");
    }
  }

  function addPoint(a: number, b: number) {
    if (!Number.isFinite(a) || !Number.isFinite(b) ||
        Math.abs(a) > 90 || Math.abs(b) > 180) {
      setMessage("Invalid coordinates.");
      return;
    }
    const point: Point = {
      name: name.trim() || "Waypoint",
      lat: a,
      lng: b,
      created: new Date().toISOString()
    };
    save([point, ...points]);
    setSelected(point.created);
    setMessage("Waypoint saved on this device.");
  }

  function copy(value: string) {
    navigator.clipboard?.writeText(value)
      .then(() => setMessage("Copied to clipboard."))
      .catch(() => setMessage("Clipboard unavailable."));
  }

  const target = points.find(p => p.created === selected) || null;
  const fresh = gps && Date.now() - gps.timestamp < 60000;
  const coords = gps ? `${gps.lat.toFixed(6)}, ${gps.lng.toFixed(6)}` : "";

  async function share() {
    if (!gps || !fresh) {
      setMessage("Wait for a fresh GPS position.");
      return;
    }
    const text = `My position: ${coords}\nGPS accuracy ±${Math.round(gps.accuracy)} m\nhttps://www.google.com/maps?q=${gps.lat},${gps.lng}`;
    try {
      if (navigator.share) await navigator.share({ title: "Outdoor check-in", text });
      else copy(text);
    } catch {
      setMessage("Sharing cancelled or unavailable. No message was sent.");
    }
  }

  function exportJSON() {
    download("grace-field-waypoints.json",
      JSON.stringify({ version: 1, points }, null, 2),
      "application/json");
  }

  function exportGPX() {
    const body = points.map(p =>
      `<wpt lat="${p.lat}" lon="${p.lng}"><name>${xml(p.name)}</name></wpt>`
    ).join("\n");
    download("grace-field-waypoints.gpx",
      `<?xml version="1.0" encoding="UTF-8"?>\n<gpx version="1.1" creator="Grace Field" xmlns="http://www.topografix.com/GPX/1/1">\n${body}\n</gpx>`,
      "application/gpx+xml");
  }

  async function importJSON(file: File) {
    try {
      if (file.size > 2000000) throw new Error("File too large.");
      const data = JSON.parse(await file.text());
      if (!Array.isArray(data.points)) throw new Error("Invalid backup.");
      const imported: Point[] = data.points.map((p: Point) => {
        const a = Number(p.lat), b = Number(p.lng);
        if (!Number.isFinite(a) || !Number.isFinite(b) ||
            Math.abs(a) > 90 || Math.abs(b) > 180)
          throw new Error("Invalid waypoint coordinates.");
        return {
          name: String(p.name || "Waypoint").slice(0, 100),
          lat: a, lng: b,
          created: String(p.created || new Date().toISOString())
        };
      });
      save([...imported, ...points].slice(0, 2000));
      setMessage(`${imported.length} waypoints imported.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Import failed.");
    }
  }

  if (!open) return null;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 23000,
      background: "#000b", display: "flex",
      alignItems: "flex-end", justifyContent: "center"
    }}>
      <section style={{
        background: "#101b16", color: "#f4f0e5",
        border: `1px solid ${gold}`, borderRadius: "22px 22px 0 0",
        padding: 18, width: "100%", maxWidth: 650,
        maxHeight: "86dvh", overflowY: "auto",
        boxSizing: "border-box", fontFamily: "Arial,sans-serif"
      }}>
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", gap: 10
        }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 2, color: gold }}>
              GRACE FIELD
            </div>
            <h2 style={{ margin: "6px 0" }}>Outdoor Utilities</h2>
          </div>
          <button style={button} onClick={() => setOpen(false)}>CLOSE</button>
        </div>

        <p style={{ color: "#bbc7bd", fontSize: 13 }}>
          One toolkit for hunting, fishing, hiking, camping, paddling and exploring.
        </p>

        <h3 style={{ color: gold }}>LIVE POSITION</h3>
        <div style={{ padding: 12, background: "#1b2b22", borderRadius: 12 }}>
          <strong>{coords || "Waiting for GPS..."}</strong>
          <p style={{ fontSize: 13 }}>
            {gps
              ? `Accuracy ±${Math.round(gps.accuracy)} m · ${fresh ? "Recent fix" : "Stale fix"}`
              : "Enable location permissions."}
          </p>
          {gps && <>
            <p style={{ fontSize: 12 }}>
              {dms(gps.lat, "N", "S")}<br />
              {dms(gps.lng, "E", "W")}
            </p>
            <p style={{ fontSize: 12 }}>
              Decimal degrees: {coords}
            </p>
          </>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button style={button} disabled={!gps} onClick={() => copy(coords)}>
              COPY GPS
            </button>
            <button style={button} onClick={share} disabled={!fresh}>
              SHARE POSITION
            </button>
          </div>
        </div>

        <h3 style={{ color: gold }}>WAYPOINTS</h3>
        <input style={input} aria-label="Waypoint name"
          placeholder="Waypoint name" value={name}
          onChange={e => setName(e.target.value)} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <input style={input} aria-label="Latitude" inputMode="decimal"
            placeholder="Latitude" value={lat}
            onChange={e => setLat(e.target.value)} />
          <input style={input} aria-label="Longitude" inputMode="decimal"
            placeholder="Longitude" value={lng}
            onChange={e => setLng(e.target.value)} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
          <button style={button} disabled={!fresh}
            onClick={() => gps && addPoint(gps.lat, gps.lng)}>
            SAVE CURRENT GPS
          </button>
          <button style={button} onClick={() => {
            if (!lat.trim() || !lng.trim()) {
              setMessage("Enter latitude and longitude.");
              return;
            }
            addPoint(Number(lat), Number(lng));
          }}>
            SAVE COORDINATES
          </button>
        </div>

        <p style={{ color: gold, fontSize: 13 }}>
          Saved utility waypoints: {points.length}
        </p>
        <select aria-label="Saved waypoint" style={input}
          value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Choose a saved waypoint</option>
          {points.map(p =>
            <option key={p.created} value={p.created}>
              {p.name} · {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
            </option>
          )}
        </select>

        {target && (
          <div style={{
            background: "#1b2b22", borderRadius: 12,
            padding: 12, marginTop: 10
          }}>
            <strong>{target.name}</strong>
            <p>{target.lat.toFixed(6)}, {target.lng.toFixed(6)}</p>
            {gps && fresh && <>
              <p style={{ color: gold, fontWeight: 800 }}>
                {(distance(gps, target) / 1609.344).toFixed(2)} miles
                {" · "}
                {Math.round(bearing(gps, target))}° true bearing
              </p>
              <p style={{ fontSize: 12 }}>
                {(distance(gps, target) * 3.28084).toFixed(0)} feet
                {" · "}
                {(distance(gps, target) / 1000).toFixed(2)} km
              </p>
            </>}
            <p style={{ fontSize: 11, color: "#bbc7bd" }}>
              Straight-line distance only. Not a safe route or obstacle-aware navigation.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button style={button} onClick={() =>
                copy(`${target.lat}, ${target.lng}`)}>
                COPY WAYPOINT
              </button>
              <button style={button} onClick={() => {
                save(points.filter(p => p.created !== target.created));
                setSelected("");
              }}>
                DELETE WAYPOINT
              </button>
            </div>
          </div>
        )}

        <h3 style={{ color: gold }}>BACKUP & TRANSFER</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <button style={button} onClick={exportJSON}>EXPORT JSON</button>
          <button style={button} onClick={exportGPX}>EXPORT GPX</button>
        </div>
        <label style={{ display: "block", marginTop: 12, fontSize: 13 }}>
          Import Grace Field waypoint backup
          <input type="file" accept=".json,application/json"
            style={{ display: "block", marginTop: 8, maxWidth: "100%" }}
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) void importJSON(file);
              e.target.value = "";
            }} />
        </label>

        {message && <p role="status" style={{ color: gold }}>{message}</p>}

        <p style={{ fontSize: 11, color: "#b6c4b8", marginTop: 18 }}>
          Utility waypoints are stored in this browser. Export backups regularly.
          These are separate from existing map markers. Manual sharing requires
          you to choose a recipient and send. This is not emergency monitoring.
          GPS and compass readings can be inaccurate; carry a navigation backup.
        </p>
      </section>
    </div>
  );
}
