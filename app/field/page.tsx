"use client";
import {useEffect,useState} from "react";
import dynamic from "next/dynamic";
import FieldMission from "@/components/field/FieldMission";
import FieldWaypointLibrary from "@/components/field/FieldWaypointLibrary";
import FieldWaypointNavigator from "@/components/field/FieldWaypointNavigator";
import type {FieldMode} from "@/components/field/FieldMap";
const FieldMap=dynamic(()=>import("@/components/field/FieldMap"),{ssr:false,loading:()=> <div style={{height:"100%",background:"#101b16",color:"#e8d4a2",display:"grid",placeItems:"center"}}>Acquiring GPS…</div>});
const send=(name:string)=>window.dispatchEvent(new Event(name));
export default function GraceField(){
 const [heading,setHeading]=useState<number|null>(null);
 const [tracking,setTracking]=useState(false);
 const [more,setMore]=useState(false);
 const [mode]=useState<FieldMode>("hunt");
 useEffect(()=>{
  function orientation(event:DeviceOrientationEvent){const e=event as DeviceOrientationEvent & {webkitCompassHeading?:number};if(typeof e.webkitCompassHeading==="number")setHeading((e.webkitCompassHeading+360)%360);else if(typeof event.alpha==="number"&&event.absolute)setHeading((360-event.alpha)%360);}
  const track=(e:Event)=>setTracking(Boolean((e as CustomEvent<{tracking:boolean}>).detail?.tracking));
  window.addEventListener("deviceorientationabsolute",orientation);window.addEventListener("deviceorientation",orientation);window.addEventListener("grace-field-tracking-state",track);
  return ()=>{window.removeEventListener("deviceorientationabsolute",orientation);window.removeEventListener("deviceorientation",orientation);window.removeEventListener("grace-field-tracking-state",track);};
 },[]);
 const cardinal=heading===null?"—":["N","NE","E","SE","S","SW","W","NW"][Math.round(heading/45)%8];
 const btn:React.CSSProperties={border:"1px solid #b89b64",background:"linear-gradient(160deg,#17281e,#0c1511)",color:"#f6edda",borderRadius:13,fontSize:12,fontWeight:800,minHeight:47,padding:"8px 10px",boxShadow:"0 4px 14px #0008",cursor:"pointer"};
 return <main className="grace-field-v2" style={{position:"fixed",inset:0,overflow:"hidden",background:"#0b1510",color:"#f6f1e5",fontFamily:"Arial,sans-serif"}}>
  <style>{`
  .grace-field-v2 .leaflet-control-zoom{top:100px;left:2px;border:0;box-shadow:0 3px 12px #0009}
  .grace-field-v2 .leaflet-control-zoom a{background:#101d17;color:#d5b67d;border:1px solid #9b8051}
  .grace-field-v2 .leaflet-control-attribution{font-size:9px;background:#0b1510bb;color:#ccc;max-width:100%;overflow:hidden;white-space:nowrap}
  .grace-field-v2 .leaflet-control-attribution a{color:#e5d2a7}
  .grace-field-v2 button:focus-visible{outline:2px solid #e3bd73;outline-offset:2px}
  .grace-field-v2 .leaflet-popup-content-wrapper{background:#101d17;color:#f4ebd7;border:1px solid #c5a76e;border-radius:14}
  .grace-field-v2 .leaflet-popup-tip{background:#101d17}
  .grace-field-v2 .leaflet-popup-content button{background:#263b2c;color:#f9f0dc;border:1px solid #ba9a5c;border-radius:8px;padding:7px 10px;cursor:pointer}
  `}</style>
  <div style={{position:"absolute",inset:0}}><FieldMap mode={mode}/><FieldMission/><FieldWaypointLibrary/><FieldWaypointNavigator/></div>
  <header style={{position:"fixed",zIndex:1200,top:"calc(env(safe-area-inset-top, 0px) + 9px)",left:13,right:13,display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,pointerEvents:"none"}}>
   <div style={{padding:"8px 11px",background:"linear-gradient(120deg,#0d1b15ee,#17281edc)",border:"1px solid #9c8155",borderRadius:13,boxShadow:"0 4px 18px #0008",minWidth:0}}><div style={{color:"#d8bc82",fontSize:13,fontWeight:900,letterSpacing:2}}>GRACE FIELD</div><div style={{color:"#b5c5b5",fontSize:9,letterSpacing:1.2,marginTop:3}}>EXPLORE · MARK · TRACK · GET BACK</div></div>
   <div style={{display:"flex",gap:7,pointerEvents:"auto"}}><button type="button" aria-label="Recenter GPS" onClick={()=>send("grace-field-v2-locate")} style={{...btn,minHeight:43,padding:"8px 11px"}}>⌖ GPS</button><button type="button" aria-label="Change map layer" onClick={()=>send("grace-field-open-layers")} style={{...btn,minHeight:43,padding:"8px 11px"}}>▱ MAP</button></div>
  </header>
  <div style={{position:"fixed",zIndex:1190,top:"calc(env(safe-area-inset-top, 0px) + 116px)",right:12,width:83,padding:"8px 5px",borderRadius:17,border:"1px solid #a58b60",background:"#0b1712ed",boxShadow:"0 4px 18px #0009",textAlign:"center",pointerEvents:"none"}}>
   <div style={{fontSize:8,letterSpacing:2,color:"#c7b58c"}}>COMPASS</div>
   <div style={{position:"relative",height:60,width:60,margin:"6px auto 2px",borderRadius:"50%",border:"2px solid #c8ad76",background:"radial-gradient(circle,#2a3d2e,#101912)"}}>
    <span style={{position:"absolute",top:-9,left:"50%",transform:"translateX(-50%)",color:"#e4bd76",fontSize:13}}>▼</span>
    <div style={{position:"absolute",inset:0,transform:`rotate(${-(heading??0)}deg)`,transition:"transform .15s linear"}}>{(["N","E","S","W"] as const).map((dir,i)=><span key={dir} style={{position:"absolute",fontSize:10,fontWeight:900,color:dir==="N"?"#edc37e":"#dce6d9",...(i===0?{top:6,left:"50%",transform:"translateX(-50%)"}:i===1?{right:5,top:"50%",transform:"translateY(-50%)"}:i===2?{bottom:5,left:"50%",transform:"translateX(-50%)"}:{left:5,top:"50%",transform:"translateY(-50%)"})}}>{dir}</span>)}</div>
    <div style={{position:"absolute",inset:24,background:"#d6b77d",borderRadius:"50%"}}/>
   </div>
   <div style={{color:"#e2c186",fontSize:17,fontWeight:900}}>{heading===null?"—":`${Math.round(heading)}°`}</div><div style={{fontSize:9,color:"#c5d0bf"}}>{heading===null?"NO SENSOR":cardinal}</div>
  </div>
  <nav aria-label="Grace Field actions" style={{position:"fixed",zIndex:1250,bottom:"calc(env(safe-area-inset-bottom, 0px) + 12px)",left:11,right:11,maxWidth:600,margin:"auto",pointerEvents:"auto"}}>
   <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:7}}>
    <button type="button" style={{...btn,background:tracking?"linear-gradient(145deg,#78322b,#3d1717)":"linear-gradient(145deg,#2b7546,#19432c)",borderColor:tracking?"#df9588":"#91bc85"}} onClick={()=>send(tracking?"grace-field-v2-stop-track":"grace-field-v2-start-track")}>{tracking?"■ STOP TRACK":"◉ START TRACK"}</button>
    <button type="button" style={btn} onClick={()=>send("grace-field-v2-save-spot")}>⌖ SAVE SPOT</button>
    <button type="button" style={btn} onClick={()=>send("grace-field-open-mission")}>♢ GUARDIAN</button>
   </div>
   <div style={{display:"flex",gap:7,marginTop:7}}>
    <button type="button" style={{...btn,flex:1,minHeight:39,fontSize:11,background:"#0e1d17f0"}} onClick={()=>send("grace-field-open-waypoint-library")}>⌖ SAVED SPOTS / NAVIGATE</button>
    <button type="button" style={{...btn,minWidth:72,minHeight:39,fontSize:11}} onClick={()=>setMore(v=>!v)}>••• MORE</button>
   </div>
  </nav>
  {more&&<div role="dialog" aria-label="Field options" style={{position:"fixed",zIndex:1350,bottom:"calc(env(safe-area-inset-bottom, 0px) + 113px)",left:12,right:12,maxWidth:580,margin:"auto",background:"#101e17f7",border:"1px solid #bba06b",borderRadius:18,padding:14,boxShadow:"0 8px 28px #000a"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}><strong style={{color:"#e2c387",fontSize:14}}>FIELD OPTIONS</strong><button type="button" style={{...btn,minHeight:34}} onClick={()=>setMore(false)}>Close</button></div>
   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9}}>
    <button type="button" style={btn} onClick={()=>{setMore(false);send("grace-field-v2-trail-back")}}>FOLLOW TRAIL BACK</button>
    <button type="button" style={btn} onClick={()=>{setMore(false);send("grace-field-v2-locate")}}>MY LOCATION</button>
    <button type="button" style={btn} onClick={()=>{setMore(false);send("grace-field-open-layers")}}>MAP LAYERS</button>
    <button type="button" style={btn} onClick={()=>{setMore(false);send("grace-field-open-waypoint-library")}}>SAVED SPOTS</button>
   </div>
  </div>}
 </main>;
}
