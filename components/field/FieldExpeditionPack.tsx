"use client";

import { useEffect, useMemo, useState } from "react";

type Waypoint = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  created: string;
};

type Observation = {
  id: string;
  text: string;
  created: string;
};

type Expedition = {
  activity: string;
  title: string;
  destination: string;
  departure: string;
  returnTime: string;
  contact: string;
  notes: string;
  checks: Record<string, boolean>;
  waypoints: Waypoint[];
  observations: Observation[];
};

type Fix = {
  lat: number;
  lng: number;
  accuracy: number;
  time: number;
};

const KEY = "grace-field-expedition-v1";

const initial: Expedition = {
  activity: "Hunting",
  title: "",
  destination: "",
  departure: "",
  returnTime: "",
  contact: "",
  notes: "",
  checks: {},
  waypoints: [],
  observations: [],
};

const checklist = [
  "Tell someone where I am going",
  "Agree on a return/check-in time",
  "Charge phone and power bank",
  "Verify maps work without internet",
  "Save truck or launch location",
  "Test GPS and return navigation",
  "Pack water and food",
  "Pack first aid and emergency supplies",
  "Pack flashlight or headlamp",
  "Check weather and conditions",
  "Check required permits and regulations",
  "Carry a navigation backup",
];

const gold = "#C8AE79";

const panel: React.CSSProperties = {
  background: "#0D1913",
  color: "#F0F1EA",
  border: `1px solid ${gold}`,
  borderRadius: 18,
  padding: 15,
};

const button: React.CSSProperties = {
  padding: "13px 12px",
  minHeight: 47,
  borderRadius: 12,
  background: "#21362B",
  color: "#F0F1EA",
  border: "1px solid #827653",
  fontWeight: 800,
  cursor: "pointer",
};

const input: React.CSSProperties = {
  ...button,
  boxSizing: "border-box",
  width: "100%",
  textAlign: "left",
  fontWeight: 500,
};

function radians(n: number) {
  return n * Math.PI / 180;
}

function distance(a: Fix, b: Waypoint) {
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(dLng / 2) ** 2;

  return (
    6371000 *
    2 *
    Math.asin(Math.min(1, Math.sqrt(h)))
  );
}

function bearing(a: Fix, b: Waypoint) {
  const dLng = radians(b.lng - a.lng);

  const x =
    Math.sin(dLng) * Math.cos(radians(b.lat));

  const y =
    Math.cos(radians(a.lat)) *
      Math.sin(radians(b.lat)) -
    Math.sin(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.cos(dLng);

  return (
    (Math.atan2(x, y) * 180 / Math.PI + 360) %
    360
  );
}

function download(
  name: string,
  contents: string,
  mime: string
) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000
  );
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function uid() {
  return (
    Date.now().toString(36) +
    "-" +
    Math.random().toString(36).slice(2)
  );
}

