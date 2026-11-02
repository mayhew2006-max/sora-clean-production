"use client";

import {useEffect, useMemo, useState} from "react";

type Site = {id:string;name:string;lat:number;lng:number;mode?:string;type?:string};
type JournalEntry = {date:string;text:string};
const WIND_DIRECTIONS = ["N","NE","E","SE","S","SW","W","NW"] as const;
const headingFor=(v:string)=>WIND_DIRECTIONS.indexOf(v as typeof WIND_DIRECTIONS[number])*45;
const angleDifference=(a:number,b:number)=>Math.abs(((a-b+540)%360)-180);
function windAtStand(from:number,speed:number,deerApproach:string){
  if(!deerApproach)return {adjustment:0,note:"Wind comparison unavailable: choose expected deer approach direction"};
  if(speed<2)return {adjustment:0,note:"Calm/variable winds: scent movement is hard to estimate"};
  const downwind=(from+180)%360;
  const separation=angleDifference(downwind,headingFor(deerApproach));
  if(separation<=55)return {adjustment:-2,note:`Scent may drift toward deer approaching from ${deerApproach}`};
  if(separation>=135)return {adjustment:1,note:`Wind may carry scent away from deer approaching from ${deerApproach}`};
  return {adjustment:0,note:`Crosswind relative to expected ${deerApproach} approach`};
}
function readStandNotes(id:string):JournalEntry[]{
  if(!id||id==="gps")return [];
  try{const v=JSON.parse(localStorage.getItem("grace-field-journal-v1-"+id)||"[]");
    return Array.isArray(v)?v.filter((x:unknown)=>x&&typeof x==="object"&&typeof (x as JournalEntry).text==="string"&&typeof (x as JournalEntry).date==="string").slice(0,5):[];
  }catch{return [];}
}
type ForecastHour = {
  time:string; temperature:number; wind:number; windFrom:number; rain:number;
  cloud:number; pressure:number; pressureChange:number|null; temperatureChange:number|null;
  index:number; reasons:string[];
};
type Forecast = {hours:ForecastHour[];timezone:string;sunrise:string[];sunset:string[];updatedAt:number};
const numberAt=(a:unknown,i:number):number|null=>Array.isArray(a)&&a[i]!==null&&Number.isFinite(Number(a[i]))?Number(a[i]):null;
const minutes=(stamp:string)=>{const m=stamp.match(/T(\d{2}):(\d{2})/);return m?Number(m[1])*60+Number(m[2]):null;};
const wrapDistance=(a:number,b:number)=>Math.min(Math.abs(a-b),1440-Math.abs(a-b));
const compass=(degrees:number)=>["N","NE","E","SE","S","SW","W","NW"][Math.round((degrees%360)/45)%8];
function formatHour(value:string){
  const [day,clock]=value.split("T");if(!day||!clock)return value;
  const date=new Date(day+"T12:00:00");const hour=Number(clock.slice(0,2));
  const dayName=date.toLocaleDateString(undefined,{weekday:"short",month:"short",day:"numeric"});
  return dayName+" · "+((hour+11)%12+1)+(hour>=12?" PM":" AM");
}
function conditionsIndex(opts:{time:string; sunrise:string;sunset:string;temp:number;wind:number;rain:number;cloud:number;pressureChange:number|null;temperatureChange:number|null}){
  // Heuristic weather-window comparison, NOT an empirical deer movement forecast.
  let points=2.0;const reasons:string[]=[];
  const current=minutes(opts.time),dawn=minutes(opts.sunrise),dusk=minutes(opts.sunset);
  if(current!==null&&dawn!==null&&wrapDistance(current,dawn)<=90){points+=3.0;reasons.push("Near local sunrise");}
  else if(current!==null&&dusk!==null&&wrapDistance(current,dusk)<=90){points+=3.0;reasons.push("Near local sunset");}
  if(opts.temp>=25&&opts.temp<=55){points+=1.0;reasons.push("Cool conditions");}
  if(opts.wind>=3&&opts.wind<=12){points+=1.0;reasons.push("Moderate wind");}
  else if(opts.wind>20){points-=1.5;reasons.push("Strong wind");}
  if(opts.rain>0.15){points-=1.5;reasons.push("Rain likely");}
  if(opts.cloud>=50){points+=0.5;reasons.push("Cloud cover");}
  if(opts.pressureChange!==null&&opts.pressureChange>1.5){points+=0.5;reasons.push("Pressure rising over 3 hours");}
  if(opts.temperatureChange!==null&&opts.temperatureChange<=-6){points+=0.5;reasons.push("Temperature dropping");}
  return {index:Math.min(9,Math.max(1,Math.round(points*10)/10)),reasons};
}
function readSites():Site[]{
  try{
    const raw=JSON.parse(localStorage.getItem("graceFieldSpots")||"[]");
    if(!Array.isArray(raw))return [];
    const seen=new Set<string>();
    return raw.filter((spot:unknown)=>{
      if(!spot||typeof spot!=="object")return false;
      const p=spot as Record<string,unknown>;
      const id=String(p.id||"");
      const lat=Number(p.lat),lng=Number(p.lng);
      if(!id||seen.has(id)||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return false;
      seen.add(id);return true;
    }).slice(0,150).map((p:Record<string,unknown>)=>({id:String(p.id),name:String(p.name||"Saved spot").slice(0,80),lat:Number(p.lat),lng:Number(p.lng),mode:String(p.mode||""),type:String(p.type||"")})).sort((a:Site,b:Site)=>Number(/stand|blind/i.test(b.type))-Number(/stand|blind/i.test(a.type))||a.name.localeCompare(b.name));
  }catch{return [];}
}
const selectStyle:React.CSSProperties={width:"100%",padding:11,borderRadius:10,background:"#152d23",color:"#fff0d8",border:"1px solid #876f4e",fontSize:14};
export default function FieldDeerForecast({open,onClose,position,focusedSpot}:{open:boolean;onClose:()=>void;position:[number,number]|null;focusedSpot?:Site|null}){
  const [sites,setSites]=useState<Site[]>([]);
  const [selected,setSelected]=useState("gps");
  const [forecast,setForecast]=useState<Forecast|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [timeline,setTimeline]=useState(false);
  const [approach,setApproach]=useState("");
  const [standNotes,setStandNotes]=useState<JournalEntry[]>([]);
  useEffect(()=>{
    if(!open)return;
    const saved=readSites();
    const all=focusedSpot&&!saved.some(s=>s.id===focusedSpot.id)?[focusedSpot,...saved]:saved;
    setSites(all);
    setSelected(focusedSpot?.id||saved.find(s=>/stand|blind/i.test(s.type)||s.mode==="hunt")?.id||"gps");
    setTimeline(false);
  },[open,focusedSpot?.id,focusedSpot?.lat,focusedSpot?.lng]);
  const site=selected==="gps"?(position?{id:"gps",name:"Current GPS position",lat:position[0],lng:position[1]}:null):sites.find(p=>p.id===selected)||null;
  const coordKey=site?site.lat.toFixed(3)+","+site.lng.toFixed(3):"none";
  useEffect(()=>{
    if(!open)return;
    setStandNotes(readStandNotes(site?.id||""));
    try{
      const v=site&&site.id!=="gps"?localStorage.getItem("grace-field-stand-approach-v1-"+site.id)||"":"";
      setApproach(WIND_DIRECTIONS.includes(v as typeof WIND_DIRECTIONS[number])?v:"");
    }catch{setApproach("");}
  },[open,site?.id]);
  function saveApproach(value:string){
    setApproach(value);
    if(!site||site.id==="gps")return;
    try{if(value)localStorage.setItem("grace-field-stand-approach-v1-"+site.id,value);
      else localStorage.removeItem("grace-field-stand-approach-v1-"+site.id);
    }catch{setError("Could not save stand preference on this device.");}
  }
  useEffect(()=>{
    if(!open)return;
    if(!site){setForecast(null);setError("Choose a saved spot or enable GPS to load conditions.");return;}
    const controller=new AbortController();
    const lat=site.lat,lng=site.lng;
    async function load(){
      setBusy(true);setError("");setForecast(null);
      try{
        const query=new URLSearchParams({
          latitude:String(lat),longitude:String(lng),
          hourly:"temperature_2m,wind_speed_10m,wind_direction_10m,precipitation,cloud_cover,pressure_msl",
          daily:"sunrise,sunset",temperature_unit:"fahrenheit",wind_speed_unit:"mph",
          precipitation_unit:"inch",timezone:"auto",forecast_days:"3"
        });
        const response=await fetch("https://api.open-meteo.com/v1/forecast?"+query,{signal:controller.signal});
        if(!response.ok)throw new Error("Weather provider returned HTTP "+response.status);
        const data=await response.json();
        const h=data.hourly||{};
        const dayLabels:Array<string>=Array.isArray(data.daily?.time)?data.daily.time:[];
        const sunrise:Array<string>=Array.isArray(data.daily?.sunrise)?data.daily.sunrise:[];
        const sunset:Array<string>=Array.isArray(data.daily?.sunset)?data.daily.sunset:[];
        const results:ForecastHour[]=[];
        // Open-Meteo timestamps are local to the REQUESTED location (timezone:auto).
        // Compare string hours in that SAME timezone, not the phone's timezone.
        const now=new Date(Date.now()+Number(data.utc_offset_seconds||0)*1000).toISOString().slice(0,16);
        const times:Array<string>=Array.isArray(h.time)?h.time:[];
        for(let i=0;i<times.length;i++){
          const time=String(times[i]);if(time<now.slice(0,13)+":00")continue;
          if(results.length>=48)break;
          const temperature=numberAt(h.temperature_2m,i),wind=numberAt(h.wind_speed_10m,i);
          const windFrom=numberAt(h.wind_direction_10m,i),rain=numberAt(h.precipitation,i);
          const cloud=numberAt(h.cloud_cover,i),pressure=numberAt(h.pressure_msl,i);
          if(temperature===null||wind===null||windFrom===null||rain===null||cloud===null||pressure===null)continue;
          const day=dayLabels.indexOf(time.slice(0,10));
          const p3=numberAt(h.pressure_msl,i-3),t3=numberAt(h.temperature_2m,i-3);
          const pressureChange=p3===null?null:pressure-p3,temperatureChange=t3===null?null:temperature-t3;
          const calc=conditionsIndex({time,sunrise:sunrise[day]||"",sunset:sunset[day]||"",temp:temperature,wind,rain,cloud,pressureChange,temperatureChange});
          results.push({time,temperature,wind,windFrom,rain,cloud,pressure,pressureChange,temperatureChange,index:calc.index,reasons:calc.reasons});
        }
        if(!results.length)throw new Error("Forecast missing required hourly readings.");
        if(!controller.signal.aborted)setForecast({hours:results,timezone:String(data.timezone_abbreviation||data.timezone||"local"),sunrise,sunset,updatedAt:Date.now()});
      }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Weather service unavailable.");}
      finally{if(!controller.signal.aborted)setBusy(false);}
    }
    void load();return()=>controller.abort();
    // coordKey intentionally rounds location to prevent a fresh API request for every GPS jitter.
  },[open,selected,coordKey]);
  const ranked=useMemo(()=>{
    if(!forecast)return [];
    return forecast.hours.map(h=>{
      const wind=windAtStand(h.windFrom,h.wind,approach);
      return {...h,windNote:wind.note,standIndex:Math.max(1,Math.min(9,Math.round((h.index+wind.adjustment)*10)/10))};
    });
  },[forecast,approach]);
  const shown=useMemo(()=>timeline?ranked.slice(0,24):[...ranked].sort((a,b)=>b.standIndex-a.standIndex||a.time.localeCompare(b.time)).slice(0,7),[ranked,timeline]);
  if(!open)return null;
  return <section role="dialog" aria-label="Deer conditions outlook" style={{position:"absolute",zIndex:3500,top:"calc(env(safe-area-inset-top,0px) + 78px)",left:12,right:12,maxWidth:500,maxHeight:"74dvh",margin:"0 auto",overflowY:"auto",borderRadius:17,background:"#0d2119",border:"1px solid #c9a66b",padding:15,color:"#f3e9d8",boxShadow:"0 12px 35px #000b"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><strong style={{color:"#e4c38c",fontSize:19}}>🦌 Deer Conditions Outlook</strong><button type="button" onClick={onClose} style={{background:"#263a2d",border:"1px solid #76664b",color:"#fff",padding:10,borderRadius:9}}>CLOSE</button></div>
    <p style={{fontSize:12,lineHeight:1.5,color:"#dfc9a6"}}>Stand-specific weather outlook (1–9 relative conditions index), NOT the chance of seeing deer. No live animal tracking; rut, terrain, thermals and hunting pressure are not modeled. Wind comparisons use only the approach direction YOU enter.</p>
    <label style={{display:"block",fontSize:12,color:"#dac18d",marginBottom:6}}>LOCATION TO ANALYZE</label>
    <select style={selectStyle} value={selected} onChange={e=>setSelected(e.target.value)}>
      <option value="gps">Current GPS position</option>
      {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
    {site&&<div style={{padding:"9px 10px",background:"#172f24",border:"1px solid #637550",borderRadius:10,margin:"9px 0"}}>
      <strong style={{color:"#e6d2a0"}}>{site.id==="gps"?"Current GPS location":site.name}</strong>
      <div style={{fontSize:12,color:"#d2dfc9",marginTop:3}}>Forecast centered on {site.lat.toFixed(6)}, {site.lng.toFixed(6)} — NOT your phone unless GPS selected.</div>
    </div>}
    {site&&site.id!=="gps"&&<div style={{margin:"10px 0",padding:11,border:"1px solid #836c4d",borderRadius:10,background:"#152b20"}}>
      <label htmlFor="grace-stand-deer-direction" style={{display:"block",fontSize:12,color:"#e4c58f",marginBottom:7}}>EXPECTED DEER APPROACH (optional)</label>
      <select id="grace-stand-deer-direction" value={approach} onChange={e=>saveApproach(e.target.value)} style={selectStyle}>
        <option value="">Unknown — don't rate wind against deer approach</option>
        {WIND_DIRECTIONS.map(d=><option key={d} value={d}>Deer generally approach from {d}</option>)}
      </select>
      <div style={{fontSize:11,color:"#c0cdbb",marginTop:6}}>Saved only for this stand on this device. Direction means where you expect deer to be relative to the stand, NOT your entry route. Air currents, terrain and thermals may change scent flow.</div>
    </div>}
    {busy&&<p>Checking local weather, pressure and daylight…</p>}
    {error&&<p role="alert" style={{color:"#ffc5a1"}}>{error}</p>}
    {forecast&&<div>
      <div style={{display:"flex",gap:7,margin:"10px 0",flexWrap:"wrap"}}><button type="button" onClick={()=>setTimeline(false)} style={{padding:"8px 10px",borderRadius:8,border:"1px solid #ac9668",background:timeline?"#183326":"#5e4c2c",color:"#fff0d5"}}>Best 7 hours for this spot</button><button type="button" onClick={()=>setTimeline(true)} style={{padding:"8px 10px",borderRadius:8,border:"1px solid #ac9668",background:timeline?"#5e4c2c":"#183326",color:"#fff0d5"}}>Next 24 hours</button></div>
      <div style={{fontSize:11,color:"#b8bcae"}}>Times at selected location · {forecast.timezone} · Updated {new Date(forecast.updatedAt).toLocaleTimeString()}</div>
      {shown.map(h=><div key={h.time} style={{padding:"11px 0",borderBottom:"1px solid #526047"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:9}}><strong>{formatHour(h.time)}</strong><strong style={{color:"#e5c58c"}}>{h.standIndex.toFixed(1)}/9 · {h.standIndex>=7?"Favorable":h.standIndex>=5?"Mixed":"Challenging"}</strong></div>
        <div style={{fontSize:12,marginTop:4}}>🌡 {Math.round(h.temperature)}°F · Wind {compass(h.windFrom)} {Math.round(h.wind)} mph · Rain {h.rain.toFixed(2)} in</div>
        <div style={{fontSize:12,marginTop:3}}>☁ {Math.round(h.cloud)}% cloud · Pressure {h.pressure.toFixed(1)} hPa {h.pressureChange===null?"":(h.pressureChange>=0?"+":"")+h.pressureChange.toFixed(1)+" / 3h"}</div>
        <div style={{fontSize:11,color:"#c4cbb8",marginTop:4}}>{h.reasons.length?h.reasons.join(" · "):"No favorable factors in this simple model"}</div>
        {approach&&<div style={{fontSize:11,color:h.windNote.includes("toward")?"#ffbc90":"#b9dcb3",marginTop:4}}>🌬 {h.windNote}. Wind blows toward {compass((h.windFrom+180)%360)}.</div>}
      </div>)}
      <p style={{fontSize:11,color:"#c6b38f",lineHeight:1.5}}>Relative conditions only. Weather index: dawn/dusk, temperature, wind, rain, cloud and 3-hour trends. When a deer approach is configured, wind alignment changes ranking by +1 (away), −2 (toward), or 0 (crosswind/unclear). These are exploratory planning weights, not validated deer predictions. Ground-level scent can differ markedly from the forecast.</p>
      {site&&site.id!=="gps"&&<div style={{borderTop:"1px solid #50604e",paddingTop:10,marginTop:10}}>
        <strong style={{color:"#e0c48f"}}>Your recent notes at {site.name}</strong>
        {standNotes.length?standNotes.map((entry,i)=><div key={entry.date+i} style={{marginTop:8,fontSize:12}}>
          <span style={{color:"#bbac8d"}}>{new Date(entry.date).toLocaleString()} · </span>{entry.text}
        </div>):<p style={{fontSize:12,color:"#bdc4b4"}}>No saved observations for this stand yet.</p>}
        <p style={{fontSize:11,color:"#aebdab"}}>These are your recorded observations; Grace does not infer deer approach or movement from free-text notes.</p>
      </div>}
    </div>}
  </section>;
}
