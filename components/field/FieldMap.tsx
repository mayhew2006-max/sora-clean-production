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
import { supabase } from "@/lib/supabaseClient";
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
  updatedAt?: string;
  syncPending?: boolean;
};

type TrailPoint = {
  lat: number;
  lng: number;
  time: string;
};

type FieldWeather = {
  temperature: number;
  feelsLike: number;
  windSpeed: number;
  windDirection: number;
  windGust: number;
  precipitation: number;
  weatherCode: number;
  sunrise: string;
  sunset: string;
  fetchedAt: string;
};

type MapLayer = "standard" | "satellite" | "topo" | "terrain";

const mapLayers: Record<
  MapLayer,
  {
    label: string;
    symbol: string;
    url: string;
    attribution: string;
    maxZoom?: number;
  }
> = {
  standard: {
    label: "Standard",
    symbol: "🗺️",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
    maxZoom: 19,
  },

  satellite: {
    label: "Satellite",
    symbol: "🛰️",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
  },

  topo: {
    label: "Topo",
    symbol: "⛰️",
    url: "https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",
    attribution:
      "Map data &copy; OpenStreetMap contributors, SRTM | Map style &copy; OpenTopoMap",
    maxZoom: 17,
  },

  terrain: {
    label: "Terrain",
    symbol: "🌲",
    url:
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri and contributors",
    maxZoom: 19,
  },
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

  const [returningToStart, setReturningToStart] =
    useState(false);

  const [mapLayer, setMapLayer] =
    useState<MapLayer>("satellite");

  const [layersOpen, setLayersOpen] =
    useState(false);

  const [toolsOpen, setToolsOpen] =
    useState(false);

  const [historyOpen, setHistoryOpen] =
    useState(false);

  const [fieldPanel, setFieldPanel] =
    useState<"weather" | "offline" | null>(null);

  const [weather, setWeather] =
    useState<FieldWeather | null>(null);

  const [weatherLoading, setWeatherLoading] =
    useState(false);

  const [weatherError, setWeatherError] =
    useState("");

  const watchId = useRef<number | null>(null);

  // Grace account / shared 50-action allowance
  const FREE_LIMIT = 50;
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState("");
  const [accountFreeUsed, setAccountFreeUsed] = useState(0);
  const [paid, setPaid] = useState(false);
  const [authReady, setAuthReady] = useState(false);

  const [fieldCloudReady, setFieldCloudReady] =
    useState(false);

  const [fieldSyncing, setFieldSyncing] =
    useState(false);

  const [fieldSyncStatus, setFieldSyncStatus] =
    useState("Local Field memory ready.");

  const freeLeft = Math.max(FREE_LIMIT - accountFreeUsed, 0);
  const fieldLocked = authReady && !paid && freeLeft <= 0;

  const types = mode === "hunt" ? huntTypes : fishTypes;

  useEffect(() => {
    let cancelled = false;

    async function loadFieldAccount() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (cancelled) return;

      const user = session?.user ?? null;

      if (!user) {
        setUserId(null);
        setUserEmail("");
        setAuthReady(true);
        return;
      }

      setUserId(user.id);
      setUserEmail(user.email || "");

      const { data: usage, error } = await supabase
        .from("grace_user_usage")
        .select("free_messages_used, paid, founder")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;

      if (error) {
        console.error("Grace Field usage load failed:", error);
        setAuthReady(true);
        return;
      }

      if (!usage) {
        const { error: createError } = await supabase
          .from("grace_user_usage")
          .upsert({
            user_id: user.id,
            email: user.email || "",
            free_messages_used: 0,
            updated_at: new Date().toISOString(),
          });

        if (createError) {
          console.error(
            "Grace Field usage account creation failed:",
            createError
          );
        }

        setAccountFreeUsed(0);
        setPaid(false);
      } else {
        setAccountFreeUsed(
          Number(usage.free_messages_used || 0)
        );
        setPaid(
          Boolean(usage.paid) || Boolean(usage.founder)
        );
      }

      setAuthReady(true);
    }

    loadFieldAccount();

    return () => {
      cancelled = true;
    };
  }, []);

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

  function validUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value
    );
  }

  function makeFieldId() {
    if (
      typeof crypto !== "undefined" &&
      typeof crypto.randomUUID === "function"
    ) {
      return crypto.randomUUID();
    }

    // RFC4122-style fallback for older WebViews.
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(
      /[xy]/g,
      (c) => {
        const r = Math.floor(Math.random() * 16);
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      }
    );
  }

  function normalizeLocalFieldSpots(
    input: unknown
  ): FieldSpot[] {
    if (!Array.isArray(input)) return [];

    return input
      .filter((spot: any) => {
        return (
          spot &&
          Number.isFinite(Number(spot.lat)) &&
          Number.isFinite(Number(spot.lng)) &&
          (spot.mode === "hunt" || spot.mode === "fish") &&
          typeof spot.type === "string"
        );
      })
      .map((spot: any) => {
        const createdAt =
          typeof spot.createdAt === "string" &&
          spot.createdAt
            ? spot.createdAt
            : new Date().toISOString();

        return {
          id:
            typeof spot.id === "string" &&
            validUuid(spot.id)
              ? spot.id
              : makeFieldId(),

          lat: Number(spot.lat),
          lng: Number(spot.lng),

          mode: spot.mode as FieldMode,

          type: String(spot.type || "spot"),

          name:
            typeof spot.name === "string"
              ? spot.name
              : "",

          notes:
            typeof spot.notes === "string"
              ? spot.notes
              : "",

          createdAt,

          updatedAt:
            typeof spot.updatedAt === "string" &&
            spot.updatedAt
              ? spot.updatedAt
              : createdAt,

          syncPending:
            Boolean(spot.syncPending),
        } satisfies FieldSpot;
      });
  }

  function cloudRowToFieldSpot(row: any): FieldSpot {
    return {
      id: String(row.id),
      lat: Number(row.lat),
      lng: Number(row.lng),
      mode: row.mode as FieldMode,
      type: String(row.type || "spot"),
      name: String(row.name || ""),
      notes: String(row.notes || ""),
      createdAt: String(
        row.created_at || new Date().toISOString()
      ),
      updatedAt: String(
        row.updated_at ||
          row.created_at ||
          new Date().toISOString()
      ),
      syncPending: false,
    };
  }

  function fieldSpotToCloudRow(
    spot: FieldSpot,
    ownerId: string
  ) {
    return {
      id: spot.id,
      user_id: ownerId,
      mode: spot.mode,
      type: spot.type,
      name: spot.name || "",
      notes: spot.notes || "",
      lat: spot.lat,
      lng: spot.lng,
      created_at: spot.createdAt,
      updated_at:
        spot.updatedAt ||
        spot.createdAt ||
        new Date().toISOString(),
    };
  }

  function mergeFieldSpots(
    localSpots: FieldSpot[],
    cloudSpots: FieldSpot[]
  ) {
    const merged = new Map<string, FieldSpot>();

    for (const spot of cloudSpots) {
      merged.set(spot.id, spot);
    }

    for (const local of localSpots) {
      const cloud = merged.get(local.id);

      if (!cloud) {
        merged.set(local.id, local);
        continue;
      }

      const localTime = new Date(
        local.updatedAt || local.createdAt
      ).getTime();

      const cloudTime = new Date(
        cloud.updatedAt || cloud.createdAt
      ).getTime();

      if (localTime > cloudTime) {
        merged.set(local.id, local);
      }
    }

    return Array.from(merged.values()).sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime()
    );
  }

  async function saveFieldSpotToCloud(
    spot: FieldSpot
  ) {
    if (!userId) return false;

    try {
      const row = fieldSpotToCloudRow(
        {
          ...spot,
          syncPending: false,
        },
        userId
      );

      const { error } = await supabase
        .from("grace_field_spots")
        .upsert(row, {
          onConflict: "id",
        });

      if (error) {
        console.error(
          "Grace Field cloud save failed:",
          error
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "Grace Field cloud save failed:",
        error
      );
      return false;
    }
  }

  async function deleteFieldSpotFromCloud(
    spotId: string
  ) {
    if (!userId) return false;

    try {
      const { error } = await supabase
        .from("grace_field_spots")
        .delete()
        .eq("id", spotId)
        .eq("user_id", userId);

      if (error) {
        console.error(
          "Grace Field cloud delete failed:",
          error
        );
        return false;
      }

      return true;
    } catch (error) {
      console.error(
        "Grace Field cloud delete failed:",
        error
      );
      return false;
    }
  }

  useEffect(() => {
    if (!authReady || !userId) return;

    const fieldUserId: string = userId;
    let cancelled = false;

    async function loadGraceFieldCloud() {
      setFieldSyncing(true);
      setFieldSyncStatus(
        "Syncing Grace Field memory..."
      );

      let localSpots: FieldSpot[] = [];

      try {
        const saved =
          localStorage.getItem("graceFieldSpots");

        if (saved) {
          localSpots =
            normalizeLocalFieldSpots(
              JSON.parse(saved)
            );
        }
      } catch {}

      const {
        data: cloudRows,
        error: cloudError,
      } = await supabase
        .from("grace_field_spots")
        .select(
          "id,user_id,mode,type,name,notes,lat,lng,created_at,updated_at"
        )
        .eq("user_id", fieldUserId)
        .order("created_at", {
          ascending: false,
        });

      if (cancelled) return;

      if (cloudError) {
        console.error(
          "Grace Field cloud load failed:",
          cloudError
        );

        // Offline/local mode remains completely usable.
        if (localSpots.length > 0) {
          setSpots(localSpots);
        }

        setFieldCloudReady(false);
        setFieldSyncing(false);
        setFieldSyncStatus(
          "Offline Field memory active."
        );
        return;
      }

      const cloudSpots = (
        cloudRows || []
      ).map(cloudRowToFieldSpot);

      // Merge instead of replacing so the first cloud
      // connection never destroys markers already on
      // this phone.
      const merged = mergeFieldSpots(
        localSpots,
        cloudSpots
      );

      if (cancelled) return;

      setSpots(merged);

      try {
        localStorage.setItem(
          "graceFieldSpots",
          JSON.stringify(merged)
        );
      } catch {}

      // Upload anything that only exists locally, or
      // whose local version is newer than the cloud row.
      const cloudMap = new Map(
        cloudSpots.map((spot) => [
          spot.id,
          spot,
        ])
      );

      const needsUpload =
        merged.filter((spot) => {
          const cloud =
            cloudMap.get(spot.id);

          if (!cloud) return true;

          const localTime =
            new Date(
              spot.updatedAt ||
                spot.createdAt
            ).getTime();

          const cloudTime =
            new Date(
              cloud.updatedAt ||
                cloud.createdAt
            ).getTime();

          return localTime > cloudTime;
        });

      if (needsUpload.length > 0) {
        const rows =
          needsUpload.map((spot) =>
            fieldSpotToCloudRow(
              {
                ...spot,
                syncPending: false,
              },
              fieldUserId
            )
          );

        const { error: migrationError } =
          await supabase
            .from("grace_field_spots")
            .upsert(rows, {
              onConflict: "id",
            });

        if (cancelled) return;

        if (migrationError) {
          console.error(
            "Grace Field migration failed:",
            migrationError
          );

          const pendingIds = new Set(
            needsUpload.map(
              (spot) => spot.id
            )
          );

          const pending = merged.map(
            (spot) =>
              pendingIds.has(spot.id)
                ? {
                    ...spot,
                    syncPending: true,
                  }
                : spot
          );

          setSpots(pending);

          try {
            localStorage.setItem(
              "graceFieldSpots",
              JSON.stringify(pending)
            );
          } catch {}

          setFieldSyncStatus(
            "Field saved locally. Cloud sync pending."
          );
        } else {
          const synced =
            merged.map((spot) => ({
              ...spot,
              syncPending: false,
            }));

          setSpots(synced);

          try {
            localStorage.setItem(
              "graceFieldSpots",
              JSON.stringify(synced)
            );
          } catch {}

          setFieldSyncStatus(
            "Grace Field memory synced."
          );
        }
      } else {
        setFieldSyncStatus(
          "Grace Field memory synced."
        );
      }

      setFieldCloudReady(true);
      setFieldSyncing(false);
    }

    loadGraceFieldCloud();

    return () => {
      cancelled = true;
    };
  }, [authReady, userId]);

  async function useFieldAction() {
    if (!authReady) {
      setLocationStatus("Grace is checking your account...");
      return false;
    }

    if (!userId) {
      window.location.href = "/login";
      return false;
    }

    if (paid) return true;

    if (fieldLocked) {
      window.location.href = "/pay";
      return false;
    }

    const nextUsed = accountFreeUsed + 1;
    setAccountFreeUsed(nextUsed);

    const { error } = await supabase
      .from("grace_user_usage")
      .upsert({
        user_id: userId,
        email: userEmail,
        free_messages_used: nextUsed,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      console.error("Grace Field usage update failed:", error);
      setAccountFreeUsed(accountFreeUsed);
      setLocationStatus(
        "Grace could not update your account. Try again."
      );
      return false;
    }

    return true;
  }

  async function startTracking() {
    if (!(await useFieldAction())) return;
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

  function returnToStart() {
    if (trail.length === 0) {
      setLocationStatus(
        "No breadcrumb trail yet. Start Track first."
      );
      return;
    }

    const first = trail[0];

    const startSpot: FieldSpot = {
      id: "grace-trail-start",
      lat: first.lat,
      lng: first.lng,
      mode,
      type: "trail-start",
      name: "Trail Start",
      notes:
        "Return destination from your recorded breadcrumb trail.",
      createdAt: first.time,
    };

    setNavigationTarget(startSpot);
    setReturningToStart(true);
    setToolsOpen(false);
    setHistoryOpen(false);
    setFieldPanel(null);

    setLocationStatus(
      "🧭 Returning to the start of your recorded trail."
    );
  }

  function stopNavigation() {
    setNavigationTarget(null);
    setReturningToStart(false);
    setLocationStatus("Navigation stopped.");
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

 function weatherDescription(code: number) {
    if (code === 0) return "Clear";
    if ([1, 2].includes(code)) return "Partly cloudy";
    if (code === 3) return "Overcast";
    if ([45, 48].includes(code)) return "Fog";
    if ([51, 53, 55, 56, 57].includes(code))
      return "Drizzle";
    if ([61, 63, 65, 66, 67].includes(code))
      return "Rain";
    if ([71, 73, 75, 77].includes(code))
      return "Snow";
    if ([80, 81, 82].includes(code))
      return "Rain showers";
    if ([85, 86].includes(code))
      return "Snow showers";
    if ([95, 96, 99].includes(code))
      return "Thunderstorms";
    return "Current conditions";
  }

  function windCardinal(degrees: number) {
    return compassDirection(degrees);
  }

  function formatFieldTime(value: string) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleTimeString([], {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  async function loadFieldWeather() {
    if (!position) {
      setLocationStatus(
        "Get a GPS lock before checking Field weather."
      );
      locateMe();
      return;
    }

    if (!(await useFieldAction())) return;

    setWeatherLoading(true);
    setWeatherError("");

    try {
      const [lat, lng] = position;

      const params = new URLSearchParams({
        latitude: String(lat),
        longitude: String(lng),
        current:
          "temperature_2m,apparent_temperature,precipitation,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m",
        daily: "sunrise,sunset",
        temperature_unit: "fahrenheit",
        wind_speed_unit: "mph",
        precipitation_unit: "inch",
        timezone: "auto",
        forecast_days: "1",
      });

      const response = await fetch(
        `https://api.open-meteo.com/v1/forecast?${params.toString()}`
      );

      if (!response.ok) {
        throw new Error(
          `Weather request failed: ${response.status}`
        );
      }

      const data = await response.json();

      const current = data?.current;
      const daily = data?.daily;

      if (!current) {
        throw new Error("Weather data unavailable.");
      }

      setWeather({
        temperature: Number(current.temperature_2m),
        feelsLike: Number(current.apparent_temperature),
        windSpeed: Number(current.wind_speed_10m),
        windDirection: Number(current.wind_direction_10m),
        windGust: Number(current.wind_gusts_10m),
        precipitation: Number(current.precipitation),
        weatherCode: Number(current.weather_code),
        sunrise: String(daily?.sunrise?.[0] || ""),
        sunset: String(daily?.sunset?.[0] || ""),
        fetchedAt: new Date().toISOString(),
      });

      setFieldPanel("weather");
      setToolsOpen(false);
    } catch (error) {
      console.error("Grace Field weather failed:", error);

      setWeatherError(
        "Grace could not load live weather. Check your connection and try again."
      );

      setFieldPanel("weather");
      setToolsOpen(false);
    } finally {
      setWeatherLoading(false);
    }
  }

 function truckAction() {
    if (truckSpot) {
      setNavigationTarget(truckSpot);
      setReturningToStart(false);
      setToolsOpen(false);
      setHistoryOpen(false);
      setFieldPanel(null);
      setLocationStatus("🚙 Navigating to My Truck.");
      return;
    }

    markTruck();
  }

 async function markTruck() {
    if (!position) {
      setLocationStatus(
        "Get a GPS lock before marking your truck."
      );
      locateMe();
      return;
    }

    if (!(await useFieldAction())) return;

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
      updatedAt: new Date().toISOString(),
      syncPending: true,
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

  async function addSpot() {
    if (!pending) return;
    if (!(await useFieldAction())) return;

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
      updatedAt: new Date().toISOString(),
      syncPending: true,
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

  useEffect(() => {
    try {
      localStorage.setItem(
        "graceFieldSpots",
        JSON.stringify(spots)
      );
    } catch (error) {
      console.warn(
        "Grace Field local save skipped:",
        error
      );
    }
  }, [spots]);

  const visibleSpots = useMemo(
    () => spots.filter((spot) => spot.mode === mode),
    [spots, mode]
  );

  const truckSpot = useMemo(
    () =>
      visibleSpots.find((spot) => spot.type === "truck") ||
      null,
    [visibleSpots]
  );

  const historySpots = useMemo(
    () =>
      [...visibleSpots].sort(
        (a, b) =>
          new Date(b.createdAt).getTime() -
          new Date(a.createdAt).getTime()
      ),
    [visibleSpots]
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

  const activeLayer = mapLayers[mapLayer];

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100dvh",
        overflow: "hidden",
        background: "#111814",
      }}
    >
      {toolsOpen && (
        <div
          style={{
            position: "absolute",
            left: 10,
            right: 10,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 76px)",
            zIndex: 920,
            padding: 10,
            borderRadius: 18,
            background: "rgba(17,24,20,.96)",
            border: "1px solid rgba(244,210,122,.55)",
            boxShadow: "0 8px 28px rgba(0,0,0,.55)",
            maxHeight: "46vh",
            overflowY: "auto",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
              marginBottom: 8,
            }}
          >
            <strong
              style={{
                fontSize: 15,
                color: "#f4d27a",
              }}
            >
              FIELD TOOLS
            </strong>

            <button
              type="button"
              onClick={() => setToolsOpen(false)}
              style={{
                width: 34,
                height: 34,
                borderRadius: "50%",
                border: "1px solid #68736b",
                background: "#202a22",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              fontSize: 11,
              opacity: 0.65,
              marginBottom: 6,
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Marker
          </div>

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
              fontSize: 11,
              opacity: 0.65,
              margin: "2px 0 6px",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            Actions
          </div>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: 8,
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
          onClick={truckAction}
          style={{
            padding: "10px 14px",
            borderRadius: 10,
            border: "1px solid #68736b",
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          🚙 {truckSpot ? "My Truck" : "Mark My Truck"}
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
            onClick={returnToStart}
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              border: "1px solid #f4d27a",
              background: "#344437",
              color: "white",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            🧭 Return to Start
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
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 8,
              marginTop: 10,
              paddingTop: 10,
              borderTop: "1px solid rgba(255,255,255,.12)",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setHistoryOpen(true);
                setToolsOpen(false);
              }}
              style={{
                padding: 11,
                borderRadius: 11,
                border: "1px solid #f4d27a",
                background: "#202a22",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              🗂️ Saved / History ({historySpots.length})
            </button>

            <button
              type="button"
              onClick={loadFieldWeather}
              style={{
                padding: 11,
                borderRadius: 11,
                border: "1px solid #f4d27a",
                background: "#202a22",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              🌦️ Weather / Wind
            </button>

            <button
              type="button"
              onClick={() => {
                const context = position
                  ? `Grace Field ${mode} scout at ${position[0].toFixed(
                      5
                    )}, ${position[1].toFixed(5)}`
                  : `Grace Field ${mode} scout`;

                sessionStorage.setItem(
                  "graceFieldScoutContext",
                  context
                );

                window.location.href = "/chat";
              }}
              style={{
                padding: 11,
                borderRadius: 11,
                border: "1px solid #f4d27a",
                background: "#202a22",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ✨ Scout with Grace
            </button>

            <button
              type="button"
              onClick={() => {
                setFieldPanel("offline");
                setToolsOpen(false);
              }}
              style={{
                padding: 11,
                borderRadius: 11,
                border: "1px solid #f4d27a",
                background: "#202a22",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              📥 Offline Area
            </button>
          </div>
        </div>
      )}

      {/* Compact Field Tools launcher */}
      {!navigationTarget && (
      <button
        type="button"
        onClick={() => setToolsOpen((open) => !open)}
        style={{
          position: "absolute",
          left: 12,
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 18px)",
          zIndex: 940,
          padding: "12px 16px",
          borderRadius: 999,
          border: "1px solid rgba(244,210,122,.75)",
          background: toolsOpen
            ? "#f4d27a"
            : "rgba(17,24,20,.95)",
          color: toolsOpen ? "#111814" : "white",
          fontWeight: 900,
          boxShadow: "0 5px 20px rgba(0,0,0,.5)",
          cursor: "pointer",
        }}
      >
        🧰 {toolsOpen ? "Close Tools" : "Field Tools"}
      </button>
      )}

      {fieldPanel && (
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom:
              "calc(env(safe-area-inset-bottom, 0px) + 76px)",
            zIndex: 968,
            maxWidth: 520,
            margin: "0 auto",
            padding: 16,
            borderRadius: 18,
            background: "rgba(17,24,20,.98)",
            border: "1px solid #f4d27a",
            boxShadow: "0 8px 30px rgba(0,0,0,.65)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <strong
              style={{
                color: "#f4d27a",
                fontSize: 18,
              }}
            >
              {fieldPanel === "weather"
                ? "🌦️ Weather / Wind"
                : "📥 Offline Area"}
            </strong>

            <button
              type="button"
              onClick={() => setFieldPanel(null)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid #68736b",
                background: "#202a22",
                color: "white",
                fontWeight: 900,
              }}
            >
              ✕
            </button>
          </div>

          {fieldPanel === "weather" ? (
            <div style={{ marginTop: 12 }}>
              {weatherLoading ? (
                <div>🌦️ Loading live Field conditions...</div>
              ) : weatherError ? (
                <div>
                  <div>{weatherError}</div>

                  <button
                    type="button"
                    onClick={loadFieldWeather}
                    style={{
                      marginTop: 10,
                      padding: "9px 12px",
                      borderRadius: 9,
                      border: "1px solid #f4d27a",
                      background: "#344437",
                      color: "white",
                      fontWeight: 800,
                    }}
                  >
                    Try Again
                  </button>
                </div>
              ) : weather ? (
                <>
                  <div
                    style={{
                      fontSize: 22,
                      fontWeight: 900,
                    }}
                  >
                    {Math.round(weather.temperature)}°F •{" "}
                    {weatherDescription(weather.weatherCode)}
                  </div>

                  <div
                    style={{
                      marginTop: 4,
                      fontSize: 13,
                      opacity: 0.72,
                    }}
                  >
                    Feels like{" "}
                    {Math.round(weather.feelsLike)}°F
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns:
                        "repeat(2, minmax(0, 1fr))",
                      gap: 8,
                      marginTop: 12,
                    }}
                  >
                    <div
                      style={{
                        padding: 11,
                        borderRadius: 12,
                        background: "#202a22",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.6,
                        }}
                      >
                        WIND
                      </div>

                      <strong>
                        {windCardinal(
                          weather.windDirection
                        )}{" "}
                        {Math.round(weather.windSpeed)} mph
                      </strong>

                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                        }}
                      >
                        Gusts{" "}
                        {Math.round(weather.windGust)} mph •{" "}
                        {Math.round(weather.windDirection)}°
                      </div>
                    </div>

                    <div
                      style={{
                        padding: 11,
                        borderRadius: 12,
                        background: "#202a22",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.6,
                        }}
                      >
                        PRECIPITATION
                      </div>

                      <strong>
                        {weather.precipitation.toFixed(2)} in
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: 11,
                        borderRadius: 12,
                        background: "#202a22",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.6,
                        }}
                      >
                        SUNRISE
                      </div>

                      <strong>
                        🌅 {formatFieldTime(weather.sunrise)}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: 11,
                        borderRadius: 12,
                        background: "#202a22",
                      }}
                    >
                      <div
                        style={{
                          fontSize: 11,
                          opacity: 0.6,
                        }}
                      >
                        SUNSET
                      </div>

                      <strong>
                        🌇 {formatFieldTime(weather.sunset)}
                      </strong>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={loadFieldWeather}
                    style={{
                      width: "100%",
                      marginTop: 12,
                      padding: 10,
                      borderRadius: 10,
                      border: "1px solid #68736b",
                      background: "#202a22",
                      color: "white",
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                  >
                    ↻ Refresh Conditions
                  </button>

                  <div
                    style={{
                      marginTop: 8,
                      fontSize: 11,
                      opacity: 0.55,
                    }}
                  >
                    Live conditions for your current GPS
                    position • Open-Meteo
                  </div>
                </>
              ) : (
                <div>No weather loaded yet.</div>
              )}
            </div>
          ) : (
            <div
              style={{
                marginTop: 12,
                lineHeight: 1.5,
              }}
            >
              <strong>Offline foundation is active.</strong>

              <div
                style={{
                  marginTop: 7,
                  opacity: 0.78,
                  fontSize: 13,
                }}
              >
                Your saved Field markers and breadcrumb trail
                already remain on this device. Downloadable
                offline map areas are the next stage so Grace
                can keep mapping, tracking and navigating where
                there is no service.
              </div>
            </div>
          )}
        </div>
      )}

      {historyOpen && (
        <div
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            top: 82,
            bottom: 72,
            zIndex: 965,
            maxWidth: 620,
            margin: "0 auto",
            padding: 14,
            borderRadius: 18,
            background: "rgba(17,24,20,.98)",
            border: "1px solid rgba(244,210,122,.7)",
            boxShadow: "0 8px 30px rgba(0,0,0,.65)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div>
              <div
                style={{
                  color: "#f4d27a",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                🗂️ Saved / History
              </div>

              <div
                style={{
                  fontSize: 12,
                  opacity: 0.7,
                  marginTop: 2,
                }}
              >
                {mode === "hunt" ? "Hunting" : "Fishing"} •{" "}
                {historySpots.length} saved
              </div>
            </div>

            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              style={{
                width: 38,
                height: 38,
                borderRadius: "50%",
                border: "1px solid #68736b",
                background: "#202a22",
                color: "white",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              overflowY: "auto",
              paddingRight: 2,
            }}
          >
            {historySpots.length === 0 ? (
              <div
                style={{
                  padding: "30px 12px",
                  textAlign: "center",
                  opacity: 0.7,
                }}
              >
                No saved{" "}
                {mode === "hunt" ? "hunting" : "fishing"} spots yet.
              </div>
            ) : (
              historySpots.map((spot) => {
                const info =
                  spot.type === "truck"
                    ? ["truck", "🚙", "My Truck"]
                    : types.find(
                        ([key]) => key === spot.type
                      ) || types[0];

                return (
                  <div
                    key={spot.id}
                    style={{
                      marginBottom: 9,
                      padding: 12,
                      borderRadius: 13,
                      background: "#202a22",
                      border: "1px solid #465148",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        gap: 10,
                        alignItems: "flex-start",
                      }}
                    >
                      <div style={{ fontSize: 25 }}>
                        {info[1]}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontWeight: 900,
                            fontSize: 16,
                          }}
                        >
                          {spot.name}
                        </div>

                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.65,
                            marginTop: 2,
                          }}
                        >
                          {info[2]} •{" "}
                          {new Date(
                            spot.createdAt
                          ).toLocaleString()}
                        </div>

                        {spot.notes && (
                          <div
                            style={{
                              marginTop: 7,
                              fontSize: 13,
                              lineHeight: 1.4,
                            }}
                          >
                            {spot.notes}
                          </div>
                        )}

                        <div
                          style={{
                            marginTop: 7,
                            fontSize: 11,
                            opacity: 0.55,
                          }}
                        >
                          {spot.lat.toFixed(5)},{" "}
                          {spot.lng.toFixed(5)}
                        </div>

                        {position && (
                          <div
                            style={{
                              marginTop: 5,
                              fontSize: 12,
                              fontWeight: 800,
                              color: "#f4d27a",
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
                            gap: 7,
                            marginTop: 10,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setNavigationTarget(spot);
                              setReturningToStart(false);
                              setHistoryOpen(false);
                            }}
                            style={{
                              flex: 1,
                              padding: "9px 10px",
                              borderRadius: 9,
                              border:
                                "1px solid #f4d27a",
                              background: "#344437",
                              color: "white",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            🧭 Navigate
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Delete "${spot.name}"?`
                                )
                              ) {
                                deleteSpot(spot.id);
                              }
                            }}
                            style={{
                              padding: "9px 11px",
                              borderRadius: 9,
                              border:
                                "1px solid #7b4d4d",
                              background: "#2b2020",
                              color: "white",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      <div
        style={{
          position: "absolute",
          top: 72,
          left: 12,
          zIndex: 850,
          maxWidth: "calc(100% - 24px)",
          padding: "7px 10px",
          borderRadius: 999,
          background: "rgba(17,24,20,.82)",
          fontSize: 12,
          opacity: 0.9,
          pointerEvents: "none",
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

      {/* Grace Outdoors map layers */}
      {!navigationTarget && (
      <div
        style={{
          position: "absolute",
          top: 118,
          right: 12,
          zIndex: 950,
        }}
      >
        <button
          type="button"
          onClick={() => setLayersOpen((open) => !open)}
          style={{
            padding: "10px 13px",
            borderRadius: 999,
            border: "1px solid rgba(244,210,122,.7)",
            background: "rgba(17,24,20,.94)",
            color: "white",
            fontWeight: 900,
            boxShadow: "0 4px 16px rgba(0,0,0,.4)",
            cursor: "pointer",
          }}
        >
          {activeLayer.symbol} Layers
        </button>

        {layersOpen && (
          <div
            style={{
              marginTop: 8,
              width: 150,
              padding: 6,
              borderRadius: 14,
              background: "rgba(17,24,20,.96)",
              border: "1px solid rgba(244,210,122,.5)",
              boxShadow: "0 6px 20px rgba(0,0,0,.5)",
            }}
          >
            {(
              Object.entries(mapLayers) as [
                MapLayer,
                (typeof mapLayers)[MapLayer]
              ][]
            ).map(([key, layer]) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  setMapLayer(key);
                  setLayersOpen(false);
                }}
                style={{
                  width: "100%",
                  padding: "10px 9px",
                  margin: "2px 0",
                  textAlign: "left",
                  borderRadius: 9,
                  border:
                    mapLayer === key
                      ? "1px solid #f4d27a"
                      : "1px solid transparent",
                  background:
                    mapLayer === key
                      ? "rgba(244,210,122,.16)"
                      : "transparent",
                  color: "white",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {layer.symbol} {layer.label}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {navigationTarget && navigation && (
        <div
          style={{
            position: "absolute",
            top: 112,
            left: 12,
            right: 12,
            zIndex: 960,
            maxWidth: 520,
            margin: "0 auto",
            padding: 14,
            borderRadius: 18,
            background: "rgba(17,24,20,.94)",
            border: "2px solid #f4d27a",
            boxShadow: "0 8px 28px rgba(0,0,0,.6)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 11,
              opacity: 0.65,
              textTransform: "uppercase",
              letterSpacing: 1.5,
            }}
          >
            {returningToStart
              ? "RETURN TO START"
              : "NAVIGATING TO"}
          </div>

          <div
            style={{
              marginTop: 4,
              fontSize: 19,
              fontWeight: 900,
            }}
          >
            {returningToStart ? "👣 " : "🧭 "}
            {navigationTarget.name}
          </div>

          <div
            style={{
              height: 92,
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 64,
                lineHeight: 1,
                transform: `rotate(${navigation.bearing}deg)`,
                transition: "transform .25s ease",
                transformOrigin: "center",
                filter:
                  "drop-shadow(0 3px 6px rgba(0,0,0,.55))",
              }}
            >
              ↑
            </div>
          </div>

          <div
            style={{
              fontSize: 30,
              fontWeight: 900,
              color: "#f4d27a",
            }}
          >
            {formatDistance(navigation.distance)}
          </div>

          <div
            style={{
              marginTop: 2,
              fontSize: 16,
              fontWeight: 800,
            }}
          >
            {navigation.direction} •{" "}
            {Math.round(navigation.bearing)}°
          </div>

          {returningToStart && (
            <div
              style={{
                marginTop: 7,
                fontSize: 12,
                opacity: 0.72,
              }}
            >
              Follow your recorded breadcrumb trail back.
              Grace is showing your original route on the map.
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 12,
            }}
          >
            <button
              type="button"
              onClick={() => {
                if (!navigationTarget) return;

                setLocationStatus(
                  `🧭 ${navigationTarget.name} • ${formatDistance(
                    navigation.distance
                  )} • ${navigation.direction}`
                );
              }}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 10,
                border: "1px solid #68736b",
                background: "#202a22",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              🎯 Target
            </button>

            <button
              type="button"
              onClick={stopNavigation}
              style={{
                flex: 1,
                padding: "10px 8px",
                borderRadius: 10,
                border: "1px solid #7b4d4d",
                background: "#2b2020",
                color: "white",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              ✕ Stop
            </button>
          </div>
        </div>
      )}

 <div
        style={{
          position: "absolute",
          inset: 0,
          height: "100%",
          minHeight: 0,
          borderRadius: 0,
          overflow: "hidden",
          border: 0,
        }}
      >
        <MapContainer
          center={center}
          zoom={position ? 15 : 7}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            key={mapLayer}
            attribution={activeLayer.attribution}
            url={activeLayer.url}
            maxZoom={activeLayer.maxZoom}
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
                : spot.type === "trail-start"
                ? ["trail-start", "👣", "Trail Start"]
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
                        onClick={() => {
                          setNavigationTarget(spot);
                          setReturningToStart(false);
                        }}
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
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 76,
            zIndex: 970,
            maxWidth: 520,
            margin: "0 auto",
            padding: 16,
            borderRadius: 16,
            background: "rgba(17,24,20,.98)",
            border: "1px solid #f4d27a",
            boxShadow: "0 8px 30px rgba(0,0,0,.6)",
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

      {/* Map-first interface: help/history will live in Field Tools. */}
    </div>
  );
}
