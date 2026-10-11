"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import FieldMission from "@/components/field/FieldMission";
import FieldWaypointLibrary from "@/components/field/FieldWaypointLibrary";
import FieldWaypointNavigator from "@/components/field/FieldWaypointNavigator";
import type { FieldMode } from "@/components/field/FieldMap";
const FieldMap = dynamic(() => import("@/components/field/FieldMap"), {ssr:false,loading:()=> <div style={{height:"100%",background:"#0C1411",color:"#E9EEE8",display:"grid",placeItems:"center"}}>Locating you...</div>});
const send = (name:string) => window.dispatchEvent(new Event(name));
export default function GraceField(){
 const [heading,setHeading]=useState<number|null>(null);
 const [tracking,setTracking]=useState(false);
 const [more,setMore]=useState(false);
 const [mode,setMode]=useState<FieldMode>("hunt");
 useEffect(()=>{
  function orientation(event:DeviceOrientationEvent){const e=event as DeviceOrientationEvent & {webkitCompassHeading?:number};if(typeof e.webkitCompassHeading==="number")setHeading((e.webkitCompassHeading+360)%360);else if(typeof event.alpha==="number" && event.absolute)setHeading((360-event.alpha)%360);}
  const track=(e:Event)=>setTracking(Boolean((e as CustomEvent<{tracking:boolean}>).detail?.tracking));
  window.addEventListener("deviceorientationabsolute",orientation);window.addEventListener("deviceorientation",orientation);window.addEventListener("grace-field-tracking-state",track);
  return ()=>{window.removeEventListener("deviceorientationabsolute",orientation);window.removeEventListener("deviceorientation",orientation);window.removeEventListener("grace-field-tracking-state",track);};
 },[]);
 const cardinal=heading===null?"—":["N","NE","E","SE","S","SW","W","NW"][Math.round(heading/45)%8];
 const action:React.CSSProperties={background:"rgba(12,22,17,.96)",color:"#F7F0E3",border:"1px solid #A48C5B",borderRadius:14,padding:"13px 8px",fontSize:12,fontWeight:850,cursor:"pointer",boxShadow:"0 4px 18px #0009"};
 return <main style={{position:"fixed",inset:0,overflow:"hidden",background:"#0C1411",color:"#E8EDE7",fontFamily:"Arial,sans-serif"}}>
  <div style={{position:"absolute",inset:0}}><FieldMap mode={mode}/><FieldMission/><FieldWaypointLibrary/><FieldWaypointNavigator/></div>
  <div style={{position:"fixed",zIndex:1200,top:"calc(env(safe-area-inset-top, 0px) + 12px)",left:12,right:12,display:"flex",justifyContent:"space-between",alignItems:"center",pointerEvents:"none"}}>
   <div style={{background:"#101B16E8",border:"1px solid #A48C5B",borderRadius:13,padding:"9px 12px",boxShadow:"0 5px 20px #0008"}}><div style={{fontSize:10,color:"#D9C394",letterSpacing:2}}>GRACE FIELD 2.0</div><strong style={{fontSize:14}}>EXPLORE · MARK · TRACK</strong></div>
   <div style={{display:"flex",gap:7,pointerEvents:"auto"}}><button type="button" aria-label="Center map on my location" onClick={()=>send("grace-field-v2-locate")} style={action}>⌖ GPS</button><button type="button" aria-label="Map layers" onClick={()=>send("grace-field-open-layers")} style={action}>▧ MAP</button></div>
  </div>
      <div style={{
        position: "absolute",
        zIndex: 1190,
        top: "calc(env(safe-area-inset-top, 0px) + 70px)",
        right: 12,
        width: 112,
        padding: "10px 8px",
        borderRadius: 18,
        border: "1px solid rgba(225,234,220,.3)",
        background: "rgba(12,20,16,.94)",
        boxShadow: "0 6px 24px rgba(0,0,0,.45)",
        textAlign: "center",
        pointerEvents: "none"
      }}>
        <div style={{
          fontSize: 9,
          letterSpacing: 2,
          color: "#b6c4b8",
          marginBottom: 7
        }}>
          COMPASS
        </div>

        <div style={{
          position: "relative",
          width: 82,
          height: 82,
          margin: "0 auto",
          borderRadius: "50%",
          border: "2px solid #C8AE79",
          background:
            "radial-gradient(circle, #26372b 0%, #111b15 75%)",
          boxShadow: "inset 0 0 14px rgba(0,0,0,.65)"
        }}>
          <div style={{
            position: "absolute",
            left: "50%",
            top: -7,
            transform: "translateX(-50%)",
            color: "#D9C394",
            fontSize: 17,
            zIndex: 2
          }}>
            ▼
          </div>

          <div style={{
            position: "absolute",
            inset: 0,
            transform: `rotate(${- (heading ?? 0)}deg)`,
            transition: "transform .15s linear"
          }}>
            {(["N", "E", "S", "W"] as const).map(
              (direction, i) => {
                const positions = [
                  { top: 7, left: "50%", transform: "translateX(-50%)" },
                  { right: 7, top: "50%", transform: "translateY(-50%)" },
                  { bottom: 7, left: "50%", transform: "translateX(-50%)" },
                  { left: 7, top: "50%", transform: "translateY(-50%)" }
                ];

                return (
                  <span key={direction} style={{
                    position: "absolute",
                    ...positions[i],
                    color:
                      direction === "N" ? "#e5b76d" : "#E1E9E0",
                    fontWeight: 900,
                    fontSize: 13
                  }}>
                    {direction}
                  </span>
                );
              }
            )}
          </div>

          <div style={{
            position: "absolute",
            inset: 28,
            borderRadius: "50%",
            background: "#C8AE79",
            border: "2px solid #0C1411"
          }} />
        </div>

        <div style={{
          marginTop: 7,
          color: "#D9C394",
          fontSize: 19,
          fontWeight: 900
        }}>
          {heading === null
            ? "—"
            : `${Math.round(heading)}°`}
        </div>

        <div style={{
          fontSize: 10,
          color: "#b4c4b5",
          letterSpacing: 1
        }}>
          {heading === null ? "NO SENSOR" : cardinal}
        </div>
      </div>
    

  <div style={{position:"fixed",bottom:"calc(env(safe-area-inset-bottom, 0px) + 16px)",left:10,right:10,zIndex:1300,maxWidth:580,margin:"auto",display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:8}}>
   <button type="button" onClick={()=>send(tracking?"grace-field-v2-stop-track":"grace-field-v2-start-track")} style={{...action,background:tracking?"#6D2826":"#285A37",borderColor:tracking?"#F5B4A8":"#7EB989"}}>{tracking?"■ STOP TRACK":"◉ START TRACK"}</button>
   <button type="button" onClick={()=>send("grace-field-v2-save-spot")} style={action}>⌖ SAVE SPOT</button>
   <button type="button" onClick={()=>send("grace-field-open-mission")} style={action}>♢ GUARDIAN</button>
   <button type="button" onClick={()=>send("grace-field-open-waypoint-library")} style={{...action,gridColumn:"span 2"}}>⌖ SAVED LOCATIONS / NAVIGATE</button>
   <button type="button" onClick={()=>setMore(v=>!v)} style={action}>⋯ MORE</button>
  </div>
  {more&&<div style={{position:"fixed",zIndex:1400,bottom:"calc(env(safe-area-inset-bottom, 0px) + 140px)",left:12,right:12,maxWidth:580,margin:"auto",background:"#101B16F7",border:"1px solid #B9A071",borderRadius:18,padding:14,boxShadow:"0 10px 30px #000A"}}><strong style={{color:"#D9C394"}}>FIELD OPTIONS</strong><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:12}}>
  <button type="button" style={action} onClick={()=>{setMore(false);send("grace-field-v2-trail-back")}}>FOLLOW TRAIL BACK</button>
  <button type="button" style={action} onClick={()=>{setMore(false);send("grace-field-open-tools")}}>MARKER TYPES & TOOLS</button>
  <button type="button" style={action} onClick={()=>{setMore(false);send("grace-field-open-layers")}}>MAP LAYERS</button>
  <button type="button" style={action} onClick={()=>{setMore(false);send("grace-field-v2-locate")}}>MY LOCATION</button>
  <button type="button" style={action} onClick={()=>{setMode(mode==="hunt"?"fish":"hunt");setMore(false)}}>SPOT CATEGORY: {mode.toUpperCase()}</button>
  <button type="button" style={action} onClick={()=>setMore(false)}>CLOSE</button>
  </div></div>}
 </main>;
}
