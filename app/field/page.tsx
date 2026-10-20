"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import FieldMission from "@/components/field/FieldMission";
import FieldWaypointLibrary from "@/components/field/FieldWaypointLibrary";
import FieldWaypointNavigator from "@/components/field/FieldWaypointNavigator";
import type { FieldMode } from "@/components/field/FieldMap";

const FieldMap = dynamic(() => import("@/components/field/FieldMap"), {
  ssr: false,
  loading: () => <div className="gf-loading">Acquiring your current GPS location…</div>,
});
const send = (name: string) => window.dispatchEvent(new Event(name));
type GpsInfo = { accuracy: number | null; altitude: number | null; status: string };
type IconName = "mountain" | "menu" | "layers" | "locate" | "search" | "compass" | "track" | "save" | "shield" | "back" | "pin" | "x" | "clock" | "weather";
function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  const shared = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const paths: Record<IconName, React.ReactNode> = {
    mountain: <><path d="M1 27 15 8l8 10 10-14 17 23"/><path d="m8 27 7-9 6 8M22 27 33 12l12 15M1 31h49"/><path d="m12 12 3-4 3 4m12-2 3-6 4 6"/></>,
    menu: <><path d="M5 9h30M5 20h30M5 31h30"/></>,
    layers: <><path d="m20 5 16 9-16 9L4 14zM4 21l16 9 16-9M4 28l16 9 16-9"/></>,
    locate: <><circle cx="20" cy="20" r="9"/><path d="M20 2v9m0 18v9M2 20h9m18 0h9"/><circle cx="20" cy="20" r="2"/></>,
    search: <><circle cx="17" cy="17" r="12"/><path d="m26 26 10 10"/></>,
    compass: <><circle cx="20" cy="20" r="16"/><path d="m25 15-3 9-9 3 3-9z"/></>,
    track: <><path d="M5 30c8-8 4-17 16-19 14-2 17 15 7 18-5 2-10-5-4-8"/><circle cx="5" cy="30" r="3"/><path d="m31 30 4 6 3-6"/></>,
    save: <><path d="M20 37S7 25 7 17a13 13 0 0 1 26 0c0 8-13 20-13 20z"/><path d="M20 11v12m-6-6h12"/></>,
    shield: <><path d="M20 3 34 9v11c0 11-7 16-14 19C13 36 6 31 6 20V9z"/><path d="m13 21 5 5 10-11"/></>,
    back: <><path d="m24 6-14 14 14 14M11 20h25"/></>,
    pin: <><path d="M20 37S7 25 7 17a13 13 0 0 1 26 0c0 8-13 20-13 20z"/><circle cx="20" cy="17" r="4"/></>,
    x: <path d="M8 8 32 32M32 8 8 32"/>,
    clock: <><circle cx="20" cy="20" r="16"/><path d="M20 10v11l7 4"/></>,
    weather: <><path d="M13 28a9 9 0 0 1 1-18 11 11 0 0 1 20 7 7 7 0 0 1-1 14H13"/><path d="M15 33v4m8-4v4m8-4v4"/></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox={name === "mountain" ? "0 0 51 40" : "0 0 40 40"} {...shared}>{paths[name]}</svg>;
}