export default function FieldExpeditionPack() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [data, setData] =
    useState<Expedition>(initial);

  const [fix, setFix] = useState<Fix | null>(null);
  const [gpsError, setGpsError] = useState("");
  const [waypointName, setWaypointName] =
    useState("My location");
  const [observation, setObservation] =
    useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const stored = localStorage.getItem(KEY);

      if (stored) {
        const parsed = JSON.parse(stored);

        if (
          parsed &&
          typeof parsed === "object"
        ) {
          setData({
            ...initial,
            ...parsed,
            checks: parsed.checks || {},
            waypoints: Array.isArray(
              parsed.waypoints
            )
              ? parsed.waypoints
              : [],
            observations: Array.isArray(
              parsed.observations
            )
              ? parsed.observations
              : [],
          });
        }
      }
    } catch {
      setMessage(
        "Could not load saved expedition data."
      );
    }

    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;

    try {
      localStorage.setItem(
        KEY,
        JSON.stringify(data)
      );
    } catch {
      setMessage(
        "Device storage is unavailable. Export a backup."
      );
    }
  }, [data, ready]);

  useEffect(() => {
    const show = () => {
      setOpen(true);
      setMessage("");
    };

    const hide = () => setOpen(false);

    window.addEventListener(
      "grace-field-open-expedition",
      show
    );

    window.addEventListener(
      "grace-field-close-expedition",
      hide
    );

    return () => {
      window.removeEventListener(
        "grace-field-open-expedition",
        show
      );

      window.removeEventListener(
        "grace-field-close-expedition",
        hide
      );
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    if (!navigator.geolocation) {
      setGpsError(
        "Geolocation is not available."
      );
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setFix({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          time: position.timestamp,
        });

        setGpsError("");
      },
      (error) => {
        setGpsError(error.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      }
    );

    return () =>
      navigator.geolocation.clearWatch(id);
  }, [open]);

  const update = (
    field: keyof Expedition,
    value: string
  ) => {
    setData((old) => ({
      ...old,
      [field]: value,
    }));
  };

  const complete = useMemo(
    () =>
      checklist.filter(
        (item) => data.checks[item]
      ).length,
    [data.checks]
  );

  const fresh =
    fix !== null &&
    Date.now() - fix.time < 60000;

  function saveGPS() {
    if (!fix || !fresh) {
      setMessage(
        "Wait for a fresh GPS fix."
      );
      return;
    }

    if (fix.accuracy > 100) {
      setMessage(
        "GPS accuracy is poor. Move into the open and try again."
      );
      return;
    }

    const point: Waypoint = {
      id: uid(),
      name:
        waypointName.trim() ||
        "Saved location",
      lat: fix.lat,
      lng: fix.lng,
      created: new Date().toISOString(),
    };

    setData((old) => ({
      ...old,
      waypoints: [
        point,
        ...old.waypoints,
      ],
    }));

    setMessage(
      `Saved ${point.name} with reported accuracy ±${Math.round(
        fix.accuracy
      )} m.`
    );
  }

  function saveObservation() {
    const text = observation.trim();

    if (!text) return;

    setData((old) => ({
      ...old,
      observations: [
        {
          id: uid(),
          text,
          created:
            new Date().toISOString(),
        },
        ...old.observations,
      ],
    }));

    setObservation("");
    setMessage("Observation saved.");
  }

  function exportJSON() {
    download(
      "grace-field-expedition.json",
      JSON.stringify(
        {
          app: "Grace Field",
          version: 1,
          exported:
            new Date().toISOString(),
          expedition: data,
        },
        null,
        2
      ),
      "application/json"
    );
  }

  function exportGPX() {
    const points = data.waypoints
      .map(
        (point) =>
          `<wpt lat="${point.lat}" lon="${point.lng}">` +
          `<name>${escapeXml(
            point.name
          )}</name>` +
          `<time>${escapeXml(
            point.created
          )}</time>` +
          `</wpt>`
      )
      .join("\n");

    const xml =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<gpx version="1.1" creator="Grace Field" ` +
      `xmlns="http://www.topografix.com/GPX/1/1">\n` +
      points +
      `\n</gpx>`;

    download(
      "grace-field-waypoints.gpx",
      xml,
      "application/gpx+xml"
    );
  }

  async function importFile(
    file: File | undefined
  ) {
    if (!file) return;

    try {
      if (file.size > 2_000_000) {
        throw new Error(
          "File is too large."
        );
      }

      const text = await file.text();

      if (
        file.name.toLowerCase().endsWith(
          ".gpx"
        )
      ) {
        const xml = new DOMParser()
          .parseFromString(
            text,
            "application/xml"
          );

        if (
          xml.querySelector("parsererror")
        ) {
          throw new Error(
            "Invalid GPX file."
          );
        }

        const points = Array.from(
          xml.getElementsByTagNameNS(
            "*",
            "wpt"
          )
        );

        const imported: Waypoint[] =
          points
            .map((node) => {
              const lat = Number(
                node.getAttribute("lat")
              );

              const lng = Number(
                node.getAttribute("lon")
              );

              const name =
                node.getElementsByTagNameNS(
                  "*",
                  "name"
                )[0]?.textContent ||
                "Imported waypoint";

              return {
                id: uid(),
                name,
                lat,
                lng,
                created:
                  new Date().toISOString(),
              };
            })
            .filter(
              (point) =>
                Number.isFinite(
                  point.lat
                ) &&
                Number.isFinite(
                  point.lng
                ) &&
                Math.abs(point.lat) <=
                  90 &&
                Math.abs(point.lng) <=
                  180
            );

        if (!imported.length) {
          throw new Error(
            "No valid waypoints found."
          );
        }

        setData((old) => ({
          ...old,
          waypoints: [
            ...imported,
            ...old.waypoints,
          ],
        }));

        setMessage(
          `Imported ${imported.length} GPX waypoints.`
        );

        return;
      }

      const parsed = JSON.parse(text);

      if (
        parsed.app !== "Grace Field" ||
        !parsed.expedition ||
        !Array.isArray(
          parsed.expedition.waypoints
        ) ||
        !Array.isArray(
          parsed.expedition.observations
        )
      ) {
        throw new Error(
          "Not a valid Grace Field expedition backup."
        );
      }

      const restored = parsed.expedition;

      const validPoints =
        restored.waypoints.filter(
          (point: Waypoint) =>
            typeof point.name ===
              "string" &&
            Number.isFinite(
              point.lat
            ) &&
            Number.isFinite(
              point.lng
            ) &&
            Math.abs(point.lat) <=
              90 &&
            Math.abs(point.lng) <=
              180
        );

      const validObservations =
        restored.observations.filter(
          (entry: Observation) =>
            typeof entry.text ===
            "string"
        );

      setData({
        ...initial,
        activity:
          typeof restored.activity ===
          "string"
            ? restored.activity
            : "Hunting",
        title:
          typeof restored.title ===
          "string"
            ? restored.title
            : "",
        destination:
          typeof restored.destination ===
          "string"
            ? restored.destination
            : "",
        departure:
          typeof restored.departure ===
          "string"
            ? restored.departure
            : "",
        returnTime:
          typeof restored.returnTime ===
          "string"
            ? restored.returnTime
            : "",
        contact:
          typeof restored.contact ===
          "string"
            ? restored.contact
            : "",
        notes:
          typeof restored.notes ===
          "string"
            ? restored.notes
            : "",
        checks:
          restored.checks &&
          typeof restored.checks ===
            "object"
            ? restored.checks
            : {},
        waypoints: validPoints,
        observations:
          validObservations,
      });

      setMessage(
        "Expedition backup restored."
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Import failed."
      );
    }
  }

  function exportSummary() {
    const text = [
      "GRACE FIELD — EXPEDITION SUMMARY",
      "",
      `Activity: ${data.activity}`,
      `Trip: ${data.title}`,
      `Destination: ${data.destination}`,
      `Departure: ${data.departure}`,
      `Expected return: ${data.returnTime}`,
      `Contact: ${data.contact}`,
      "",
      `Readiness: ${complete}/${checklist.length}`,
      "",
      ...checklist.map(
        (item) =>
          `${data.checks[item] ? "[x]" : "[ ]"} ${item}`
      ),
      "",
      "TRIP NOTES",
      data.notes,
      "",
      "WAYPOINTS",
      ...data.waypoints.map(
        (point) =>
          `${point.name}: ${point.lat}, ${point.lng}`
      ),
      "",
      "OBSERVATIONS",
      ...data.observations.map(
        (entry) =>
          `${entry.created}: ${entry.text}`
      ),
    ].join("\n");

    download(
      "grace-field-trip-summary.txt",
      text,
      "text/plain"
    );
  }

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 25000,
        background: "rgba(0,0,0,.75)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
      }}
    >
      <section
        style={{
          ...panel,
          width: "100%",
          maxWidth: 650,
          maxHeight: "87dvh",
          overflowY: "auto",
          boxSizing: "border-box",
          borderRadius:
            "22px 22px 0 0",
          paddingBottom:
            "calc(env(safe-area-inset-bottom, 0px) + 110px)",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent:
              "space-between",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                color: gold,
                letterSpacing: 2,
              }}
            >
              GRACE FIELD
            </div>

            <h2>
              Expedition Pack
            </h2>
          </div>

          <button
            style={button}
            onClick={() =>
              setOpen(false)
            }
          >
            CLOSE
          </button>
        </div>

        <p
          style={{
            color: "#C3CDC5",
          }}
        >
          Hunting, fishing, hiking,
          camping, paddling and
          exploring.
        </p>

        {message && (
          <div
            role="status"
            style={{
              padding: 12,
              background: "#26392D",
              borderRadius: 10,
              marginBottom: 12,
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            ...panel,
            marginBottom: 14,
          }}
        >
          <h3 style={{ color: gold }}>
            TRIP DETAILS
          </h3>

          <select
            style={input}
            value={data.activity}
            onChange={(e) =>
              update(
                "activity",
                e.target.value
              )
            }
          >
            {[
              "Hunting",
              "Fishing",
              "Hiking",
              "Camping",
              "Paddling",
              "Wildlife Watching",
              "Exploring",
              "Other",
            ].map((activity) => (
              <option key={activity}>
                {activity}
              </option>
            ))}
          </select>

          {(
            [
              ["title", "Trip name"],
              [
                "destination",
                "Destination",
              ],
              [
                "departure",
                "Departure date/time",
              ],
              [
                "returnTime",
                "Expected return",
              ],
              [
                "contact",
                "Emergency contact name",
              ],
            ] as const
          ).map(
            ([field, placeholder]) => (
              <input
                key={field}
                style={{
                  ...input,
                  marginTop: 9,
                }}
                placeholder={
                  placeholder
                }
                value={data[field]}
                onChange={(e) =>
                  update(
                    field,
                    e.target.value
                  )
                }
              />
            )
          )}

          <textarea
            style={{
              ...input,
              marginTop: 9,
              minHeight: 90,
            }}
            placeholder="Trip notes and plans"
            value={data.notes}
            onChange={(e) =>
              update(
                "notes",
                e.target.value
              )
            }
          />
        </div>

        <div
          style={{
            ...panel,
            marginBottom: 14,
          }}
        >
          <h3 style={{ color: gold }}>
            BEFORE YOU GO
          </h3>

          <p>
            {complete} of{" "}
            {checklist.length} checks
            completed
          </p>

          {checklist.map((item) => (
            <label
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 0",
                borderBottom:
                  "1px solid #33443B",
              }}
            >
              <input
                type="checkbox"
                checked={
                  !!data.checks[item]
                }
                onChange={(e) =>
                  setData((old) => ({
                    ...old,
                    checks: {
                      ...old.checks,
                      [item]:
                        e.target.checked,
                    },
                  }))
                }
              />

              {item}
            </label>
          ))}
        </div>

        <div
          style={{
            ...panel,
            marginBottom: 14,
          }}
        >
          <h3 style={{ color: gold }}>
            LIVE GPS
          </h3>

          {fix ? (
            <>
              <strong>
                {fix.lat.toFixed(6)},{" "}
                {fix.lng.toFixed(6)}
              </strong>

              <p>
                Accuracy ±
                {Math.round(
                  fix.accuracy
                )} m
                {!fresh
                  ? " — STALE FIX"
                  : " — RECENT FIX"}
              </p>
            </>
          ) : (
            <p>
              {gpsError ||
                "Waiting for GPS..."}
            </p>
          )}

          <input
            style={input}
            value={waypointName}
            onChange={(e) =>
              setWaypointName(
                e.target.value
              )
            }
            placeholder="Waypoint name"
          />

          <button
            style={{
              ...button,
              marginTop: 9,
              width: "100%",
            }}
            onClick={saveGPS}
          >
            SAVE CURRENT LOCATION
          </button>
        </div>

        <div
          style={{
            ...panel,
            marginBottom: 14,
          }}
        >
          <h3 style={{ color: gold }}>
            SAVED WAYPOINTS (
            {data.waypoints.length})
          </h3>

          {data.waypoints.map(
            (point) => (
              <div
                key={point.id}
                style={{
                  borderBottom:
                    "1px solid #35463B",
                  padding: "12px 0",
                }}
              >
                <strong>
                  {point.name}
                </strong>

                <p
                  style={{
                    fontSize: 12,
                  }}
                >
                  {point.lat.toFixed(
                    6
                  )}
                  ,{" "}
                  {point.lng.toFixed(
                    6
                  )}
                </p>

                {fix && fresh && (
                  <p
                    style={{
                      color: gold,
                    }}
                  >
                    {(
                      distance(
                        fix,
                        point
                      ) / 1609.344
                    ).toFixed(2)}{" "}
                    miles ·{" "}
                    {Math.round(
                      bearing(
                        fix,
                        point
                      )
                    )}
                    ° true bearing
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <a
                    href={
                      "https://www.google.com/maps?q=" +
                      point.lat +
                      "," +
                      point.lng
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      ...button,
                      textDecoration:
                        "none",
                    }}
                  >
                    OPEN MAP
                  </a>

                  <button
                    style={button}
                    onClick={() =>
                      setData(
                        (old) => ({
                          ...old,
                          waypoints:
                            old.waypoints.filter(
                              (item) =>
                                item.id !==
                                point.id
                            ),
                        })
                      )
                    }
                  >
                    DELETE
                  </button>
                </div>
              </div>
            )
          )}
        </div>

        <div
          style={{
            ...panel,
            marginBottom: 14,
          }}
        >
          <h3 style={{ color: gold }}>
            FIELD JOURNAL
          </h3>

          <textarea
            style={{
              ...input,
              minHeight: 100,
            }}
            placeholder="Tracks, wildlife, fish, weather, trail conditions, hazards..."
            value={observation}
            onChange={(e) =>
              setObservation(
                e.target.value
              )
            }
          />

          <button
            style={{
              ...button,
              marginTop: 9,
              width: "100%",
            }}
            onClick={
              saveObservation
            }
          >
            SAVE OBSERVATION
          </button>

          {data.observations.map(
            (entry) => (
              <div
                key={entry.id}
                style={{
                  borderBottom:
                    "1px solid #35463B",
                  padding: "12px 0",
                }}
              >
                <small
                  style={{
                    color: gold,
                  }}
                >
                  {new Date(
                    entry.created
                  ).toLocaleString()}
                </small>

                <p>
                  {entry.text}
                </p>

                <button
                  style={button}
                  onClick={() =>
                    setData(
                      (old) => ({
                        ...old,
                        observations:
                          old.observations.filter(
                            (item) =>
                              item.id !==
                              entry.id
                          ),
                      })
                    )
                  }
                >
                  DELETE ENTRY
                </button>
              </div>
            )
          )}
        </div>

        <div style={panel}>
          <h3 style={{ color: gold }}>
            BACKUP & EXPORT
          </h3>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "1fr 1fr",
              gap: 9,
            }}
          >
            <button
              style={button}
              onClick={exportJSON}
            >
              EXPORT JSON
            </button>

            <button
              style={button}
              onClick={exportGPX}
            >
              EXPORT GPX
            </button>

            <button
              style={button}
              onClick={
                exportSummary
              }
            >
              TRIP SUMMARY
            </button>
          </div>

          <p>
            Restore an expedition
            backup or import GPX
            waypoints:
          </p>

          <input
            type="file"
            accept=".json,.gpx,application/json,application/gpx+xml"
            onChange={(e) => {
              void importFile(
                e.target.files?.[0]
              );

              e.target.value = "";
            }}
          />

          <p
            style={{
              fontSize: 12,
              color: "#C3CDC5",
              marginTop: 18,
            }}
          >
            Records are stored in
            this browser. Export a
            backup before changing
            devices or clearing
            browser data.
            GPS, batteries, and
            connectivity can fail.
            Carry a dedicated
            navigation backup and
            tell someone your
            return plan. This is
            not an emergency
            monitoring service.
          </p>
        </div>
      </section>
    </div>
  );
}
