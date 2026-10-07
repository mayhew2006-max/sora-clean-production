"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type FieldMode = "hunt" | "fish";

export type FieldSpot = {
  id: string;
  lat: number;
  lng: number;
  mode: FieldMode;
  type: string;
  name: string;
  notes: string;
  createdAt: string;
};

type TrailPoint = {
  lat: number;
  lng: number;
  time: string;
};

const huntTypes = [
  ["stand", "🌲", "Tree Stand"],
  ["blind", "⛺", "Ground Blind"],
  ["camera", "📷", "Trail Camera"],
  ["deer", "🦌", "Deer Sighting"],
  ["scrape", "🦌", "Scrape / Rub"],
  ["bedding", "🛏️", "Bedding Area"],
  ["trail", "🐾", "Game Trail"],
  ["food", "🌾", "Food Plot"],
  ["water", "💧", "Water"],
  ["kill", "🎯", "Harvest"],
  ["blood", "🩸", "Blood / Sign"],
  ["hazard", "⚠️", "Hazard"],
  ["parking", "🅿️", "Parking"],
];

const fishTypes = [
  ["hole", "🎯", "Fishing Hole"],
  ["catch", "🐟", "Catch"],
  ["structure", "🪵", "Structure"],
  ["weed", "🌿", "Weed Bed"],
  ["dropoff", "⬇️", "Drop-off"],
  ["dock", "⚓", "Dock"],
  ["ramp", "🚤", "Boat Ramp"],
  ["current", "🌊", "Current"],
  ["hazard", "⚠️", "Hazard"],
  ["parking", "🅿️", "Parking"],
];

