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
import { markerOptions, markerSvg, markerColor } from "./FieldPremiumMarkers";

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

type MapLayer = "standard" | "satellite" | "topo" | "terrain" | "hybrid";

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

  hybrid: {
    label: "Hybrid",
    symbol: "◈",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 19,
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

function makeIcon(symbol: string, border = "#C8AE79", iconStyle = "realistic") {
  const type = symbol;
  const isYou = type === "my-location";
  const html = isYou
    ? `<div style="width:22px;height:22px;border:3px solid #fff;border-radius:50%;background:#1889ef;box-shadow:0 0 0 7px #159af83b,0 2px 12px #000a"></div>`
    : markerSvg(type, 45, true, iconStyle);
  return L.divIcon({className:"grace-premium-pin",html,
    iconSize:isYou?[22,22]:[45,59],iconAnchor:isYou?[11,11]:[22,59],popupAnchor:[0,-55]});
}

type FieldToolName = "location" | "save" | "truck" | "track" | "return" | "history" | "weather" | "offline" | "guardian";
function FieldToolIcon({name}:{name:string}){
 const d:Record<FieldToolName,string>={location:"M12 2v5m0 10v5M2 12h5m10 0h5M12 7a5 5 0 1 0 .01 0",save:"M12 21S5 15 5 10a7 7 0 0 1 14 0c0 5-7 11-7 11Zm0-14v6m-3-3h6",truck:"M2 7h12v10H2zM14 11h4l4 4v2h-8zM5 18a2 2 0 1 0 4 0m8 0a2 2 0 1 0 4 0",track:"M3 19c3-13 8-14 11-7s7 7 7-4M3 19l3-3m-3 3 4 1",return:"m12 5-7 7 7 7M5 12h14",history:"M4 6h16v14H4zM7 10h10M7 14h10",weather:"M5 17a4 4 0 1 1 2-8 6 6 0 0 1 11 2 3 3 0 0 1-1 6zm3 2-1 3m6-3-1 3",offline:"M4 8V3h16v5M5 15l7 6 7-6m-7 6V8",guardian:"m12 2 8 4v5c0 6-4 9-8 11-4-2-8-5-8-11V6zM8 12l3 3 5-6"};
 return <svg aria-hidden="true" width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#dab980" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d={d[name as FieldToolName]||d.location}/></svg>;
}

function MapController({
  command,
  onComplete,
}: {
  command:
    | {
        id: number;
        lat: number;
        lng: number;
        zoom: number;
      }
    | null;
  onComplete: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    if (!command) return;

    map.flyTo(
      [command.lat, command.lng],
      Math.max(map.getZoom(), command.zoom)
    );

    onComplete();
  }, [command, map, onComplete]);

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

type GraceNativeTrailBridge = {
  startTracking: (freshTrail: boolean) => boolean;
  stopTracking: () => void;
  isTracking: () => boolean;
  getTrailSnapshot: () => string;
  clearTrail: () => boolean;
};
function graceNativeTrail(): GraceNativeTrailBridge | null {
  if (typeof window === "undefined") return null;
  return (window as Window & { GraceTrailNative?: GraceNativeTrailBridge }).GraceTrailNative || null;
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
  const [editingSpotId, setEditingSpotId] = useState<string | null>(null);
  const [spotAppearanceVersion, setSpotAppearanceVersion] = useState(0);
  function photoKey(id: string){return `grace-field-photo-v1-${id}`;}
  function styleKey(id: string){return `grace-field-style-v1-${id}`;}
  function localSpotPhoto(id: string){try{return localStorage.getItem(photoKey(id))||"";}catch{return "";}}
  function localSpotStyle(id: string){try{return localStorage.getItem(styleKey(id))||"realistic";}catch{return "realistic";}}
  function setLocalSpotStyle(id:string,style:string){try{localStorage.setItem(styleKey(id),style);setSpotAppearanceVersion(n=>n+1);}catch{setLocationStatus("Cannot store marker style on this device.");}}
  async function attachLocalSpotPhoto(id: string,file:File){
    if(!file.type.startsWith("image/")){setLocationStatus("Choose an image file.");return;}
    if(file.size>20*1024*1024){setLocationStatus("Photo too large (maximum 20 MB before resize).");return;}
    const url=URL.createObjectURL(file);
    try{
      const photo=new Image();
      await new Promise<void>((resolve,reject)=>{photo.onload=()=>resolve();photo.onerror=()=>reject(new Error("Image could not load"));photo.src=url;});
      const scale=Math.min(1,900/Math.max(photo.width,photo.height));
      const canvas=document.createElement("canvas");canvas.width=Math.max(1,Math.round(photo.width*scale));canvas.height=Math.max(1,Math.round(photo.height*scale));
      const context=canvas.getContext("2d");if(!context)throw new Error("Image processing unavailable");
      context.drawImage(photo,0,0,canvas.width,canvas.height);
      const resized=canvas.toDataURL("image/jpeg",0.7);
      localStorage.setItem(photoKey(id),resized);
      setSpotAppearanceVersion(n=>n+1);
      setLocationStatus("Spot photo saved on this device.");
    }catch{setLocationStatus("Could not save photo. Device storage may be full.");}
    finally{URL.revokeObjectURL(url);}
  }


  const [locationStatus, setLocationStatus] =
    useState("Finding your location...");

  const [tracking, setTracking] = useState(false);
  const [lastTrailGpsAt,setLastTrailGpsAt] = useState<number|null>(null);
  const [heartbeat,setHeartbeat] = useState(Date.now());
  useEffect(()=>{const timer=window.setInterval(()=>setHeartbeat(Date.now()),10000);return()=>window.clearInterval(timer);},[]);
  const [trail, setTrail] = useState<TrailPoint[]>([]);
  const trackingActiveRef = useRef(false);
  // Android location foreground service records while the WebView is locked.
  // Restore only verified native points; this does not upload live positions.
  useEffect(() => {
    const native = graceNativeTrail();
    if (!native) return;
    let lastSnapshot = "";
    const sync = () => {
      try {
        const active = native.isTracking();
        trackingActiveRef.current = active;
        setTracking(active);
        const raw = native.getTrailSnapshot();
        if (!raw || raw === lastSnapshot) return;
        const parsed: unknown = JSON.parse(raw);
        if (!Array.isArray(parsed) || !parsed.length) return;
        const valid: TrailPoint[] = parsed.filter((p: unknown) => {
          if (!p || typeof p !== "object") return false;
          const point = p as Record<string, unknown>;
          return typeof point.lat === "number" && Number.isFinite(point.lat) &&
            typeof point.lng === "number" && Number.isFinite(point.lng) &&
            Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180 &&
            typeof point.time === "string" && Number.isFinite(Date.parse(point.time));
        }).map((p: TrailPoint) => ({lat:p.lat,lng:p.lng,time:p.time}));
        if (valid.length === 0) return;
        lastSnapshot = raw;
        setTrail(valid);
        const finalPoint = valid[valid.length - 1];
        setPosition([finalPoint.lat, finalPoint.lng]);
        setLastTrailGpsAt(Date.parse(finalPoint.time));
      } catch {
        setLocationStatus("Android trail restore failed. Local trail has not been erased.");
      }
    };
    const onResume = () => { if (document.visibilityState === "visible") sync(); };
    const initial = window.setTimeout(sync, 750);
    const interval = window.setInterval(sync, 10000);
    document.addEventListener("visibilitychange", onResume);
    window.addEventListener("pageshow", onResume);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onResume);
      window.removeEventListener("pageshow", onResume);
    };
  }, []);


  const [navigationTarget, setNavigationTarget] =
    useState<FieldSpot | null>(null);
  // Navigate to a discovered destination without saving it as a permanent waypoint.
  useEffect(() => {
    const navigate = (event: Event) => {
      const detail = (event as CustomEvent<{lat:number;lng:number}>).detail;
      const lat = Number(detail?.lat), lng = Number(detail?.lng);
      if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) return;
      setNavigationTarget({
        id: "grace-discovery-"+lat+"-"+lng,
        lat, lng, mode:"fish", type:"discovered", name:"Discovered destination",
        notes:"Mapped destination; legal public access not verified.",
        createdAt:new Date().toISOString()
      });
      setReturningToStart(false);
      setDiscoveryPin({lat,lng,name:"Discovered destination"});
      setMapCommand({id:Date.now(),lat,lng,zoom:16});
    };
    window.addEventListener("grace-field-navigate-discovery",navigate);
    return () => window.removeEventListener("grace-field-navigate-discovery",navigate);
  }, []);


 
  // Unified waypoint library: focus the existing map without
  // changing saved markers, cloud records, or tracking.
  useEffect(() => {
    const focus = (event: Event) => {
      const detail = (event as CustomEvent<{
        lat: number;
        lng: number;
        discovery?: boolean;
        name?: string;
      }>).detail;

      if (!detail) return;

      const lat = Number(detail.lat);
      const lng = Number(detail.lng);

      if (!Number.isFinite(lat) || !Number.isFinite(lng) ||
          Math.abs(lat) > 90 || Math.abs(lng) > 180) return;

      if (detail.discovery) setDiscoveryPin({lat,lng,name: typeof detail.name === "string" ? detail.name.slice(0,100) : "Fishing destination"});
      setMapCommand({
        id: Date.now(),
        lat,
        lng,
        zoom: 16,
      });
    };

    window.addEventListener("grace-field-focus-waypoint", focus);
    return () => window.removeEventListener(
      "grace-field-focus-waypoint", focus
    );
  }, []);

 const [discoveryPin, setDiscoveryPin] = useState<{lat:number;lng:number;name:string}|null>(null);
 const [mapCommand, setMapCommand] =
    useState<{
      id: number;
      lat: number;
      lng: number;
      zoom: number;
    } | null>(null);

  const [returningToStart, setReturningToStart] =
    useState(false);

  const [mapLayer, setMapLayer] =
    useState<MapLayer>("satellite");

  const [layersOpen, setLayersOpen] =
    useState(false);

  const [toolsOpen, setToolsOpen] =
    useState(false);

 
  useEffect(() => {
    const showTools = () => {
      setLayersOpen(false);
      setToolsOpen(true);
    };
    const showLayers = () => {
      setToolsOpen(false);
      setLayersOpen(true);
    };
    window.addEventListener("grace-field-open-tools", showTools);
    window.addEventListener("grace-field-open-layers", showLayers);
    return () => {
      window.removeEventListener("grace-field-open-tools", showTools);
      window.removeEventListener("grace-field-open-layers", showLayers);
    };
  }, []);

 const [historyOpen, setHistoryOpen] =
    useState(false);

  const [navigationCompact, setNavigationCompact] = useState(false);

  const [fieldPanel, setFieldPanel] =
    useState<"weather" | "offline" | null>(null);

  useEffect(() => {
    const open = Boolean(fieldPanel || historyOpen || toolsOpen || layersOpen || pending || (navigationTarget && !navigationCompact));
    window.dispatchEvent(new CustomEvent("grace-field-overlay-state", {detail: {open}}));
    return () => { window.dispatchEvent(new CustomEvent("grace-field-overlay-state", {detail: {open: false}})); };
  }, [fieldPanel, historyOpen, toolsOpen, layersOpen, pending, navigationTarget, navigationCompact]);

  useEffect(() => {
    setNavigationCompact(false);
  }, [navigationTarget?.id]);

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

  const types = [...huntTypes, ...fishTypes];

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

  const firstGpsFix = useRef(true);
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
      window.dispatchEvent(new CustomEvent("grace-field-gps-info", {detail:{accuracy:reportedAccuracy,altitude:null,status:`Location rejected — ±${reportedAccuracy} m is too inaccurate`}}));

      return false;
    }

    const next: [number, number] = [
      result.coords.latitude,
      result.coords.longitude,
    ];

    setPosition(next);
    window.dispatchEvent(new CustomEvent("grace-field-gps-info", {detail: {
      accuracy: reportedAccuracy,
      altitude: Number.isFinite(result.coords.altitude ?? NaN) ? result.coords.altitude : null,
      status: `Location locked • ±${reportedAccuracy} m`,
    }}));
    if (firstGpsFix.current) {
      firstGpsFix.current = false;
      setMapCommand({id: Date.now(), lat: next[0], lng: next[1], zoom: 16});
    }
    setAccuracy(reportedAccuracy);

    setLocationStatus(
      `Location locked • ±${reportedAccuracy} m`
    );

    if (trackingActiveRef.current && !graceNativeTrail() && reportedAccuracy <= 40) {
      setLastTrailGpsAt(result.timestamp);
      setTrail((current) => {
        const last = current[current.length - 1];

        if (last) {
          const moved = distanceMeters(
            [last.lat, last.lng],
            next
          );

          if (moved < 5) return current;
          const elapsed = Math.max(1,(Date.now()-new Date(last.time).getTime())/1000);
          if (moved > Math.max(45, elapsed * 6 + reportedAccuracy * 2)) return current;
        }

        return [
          ...current,
          {
            lat: next[0],
            lng: next[1],
            time: new Date(result.timestamp).toISOString(),
          },
        ];
      });
    }

    return true;
  }

  function locationError(error: GeolocationPositionError) {
    console.error("Grace Field GPS error:", error);
    if (error.code === 1 && trackingActiveRef.current && !graceNativeTrail()) {
      trackingActiveRef.current = false;
      setTracking(false);
      if (watchId.current !== null) {
        navigator.geolocation.clearWatch(watchId.current);
        watchId.current = null;
      }
    }
    window.dispatchEvent(new CustomEvent("grace-field-gps-info", {detail:{accuracy:null,altitude:null,status:`GPS error: ${error.message}`}}));

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
    window.dispatchEvent(new CustomEvent("grace-field-gps-info", {detail:{accuracy:null,altitude:null,status:"Acquiring fresh precise GPS…"}}));

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

  // Grace Field 2.0 UI bridge: reuses existing GPS, tracking and saved-spot logic.
  useEffect(() => {
    const commands: Array<[string, () => void]> = [
      ["grace-field-v2-locate", () => { if (!navigator.geolocation) return; navigator.geolocation.getCurrentPosition((p) => { if (acceptPosition(p)) centerMapOn(p.coords.latitude, p.coords.longitude, 16); }, locationError, {enableHighAccuracy:true,timeout:30000,maximumAge:0}); }],
      ["grace-field-v2-save-spot", () => markHere()],
      ["grace-field-v2-start-track", () => { void startTracking(); }],
      ["grace-field-v2-stop-track", () => stopTracking()],
      ["grace-field-v2-trail-back", () => returnToStart()],
    ];
    commands.forEach(([name, handler]) => window.addEventListener(name, handler));
    return () => commands.forEach(([name, handler]) => window.removeEventListener(name, handler));
  });
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("grace-field-tracking-state", {detail:{tracking}}));
  }, [tracking]);

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
    if (trackingActiveRef.current) return;
    if (!(await useFieldAction())) return;
    const native = graceNativeTrail();
    if (!native && !navigator.geolocation) return;
    let newNativeTrail = false;
    if (trail.length > 1) {
      const wantsNew = window.confirm("Start a NEW breadcrumb trail? Your previous trail will be archived on this device. Press Cancel to continue the existing trail.");
      if (wantsNew) {
        try {
          const saved = JSON.parse(localStorage.getItem("graceFieldTrackHistory") || "[]");
          const archive = Array.isArray(saved) ? saved : [];
          archive.unshift({savedAt:new Date().toISOString(),points:trail});
          localStorage.setItem("graceFieldTrackHistory",JSON.stringify(archive.slice(0,25)));
          setTrail([]);
          newNativeTrail = true;
        } catch {setLocationStatus("Could not archive last trail. Continuing existing trail so nothing is lost.");}
      }
    }

    if (native) {
      if (!native.startTracking(newNativeTrail)) {
        setLocationStatus("Allow precise Android location, then press START TRACK again.");
        return;
      }
      trackingActiveRef.current = true;
      setTracking(true);
      setLocationStatus("Android background GPS requested. Check the ongoing tracking notification.");
      return;
    }

    if (watchId.current !== null) {
      navigator.geolocation.clearWatch(watchId.current);
    }

    if (trackingActiveRef.current) return;
    trackingActiveRef.current = true;
    setLastTrailGpsAt(null);
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
    const native = graceNativeTrail();
    if (native) native.stopTracking();
    if (
      watchId.current !== null &&
      navigator.geolocation
    ) {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }

    trackingActiveRef.current = false;
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

  function exportTrailHistory() {
    try {
      const archived = JSON.parse(localStorage.getItem("graceFieldTrackHistory") || "[]");
      const exportData = { exportedAt: new Date().toISOString(), activeTrail: trail, archivedTrails: Array.isArray(archived) ? archived : [] };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "grace-field-trails.json";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setLocationStatus("Current and archived trails exported to device.");
    } catch {
      setLocationStatus("Trail export unavailable. No trail data was deleted.");
    }
  }

  function clearTrail() {
    if (
      typeof window !== "undefined" &&
      !window.confirm("Clear your breadcrumb trail?")
    ) {
      return;
    }
    const native = graceNativeTrail();
    if (native && !native.clearTrail()) {
      setLocationStatus("Stop native tracking before clearing the trail.");
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
    setEditingSpotId(null);

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

 function centerMapOn(
    lat: number,
    lng: number,
    zoom = 16
  ) {
    setMapCommand({
      id: Date.now(),
      lat,
      lng,
      zoom,
    });
  }

  function centerOnMe() {
    if (!position) {
      setLocationStatus(
        "Waiting for your GPS position."
      );
      locateMe();
      return;
    }

    centerMapOn(position[0], position[1], 16);
    setLocationStatus("📍 Centered on your location.");
  }

  function backToTruck() {
    if (!truckSpot) {
      setLocationStatus(
        "No truck marker saved yet. Mark My Truck first."
      );
      return;
    }

    centerMapOn(
      truckSpot.lat,
      truckSpot.lng,
      17
    );

    setLocationStatus("🚙 Showing My Truck.");
  }

 
  function findMeNow() {
    if (!position) {
      setLocationStatus("Finding your GPS position...");
      locateMe();
      return;
    }

    centerMapOn(position[0], position[1], 17);
    setLocationStatus("📍 Showing your current location.");
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

    const selected = markerOptions.find((item) => item.type === selectedType);
    const selectedLabel = selected?.label || types.find(([key]) => key === selectedType)?.[2] || "Saved Spot";

    const spot: FieldSpot = {
      id: editingSpotId || makeFieldId(),
      lat: pending.lat,
      lng: pending.lng,
      mode: ["hole","catch","dock","ramp","water","current","weed","dropoff","structure"].includes(selectedType) ? "fish" : "hunt",
      type: selectedType,
      name: name.trim() || selectedLabel,
      notes: notes.trim(),
      createdAt: editingSpotId ? (spots.find(s => s.id === editingSpotId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncPending: true,
    };

    setSpots((current) => editingSpotId ? current.map(s => s.id === editingSpotId ? spot : s) : [...current, spot]);
    setPending(null);
    setName("");
    setNotes("");
    setEditingSpotId(null);
    void saveFieldSpotToCloud(spot).then(ok => {
      if (ok) setSpots(current => current.map(s => s.id === spot.id && s.updatedAt === spot.updatedAt ? {...s,syncPending:false} : s));
      else setFieldSyncStatus("Saved on device. Cloud sync pending; reconnect to sync.");
    });
  }

  async function deleteSpot(id: string) {
    if (!userId || !fieldCloudReady) {
      setLocationStatus(
        "Cloud memory is not ready. Marker was NOT deleted."
      );
      return;
    }

    setLocationStatus("Deleting marker from cloud...");

    const deleted = await deleteFieldSpotFromCloud(id);

    if (!deleted) {
      setLocationStatus(
        "Cloud deletion failed. Marker was kept."
      );
      return;
    }

    setSpots((current) =>
      current.filter((spot) => spot.id !== id)
    );

    if (navigationTarget?.id === id) {
      setNavigationTarget(null);
    }

    setLocationStatus("Marker deleted from cloud and device.");
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

  const visibleSpots = spots;

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
        background: "#0C1411",
      }}
    >
      {toolsOpen && (
        <div role="dialog" aria-label="Outdoor field tools" className="gf-premium-sheet" style={{position:"absolute",zIndex:1600,left:10,right:10,bottom:"calc(env(safe-area-inset-bottom, 0px) + 94px)",maxWidth:510,margin:"auto",maxHeight:"min(70dvh, 600px)",overflowY:"auto",borderRadius:17,padding:"17px 14px 18px",background:"linear-gradient(150deg,rgba(7,20,16,.99),rgba(13,30,22,.99))",border:"1px solid #d3ac72",boxShadow:"0 15px 50px #000d",color:"#f3e6cd"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",borderBottom:"1px solid #8c785766",paddingBottom:12}}>
            <div><div style={{color:"#d5b57e",fontSize:10,letterSpacing:2.2}}>GRACE FIELD / NAVIGATION</div><h2 style={{fontFamily:"Georgia,serif",fontWeight:500,fontSize:24,letterSpacing:1.3,margin:"5px 0 0"}}>FIELD OPERATIONS</h2></div>
            <button type="button" aria-label="Close outdoor field tools" onClick={()=>setToolsOpen(false)} style={{width:43,height:43,color:"#e7c28b",background:"#10241b",border:"1px solid #ad9269",borderRadius:10,fontSize:24}}>×</button>
          </div>
          <div style={{color:"#afc6b2",fontSize:12,margin:"12px 0"}}>Clean map-first tools. Select a marker using Save Location; no emoji shortcuts.</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:9}}>
            {([
              ["FIND MY LOCATION","location"],
              ["SAVE LOCATION","save"],
              [truckSpot?"NAVIGATE TO TRUCK":"MARK MY TRUCK","truck"],
              [tracking?"STOP TRACK":"START TRACK","track"],
              ["FOLLOW TRAIL BACK","return"],
              ["SAVED SPOTS","history"],
              ["WEATHER & WIND","weather"],
              ["OFFLINE MAP STATUS","offline"],
              ["GUARDIAN ANGEL","guardian"],
            ] as [string,string][]).map(([title,kind])=><button key={kind} type="button" onClick={()=>{
              setToolsOpen(false);
              if(kind==="location")findMeNow();
              if(kind==="save")markHere();
              if(kind==="truck"){if(truckSpot)backToTruck();else void truckAction();}
              if(kind==="track"){if(tracking)stopTracking();else void startTracking();}
              if(kind==="return")returnToStart();
              if(kind==="history")setHistoryOpen(true);
              if(kind==="weather"){setFieldPanel("weather");void loadFieldWeather();}
              if(kind==="offline")setFieldPanel("offline");
              if(kind==="guardian")window.dispatchEvent(new Event("grace-field-open-mission"));
            }} style={{minHeight:70,display:"flex",alignItems:"center",gap:9,textAlign:"left",padding:"11px 10px",borderRadius:11,background:"linear-gradient(140deg,#172e22,#0b1b14)",border:"1px solid #766c50",color:"#f8edda",fontWeight:800,fontSize:12,letterSpacing:.4}}>
              <FieldToolIcon name={kind}/><span>{title}</span>
            </button>)}
          </div>
          <div style={{marginTop:13,background:"#081510",border:"1px solid #5a644e",borderRadius:11,padding:"10px 12px",fontSize:11,lineHeight:1.5,color:"#ced5c4"}}>
            <strong style={{color:tracking?"#a0e6b5":"#e8c991"}}>{tracking?"● RECORDING GPS TRAIL":"● TRAIL READY"}</strong>
            <div>{trail.length} saved breadcrumb points. Blue lines show accepted GPS positions; inaccurate fixes are excluded.</div>
            <div style={{display:"flex",gap:7,flexWrap:"wrap",marginTop:9}}>
              <button type="button" onClick={exportTrailHistory} style={{padding:"9px 13px",border:"1px solid #9aab8f",borderRadius:8,background:"#19372a",color:"#f8e4cf",fontWeight:700}}>EXPORT TRAILS</button>
              {trail.length>0&&<button type="button" onClick={clearTrail} style={{padding:"9px 13px",border:"1px solid #ad8b62",borderRadius:8,background:"#342419",color:"#f8e4cf",fontWeight:700}}>CLEAR TRAIL (CONFIRM)</button>}
            </div>
          </div>
        </div>
      )}

      {fieldPanel && (
        <div data-grace-field-overlay="true"
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: 118,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 108px)",
            zIndex: 3200,
            maxWidth: 520,
            margin: "0 auto",
            padding: 16,
            borderRadius: 18,
            background: "linear-gradient(160deg,rgba(17,31,24,.99),rgba(8,17,14,.99))",
            border: "1px solid rgba(200,174,121,.55)",
            boxShadow: "0 12px 40px rgba(0,0,0,.72)",
            overflowY: "auto",
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
                color: "#C8AE79",
                fontSize: 18,
              }}
            >
              {fieldPanel === "weather"
                ? "WEATHER & WIND"
                : "OFFLINE MAP STATUS"}
            </strong>

            <button
              type="button"
              onClick={() => setFieldPanel(null)}
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1px solid #68736b",
                background: "#18251F",
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
                      border: "1px solid rgba(200,174,121,.55)",
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
                        background: "#18251F",
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
                        background: "#18251F",
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
                        background: "#18251F",
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
                        {formatFieldTime(weather.sunrise)}
                      </strong>
                    </div>

                    <div
                      style={{
                        padding: 11,
                        borderRadius: 12,
                        background: "#18251F",
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
                        {formatFieldTime(weather.sunset)}
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
                      background: "#18251F",
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
        <div data-grace-field-overlay="true"
          style={{
            position: "absolute",
            left: 14,
            right: 14,
            top: 118,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 108px)",
            zIndex: 3200,
            maxWidth: 620,
            margin: "0 auto",
            padding: 14,
            borderRadius: 18,
            background: "linear-gradient(160deg,rgba(17,31,24,.99),rgba(8,17,14,.99))",
            border: "1px solid rgba(244,210,122,.7)",
            boxShadow: "0 12px 40px rgba(0,0,0,.72)",
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
                  color: "#C8AE79",
                  fontWeight: 900,
                  fontSize: 18,
                }}
              >
                ▤ SAVED / HISTORY
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
                background: "#18251F",
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
                      background: "#18251F",
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
                      <div style={{width:44,height:57,flexShrink:0}} dangerouslySetInnerHTML={{__html:markerSvg(spot.type,43,true,localSpotStyle(spot.id))}} />

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
                              color: "#C8AE79",
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
                                "1px solid rgba(200,174,121,.55)",
                              background: "#344437",
                              color: "white",
                              fontWeight: 800,
                              cursor: "pointer",
                            }}
                          >
                            Navigate
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

      {/* GPS status and live accuracy are displayed in the compact main map instruments. */}

      {/* Grace Outdoors map layers */}
      {layersOpen && !navigationTarget && (
      <div
        style={{
          position: "absolute",
          bottom: "calc(env(safe-area-inset-bottom, 0px) + 100px)",
          left: 12,
          right: 12,
          zIndex: 950,
          display: "flex",
          justifyContent: "center",
        }}
      >
        {layersOpen && (
          <div
            style={{
              marginTop: 8,
              width: "min(100%, 420px)",
              maxHeight: "43dvh",
              overflowY: "auto",
              padding: 12,
              borderRadius: 14,
              background: "rgba(17,24,20,.96)",
              border: "1px solid rgba(244,210,122,.5)",
              boxShadow: "0 6px 20px rgba(0,0,0,.5)",
            }}
          >
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 8
            }}>
              <strong style={{color:"#C8AE79",letterSpacing:1}}>
                MAP LAYERS
              </strong>
              <button
                type="button"
                onClick={() => setLayersOpen(false)}
                style={{
                  border:"1px solid #68736b",
                  borderRadius:999,
                  background:"#18251F",
                  color:"white",
                  padding:"7px 12px",
                  fontWeight:800
                }}
              >
                CLOSE
              </button>
            </div>
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
                      ? "1px solid rgba(200,174,121,.55)"
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
                {layer.label}
              </button>
            ))}
          </div>
        )}
      </div>
      )}

      {navigationTarget && navigation && (
        navigationCompact ? (
          <div role="status" aria-label="Active navigation" style={{
            position:"absolute", zIndex:3200, left:12, right:12,
            bottom:"calc(env(safe-area-inset-bottom, 0px) + 90px)",
            margin:"0 auto", maxWidth:460, padding:"9px 10px", borderRadius:13,
            border:"1px solid #c9a16c", background:"#0c2019f5",
            display:"flex", alignItems:"center", gap:8, boxShadow:"0 10px 30px #000a"
          }}>
            <button type="button" onClick={()=>setNavigationCompact(false)} style={{
              flex:1,minWidth:0,textAlign:"left",border:0,background:"transparent",color:"#f5dec0",padding:5
            }}>
              <div style={{fontSize:9,letterSpacing:1.3,color:"#d9b77d"}}>NAVIGATION · TAP TO EXPAND</div>
              <div style={{fontSize:14,fontWeight:800,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
                {navigationTarget.name} · {formatDistance(navigation.distance)} · {navigation.direction} {Math.round(navigation.bearing)}°
              </div>
            </button>
            <button type="button" onClick={stopNavigation} aria-label="Stop navigation" style={{
              padding:"9px 12px",borderRadius:9,border:"1px solid #bb826c",background:"#3b211d",color:"#f8e2d8",fontWeight:800
            }}>STOP</button>
          </div>
        ) : (
          <div data-grace-field-navigation="true" role="dialog" aria-label={returningToStart ? "Return to trail start" : "Navigate to saved location"}
            style={{
              position:"absolute", zIndex:3200,
              top:"calc(env(safe-area-inset-top, 0px) + 88px)", left:12, right:12,
              maxWidth:520, maxHeight:"calc(100dvh - 205px)", overflowY:"auto",
              margin:"0 auto", padding:"15px", borderRadius:17,
              background:"linear-gradient(155deg,#0a1d16fa,#10251bfa)",
              border:"1px solid #d2ab73",boxShadow:"0 15px 40px #000d", color:"#f6ebd9"
            }}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10}}>
              <div style={{minWidth:0}}>
                <div style={{fontSize:10,letterSpacing:2,color:"#d4b47f"}}>
                  {returningToStart ? "RETURN TO START" : "NAVIGATE TO SAVED SPOT"}
                </div>
                <div style={{fontSize:22,fontFamily:"Georgia,serif",marginTop:7,overflowWrap:"anywhere"}}>{navigationTarget.name}</div>
              </div>
              <button type="button" onClick={()=>setNavigationCompact(true)} aria-label="Minimize navigation panel" style={{
                flexShrink:0, padding:"9px 11px",fontSize:11,fontWeight:800,
                color:"#f2dbb0",border:"1px solid #ad9163",borderRadius:9,background:"#193126"
              }}>VIEW MAP ↓</button>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:10,marginTop:14}}>
              <div style={{padding:13,borderRadius:12,border:"1px solid #8c7755",background:"#0b1a14"}}>
                <div style={{fontSize:9,letterSpacing:1.3,color:"#c4ac84"}}>DIRECT BEARING</div>
                <div style={{fontWeight:800,fontSize:24,color:"#f3d49d",marginTop:6,whiteSpace:"nowrap"}}>
                  {navigation.direction} · {Math.round(navigation.bearing)}°
                </div>
                <div style={{fontSize:11,color:"#c6cfc0",marginTop:3}}>True north · not turn-by-turn</div>
              </div>
              <div style={{padding:13,borderRadius:12,border:"1px solid #8c7755",background:"#0b1a14"}}>
                <div style={{fontSize:9,letterSpacing:1.3,color:"#c4ac84"}}>DIRECT DISTANCE</div>
                <div style={{fontWeight:800,fontSize:25,color:"#f3d49d",marginTop:6}}>
                  {formatDistance(navigation.distance)}
                </div>
                <div style={{fontSize:11,color:"#c6cfc0",marginTop:3}}>Straight-line distance</div>
              </div>
            </div>
            <div style={{marginTop:12,padding:"10px 11px",borderRadius:10,
              background:accuracy !== null && navigation.distance <= accuracy ? "#402b18" : "#162f22",
              border:"1px solid #88714c",fontSize:12,lineHeight:1.5}}>
              {accuracy === null ? "GPS accuracy unavailable. Confirm your position using landmarks."
                : navigation.distance <= accuracy
                  ? `GPS accuracy ±${Math.round(accuracy * 3.28084)} ft: the target is within your location uncertainty. Distance and bearing may jump even when you are standing still.`
                  : `GPS accuracy ±${Math.round(accuracy * 3.28084)} ft. Check terrain and landmarks before moving.`}
            </div>
            {returningToStart && (
              <div style={{fontSize:12,lineHeight:1.6,color:"#cdd7c8",marginTop:10}}>
                {trail.length > 1
                  ? "Use the recorded blue breadcrumb trail on the map to retrace your path. The bearing above points directly to the start, not around obstacles."
                  : "No usable breadcrumb trail is recorded. Do not rely on a straight-line bearing to avoid cliffs, water, or other obstacles."}
              </div>
            )}
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${navigationTarget.lat}%2C${navigationTarget.lng}&travelmode=driving`}
              target="_blank"
              rel="noopener noreferrer"
              style={{display:"block",marginTop:14,padding:"13px 12px",textAlign:"center",borderRadius:10,background:"#d4af70",color:"#12271c",fontWeight:900,textDecoration:"none"}}
            >
              OPEN GOOGLE MAPS · DRIVE THERE ↗
            </a>
            <div style={{fontSize:11,color:"#d6c6a6",marginTop:6}}>Google Maps provides road directions. Grace Field remains available for off-road navigation.</div>
            <div style={{display:"flex",gap:9,marginTop:14}}>
              <button type="button" onClick={()=>setNavigationCompact(true)} style={{flex:1,padding:"12px 9px",border:"1px solid #9e926e",borderRadius:10,color:"#f4e5c8",background:"#1c3829",fontWeight:800}}>VIEW MAP</button>
              <button type="button" onClick={stopNavigation} style={{flex:1,padding:"12px 9px",border:"1px solid #c08879",borderRadius:10,color:"#ffe4d9",background:"#452420",fontWeight:800}}>STOP NAVIGATION</button>
            </div>
          </div>
        )
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
          {mapLayer === "hybrid" && <TileLayer
            attribution="Labels &copy; Esri"
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
            maxZoom={19}
          />}

          <MapController
            command={mapCommand}
            onComplete={() => setMapCommand(null)}
          />

          <MapTap
            onTap={(lat, lng) => {
              setPending({ lat, lng });
              setName("");
              setNotes("");
              setEditingSpotId(null);
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

          {discoveryPin && <Marker position={[discoveryPin.lat,discoveryPin.lng]} icon={makeIcon("custom","#f2bc62")}><Popup>{discoveryPin.name} — discovered location (public access unverified)</Popup></Marker>}

          {pending && (
            <Marker
              position={[pending.lat, pending.lng]}
              icon={makeIcon("custom", "#ff9f43")}
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
                color: "#20a7f7",
                weight: 5,
                opacity: 0.93,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          )}

          {returningToStart && trail.length>1 && (
            <Polyline positions={[...trail].reverse().map(point=>[point.lat,point.lng] as [number,number])} pathOptions={{color:"#f2bc62",weight:3,opacity:.98,dashArray:"8 8",lineCap:"round"}} />
          )}

          {position && (
            <Marker
              position={position}
              icon={makeIcon("my-location", "#5ee7ff")}
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
            const info = markerOptions.find(o => o.type === spot.type);
            const photo = localSpotPhoto(spot.id);
            const spotStyle = localSpotStyle(spot.id);
            void info;
            void spotAppearanceVersion;
            return (
              <Marker
                key={spot.id}
                position={[spot.lat, spot.lng]}
                icon={makeIcon(spot.type, markerColor(spot.type), spotStyle)}
              >
                <Popup maxWidth={320} autoPanPaddingTopLeft={[15, 105]} autoPanPaddingBottomRight={[15, 125]}>
                  <div style={{ minWidth: 190 }}>
                    <strong style={{display:"block",fontSize:17,color:"#efd29e",marginBottom:6}}>{spot.name}</strong>
                    {photo && <img src={photo} alt={`Saved view at ${spot.name}`} style={{width:"100%",maxHeight:152,objectFit:"cover",borderRadius:9,border:"1px solid #97835c",marginBottom:8}}/>}
                    <label style={{display:"block",textAlign:"center",background:"#23392b",border:"1px solid #927850",padding:8,borderRadius:9,fontWeight:800,cursor:"pointer",fontSize:11,marginBottom:8}}>
                      {photo?"CHANGE PHOTO":"ADD SPOT PHOTO"}
                      <input type="file" accept="image/*" capture="environment" style={{display:"none"}} onChange={e=>{const f=e.currentTarget.files?.[0];if(f)void attachLocalSpotPhoto(spot.id,f);e.currentTarget.value="";}}/>
                    </label>
                    <div style={{fontSize:10,color:"#cdb58c",letterSpacing:1,marginBottom:5}}>MARKER APPEARANCE</div>
                    <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:8}}>
                      {(["realistic","modern","tactical","topo","minimal"] as const).map(style=><button type="button" key={style} onClick={()=>setLocalSpotStyle(spot.id,style)} style={{fontSize:10,padding:"5px 7px",background:spotStyle===style?"#5d4926":"#1c3027",borderColor:spotStyle===style?"#e9c788":"#5b6b57"}}>{style}</button>)}
                    </div>
                    {spot.notes && <p style={{whiteSpace:"pre-wrap"}}>{spot.notes}</p>}

                    <small style={{display:"block",marginTop:6,color:"#c6bea8"}}>
                      Saved {new Date(spot.createdAt).toLocaleString()} · Photo/style saved on this device
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
                        Navigate
                      </button>

                      <button onClick={() => {
                        setPending({lat:spot.lat,lng:spot.lng});
                        setName(spot.name);setNotes(spot.notes);
                        setSelectedType(spot.type);setEditingSpotId(spot.id);
                      }}>Edit</button>
                      <button
                        onClick={() => {
                          if (window.confirm(
                            `Permanently delete "${spot.name}" from Grace Field?`
                          )) {
                            void deleteSpot(spot.id);
                          }
                        }}
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
        <div role="status" aria-live="polite" style={{position:"absolute",top:84,left:"50%",transform:"translateX(-50%)",zIndex:850,border:"1px solid #79c69a",background:"#082018ec",color:"#d8ffdc",padding:"6px 11px",borderRadius:9,fontSize:11,fontWeight:850,whiteSpace:"nowrap",boxShadow:"0 3px 10px #000a"}}>
          {lastTrailGpsAt===null||heartbeat-lastTrailGpsAt>45000?"◌ GPS SIGNAL STALE":"● TRACKING"} · {trail.length} GPS points · {accuracy!==null?`±${Math.round(accuracy*3.28084)} ft`:"waiting for fix"}
        </div>
      )}

      {pending && (
        <div
          id="grace-field-save-spot"
          style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 115px)",
            zIndex: 1900,
            maxHeight: "min(74dvh, 720px)",
            overflowY: "auto",
            maxWidth: 520,
            margin: "0 auto",
            padding: 16,
            borderRadius: 22,
            background: "linear-gradient(160deg,rgba(17,31,24,.99),rgba(8,17,14,.99))",
            border: "1px solid rgba(200,174,121,.55)",
            boxShadow: "0 16px 50px rgba(0,0,0,.85)",
          }}
        >
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}>
            <strong style={{color:"#e1c48c",fontSize:17}}>{editingSpotId ? "EDIT SAVED SPOT" : "SAVE LOCATION"}</strong>
            <button type="button" aria-label="Close save location" onClick={()=>{setPending(null);setEditingSpotId(null);}} style={{background:"#1a2b21",border:"1px solid #806f51",color:"#fff",borderRadius:20,padding:"5px 12px"}}>✕</button>
          </div>
          <div style={{color:"#b4c6b4",fontSize:12,marginTop:6}}>Choose a location type, then give it a name. Your spot stays on your map.</div>
          <div style={{display:"flex",gap:7,overflowX:"auto",padding:"10px 0 6px"}}>
            {(["Hunting","Fishing","Camping & Base","Other"] as const).map(category=><button key={category} type="button" onClick={()=>{const first=markerOptions.find(m=>m.category===category);if(first)setSelectedType(first.type);}} style={{background:markerOptions.find(m=>m.type===selectedType)?.category===category?"#405b3e":"#14251b",color:"#f8e8cb",border:"1px solid #917a50",borderRadius:9,padding:"9px 12px",fontSize:12,fontWeight:700,whiteSpace:"nowrap"}}>{category}</button>)}
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:7,margin:"8px 0 12px"}}>
            {markerOptions.map(option=><button key={option.type} type="button" onClick={()=>setSelectedType(option.type)} style={{minHeight:100,background:selectedType===option.type?"#35503b":"#192920",border:selectedType===option.type?"2px solid #e0bd7c":"1px solid #465b46",borderRadius:11,color:"#f6f1e6",boxShadow:selectedType===option.type?"0 0 0 2px #d8b77940,inset 0 0 25px #e6c58914":"0 5px 12px #0005",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,padding:4}}><span dangerouslySetInnerHTML={{__html:markerSvg(option.type,64)}}/><span style={{fontSize:11,fontWeight:700,lineHeight:1.15,textAlign:"center"}}>{option.label}</span></button>)}
          </div>

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
              "Name — Ridge Stand, Creek Hole, Camera 3..."
            }
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 13,
              borderRadius: 12,
              background: "#10241c",
              color: "#fff1d8",
              border: "1px solid #987a51",
              fontSize: 15,
              marginTop: 12,
            }}
          />

          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={
              "Notes — wind direction, access trail, water depth..."
            }
            rows={3}
            style={{
              width: "100%",
              boxSizing: "border-box",
              padding: 13,
              borderRadius: 12,
              background: "#10241c",
              color: "#fff1d8",
              border: "1px solid #987a51",
              fontSize: 15,
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
              {editingSpotId ? "Update Spot" : "Save Spot"}
            </button>

            <button
              onClick={() => {setPending(null);setEditingSpotId(null);}}
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
