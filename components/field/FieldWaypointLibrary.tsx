"use client";

import { useEffect, useMemo, useState } from "react";

type Point = {
  key: string;
  name: string;
  lat: number;
  lng: number;
  type: string;
  source: string;
  date: string;
};

const GOLD = "#C8AE79";

const control: React.CSSProperties = {
  background: "#203329",
  color: "#F2F0E8",
  border: "1px solid #887956",
  borderRadius: 12,
  padding: "12px 13px",
  minHeight: 46,
  fontWeight: 750,
  cursor: "pointer",
};

function valid(lat: number, lng: number) {
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
}

function readJSON(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

function collect(): Point[] {
  const result: Point[] = [];

  function add(
    entries: unknown,
    source: string,
    typeFallback: string
  ) {
    if (!Array.isArray(entries)) return;

    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== "object") return;

      const p = entry as Record<string, unknown>;
      const lat = Number(p.lat);
      const lng = Number(p.lng);

      if (!valid(lat, lng)) return;

      result.push({
        key: `${source}:${String(p.id || p.created || index)}`,
        name: String(p.name || "Saved waypoint").slice(0, 120),
        lat,
        lng,
        type: String(p.type || typeFallback).slice(0, 60),
        source,
        date: String(p.createdAt || p.created || ""),
      });
    });
  }

  add(readJSON("graceFieldSpots"), "Map", "Map marker");
  add(
    readJSON("grace-field-outdoor-waypoints-v1"),
    "Outdoor Utilities",
    "Waypoint"
  );

  const expedition = readJSON("grace-field-expedition-v1");

  if (expedition && typeof expedition === "object") {
    const record = expedition as Record<string, unknown>;
    add(record.waypoints, "Expedition Pack", "Expedition waypoint");
  }

  return result;
}

