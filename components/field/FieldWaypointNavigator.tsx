"use client";

import { useEffect, useMemo, useState } from "react";

type Destination = {
  name: string;
  lat: number;
  lng: number;
};

type Fix = {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
};

const GOLD = "#C8AE79";

const button: React.CSSProperties = {
  padding: "13px 12px",
  borderRadius: 12,
  border: "1px solid #8C7C59",
  background: "#20362A",
  color: "#F1F2E9",
  fontWeight: 800,
  minHeight: 48,
  cursor: "pointer",
};

function rad(value: number) {
  return value * Math.PI / 180;
}

function deg(value: number) {
  return value * 180 / Math.PI;
}

function distanceMeters(a: Fix, b: Destination) {
  const radius = 6371000;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) *
    Math.cos(rad(b.lat)) *
    Math.sin(dLng / 2) ** 2;

  return 2 * radius * Math.asin(Math.sqrt(Math.min(1, h)));
}

function bearing(a: Fix, b: Destination) {
  const dLng = rad(b.lng - a.lng);

  const y = Math.sin(dLng) * Math.cos(rad(b.lat));

  const x =
    Math.cos(rad(a.lat)) * Math.sin(rad(b.lat)) -
    Math.sin(rad(a.lat)) *
    Math.cos(rad(b.lat)) *
    Math.cos(dLng);

  return (deg(Math.atan2(y, x)) + 360) % 360;
}

function cardinal(angle: number) {
  const directions = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];

  return directions[Math.round(angle / 22.5) % 16];
}

function formatDistance(meters: number) {
  const feet = meters * 3.28084;

  if (feet < 5280) {
    return `${Math.round(feet).toLocaleString()} ft`;
  }

  return `${(feet / 5280).toFixed(2)} mi`;
}

