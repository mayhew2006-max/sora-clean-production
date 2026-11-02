"use client";

import {useEffect, useMemo, useState} from "react";

type Site = {id:string;name:string;lat:number;lng:number};
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
    }).slice(0,150).map((p:Record<string,unknown>)=>({id:String(p.id),name:String(p.name||"Saved spot").slice(0,80),lat:Number(p.lat),lng:Number(p.lng)}));
  }catch{return [];}
}
const selectStyle:React.CSSProperties={width:"100%",padding:11,borderRadius:10,background:"#152d23",color:"#fff0d8",border:"1px solid #876f4e",fontSize:14};
export default function FieldDeerForecast({open,onClose,position}:{open:boolean;onClose:()=>void;position:[number,number]|null}){
  const [sites,setSites]=useState<Site[]>([]);
  const [selected,setSelected]=useState("gps");
  const [forecast,setForecast]=useState<Forecast|null>(null);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [timeline,setTimeline]=useState(false);
  useEffect(()=>{if(open){setSites(readSites());setTimeline(false);}},[open]);
  const site=selected==="gps"?(position?{id:"gps",name:"Current GPS position",lat:position[0],lng:position[1]}:null):sites.find(p=>p.id===selected)||null;
  const coordKey=site?site.lat.toFixed(3)+","+site.lng.toFixed(3):"none";
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
  const shown=useMemo(()=>!forecast?[]:timeline?forecast.hours.slice(0,24):[...forecast.hours].sort((a,b)=>b.index-a.index||a.time.localeCompare(b.time)).slice(0,7),[forecast,timeline]);
  if(!open)return null;
  return <section role="dialog" aria-label="Deer conditions outlook" style={{position:"absolute",zIndex:3500,top:"calc(env(safe-area-inset-top,0px) + 78px)",left:12,right:12,maxWidth:500,maxHeight:"74dvh",margin:"0 auto",overflowY:"auto",borderRadius:17,background:"#0d2119",border:"1px solid #c9a66b",padding:15,color:"#f3e9d8",boxShadow:"0 12px 35px #000b"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><strong style={{color:"#e4c38c",fontSize:19}}>🦌 Deer Conditions Outlook</strong><button type="button" onClick={onClose} style={{background:"#263a2d",border:"1px solid #76664b",color:"#fff",padding:10,borderRadius:9}}>CLOSE</button></div>
    <p style={{fontSize:12,lineHeight:1.5,color:"#dfc9a6"}}>Experimental weather-and-daylight suitability index (1–9), NOT a probability of seeing deer. No animal tracking. Habitat, rut, moon, hunting pressure and sightings are not modeled.</p>
    <label style={{display:"block",fontSize:12,color:"#dac18d",marginBottom:6}}>LOCATION TO ANALYZE</label>
    <select style={selectStyle} value={selected} onChange={e=>setSelected(e.target.value)}>
      <option value="gps">Current GPS position</option>
      {sites.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
    </select>
    {site&&<p style={{fontSize:11,color:"#b9cbb5",margin:"7px 0 12px"}}>{site.name} · Forecast uses this location, not necessarily where your phone is now.</p>}
    {busy&&<p>Checking local weather, pressure and daylight…</p>}
    {error&&<p role="alert" style={{color:"#ffc5a1"}}>{error}</p>}
    {forecast&&<div>
      <div style={{display:"flex",gap:7,margin:"10px 0",flexWrap:"wrap"}}><button type="button" onClick={()=>setTimeline(false)} style={{padding:"8px 10px",borderRadius:8,border:"1px solid #ac9668",background:timeline?"#183326":"#5e4c2c",color:"#fff0d5"}}>Best 7 hours</button><button type="button" onClick={()=>setTimeline(true)} style={{padding:"8px 10px",borderRadius:8,border:"1px solid #ac9668",background:timeline?"#5e4c2c":"#183326",color:"#fff0d5"}}>Next 24 hours</button></div>
      <div style={{fontSize:11,color:"#b8bcae"}}>Times at selected location · {forecast.timezone} · Updated {new Date(forecast.updatedAt).toLocaleTimeString()}</div>
      {shown.map(h=><div key={h.time} style={{padding:"11px 0",borderBottom:"1px solid #526047"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:9}}><strong>{formatHour(h.time)}</strong><strong style={{color:"#e5c58c"}}>{h.index.toFixed(1)}/9 · {h.index>=7?"Favorable":h.index>=5?"Mixed":"Challenging"}</strong></div>
        <div style={{fontSize:12,marginTop:4}}>🌡 {Math.round(h.temperature)}°F · Wind {compass(h.windFrom)} {Math.round(h.wind)} mph · Rain {h.rain.toFixed(2)} in</div>
        <div style={{fontSize:12,marginTop:3}}>☁ {Math.round(h.cloud)}% cloud · Pressure {h.pressure.toFixed(1)} hPa {h.pressureChange===null?"":(h.pressureChange>=0?"+":"")+h.pressureChange.toFixed(1)+" / 3h"}</div>
        <div style={{fontSize:11,color:"#c4cbb8",marginTop:4}}>{h.reasons.length?h.reasons.join(" · "):"No favorable factors in this simple model"}</div>
      </div>)}
      <p style={{fontSize:11,color:"#c6b38f",lineHeight:1.5}}>Relative conditions only. Index weights: dawn/dusk, temperature, wind, rain, cloud, 3-hour pressure and temperature trends. Pressure changes are included as an exploratory factor, not proof of deer behavior. Check local terrain and regulations before going.</p>
    </div>}
  </section>;
}
