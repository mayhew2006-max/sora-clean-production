"use client";

import React, { useEffect, useMemo, useState } from "react";

type WP = {
  key: string;
  name: string;
  lat: number;
  lng: number;
  source: string;
};

type Camera = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  brand: string;
  notes: string;
};

type Observation = {
  id: string;
  cameraId: string;
  animal: string;
  observedAt: string;
  count: number;
  notes: string;
  mediaId?: string;
};

type Trip = {
  destination: string;
  returnAt: string;
  contact: string;
  notes: string;
  startedAt: string;
  checkInAt: string;
  active: boolean;
};

const CAM_KEY = "grace-field-cameras-v1";
const OBS_KEY = "grace-field-camera-observations-v1";
const TRIP_KEY = "grace-field-guardian-command-v1";
const MEDIA_DB = "grace-field-camera-media-v1";

const button: React.CSSProperties = {
  background: "#20372d",
  border: "1px solid #9e8858",
  color: "#f7f0df",
  borderRadius: 11,
  padding: "11px 13px",
  fontWeight: 700,
  cursor: "pointer",
  minHeight: 44
};

const field: React.CSSProperties = {
  ...button,
  width: "100%",
  boxSizing: "border-box",
  fontWeight: 400,
  background: "#14271e"
};

const card: React.CSSProperties = {
  padding: 14,
  borderRadius: 15,
  background: "#14261d",
  border: "1px solid #506347",
  marginBottom: 12
};

function uid() {
  return typeof crypto !== "undefined" &&
    "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
}

function read<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}

function valid(lat: number, lng: number) {
  return Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180;
}

function loadWaypoints(): WP[] {
  const all: WP[] = [];
  const map = read<any[]>("graceFieldSpots", []);
  const utilities = read<any[]>(
    "grace-field-outdoor-waypoints-v1", []
  );
  const expedition = read<any>(
    "grace-field-expedition-v1", {}
  );

  function add(items: any[], source: string) {
    if (!Array.isArray(items)) return;
    items.forEach((p, i) => {
      const lat = Number(p.lat);
      const lng = Number(p.lng);
      if (!valid(lat, lng)) return;
      all.push({
        key: `${source}:${p.id || p.created || i}`,
        name: String(p.name || "Saved location"),
        lat, lng, source
      });
    });
  }

  add(map, "Map");
  add(utilities, "Outdoor Utilities");
  add(expedition.waypoints || [], "Expedition");
  return all;
}

function openMediaDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("Device media storage unavailable."));
      return;
    }
    const request = indexedDB.open(MEDIA_DB, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("media")) {
        db.createObjectStore("media", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(request.error || new Error("Storage failed."));
  });
}

async function storeMedia(id: string, file: File) {
  const db = await openMediaDB();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("media", "readwrite");
      tx.objectStore("media").put({
        id,
        name: file.name,
        type: file.type,
        blob: file,
        savedAt: new Date().toISOString()
      });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(
        tx.error || new Error("Media save failed.")
      );
    });
  } finally {
    db.close();
  }
}

async function retrieveMedia(id: string): Promise<any> {
  const db = await openMediaDB();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction("media", "readonly");
      const req = tx.objectStore("media").get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  } finally {
    db.close();
  }
}

const blankTrip: Trip = {
  destination: "",
  returnAt: "",
  contact: "",
  notes: "",
  startedAt: "",
  checkInAt: "",
  active: false
};