export default function GraceField() {
  const [heading, setHeading] = useState<number | null>(null);
  const [tracking, setTracking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [graceOpen, setGraceOpen] = useState(false);
  const graceFrameRef = useRef<HTMLIFrameElement>(null);
  const sendFieldContext = () => {
    try {
      const raw = JSON.parse(localStorage.getItem("graceFieldSpots") || "[]");
      const spots = Array.isArray(raw) ? raw.filter((p: any) =>
        p && typeof p.name === "string" && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng))
      ).slice(0, 150).map((p: any) => ({id: String(p.id || ""), name: p.name.slice(0,120), type: String(p.type || ""), lat: Number(p.lat), lng: Number(p.lng)})) : [];
      graceFrameRef.current?.contentWindow?.postMessage({type:"grace-field-context",spots},window.location.origin);
    } catch { graceFrameRef.current?.contentWindow?.postMessage({type:"grace-field-context",spots:[]},window.location.origin); }
  };
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== graceFrameRef.current?.contentWindow) return;
      const data = event.data;
      if (!data || typeof data !== "object") return;
      if (data.type === "grace-field-request-context") sendFieldContext();
      if (data.type === "grace-field-open-guardian") { setGraceOpen(false); send("grace-field-open-mission"); }
      if (data.type === "grace-field-show-spots") { setGraceOpen(false); send("grace-field-open-waypoint-library"); }
      if (data.type === "grace-field-focus-spot") {
        const lat = Number(data.lat), lng = Number(data.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat)>90 || Math.abs(lng)>180) return;
        const spots = JSON.parse(localStorage.getItem("graceFieldSpots") || "[]");
        if (!Array.isArray(spots) || !spots.some((p:any) => p.id === data.id && Number(p.lat) === lat && Number(p.lng) === lng)) return;
        // Let the iframe close and the map regain its full viewport first.
        setGraceOpen(false);
        window.requestAnimationFrame(() => {
          window.dispatchEvent(new CustomEvent("grace-field-focus-waypoint",{detail:{lat,lng}}));
        });
      }
    };
    window.addEventListener("message",onMessage);
    return () => window.removeEventListener("message",onMessage);
  }, []);
  const [mapOverlayOpen, setMapOverlayOpen] = useState(false);
  const [gps, setGps] = useState<GpsInfo>({accuracy: null, altitude: null, status: "Acquiring precise GPS…"});
  const [mode] = useState<FieldMode>("hunt");
  useEffect(() => {
    const orientation = (ev: DeviceOrientationEvent) => {
      const e = ev as DeviceOrientationEvent & { webkitCompassHeading?: number };
      if (typeof e.webkitCompassHeading === "number") setHeading((e.webkitCompassHeading + 360) % 360);
      else if (ev.absolute && typeof ev.alpha === "number") setHeading((360 - ev.alpha) % 360);
    };
    const track = (e: Event) => setTracking(Boolean((e as CustomEvent<{tracking: boolean}>).detail?.tracking));
    const updateGps = (e: Event) => {
      const v = (e as CustomEvent<GpsInfo>).detail;
      if (v) setGps(v);
    };
    window.addEventListener("deviceorientationabsolute", orientation);
    window.addEventListener("deviceorientation", orientation);
    window.addEventListener("grace-field-tracking-state", track);
    window.addEventListener("grace-field-gps-info", updateGps);
    return () => {
      window.removeEventListener("deviceorientationabsolute", orientation);
      window.removeEventListener("deviceorientation", orientation);
      window.removeEventListener("grace-field-tracking-state", track);
      window.removeEventListener("grace-field-gps-info", updateGps);
    };
  }, []);
  useEffect(() => {
    const onOverlayChange = (event: Event) => {
      const state = (event as CustomEvent<{open: boolean}>).detail;
      setMapOverlayOpen(Boolean(state?.open));
    };
    window.addEventListener("grace-field-overlay-state", onOverlayChange);
    return () => window.removeEventListener("grace-field-overlay-state", onOverlayChange);
  }, []);
  const cardinal = heading === null ? "NO SENSOR" : ["N", "NE", "E", "SE", "S", "SW", "W", "NW"][Math.round(heading / 45) % 8];
  const doMenuAction = (event: string) => { setMenuOpen(false); send(event); };
  return <main className={`grace-field-v3${mapOverlayOpen ? " gf-map-overlay-open" : ""}`}>
    <style>{`
      .grace-field-v3{position:fixed;inset:0;z-index:10000;overflow:hidden;background:#0a1513;color:#f2e9d7;font-family:system-ui,-apple-system,'Segoe UI',sans-serif;isolation:isolate}
      .grace-field-v3 *{box-sizing:border-box}
      .grace-field-v3 .gf-loading{height:100%;display:grid;place-items:center;background:#0a1513;color:#dfbf7f}
      .grace-field-v3 button{font:inherit;touch-action:manipulation;cursor:pointer}
      .grace-field-v3 button:focus-visible{outline:2px solid #ffda8b;outline-offset:3px}
      .grace-field-v3 .leaflet-container{background:#091611;font:inherit}
      .grace-field-v3 .leaflet-control-zoom{display:none}
      .grace-field-v3 .leaflet-control-attribution{background:#08130eda!important;color:#b6bba9!important;font-size:8px!important;max-width:100%;white-space:nowrap;overflow:hidden}
      .grace-field-v3 .leaflet-control-attribution a{color:#c5b18a!important}
      .grace-field-v3 .leaflet-popup-content-wrapper{background:#0c1915;color:#fff2d6;border:1px solid #be9c61;border-radius:14;box-shadow:0 12px 25px #000c}
      .grace-field-v3 .leaflet-popup-tip{background:#0c1915}
      .grace-field-v3 .leaflet-popup-content button{background:#283b2e;color:#f8eddb;border:1px solid #b69a69;border-radius:8px;padding:8px 10px;margin-top:2px}
      .grace-field-v3 .leaflet-marker-icon.grace-premium-pin{filter:drop-shadow(0 4px 6px #000d)}
      /* Keep fixed map instruments from obscuring open FieldMap sheets. */
      .grace-field-v3:has([data-grace-field-overlay="true"]) .gf-sidebar,
      .grace-field-v3:has([data-grace-field-overlay="true"]) .gf-quicktools{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      /* Leaflet saved-spot popups otherwise render beneath compass and quick tools.
         Hide overlays ONLY during an open popup; GPS recording continues. */
      .grace-field-v3:has(.leaflet-popup) .gf-sidebar,
      .grace-field-v3:has(.leaflet-popup) .gf-quicktools,
      .grace-field-v3:has(.leaflet-popup) .gf-bottom{visibility:hidden!important;opacity:0!important;pointer-events:none!important}
      .grace-field-v3 .leaflet-popup-content{max-width:calc(100vw - 56px)!important;overflow-wrap:anywhere}
      .grace-field-v3 .leaflet-popup-content-wrapper{max-height:calc(100dvh - 190px);overflow-y:auto;border-radius:14px}
      .grace-field-v3 .leaflet-popup-content button{white-space:nowrap;min-width:0}
      .grace-field-v3 .leaflet-popup-close-button{z-index:2}
      /* Foreground navigation hides fixed widgets without deleting or stopping GPS recording. */
      .gf-map-overlay-open .gf-sidebar,.gf-map-overlay-open .gf-quicktools,.gf-map-overlay-open .gf-bottom{visibility:hidden!important;pointer-events:none!important}
      .grace-field-v3:has([data-grace-field-navigation="true"]) .gf-sidebar,
      .grace-field-v3:has([data-grace-field-navigation="true"]) .gf-quicktools,
      .grace-field-v3:has([data-grace-field-navigation="true"]) .gf-bottom{visibility:hidden!important;pointer-events:none!important}
      .gf-grace-launch{position:absolute;z-index:1280;right:12px;bottom:calc(env(safe-area-inset-bottom,0px) + 90px);display:flex;align-items:center;gap:9px;padding:8px 13px 8px 8px;border:1px solid #d5a575;border-radius:99px;background:#101d19f5;color:#ffe4cd;box-shadow:0 8px 25px #000a;font-weight:800}
      .gf-grace-launch img{width:36px;height:36px;border-radius:50%;object-fit:cover;border:1px solid #f3a683}
      .gf-grace-sheet{position:absolute;z-index:1800;top:auto;right:9px;bottom:calc(env(safe-area-inset-bottom,0px) + 90px);left:9px;height:min(42dvh,390px);max-width:480px;margin-left:auto;border:1px solid #b99a62;border-radius:18px;overflow:hidden;background:#10221b;box-shadow:0 15px 55px #000e;display:flex;flex-direction:column}
      .gf-grace-sheet-head{background:#10221b;color:#fff0df;display:flex;align-items:center;justify-content:space-between;padding:9px 13px;font-weight:800}
      .gf-grace-sheet iframe{border:0;width:100%;flex:1;min-height:0;background:#10221b}
      .gf-panel{background:linear-gradient(145deg,#081511f6,#11221bee);border:1px solid #ad9060;box-shadow:0 8px 22px #000a}
      .gf-header{position:absolute;z-index:1200;top:calc(env(safe-area-inset-top,0px) + 9px);left:9px;right:9px;height:63px;display:flex;align-items:center;justify-content:space-between;gap:8px;padding:6px 9px;border-radius:15px;pointer-events:auto}
      .gf-brand{display:flex;gap:8px;align-items:center;min-width:0}
      .gf-brand svg{color:#edc887;flex-shrink:0}
      .gf-brand-logo{width:49px;height:49px;object-fit:cover;border-radius:11px;border:1px solid #a88a52;flex-shrink:0}
      .gf-brand-title{font-family:Georgia,'Times New Roman',serif;font-size:clamp(18px,5.5vw,28px);letter-spacing:1.7px;color:#f2d7a2;line-height:1}
      .gf-brand-sub{font-size:clamp(7px,1.9vw,10px);letter-spacing:1.05px;white-space:nowrap;color:#e4e2d3;margin-top:6px}
      .gf-icon-button{display:grid;place-items:center;width:43px;height:43px;min-width:43px;background:linear-gradient(150deg,#162920,#08130e);border:1px solid #a68a5e;border-radius:11px;color:#e9cca0}
      .gf-sidebar{position:absolute;z-index:1150;left:12px;top:calc(env(safe-area-inset-top,0px) + 84px);width:96px;display:grid;gap:7px;pointer-events:none}
      .gf-card{border-radius:13px;padding:9px;background:#061510e8;border:1px solid #a78a58;text-align:center;box-shadow:0 5px 12px #0008}
      .gf-card-label{font-size:9px;letter-spacing:1.3px;color:#e3ca91}
      .gf-card-number{font-size:21px;font-weight:800;color:#f9ebcf;letter-spacing:-.5px}
      .gf-card-unit{font-size:10px;color:#d0dbcb}
      .gf-compass-disc{width:68px;height:68px;margin:7px auto 3px;border:1px solid #c9a975;border-radius:50%;position:relative;background:radial-gradient(circle at 35% 30%,#31483a,#0b1511);box-shadow:inset 0 0 11px #000b}
      .gf-compass-disc:before{content:'N';position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:10px;font-weight:900;color:#f1c782}
      .gf-compass-needle{position:absolute;left:50%;top:50%;width:13px;height:52px;transform:translate(-50%,-50%);clip-path:polygon(50% 0%,100% 50%,50% 100%,0 50%);background:linear-gradient(90deg,#dfb46d 0 49%,#edf2e3 50%);filter:drop-shadow(0 1px 2px #000)}
      .gf-compass-dot{width:9px;height:9px;position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);background:#fff2d9;border:2px solid #7f623d;border-radius:50%}
      .gf-quicktools{position:absolute;z-index:1190;right:11px;top:calc(env(safe-area-inset-top,0px) + 86px);display:grid;gap:7px}
      .gf-quicktools .gf-icon-button{height:42px;width:42px;min-width:42px;border-radius:11px}
      .gf-bottom{position:absolute;z-index:1250;bottom:calc(env(safe-area-inset-bottom,0px) + 18px);left:9px;right:9px;max-width:660px;margin:auto;display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;pointer-events:auto}
      .gf-action{min-width:0;min-height:59px;border:1px solid #d0ae75;border-radius:12px;color:#f7efda;font-weight:850!important;font-size:clamp(10px,2.5vw,13px)!important;letter-spacing:.25px;display:flex;align-items:center;justify-content:center;gap:6px;background:linear-gradient(150deg,#1c3025ef,#0b1811f6);box-shadow:0 5px 15px #000b}
      .gf-action svg{width:22px;min-width:17px;max-width:22px}
      .gf-action.primary{background:linear-gradient(155deg,#286a40,#15472e);border-color:#9bcb87}
      .gf-action.stop{background:linear-gradient(155deg,#692922,#361614);border-color:#e59a86}
      .gf-menu{position:absolute;z-index:1550;right:10px;left:10px;top:calc(env(safe-area-inset-top,0px) + 80px);max-width:460px;margin-left:auto;border-radius:17px;padding:15px;max-height:calc(100dvh - 180px);overflow-y:auto}
      .gf-menu-title{display:flex;justify-content:space-between;align-items:center;gap:8px;margin-bottom:11px;color:#edcb8e;letter-spacing:1.3px;font-weight:900}
      .gf-menu-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px}
      .gf-menu-choice{background:#1b3127;border:1px solid #977e55;color:#f0e5d3;border-radius:11px;min-height:56px;display:flex;align-items:center;justify-content:center;gap:7px;font-weight:750;font-size:12px}
      .gf-footer-note{font-size:10px;color:#d1dbc6;opacity:.88;margin-top:10px}
      @media(min-width:780px){.gf-header{left:15px;right:15px;height:73px;padding:8px 16px}.gf-sidebar{left:18px;top:100px;width:117px}.gf-compass-disc{height:85px;width:85px}.gf-quicktools{right:17px;top:101px}.gf-bottom{bottom:26px}.gf-action{min-height:65px}}
      @media(max-width:350px){.gf-brand svg{width:37px}.gf-brand-title{font-size:18px}.gf-brand-sub{font-size:7px;letter-spacing:.4px}.gf-header{height:58px}.gf-sidebar{width:83px}.gf-card-number{font-size:18px}.gf-compass-disc{width:58px;height:58px}.gf-action{gap:3px}.gf-action svg{width:18px}}
    `}</style>
    <div style={{position:"absolute",inset:0}}><FieldMap mode={mode}/><FieldMission/><FieldWaypointLibrary/><FieldWaypointNavigator/></div>
    <header className="gf-header gf-panel">
      <div className="gf-brand"><img className="gf-brand-logo" src="/grace-field-logo.webp" alt="Grace Field" width={49} height={49}/><div><div className="gf-brand-title">GRACE FIELD</div><div className="gf-brand-sub">EXPLORE · MARK · TRACK · GET BACK</div></div></div>
      <button className="gf-icon-button" aria-label="Open Grace Field menu" onClick={()=>setMenuOpen(v=>!v)}><Icon name={menuOpen?"x":"menu"} size={25}/></button>
    </header>
    <aside className="gf-sidebar" aria-label="Navigation instruments">
      <div className="gf-card"><div className="gf-card-label">COMPASS</div><div className="gf-compass-disc"><div className="gf-compass-needle" style={{transform:`translate(-50%,-50%) rotate(${-(heading??0)}deg)`}}/><div className="gf-compass-dot"/></div><div className="gf-card-number">{heading===null?"—":`${Math.round(heading)}°`}</div><div className="gf-card-unit">{cardinal}</div></div>
      <div className="gf-card"><Icon name="mountain" size={29}/><div className="gf-card-number" style={{fontSize:17}}>{gps.altitude===null?"—":Math.round(gps.altitude*3.28084).toLocaleString()}</div><div className="gf-card-unit">ELEVATION FT</div></div>
      <div className="gf-card"><Icon name="locate" size={24}/><div className="gf-card-number" style={{fontSize:17}}>{gps.accuracy===null?"—":`±${Math.round(gps.accuracy*3.28084)}`}</div><div className="gf-card-unit">GPS ACCURACY FT</div></div>
    </aside>
    <div className="gf-quicktools" aria-label="Map controls">
      <button className="gf-icon-button" aria-label="Map layers" onClick={()=>send("grace-field-open-layers")}><Icon name="layers"/></button>
      <button className="gf-icon-button" aria-label="Saved spots and search" onClick={()=>send("grace-field-open-waypoint-library")}><Icon name="search"/></button>
      <button className="gf-icon-button" aria-label="Compass and navigation" onClick={()=>setMenuOpen(v=>!v)}><Icon name="compass"/></button>
      <button className="gf-icon-button" aria-label="Locate me using fresh GPS" onClick={()=>send("grace-field-v2-locate")}><Icon name="locate"/></button>
    </div>
    {!graceOpen && !mapOverlayOpen && <button type="button" className="gf-grace-launch" onClick={()=>{setMenuOpen(false);setGraceOpen(true);}} aria-label="Talk with Grace while keeping the map open"><img src="/grace-avatar.png" alt=""/><span>Talk to Grace</span></button>}
    {graceOpen && <section className="gf-grace-sheet" aria-label="Grace companion chat">
      <div className="gf-grace-sheet-head"><span>Grace · Your companion</span><button type="button" onClick={()=>setGraceOpen(false)} aria-label="Close Grace chat and return to map" style={{color:"white",background:"transparent",border:0,padding:"7px 10px"}}>✕ Back to map</button></div>
      <iframe ref={graceFrameRef} title="Grace conversation" src="/chat?field=1" allow="microphone; camera" onLoad={sendFieldContext} />
    </section>}
    <nav className="gf-bottom" aria-label="Main field actions">
      <button className={`gf-action ${tracking?"stop":"primary"}`} onClick={()=>send(tracking?"grace-field-v2-stop-track":"grace-field-v2-start-track")}><Icon name="track"/><span>{tracking?"STOP TRACK":"START TRACK"}</span></button>
      <button className="gf-action" onClick={()=>send("grace-field-v2-save-spot")}><Icon name="save"/><span>SAVE LOCATION</span></button>
      <button className="gf-action" onClick={()=>send("grace-field-open-mission")}><Icon name="shield"/><span>GUARDIAN ANGEL</span></button>
    </nav>
    {menuOpen&&<div className="gf-menu gf-panel" role="dialog" aria-label="Field tools">
      <div className="gf-menu-title"><span>FIELD OPERATIONS</span><button className="gf-icon-button" aria-label="Close field menu" onClick={()=>setMenuOpen(false)}><Icon name="x"/></button></div>
      <div className="gf-menu-grid">
        <button className="gf-menu-choice" onClick={()=>doMenuAction("grace-field-open-waypoint-library")}><Icon name="pin"/> SAVED SPOTS</button>
        <button className="gf-menu-choice" onClick={()=>doMenuAction("grace-field-v2-trail-back")}><Icon name="back"/> FOLLOW TRAIL BACK</button>
        <button className="gf-menu-choice" onClick={()=>doMenuAction("grace-field-open-layers")}><Icon name="layers"/> MAP TYPES</button>
        <button className="gf-menu-choice" onClick={()=>doMenuAction("grace-field-v2-locate")}><Icon name="locate"/> MY LOCATION</button>
        <button className="gf-menu-choice" onClick={()=>doMenuAction("grace-field-open-tools")}><Icon name="weather"/> OUTDOOR TOOLS</button>
        <button className="gf-menu-choice" onClick={()=>doMenuAction("grace-field-open-mission")}><Icon name="shield"/> GUARDIAN ANGEL</button>
        <button className="gf-menu-choice" style={{gridColumn:"1 / -1"}} onClick={()=>{if(window.history.length>1)window.history.back();else window.location.assign("/");}}><Icon name="back"/> BACK TO GRACE</button>
      </div>
      <div className="gf-footer-note">{gps.status} · GPS and compass accuracy depend on your device and conditions.</div>
    </div>}
  </main>;
}