export default function FieldWaypointNavigator() {
  const [destination, setDestination] =
    useState<Destination | null>(null);

  const [fix, setFix] = useState<Fix | null>(null);
  const [heading, setHeading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const open = (event: Event) => {
      const detail = (event as CustomEvent<Destination>).detail;

      if (!detail) return;

      const lat = Number(detail.lat);
      const lng = Number(detail.lng);

      if (!Number.isFinite(lat) ||
          !Number.isFinite(lng) ||
          Math.abs(lat) > 90 ||
          Math.abs(lng) > 180) return;

      setFix(null);
      setError("");
      setDestination({
        name: String(detail.name || "Waypoint"),
        lat,
        lng,
      });
    };

    window.addEventListener("grace-field-navigate-waypoint", open);

    return () => window.removeEventListener(
      "grace-field-navigate-waypoint", open
    );
  }, []);

  useEffect(() => {
    if (!destination) return;

    if (!navigator.geolocation) {
      setError("GPS is unavailable on this device.");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      position => {
        setFix({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        });
        setNow(Date.now());
        setError("");
      },
      failure => {
        setError("GPS: " + failure.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 20000,
      }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [destination]);

  useEffect(() => {
    if (!destination) return;

    const onOrientation = (event: DeviceOrientationEvent) => {
      const compass = event as DeviceOrientationEvent & {
        webkitCompassHeading?: number;
      };

      if (typeof compass.webkitCompassHeading === "number") {
        setHeading((compass.webkitCompassHeading + 360) % 360);
      } else if (
        event.absolute &&
        typeof event.alpha === "number"
      ) {
        setHeading((360 - event.alpha) % 360);
      }
    };

    window.addEventListener("deviceorientationabsolute", onOrientation);
    window.addEventListener("deviceorientation", onOrientation);

    return () => {
      window.removeEventListener("deviceorientationabsolute", onOrientation);
      window.removeEventListener("deviceorientation", onOrientation);
    };
  }, [destination]);

  useEffect(() => {
    if (!destination) return;

    const timer = window.setInterval(() => setNow(Date.now()), 3000);
    return () => window.clearInterval(timer);
  }, [destination]);

  const values = useMemo(() => {
    if (!destination || !fix) return null;

    return {
      meters: distanceMeters(fix, destination),
      bearing: bearing(fix, destination),
    };
  }, [destination, fix]);

  if (!destination) return null;

  const fresh = !!fix && now - fix.timestamp < 15000;
  const reliable = fresh && !!fix && fix.accuracy <= 100;
  const relativeAngle =
    values && heading !== null
      ? (values.bearing - heading + 360) % 360
      : null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 27000,
      background: "rgba(0,0,0,.82)",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
    }}>
      <section style={{
        width: "100%",
        maxWidth: 650,
        maxHeight: "89dvh",
        overflowY: "auto",
        boxSizing: "border-box",
        padding: 18,
        paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 90px)",
        background: "#101D16",
        border: `1px solid ${GOLD}`,
        borderRadius: "22px 22px 0 0",
        color: "#F3F2E9",
        fontFamily: "Arial, sans-serif",
      }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}>
          <div>
            <div style={{
              fontSize: 11,
              letterSpacing: 2,
              color: GOLD,
            }}>
              GRACE FIELD NAVIGATION
            </div>
            <h2 style={{ margin: "7px 0" }}>
              {destination.name}
            </h2>
          </div>

          <button
            style={button}
            onClick={() => setDestination(null)}
          >
            CLOSE
          </button>
        </div>

        <div style={{
          marginTop: 16,
          background: "#203328",
          borderRadius: 16,
          padding: 17,
          textAlign: "center",
        }}>
          <div style={{
            fontSize: 12,
            color: reliable ? "#B4DFB9" : "#E8CA83",
          }}>
            {!fix
              ? "WAITING FOR GPS"
              : !fresh
                ? "GPS POSITION IS STALE"
                : !reliable
                  ? "LOW GPS ACCURACY"
                  : "LIVE GPS POSITION"}
          </div>

          <div style={{
            width: 190,
            height: 190,
            borderRadius: "50%",
            border: `3px solid ${GOLD}`,
            margin: "18px auto",
            display: "grid",
            placeItems: "center",
            position: "relative",
            background: "#101D16",
          }}>
            <div style={{
              position: "absolute",
              top: 9,
              color: GOLD,
              fontWeight: 800,
            }}>
              {heading !== null ? "AHEAD" : "N"}
            </div>

            <div style={{
              fontSize: 92,
              lineHeight: 1,
              color: GOLD,
              transform: `rotate(${relativeAngle ?? values?.bearing ?? 0}deg)`,
              transition: "transform .35s ease",
            }}>
              ↑
            </div>
          </div>

          {heading === null && (
            <p style={{ fontSize: 12, color: "#E8CA83" }}>
              Device compass unavailable. Arrow shows bearing
              relative to north, not your phone's direction.
            </p>
          )}

          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 10,
          }}>
            <div>
              <div style={{ fontSize: 11, color: "#B9C8BA" }}>
                STRAIGHT-LINE DISTANCE
              </div>
              <strong style={{ fontSize: 26, color: GOLD }}>
                {values ? formatDistance(values.meters) : "—"}
              </strong>
            </div>

            <div>
              <div style={{ fontSize: 11, color: "#B9C8BA" }}>
                TRUE BEARING
              </div>
              <strong style={{ fontSize: 26, color: GOLD }}>
                {values
                  ? `${Math.round(values.bearing)}° ${cardinal(values.bearing)}`
                  : "—"}
              </strong>
            </div>
          </div>
        </div>

        <div style={{
          background: "#1B2C22",
          padding: 14,
          borderRadius: 14,
          marginTop: 12,
          fontSize: 13,
          lineHeight: 1.7,
        }}>
          <div>
            <strong>Destination:</strong>{" "}
            {destination.lat.toFixed(6)}, {destination.lng.toFixed(6)}
          </div>
          <div>
            <strong>GPS accuracy:</strong>{" "}
            {fix ? `±${Math.round(fix.accuracy)} m` : "Waiting"}
          </div>
          <div>
            <strong>Phone heading:</strong>{" "}
            {heading === null ? "Unavailable" : `${Math.round(heading)}°`}
          </div>
          {error && <div style={{ color: "#E9A6A6" }}>{error}</div>}
        </div>

        <button
          style={{ ...button, width: "100%", marginTop: 12 }}
          onClick={() => {
            window.dispatchEvent(new CustomEvent(
              "grace-field-focus-waypoint",
              {
                detail: {
                  lat: destination.lat,
                  lng: destination.lng,
                },
              }
            ));
            setDestination(null);
          }}
        >
          VIEW DESTINATION ON MAP
        </button>

        <button
          style={{
            ...button,
            width: "100%",
            marginTop: 9,
            background: "#7E382F",
          }}
          onClick={() => setDestination(null)}
        >
          STOP NAVIGATION
        </button>

        <p style={{
          color: "#B9C8BA",
          fontSize: 11,
          lineHeight: 1.6,
          marginTop: 15,
        }}>
          Navigation uses straight-line GPS calculations, not a safe
          walking route. Bearing is relative to true north. Device
          compass readings may be inaccurate or unavailable. Do not
          rely on this alone for wilderness navigation, hazardous
          terrain, or emergencies. Carry an offline map and backup compass.
        </p>
      </section>
    </div>
  );
}