function makeIcon(symbol: string, border = "#f4d27a") {
  return L.divIcon({
    className: "",
    html: `
      <div style="
        width:38px;
        height:38px;
        border-radius:50%;
        background:#172019;
        border:2px solid ${border};
        display:flex;
        align-items:center;
        justify-content:center;
        font-size:21px;
        box-shadow:0 3px 10px rgba(0,0,0,.45);
      ">${symbol}</div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -20],
  });
}

function MoveMap({
  position,
  navigationTarget,
}: {
  position: [number, number] | null;
  navigationTarget: FieldSpot | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (navigationTarget) {
      map.flyTo(
        [navigationTarget.lat, navigationTarget.lng],
        Math.max(map.getZoom(), 16)
      );
    } else if (position) {
      map.flyTo(position, Math.max(map.getZoom(), 15));
    }
  }, [position, navigationTarget, map]);

  return null;
}

function MapTap({
  onTap,
}: {
  onTap: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onTap(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

function distanceMeters(
  a: [number, number],
  b: [number, number]
) {
  const R = 6371000;
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLat = ((b[0] - a[0]) * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function bearingDegrees(
  a: [number, number],
  b: [number, number]
) {
  const lat1 = (a[0] * Math.PI) / 180;
  const lat2 = (b[0] * Math.PI) / 180;
  const dLng = ((b[1] - a[1]) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) *
      Math.cos(lat2) *
      Math.cos(dLng);

  return (
    ((Math.atan2(y, x) * 180) / Math.PI + 360) %
    360
  );
}

function compassDirection(degrees: number) {
  const directions = [
    "N",
    "NE",
    "E",
    "SE",
    "S",
    "SW",
    "W",
    "NW",
  ];

  return directions[
    Math.round(degrees / 45) % directions.length
  ];
}

function formatDistance(meters: number) {
  const feet = meters * 3.28084;

  if (feet < 1000) {
    return `${Math.round(feet)} ft`;
  }

  return `${(meters / 1609.344).toFixed(2)} mi`;
}

export default function FieldMap({
  mode,
}: {
  mode: FieldMode;
}) {
  const [spots, setSpots] = useState<FieldSpot[]>([]);
  const [position, setPosition] =
    useState<[number, number] | null>(null);

  const [accuracy, setAccuracy] =
    useState<number | null>(null);

  const [selectedType, setSelectedType] = useState(
    mode === "hunt" ? "stand" : "hole"
  );

  const [pending, setPending] =
    useState<{ lat: number; lng: number } | null>(null);

  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");

  const [locationStatus, setLocationStatus] =
    useState("Finding your location...");

  const [tracking, setTracking] = useState(false);
  const [trail, setTrail] = useState<TrailPoint[]>([]);

  const [navigationTarget, setNavigationTarget] =
    useState<FieldSpot | null>(null);

  const watchId = useRef<number | null>(null);

  const types = mode === "hunt" ? huntTypes : fishTypes;

  useEffect(() => {
    setSelectedType(mode === "hunt" ? "stand" : "hole");
    setPending(null);
  }, [mode]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("graceFieldSpots");
      if (saved) setSpots(JSON.parse(saved));

      const savedTrail =
        localStorage.getItem("graceFieldTrail");

      if (savedTrail) setTrail(JSON.parse(savedTrail));
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(
        "graceFieldSpots",
        JSON.stringify(spots)
      );
    } catch {}
  }, [spots]);

  useEffect(() => {
    try {
      localStorage.setItem(
        "graceFieldTrail",
        JSON.stringify(trail)
      );
    } catch {}
  }, [trail]);

  function acceptPosition(result: GeolocationPosition) {
    const reportedAccuracy = Math.round(
      result.coords.accuracy
    );

    /*
      Desktop browsers sometimes return a network/IP estimate
      many miles away. Grace Field refuses extremely coarse
      positions instead of pretending they are real GPS.
    */
    if (
      !Number.isFinite(reportedAccuracy) ||
      reportedAccuracy > 1500
    ) {
      setAccuracy(reportedAccuracy);

      setLocationStatus(
        `Location rejected — accuracy is only about ${reportedAccuracy} m.`
      );

      return false;
    }

    const next: [number, number] = [
      result.coords.latitude,
      result.coords.longitude,
    ];

    setPosition(next);
    setAccuracy(reportedAccuracy);

    setLocationStatus(
      `Location locked • ±${reportedAccuracy} m`
    );

    if (tracking) {
      setTrail((current) => {
        const last = current[current.length - 1];

        if (last) {
          const moved = distanceMeters(
            [last.lat, last.lng],
            next
          );

          if (moved < 4) return current;
        }

        return [
          ...current,
          {
            lat: next[0],
            lng: next[1],
            time: new Date().toISOString(),
          },
        ];
      });
    }

    return true;
  }

  function locationError(error: GeolocationPositionError) {
    console.error("Grace Field GPS error:", error);

    if (error.code === 1) {
      setLocationStatus(
        "Location permission blocked. Allow precise location for Grace and try again."
      );
    } else if (error.code === 2) {
      setLocationStatus(
        "GPS position unavailable. Grace will not substitute a fake network location."
      );
    } else if (error.code === 3) {
      setLocationStatus(
        "GPS timed out. Try again with a clearer view of the sky."
      );
    } else {
      setLocationStatus("Location unavailable.");
    }
  }

  function locateMe() {
    if (!navigator.geolocation) {
      setLocationStatus(
        "Location is not available on this device."
      );
      return;
    }

    setLocationStatus("Finding precise location...");

    navigator.geolocation.getCurrentPosition(
      acceptPosition,
      locationError,
      {
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 0,
      }
    );
  }

  useEffect(() => {
    locateMe();

    return () => {
      if (
        watchId.current !== null &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(watchId.current);
      }
    };
  }, []);

  function startTracking() {
    if (!navigator.geolocation) return;

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    setTracking(true);
    setLocationStatus("Live GPS tracking started...");

    watchId.current =
      navigator.geolocation.watchPosition(
        acceptPosition,
        locationError,
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 3000,
        }
      );
  }

  function stopTracking() {
    if (
      watchId.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    setTracking(false);
    setLocationStatus("Live tracking stopped.");
  }

  function clearTrail() {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Clear your breadcrumb trail?")
    ) {
      return;
    }

    setTrail([]);
  }

  function markHere() {
    if (!position) {
      setLocationStatus(
        "Get a GPS lock before marking your current location."
      );
      locateMe();
      return;
    }

    setPending({
      lat: position[0],
      lng: position[1],
    });

    setName("");
    setNotes("");

    setLocationStatus(
      "📌 Current location selected — add a name or notes below."
    );

    setTimeout(() => {
      document
        .getElementById("grace-field-save-spot")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  }

 function markTruck() {
    if (!position) {
      setLocationStatus(
        "Get a GPS lock before marking your truck."
      );
      locateMe();
      return;
    }

    const truck: FieldSpot = {
      id:
        typeof crypto !== "undefined" &&
        "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      lat: position[0],
      lng: position[1],
      mode,
      type: "truck",
      name: "My Truck",
      notes: "Vehicle location",
      createdAt: new Date().toISOString(),
    };

    setSpots((current) => [
      ...current.filter(
        (spot) =>
          !(spot.mode === mode && spot.type === "truck")
      ),
      truck,
    ]);

    setLocationStatus("🚙 Truck location saved.");
  }

  function addSpot() {
    if (!pending) return;

    const selected =
      types.find(([key]) => key === selectedType) ||
      types[0];

    const spot: FieldSpot = {
      id:
        typeof crypto !== "undefined" &&
        "randomUUID" in crypto
          ? crypto.randomUUID()
          : String(Date.now()),
      lat: pending.lat,
      lng: pending.lng,
      mode,
      type: selectedType,
      name: name.trim() || selected[2],
      notes: notes.trim(),
      createdAt: new Date().toISOString(),
    };

    setSpots((current) => [...current, spot]);
    setPending(null);
    setName("");
    setNotes("");
  }

  function deleteSpot(id: string) {
    setSpots((current) =>
      current.filter((spot) => spot.id !== id)
    );

    if (navigationTarget?.id === id) {
      setNavigationTarget(null);
    }
  }

  const visibleSpots = useMemo(
    () => spots.filter((spot) => spot.mode === mode),
    [spots, mode]
  );

  const navigation = useMemo(() => {
    if (!position || !navigationTarget) return null;

    const target: [number, number] = [
      navigationTarget.lat,
      navigationTarget.lng,
    ];

    const distance = distanceMeters(position, target);
    const bearing = bearingDegrees(position, target);

    return {
      distance,
      bearing,
      direction: compassDirection(bearing),
    };
  }, [position, navigationTarget]);

  const center: [number, number] =
    position || [38.5, -80.5];

  return (
    <div>
      <div
        style={{
          display: "flex",
          gap: 8,
          overflowX: "auto",
          paddingBottom: 10,
        }}
      >
        {types.map(([key, symbol, label]) => (
          <button
            key={key}
            onClick={() => setSelectedType(key)}
            style={{
              whiteSpace: "nowrap",
              padding: "9px 12px",
              borderRadius: 999,
              border:
                selectedType === key
                  ? "2px solid #f4d27a"
                  : "1px solid #566158",
              background:
                selectedType === key
                  ? "#344437"
                  : "#202a22",
              color: "white",
              cursor: "pointer",
            }}
          >
            {symbol} {label}
          </button>
        ))}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <button
          onClick={locateMe}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #68736b",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          📍 Find Me
        </button>

        <button
          onClick={markHere}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #68736b",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          📌 Mark Here
        </button>

 <button
          onClick={markTruck}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #68736b",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          🚙 Mark My Truck
        </button>

        {!tracking ? (
          <button
            onClick={startTracking}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #68736b",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            👣 Start Track
          </button>
        ) : (
          <button
            onClick={stopTracking}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "2px solid #f4d27a",
              background: "#344437",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            ⏹ Stop Track
          </button>
        )}

        {trail.length > 0 && (
          <button
            onClick={clearTrail}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #68736b",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            🧹 Clear Trail
          </button>
        )}
      </div>

      <div
        style={{
          marginBottom: 10,
          fontSize: 13,
          opacity: 0.8,
        }}
      >
        {locationStatus}
        {accuracy !== null && (
          <>
            {" "}
            • accuracy ±
            {accuracy < 305
              ? `${Math.round(accuracy * 3.28084)} ft`
              : `${accuracy} m`}
          </>
        )}
      </div>

      {navigationTarget && navigation && (
        <div
          style={{
            marginBottom: 12,
            padding: 14,
            borderRadius: 14,
            background: "#202a22",
            border: "2px solid #f4d27a",
          }}
        >
          <div
            style={{
              fontSize: 12,
              opacity: 0.7,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Navigating to
          </div>

          <strong style={{ fontSize: 18 }}>
            🧭 {navigationTarget.name}
          </strong>

          <div
            style={{
              marginTop: 6,
              fontSize: 20,
              fontWeight: 900,
            }}
          >
            {formatDistance(navigation.distance)} •{" "}
            {navigation.direction} •{" "}
            {Math.round(navigation.bearing)}°
          </div>

          <button
            onClick={() => setNavigationTarget(null)}
            style={{
              marginTop: 10,
              padding: "8px 12px",
              borderRadius: 9,
              cursor: "pointer",
            }}
          >
            Stop Navigation
          </button>
        </div>
      )}

      <div
        style={{
          height: "58vh",
          minHeight: 430,
          borderRadius: 16,
          overflow: "hidden",
          border: "1px solid #465148",
        }}
      >
        <MapContainer
          center={center}
          zoom={position ? 15 : 7}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <MoveMap
            position={position}
            navigationTarget={navigationTarget}
          />

          <MapTap
            onTap={(lat, lng) => {
              setPending({ lat, lng });
              setName("");
              setNotes("");
              setLocationStatus(
                "📌 Map location selected — add a name or notes below."
              );

              setTimeout(() => {
                document
                  .getElementById("grace-field-save-spot")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "center",
                  });
              }, 100);
            }}
          />

          {pending && (
            <Marker
              position={[pending.lat, pending.lng]}
              icon={makeIcon("📌", "#ff9f43")}
            >
              <Popup>
                New marker location
              </Popup>
            </Marker>
          )}

          {trail.length > 1 && (
            <Polyline
              positions={trail.map((point) => [
                point.lat,
                point.lng,
              ])}
              pathOptions={{
                weight: 5,
                opacity: 0.85,
              }}
            />
          )}

          {position && (
            <Marker
              position={position}
              icon={makeIcon("📍", "#5ee7ff")}
            >
              <Popup>
                <strong>You are here.</strong>
                {accuracy !== null && (
                  <div>
                    Accuracy ±{Math.round(accuracy)} m
                  </div>
                )}
              </Popup>
            </Marker>
          )}

          {visibleSpots.map((spot) => {
            const info =
              spot.type === "truck"
                ? ["truck", "🚙", "My Truck"]
                : types.find(
                    ([key]) => key === spot.type
                  ) || types[0];

            return (
              <Marker
                key={spot.id}
                position={[spot.lat, spot.lng]}
                icon={makeIcon(
                  info[1],
                  spot.type === "truck"
                    ? "#5ee7ff"
                    : "#f4d27a"
                )}
              >
                <Popup>
                  <div style={{ minWidth: 190 }}>
                    <strong>{spot.name}</strong>

                    {spot.notes && <p>{spot.notes}</p>}

                    <small>
                      Saved{" "}
                      {new Date(
                        spot.createdAt
                      ).toLocaleString()}
                    </small>

                    {position && (
                      <div
                        style={{
                          marginTop: 8,
                          fontWeight: 700,
                        }}
                      >
                        {formatDistance(
                          distanceMeters(position, [
                            spot.lat,
                            spot.lng,
                          ])
                        )}{" "}
                        away
                      </div>
                    )}

                    <div
                      style={{
                        display: "flex",
                        gap: 6,
                        marginTop: 10,
                      }}
                    >
                      <button
                        onClick={() =>
                          setNavigationTarget(spot)
                        }
                      >
                        🧭 Navigate
                      </button>

                      <button
                        onClick={() =>
                          deleteSpot(spot.id)
                        }
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      {tracking && (
        <div
          style={{
            marginTop: 10,
            padding: 10,
            borderRadius: 10,
            background: "#344437",
            fontWeight: 800,
          }}
        >
          👣 Recording breadcrumb trail • {trail.length} GPS
          points
        </div>
      )}

      {pending && (
        <div
          id="grace-field-save-spot"
          style={{
            marginTop: 14,
            padding: 16,
            borderRadius: 14,
            background: "#202a22",
            border: "1px solid #465148",
          }}
        >
          <strong>Save this spot</strong>

          <div
            style={{
              fontSize: 12,
              opacity: 0.65,
              marginTop: 4,
            }}
          >
            {pending.lat.toFixed(6)},{" "}
            {pending.lng.toFixed(6)}
          </div>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={
              mode === "hunt"
                ? "Name — Ridge Stand"
                : "Name — The Honey Hole 😂"
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              borderRadius: 10,
              marginTop: 12,
            }}
          />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              mode === "hunt"
                ? "Notes — buck trail, NW wind, morning stand..."
                : "Notes — bass, 8 ft deep, green pumpkin worm..."
            }
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 12,
              borderRadius: 10,
              marginTop: 8,
            }}
          />

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 10,
            }}
          >
            <button
              onClick={addSpot}
              style={{
                flex: 1,
                padding: 12,
                borderRadius: 10,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              Save Spot
            </button>

            <button
              onClick={() => setPending(null)}
              style={{
                padding: 12,
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 16,
          opacity: 0.72,
          fontSize: 13,
          lineHeight: 1.5,
        }}
      >
        Tap the map to save a field marker. Use Mark My Truck
        before heading into the woods. Start Track records a
        breadcrumb trail while you move. Tap any saved marker
        and choose Navigate for live distance and direction.
        Saved Field data stays private on this device.
      </div>
    </div>
  );
}
