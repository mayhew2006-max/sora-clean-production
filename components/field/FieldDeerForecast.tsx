"use client";
import {useEffect,useState} from "react";
type Hour = {time:string;temp:number;wind:number;rain:number;cloud:number;score:number};
const numberAt=(a:unknown,i:number)=>Array.isArray(a)&&a[i]!==null&&Number.isFinite(Number(a[i]))?Number(a[i]):null;
export default function FieldDeerForecast({open,onClose,position}:{open:boolean;onClose:()=>void;position:[number,number]|null}){
 const [hours,setHours]=useState<Hour[]>([]);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 useEffect(()=>{
  if(!open)return;
  if(!position){setError("A fresh GPS location is required for local conditions.");return;}
  const controller=new AbortController();
  async function load(){
   setBusy(true);setError("");setHours([]);
   try{
    const query=new URLSearchParams({latitude:String(position![0]),longitude:String(position![1]),hourly:"temperature_2m,wind_speed_10m,precipitation,cloud_cover",daily:"sunrise,sunset",temperature_unit:"fahrenheit",wind_speed_unit:"mph",precipitation_unit:"inch",timezone:"auto",forecast_days:"2"});
    const response=await fetch("https://api.open-meteo.com/v1/forecast?"+query,{signal:controller.signal});
    if(!response.ok)throw new Error("Weather forecast unavailable");
    const data=await response.json();
    const sunrise=(data.daily?.sunrise||[]).map((s:string)=>new Date(s).getTime());
    const sunset=(data.daily?.sunset||[]).map((s:string)=>new Date(s).getTime());
    const now=Date.now();
    const results:Hour[]=[];
    for(let i=0;i<(data.hourly?.time?.length||0);i++){
      const time=String(data.hourly.time[i]);const stamp=new Date(time).getTime();
      if(!Number.isFinite(stamp)||stamp<now-3600000||stamp>now+36*3600000)continue;
      const temp=numberAt(data.hourly.temperature_2m,i),wind=numberAt(data.hourly.wind_speed_10m,i),rain=numberAt(data.hourly.precipitation,i),cloud=numberAt(data.hourly.cloud_cover,i);
      if(temp===null||wind===null||rain===null||cloud===null)continue;
      const dayIndex=Math.min(sunrise.length-1,Math.floor(i/24));
      const dawn=sunrise[dayIndex],dusk=sunset[dayIndex];
      const nearLight=Number.isFinite(dawn)&&Number.isFinite(dusk)&&(Math.abs(stamp-dawn)<2*3600000||Math.abs(stamp-dusk)<2*3600000);
      // Transparent heuristic: weather and light suitability, not measured deer activity.
      const score=Math.min(100,Math.max(0,40+(nearLight?30:0)+(temp>=25&&temp<=55?15:0)+(wind>=3&&wind<=12?10:wind>20?-15:0)+(rain>0.15?-20:0)+(cloud>=50?5:0)));
      results.push({time,temp,wind,rain,cloud,score});
    }
    if(!results.length)throw new Error("Forecast data incomplete");
    if(!controller.signal.aborted)setHours(results);
   }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:"Unable to load forecast");}
   finally{if(!controller.signal.aborted)setBusy(false);}
  }
  void load();return()=>controller.abort();
 },[open,position?.[0],position?.[1]]);
 if(!open)return null;
 const peak=[...hours].sort((a,b)=>b.score-a.score).slice(0,5);
 return <section role="dialog" aria-label="Deer movement outlook" style={{position:"absolute",zIndex:3500,top:"calc(env(safe-area-inset-top, 0px) + 80px)",left:12,right:12,maxWidth:500,maxHeight:"70dvh",margin:"0 auto",overflowY:"auto",borderRadius:17,background:"#0d2119",border:"1px solid #c9a66b",padding:16,color:"#f3e9d8",boxShadow:"0 12px 35px #000b"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:10,alignItems:"center"}}><strong style={{color:"#e4c38c",fontSize:19}}>🦌 Deer Movement Outlook</strong><button type="button" onClick={onClose} style={{background:"#263a2d",color:"#fff",padding:10,borderRadius:9}}>CLOSE</button></div>
  <p style={{fontSize:12,lineHeight:1.5,color:"#dfc9a6"}}>Experimental weather-and-daylight suitability score — not a probability of seeing deer. Not based on live animal locations. Human pressure, habitat, rut and local patterns are not modeled.</p>
  {busy&&<p>Loading local weather…</p>}
  {error&&<p role="alert" style={{color:"#ffc5a1"}}>{error}</p>}
  {!busy&&peak.length>0&&<><strong>Highest-scoring upcoming hours</strong>{peak.map(h=><div key={h.time} style={{padding:"9px 0",borderBottom:"1px solid #526047"}}><strong>{new Date(h.time).toLocaleString([], {weekday:"short",hour:"numeric",month:"short",day:"numeric"})} · {h.score}/100</strong><div style={{fontSize:12,marginTop:3}}>{Math.round(h.temp)}°F · Wind {Math.round(h.wind)} mph · Rain {h.rain.toFixed(2)} in · Cloud {Math.round(h.cloud)}%</div></div>)}<p style={{fontSize:11,color:"#c6b38f"}}>Score is a heuristic for comparing conditions, not a validated deer-activity prediction. Open-Meteo forecast; refresh by closing and reopening.</p></>}
 </section>;
}