export default function FieldCommandCenter() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<
    "waypoints" | "guardian" | "cameras"
  >("waypoints");
  const [waypoints, setWaypoints] = useState<WP[]>([]);
  const [search, setSearch] = useState("");
  const [cameras, setCameras] = useState<Camera[]>([]);
  const [observations, setObservations] =
    useState<Observation[]>([]);
  const [trip, setTrip] = useState<Trip>(blankTrip);
  const [now, setNow] = useState(Date.now());
  const [message, setMessage] = useState("");
  const [cameraName, setCameraName] = useState("");
  const [cameraBrand, setCameraBrand] = useState("");
  const [cameraLat, setCameraLat] = useState("");
  const [cameraLng, setCameraLng] = useState("");
  const [cameraNotes, setCameraNotes] = useState("");
  const [selectedCamera, setSelectedCamera] = useState("");
  const [animal, setAnimal] = useState("Deer");
  const [count, setCount] = useState("1");
  const [observedAt, setObservedAt] = useState("");
  const [observationNotes, setObservationNotes] = useState("");
  const [media, setMedia] = useState<File | null>(null);

  useEffect(() => {
    setCameras(read(CAM_KEY, []));
    setObservations(read(OBS_KEY, []));
    setTrip(read(TRIP_KEY, blankTrip));
    setWaypoints(loadWaypoints());

    const refresh = () => setWaypoints(loadWaypoints());
    const interval = window.setInterval(() => {
      setNow(Date.now());
      refresh();
    }, 15000);

    window.addEventListener("storage", refresh);
    window.addEventListener(
      "grace-field-waypoints-changed", refresh
    );

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(
        "grace-field-waypoints-changed", refresh
      );
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(CAM_KEY, JSON.stringify(cameras));
    } catch {}
  }, [cameras]);

  useEffect(() => {
    try {
      localStorage.setItem(OBS_KEY, JSON.stringify(observations));
    } catch {}
  }, [observations]);

  useEffect(() => {
    try {
      localStorage.setItem(TRIP_KEY, JSON.stringify(trip));
    } catch {}
  }, [trip]);

  const filtered = useMemo(
    () => waypoints.filter(w =>
      `${w.name} ${w.source}`
        .toLowerCase()
        .includes(search.toLowerCase())
    ),
    [waypoints, search]
  );

  const overdue = Boolean(
    trip.active &&
    trip.returnAt &&
    now > new Date(trip.returnAt).getTime()
  );

  const patterns = useMemo(() => {
    const counts = new Map<string, number>();
    observations.forEach(o => {
      const date = new Date(o.observedAt);
      if (Number.isNaN(date.getTime())) return;
      const period = date.getHours() < 6 ? "Midnight–6 AM" :
        date.getHours() < 12 ? "6 AM–Noon" :
        date.getHours() < 18 ? "Noon–6 PM" : "6 PM–Midnight";
      const key = `${o.animal} / ${period}`;
      counts.set(key, (counts.get(key) || 0) + 1);
    });
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [observations]);

  function navigate(w: WP) {
    window.dispatchEvent(new CustomEvent(
      "grace-field-navigate-waypoint",
      { detail: { name: w.name, lat: w.lat, lng: w.lng } }
    ));
    setOpen(false);
  }

  function focus(w: WP) {
    window.dispatchEvent(new CustomEvent(
      "grace-field-focus-waypoint",
      { detail: { name: w.name, lat: w.lat, lng: w.lng } }
    ));
    setOpen(false);
  }

  function saveCamera() {
    const lat = Number(cameraLat);
    const lng = Number(cameraLng);
    if (!cameraName.trim() || !cameraLat.trim() ||
        !cameraLng.trim() || !valid(lat, lng)) {
      setMessage("Enter a camera name and valid GPS coordinates.");
      return;
    }
    const camera: Camera = {
      id: uid(),
      name: cameraName.trim(),
      brand: cameraBrand.trim(),
      lat, lng,
      notes: cameraNotes.trim()
    };
    setCameras(old => [...old, camera]);
    setSelectedCamera(camera.id);
    setCameraName("");
    setCameraBrand("");
    setCameraLat("");
    setCameraLng("");
    setCameraNotes("");
    setMessage("Camera registered on this device.");
  }

  async function addObservation() {
    if (!selectedCamera || !animal.trim()) {
      setMessage("Select a camera and animal.");
      return;
    }
    const number = Number(count);
    if (!Number.isInteger(number) || number < 1 ||
        number > 1000) {
      setMessage("Enter a valid animal count.");
      return;
    }

    const date = observedAt
      ? new Date(observedAt)
      : new Date();
    if (Number.isNaN(date.getTime())) {
      setMessage("Invalid observation date.");
      return;
    }

    const record: Observation = {
      id: uid(),
      cameraId: selectedCamera,
      animal: animal.trim(),
      count: number,
      observedAt: date.toISOString(),
      notes: observationNotes.trim()
    };

    if (media) {
      if (!media.type.startsWith("image/") &&
          !media.type.startsWith("video/")) {
        setMessage("Choose an image or video.");
        return;
      }
      if (media.size > 100 * 1024 * 1024) {
        setMessage("File exceeds the 100 MB per-file limit.");
        return;
      }
      try {
        await storeMedia(record.id, media);
        record.mediaId = record.id;
      } catch (error) {
        setMessage(
          "Media storage failed. Observation was not saved. " +
          String(error)
        );
        return;
      }
    }

    setObservations(old => [record, ...old]);
    setObservationNotes("");
    setMedia(null);
    setMessage(
      "Observation recorded. Automated visual analysis is not yet connected."
    );
  }

  async function viewMedia(id: string) {
    try {
      const stored = await retrieveMedia(id);
      if (!stored?.blob) throw new Error("File not found.");
      const url = URL.createObjectURL(stored.blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = stored.name || "camera-media";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
    } catch {
      setMessage("Media unavailable on this device.");
    }
  }

  function shareCheckIn() {
    if (!navigator.geolocation) {
      setMessage("GPS is unavailable.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      async position => {
        const { latitude, longitude, accuracy } =
          position.coords;
        const text = [
          "Grace Field — Guardian Angel check-in",
          `Destination: ${trip.destination || "Not set"}`,
          `Return planned: ${trip.returnAt || "Not set"}`,
          `Location: ${latitude}, ${longitude}`,
          `Reported GPS accuracy: ±${Math.round(accuracy)} m`,
          `Map: https://www.google.com/maps?q=${latitude},${longitude}`,
          `Time: ${new Date().toLocaleString()}`
        ].join("\n");

        setTrip(old => ({
          ...old,
          checkInAt: new Date().toISOString()
        }));

        try {
          if (navigator.share) {
            await navigator.share({
              title: "Guardian Angel check-in",
              text
            });
            setMessage(
              "Share sheet opened. Confirm delivery with your contact."
            );
          } else {
            await navigator.clipboard.writeText(text);
            setMessage(
              "Check-in copied. Send it to your contact."
            );
          }
        } catch {
          setMessage(
            "Sharing was cancelled or unavailable. " +
            "No delivery was confirmed."
          );
        }
      },
      () => setMessage(
        "Unable to obtain GPS. No check-in was shared."
      ),
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );
  }

  function exportData() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      cameras,
      observations,
      trip,
      mediaIncluded: false
    };
    const url = URL.createObjectURL(new Blob(
      [JSON.stringify(data, null, 2)],
      { type: "application/json" }
    ));
    const link = document.createElement("a");
    link.href = url;
    link.download = "grace-field-command-backup.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage(
      "Metadata exported. Photos and videos are NOT included."
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setWaypoints(loadWaypoints());
          setOpen(true);
        }}
        style={{
          position: "fixed",
          bottom: 86,
          right: 12,
          zIndex: 1200,
          ...button,
          background: "#173c2a",
          boxShadow: "0 4px 20px #0008"
        }}
      >
        🌲 Field Command
      </button>

      {open && (
        <div style={{
          position: "fixed",
          inset: 0,
          zIndex: 26000,
          background: "#07110dee",
          overflowY: "auto",
          color: "#f4f0e4",
          padding: "18px 14px 60px",
          boxSizing: "border-box"
        }}>
          <div style={{ maxWidth: 720, margin: "0 auto" }}>
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 12
            }}>
              <div>
                <div style={{
                  color: "#d6bc7a",
                  fontSize: 12,
                  letterSpacing: 2
                }}>GRACE FIELD</div>
                <h2 style={{ margin: "5px 0 14px" }}>
                  🌲 Field Command Center
                </h2>
              </div>
              <button style={button}
                onClick={() => setOpen(false)}>✕ CLOSE</button>
            </div>

            <div style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
              marginBottom: 15
            }}>
              {([
                ["waypoints", "📍 Waypoints"],
                ["guardian", "🛡️ Guardian Angel"],
                ["cameras", "📷 Trail Cameras"]
              ] as const).map(([key, label]) => (
                <button key={key} style={{
                  ...button,
                  background: tab === key
                    ? "#52633a" : "#20372d"
                }} onClick={() => setTab(key)}>
                  {label}
                </button>
              ))}
            </div>

            {message && (
              <div style={{
                ...card,
                borderColor: "#c8a968",
                color: "#ead4a1"
              }}>
                {message}
                <button
                  style={{ ...button, marginLeft: 8 }}
                  onClick={() => setMessage("")}
                >Dismiss</button>
              </div>
            )}

            {tab === "waypoints" && (
              <>
                <div style={card}>
                  <strong>{waypoints.length} saved waypoint records</strong>
                  <p style={{ fontSize: 13, opacity: .8 }}>
                    Reads your existing map, Outdoor Utilities,
                    and Expedition locations without modifying them.
                  </p>
                  <input
                    style={field}
                    placeholder="Search locations..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
                {filtered.map(w => (
                  <div key={w.key} style={card}>
                    <strong>{w.name}</strong>
                    <div style={{
                      opacity: .7, fontSize: 12, marginTop: 4
                    }}>{w.source}</div>
                    <p style={{ fontSize: 13 }}>
                      {w.lat.toFixed(6)}, {w.lng.toFixed(6)}
                    </p>
                    <div style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: 8
                    }}>
                      <button style={button}
                        onClick={() => navigate(w)}>
                        🧭 Navigate
                      </button>
                      <button style={button}
                        onClick={() => focus(w)}>
                        🗺️ View Map
                      </button>
                      <button style={button}
                        onClick={async () => {
                          try {
                            await navigator.clipboard.writeText(
                              `${w.lat}, ${w.lng}`
                            );
                            setMessage("Coordinates copied.");
                          } catch {
                            setMessage("Clipboard unavailable.");
                          }
                        }}>
                        Copy GPS
                      </button>
                    </div>
                  </div>
                ))}
              </>
            )}

            {tab === "guardian" && (
              <>
                <div style={{
                  ...card,
                  borderColor: overdue ? "#d36b5d" : "#506347"
                }}>
                  <strong>
                    {overdue ? "⚠️ RETURN TIME OVERDUE" :
                      trip.active ? "🟢 Trip active" :
                      "Guardian Angel — Trip Planner"}
                  </strong>
                  <p style={{ fontSize: 13 }}>
                    This is an on-device trip log and sharing tool.
                    It does not automatically contact anyone,
                    monitor a closed app, or dispatch rescuers.
                  </p>
                </div>

                <div style={card}>
                  <label>Destination</label>
                  <input style={field}
                    value={trip.destination}
                    onChange={e => setTrip(t => ({
                      ...t, destination: e.target.value
                    }))}
                    placeholder="North Ridge trailhead"
                  />
                  <p>Expected return</p>
                  <input type="datetime-local" style={field}
                    value={trip.returnAt}
                    onChange={e => setTrip(t => ({
                      ...t, returnAt: e.target.value
                    }))}
                  />
                  <p>Emergency contact name / phone</p>
                  <input style={field}
                    value={trip.contact}
                    onChange={e => setTrip(t => ({
                      ...t, contact: e.target.value
                    }))}
                    placeholder="Contact information"
                  />
                  <p>Trip notes</p>
                  <textarea style={{
                    ...field, minHeight: 80
                  }}
                    value={trip.notes}
                    onChange={e => setTrip(t => ({
                      ...t, notes: e.target.value
                    }))}
                  />
                  <div style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                    marginTop: 12
                  }}>
                    <button style={button}
                      onClick={() => {
                        if (!trip.destination.trim() ||
                            !trip.returnAt ||
                            Number.isNaN(
                              new Date(trip.returnAt).getTime()
                            ) ||
                            new Date(trip.returnAt).getTime() <=
                              Date.now()) {
                          setMessage(
                            "Enter a destination and a future return time."
                          );
                          return;
                        }
                        setTrip(t => ({
                          ...t,
                          active: true,
                          startedAt: new Date().toISOString()
                        }));
                        setMessage(
                          "Trip started on this device. " +
                          "Tell your contact your plan separately."
                        );
                      }}>
                      Start Trip
                    </button>
                    <button style={button}
                      onClick={shareCheckIn}>
                      📍 Share GPS Check-in
                    </button>
                    <button style={button}
                      onClick={() => {
                        setTrip(t => ({ ...t, active: false }));
                        setMessage("Trip marked complete.");
                      }}>
                      Finish Trip
                    </button>
                  </div>
                  {trip.checkInAt && (
                    <p style={{ fontSize: 12, opacity: .75 }}>
                      Last check-in prepared:
                      {" "}{new Date(trip.checkInAt).toLocaleString()}
                    </p>
                  )}
                </div>
              </>
            )}

            {tab === "cameras" && (
              <>
                <div style={card}>
                  <strong>📷 Register Trail Camera</strong>
                  <p style={{ fontSize: 13, opacity: .8 }}>
                    Works with cellular or SD-card cameras.
                    Manufacturer connections are not yet active.
                  </p>
                  <input style={field}
                    placeholder="Camera name"
                    value={cameraName}
                    onChange={e => setCameraName(e.target.value)}
                  />
                  <input style={{ ...field, marginTop: 8 }}
                    placeholder="Brand / model (optional)"
                    value={cameraBrand}
                    onChange={e => setCameraBrand(e.target.value)}
                  />
                  <div style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginTop: 8
                  }}>
                    <input style={field}
                      placeholder="Latitude"
                      value={cameraLat}
                      onChange={e => setCameraLat(e.target.value)}
                    />
                    <input style={field}
                      placeholder="Longitude"
                      value={cameraLng}
                      onChange={e => setCameraLng(e.target.value)}
                    />
                  </div>
                  <input style={{ ...field, marginTop: 8 }}
                    placeholder="Location notes"
                    value={cameraNotes}
                    onChange={e => setCameraNotes(e.target.value)}
                  />
                  <button style={{
                    ...button, marginTop: 10
                  }} onClick={saveCamera}>
                    + Save Camera
                  </button>
                </div>

                {cameras.map(c => (
                  <div style={card} key={c.id}>
                    <strong>{c.name}</strong>
                    <div style={{ fontSize: 12, opacity: .75 }}>
                      {c.brand || "Unspecified model"} —
                      {" "}{c.lat.toFixed(6)}, {c.lng.toFixed(6)}
                    </div>
                    {c.notes && <p>{c.notes}</p>}
                    <button style={button}
                      onClick={() => navigate({
                        key: c.id,
                        name: c.name,
                        lat: c.lat,
                        lng: c.lng,
                        source: "Camera"
                      })}>
                      🧭 Navigate to Camera
                    </button>
                  </div>
                ))}

                <div style={card}>
                  <strong>🦌 Record Wildlife Observation</strong>
                  <p style={{ fontSize: 13, opacity: .8 }}>
                    Record what the image/video shows. Automatic
                    identification is not connected yet.
                  </p>
                  <select style={field}
                    value={selectedCamera}
                    onChange={e =>
                      setSelectedCamera(e.target.value)
                    }>
                    <option value="">Select camera</option>
                    {cameras.map(c => (
                      <option value={c.id} key={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <input style={{ ...field, marginTop: 8 }}
                    placeholder="Animal"
                    value={animal}
                    onChange={e => setAnimal(e.target.value)}
                  />
                  <p>Animal count</p>
                  <input type="number" min="1"
                    style={field}
                    value={count}
                    onChange={e => setCount(e.target.value)}
                  />
                  <p>Capture date/time (leave blank for now)</p>
                  <input type="datetime-local" style={field}
                    value={observedAt}
                    onChange={e => setObservedAt(e.target.value)}
                  />
                  <p>Behavior / notes</p>
                  <textarea style={{
                    ...field, minHeight: 70
                  }}
                    value={observationNotes}
                    onChange={e =>
                      setObservationNotes(e.target.value)
                    }
                  />
                  <p>Photo or video (max 100 MB)</p>
                  <input
                    type="file"
                    accept="image/*,video/*"
                    style={field}
                    onChange={e =>
                      setMedia(e.target.files?.[0] || null)
                    }
                  />
                  <button style={{
                    ...button, marginTop: 10
                  }} onClick={() => void addObservation()}>
                    + Save Observation
                  </button>
                </div>

                <div style={card}>
                  <strong>📊 Wildlife Activity Patterns</strong>
                  <p style={{ fontSize: 12, opacity: .8 }}>
                    Based on recorded encounters, not individual
                    animals. More observations improve the picture.
                  </p>
                  {patterns.length === 0
                    ? <p>No observations recorded yet.</p>
                    : patterns.slice(0, 12).map(([label, n]) => (
                      <div key={label} style={{
                        display: "flex",
                        justifyContent: "space-between",
                        borderBottom: "1px solid #33473a",
                        padding: "9px 0"
                      }}>
                        <span>{label}</span>
                        <strong>{n} encounter(s)</strong>
                      </div>
                    ))}
                </div>

                <div style={card}>
                  <strong>Observation History</strong>
                  {observations.map(o => {
                    const c = cameras.find(
                      x => x.id === o.cameraId
                    );
                    return (
                      <div key={o.id} style={{
                        padding: "10px 0",
                        borderBottom: "1px solid #33473a"
                      }}>
                        <strong>{o.animal} × {o.count}</strong>
                        <div style={{
                          fontSize: 12, opacity: .75
                        }}>
                          {c?.name || "Unknown camera"} —
                          {" "}{new Date(
                            o.observedAt
                          ).toLocaleString()}
                        </div>
                        {o.notes && <p>{o.notes}</p>}
                        {o.mediaId && (
                          <button style={button}
                            onClick={() =>
                              void viewMedia(o.mediaId!)
                            }>
                            View / Save Media
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            <div style={card}>
              <button style={button}
                onClick={exportData}>
                Export Command Center Data
              </button>
              <p style={{ fontSize: 12, opacity: .75 }}>
                Export includes camera records, observations,
                and trip metadata. Media files are not included.
                Keep your original camera photos and videos.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