export default function FieldWaypointLibrary() {
  const [open, setOpen] = useState(false);
  const [points, setPoints] = useState<Point[]>([]);
  const [search, setSearch] = useState("");
  const [source, setSource] = useState("All");
  const [message, setMessage] = useState("");

  function refresh() {
    setPoints(collect());
    setMessage("Saved locations refreshed.");
  }

  useEffect(() => {
    const show = () => {
      setPoints(collect());
      setMessage("");
      setOpen(true);
    };

    window.addEventListener("grace-field-open-waypoint-library", show);

    return () => window.removeEventListener(
      "grace-field-open-waypoint-library", show
    );
  }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return points.filter(p =>
      (source === "All" || p.source === source) &&
      (!term ||
        `${p.name} ${p.type} ${p.source}`
          .toLowerCase().includes(term))
    );
  }, [points, search, source]);

  const uniqueLocations = useMemo(() => {
    const seen = new Set<string>();

    for (const p of points) {
      seen.add(`${p.lat.toFixed(5)},${p.lng.toFixed(5)}`);
    }

    return seen.size;
  }, [points]);

  function focus(p: Point) {
    window.dispatchEvent(new CustomEvent(
      "grace-field-focus-waypoint",
      { detail: { lat: p.lat, lng: p.lng } }
    ));
    setOpen(false);
  }

  function navigate(p: Point) {
    window.dispatchEvent(new CustomEvent(
      "grace-field-navigate-waypoint",
      {
        detail: {
          name: p.name,
          lat: p.lat,
          lng: p.lng,
        },
      }
    ));
    setOpen(false);
  }

  async function copy(p: Point) {
    try {
      await navigator.clipboard.writeText(`${p.lat}, ${p.lng}`);
      setMessage("Coordinates copied.");
    } catch {
      setMessage("Clipboard unavailable.");
    }
  }

  if (!open) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 26000,
      background: "rgba(0,0,0,.76)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
    }}>
      <section style={{
        width: "100%",
        maxWidth: 650,
        maxHeight: "88dvh",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: "18px 16px",
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)",
        borderRadius: "22px 22px 0 0",
        background: "#101B15",
        border: `1px solid ${GOLD}`,
        color: "#F0F1EA",
        boxShadow: "0 -12px 45px rgba(0,0,0,.6)",
        fontFamily: "Arial, sans-serif",
      }}>
        <div style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}>
          <div>
            <div style={{
              fontSize: 10,
              letterSpacing: 2,
              color: GOLD,
            }}>
              GRACE FIELD
            </div>
            <h2 style={{ margin: "6px 0" }}>Waypoint Library</h2>
          </div>
          <button style={control} onClick={() => setOpen(false)}>
            CLOSE
          </button>
        </div>

        <p style={{ color: "#C0CBBF", fontSize: 13 }}>
          One view of your hunting, fishing, hiking, camping,
          paddling and expedition locations.
        </p>

        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 9,
          marginBottom: 12,
        }}>
          <div style={{
            background: "#203127",
            borderRadius: 12,
            padding: 13,
          }}>
            <div style={{ fontSize: 11, color: "#BBC8BB" }}>
              SAVED RECORDS
            </div>
            <strong style={{ fontSize: 25, color: GOLD }}>
              {points.length}
            </strong>
          </div>
          <div style={{
            background: "#203127",
            borderRadius: 12,
            padding: 13,
          }}>
            <div style={{ fontSize: 11, color: "#BBC8BB" }}>
              UNIQUE COORDINATES
            </div>
            <strong style={{ fontSize: 25, color: GOLD }}>
              {uniqueLocations}
            </strong>
          </div>
        </div>

        <input
          aria-label="Search saved locations"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search name or type..."
          style={{
            ...control,
            width: "100%",
            boxSizing: "border-box",
            textAlign: "left",
            marginBottom: 9,
          }}
        />

        <select
          aria-label="Filter location source"
          value={source}
          onChange={e => setSource(e.target.value)}
          style={{
            ...control,
            width: "100%",
            marginBottom: 10,
          }}
        >
          <option value="All">All saved locations</option>
          <option value="Map">Map markers</option>
          <option value="Outdoor Utilities">Outdoor Utilities</option>
          <option value="Expedition Pack">Expedition Pack</option>
        </select>

        <button style={{ ...control, width: "100%" }} onClick={refresh}>
          REFRESH SAVED LOCATIONS
        </button>

        {message && (
          <p role="status" style={{ color: GOLD, fontSize: 12 }}>
            {message}
          </p>
        )}

        <div style={{ marginTop: 12 }}>
          {filtered.length === 0 && (
            <p style={{ color: "#C0CBBF" }}>
              No saved locations match this filter.
            </p>
          )}

          {filtered.map(p => (
            <article key={p.key} style={{
              padding: 13,
              marginBottom: 10,
              borderRadius: 14,
              background: "#1B2C22",
              border: "1px solid rgba(200,174,121,.35)",
            }}>
              <div style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 8,
                alignItems: "flex-start",
              }}>
                <strong>{p.name}</strong>
                <span style={{
                  color: GOLD,
                  fontSize: 11,
                  textAlign: "right",
                }}>
                  {p.source}
                </span>
              </div>

              <p style={{
                color: "#BFCBBF",
                fontSize: 12,
                margin: "8px 0",
              }}>
                {p.type} · {p.lat.toFixed(6)}, {p.lng.toFixed(6)}
              </p>

              <div style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}>
                <button style={control} onClick={() => focus(p)}>
                  VIEW ON MAP
                </button>
                <button style={control} onClick={() => void copy(p)}>
                  COPY GPS
                </button>
                <button
                  style={{
                    ...control,
                    gridColumn: "1 / -1",
                    background: "#C8AE79",
                    color: "#142017",
                  }}
                  onClick={() => navigate(p)}
                >
                  🧭 NAVIGATE TO THIS LOCATION
                </button>
              </div>
            </article>
          ))}
        </div>

        <p style={{
          fontSize: 11,
          color: "#B5C3B5",
          marginTop: 16,
        }}>
          This library reads existing saved locations without moving
          or deleting them. Records remain in their original storage
          systems. Identical coordinates may represent separate records.
          Viewing a point centers the map; it does not start navigation.
          Export your existing backups before clearing app data.
        </p>
      </section>
    </div>
  );
}
