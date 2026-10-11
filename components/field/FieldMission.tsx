"use client";

import { useEffect, useRef, useState } from "react";

type Fix = { lat: number; lng: number; accuracy: number; altitude: number | null; time: number };
type Destination = { name: string; lat: number; lng: number };
type RecordItem = { id: string; time: string; kind: "check-in" | "observation" | "event"; text: string; lat: number | null; lng: number | null; accuracy?: number };
type TripPlan = { destinationName: string; contactName: string; contactPhone: string; returnAt: string; checkInterval: number; destination: Destination | null; startedAt: number | null; nextCheckAt: number | null; lastCheckAt: number | null; records: RecordItem[] };
const KEY = "grace-field-guardian-v3";
const DEFAULT: TripPlan = { destinationName: "", contactName: "", contactPhone: "", returnAt: "", checkInterval: 30, destination: null, startedAt: null, nextCheckAt: null, lastCheckAt: null, records: [] };
const label: React.CSSProperties = {fontSize:11,letterSpacing:1.4,color:"#d7b679",fontWeight:850};
const box: React.CSSProperties = {background:"linear-gradient(145deg,#0b1c16,#12251c)",border:"1px solid #89734e",borderRadius:14,padding:14,marginTop:12};
const btn: React.CSSProperties = {background:"linear-gradient(145deg,#223b2c,#15281e)",border:"1px solid #a18b62",borderRadius:10,color:"#f8edd7",fontWeight:800,padding:"12px 9px",minHeight:44,cursor:"pointer"};
const field: React.CSSProperties = {width:"100%",minWidth:0,boxSizing:"border-box",background:"#1d3327",border:"1px solid #7c775e",borderRadius:8,color:"#fff6e4",padding:"11px 12px",fontSize:14,outlineColor:"#d6b477",marginTop:6};
function distance(a: {lat:number;lng:number},b: {lat:number;lng:number}) { const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r,x=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x)); }
function bearing(a: {lat:number;lng:number},b: {lat:number;lng:number}) { const r=Math.PI/180,y=Math.sin((b.lng-a.lng)*r)*Math.cos(b.lat*r),x=Math.cos(a.lat*r)*Math.sin(b.lat*r)-Math.sin(a.lat*r)*Math.cos(b.lat*r)*Math.cos((b.lng-a.lng)*r);return (Math.atan2(y,x)*180/Math.PI+360)%360; }
function clock(ms:number){ const n=Math.max(0,Math.floor(ms/1000));return [Math.floor(n/3600),Math.floor(n%3600/60),n%60].map(x=>String(x).padStart(2,"0")).join(":"); }
function readStored():TripPlan {
 if(typeof window==="undefined")return DEFAULT;
 try{
  const saved=JSON.parse(localStorage.getItem(KEY)||"null");
  if(saved&&typeof saved==="object")return {...DEFAULT,...saved,records:Array.isArray(saved.records)?saved.records:[]};
  // Migrate existing Guardian Angel logs and destinations without deleting original keys.
  const old=JSON.parse(localStorage.getItem("grace-field-mission-v1")||"null");
  const command=JSON.parse(localStorage.getItem("grace-field-guardian-command-v1")||"null");
  const last=command?.trip||command;
  const legacy=old&&typeof old==="object"?old:{};
  const dest=legacy.destination&&Number.isFinite(Number(legacy.destination.lat))&&Number.isFinite(Number(legacy.destination.lng))?legacy.destination:null;
  const oldRecords:Array<RecordItem>=Array.isArray(legacy.logs)?legacy.logs.map((r:any,i:number)=>({id:`legacy-${i}-${r.id||""}`,time:String(r.time||new Date().toISOString()),kind:"observation" as const,text:String(r.text||""),lat:Number.isFinite(Number(r.lat))?Number(r.lat):null,lng:Number.isFinite(Number(r.lng))?Number(r.lng):null})):[];
  if(last&&typeof last==="object"&&last.destination)oldRecords.unshift({id:"legacy-trip",time:new Date().toISOString(),kind:"event",text:`Previous Guardian trip: ${last.destination}. ${last.notes||""}`,lat:null,lng:null});
  return {...DEFAULT,destination:dest,destinationName:String(last?.destination||dest?.name||""),returnAt:String(last?.returnAt||""),contactName:String(last?.contact||""),records:oldRecords};
 }catch{return DEFAULT;}
}
function addRecord(plan:TripPlan,kind:RecordItem["kind"],text:string,fix:Fix|null):TripPlan {return {...plan,records:[{id:`${Date.now()}-${Math.random().toString(36).slice(2,6)}`,time:new Date().toISOString(),kind,text,lat:fix?.lat??null,lng:fix?.lng??null,accuracy:fix?.accuracy},...plan.records].slice(0,1000)};}
function localDateTime(value:string){const d=new Date(value);return Number.isNaN(d.getTime())?"":d.toLocaleString();}

export default function FieldMission(){
 const [open,setOpen]=useState(false);
 const [tab,setTab]=useState<"safety"|"navigate"|"records">("safety");
 const [plan,setPlan]=useState<TripPlan>(DEFAULT);
 const [ready,setReady]=useState(false);
 const [fix,setFix]=useState<Fix|null>(null);
 const [gpsError,setGpsError]=useState("Acquiring GPS…");
 const [now,setNow]=useState(Date.now());
 const [message,setMessage]=useState("");
 const [note,setNote]=useState("");
 const [newLat,setNewLat]=useState("");
 const [newLng,setNewLng]=useState("");
 const [newDestName,setNewDestName]=useState("");
 const alertedAt=useRef<string>("");
 const latestFix=useRef<Fix|null>(null);
 const latestPlan=useRef(plan);
 latestPlan.current=plan;
 latestFix.current=fix;
 useEffect(()=>{setPlan(readStored());setReady(true);},[]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(KEY,JSON.stringify(plan));}catch{setMessage("Device storage unavailable. Export your trip records now.");}},[plan,ready]);
 useEffect(()=>{const id=window.setInterval(()=>setNow(Date.now()),1000);return()=>window.clearInterval(id);},[]);
 useEffect(()=>{const show=()=>{setOpen(true);setTab("safety");};window.addEventListener("grace-field-open-mission",show);return()=>window.removeEventListener("grace-field-open-mission",show);},[]);
 useEffect(()=>{
   if(!open&&!plan.startedAt)return;
   if(!navigator.geolocation){setGpsError("GPS not supported on this device.");return;}
   const id=navigator.geolocation.watchPosition(p=>{
     const c=p.coords;
     if(!Number.isFinite(c.accuracy)||c.accuracy>1500){setGpsError(`Location too inaccurate (±${Math.round(c.accuracy)} m).`);return;}
     setFix({lat:c.latitude,lng:c.longitude,accuracy:c.accuracy,altitude:c.altitude,time:p.timestamp});setGpsError("");
   },e=>setGpsError(e.message),{enableHighAccuracy:true,maximumAge:0,timeout:30000});
   return()=>navigator.geolocation.clearWatch(id);
 },[open,plan.startedAt]);
 const fresh=!!fix&&Number.isFinite(fix.accuracy)&&fix.accuracy<=100&&now-fix.time<=60000;
 const active=plan.startedAt!==null;
 const overdue=active&&plan.returnAt&&now>new Date(plan.returnAt).getTime();
 const checkDue=active&&plan.nextCheckAt!==null&&now>=plan.nextCheckAt;
 useEffect(()=>{
   if(!checkDue&&!overdue){alertedAt.current="";return;}
   const code=`${overdue?"return":"check"}-${Math.floor(now/300000)}`;
   if(alertedAt.current===code)return;
   alertedAt.current=code;
   setMessage(overdue?"RETURN TIME PASSED — contact your person now. No alert has been sent to them.":"CHECK-IN DUE — share your current position with your contact.");
   if(typeof navigator!=="undefined" && "vibrate" in navigator)navigator.vibrate?.([250,150,250]);
   async function notify(){
     try{
       if(typeof Notification==="undefined"||Notification.permission!=="granted")return;
       if("serviceWorker" in navigator){const reg=await navigator.serviceWorker.getRegistration();if(reg)await reg.showNotification("Guardian Angel reminder",{body:overdue?"Your return time has passed. Contact your emergency person.":"Time to send your GPS check-in.",tag:"grace-field-guardian"});}
     }catch{}
   }
   void notify();
 },[checkDue,overdue,now]);
 const coords=fix?`${fix.lat.toFixed(6)}, ${fix.lng.toFixed(6)}`:"GPS not available";
 const gpsLink=fix?`https://www.google.com/maps?q=${fix.lat},${fix.lng}`:"";
 const dueAt=plan.returnAt?new Date(plan.returnAt).getTime():null;
 const planText=`Guardian Angel trip plan\nDestination: ${plan.destinationName||plan.destination?.name||"Not set"}\nReturn by: ${plan.returnAt?localDateTime(plan.returnAt):"Not set"}\nCheck-in every: ${plan.checkInterval} minutes\nEmergency contact: ${plan.contactName||"Not set"}${plan.contactPhone?` (${plan.contactPhone})`:""}\nThis plan is not automatically monitored or sent.`;
 async function share(text:string,title:string){
   try{
     if(navigator.share){await navigator.share({title,text});setMessage("Sharing completed or selected in device. Verify that your recipient received it.");return;}
     if(navigator.clipboard){await navigator.clipboard.writeText(text);setMessage("Copied. Paste into a text message and SEND it.");return;}
     setMessage("Sharing unavailable. Copy your coordinates manually.");
   }catch(e){if((e as Error)?.name==="AbortError")setMessage("Share cancelled; nothing was sent.");else setMessage("Share failed. Try your messaging app directly.");}
 }
 function recordCheckIn(){
   if(!fresh||!fix){setMessage("Wait for a fresh accurate GPS fix (±100 m or better).");return;}
   setPlan(old=>{const v=addRecord(old,"check-in","Manual GPS check-in recorded on this device",fix);return {...v,lastCheckAt:Date.now(),nextCheckAt:old.startedAt?Date.now()+old.checkInterval*60000:null};});
   setMessage("Check-in recorded locally. Use SEND CHECK-IN to inform your contact; saving does not send a message.");
 }
 async function sendCheckIn(){
   if(!fresh||!fix){setMessage("Wait for a fresh accurate GPS fix before sharing.");return;}
   recordCheckIn();
   await share(`GUARDIAN ANGEL GPS CHECK-IN\nTime: ${new Date(fix.time).toLocaleString()}\nLocation: ${coords}\nAccuracy: ±${Math.round(fix.accuracy)} m\nMap: ${gpsLink}\nTrip: ${plan.destinationName||"Field trip"}\nReturn: ${plan.returnAt?localDateTime(plan.returnAt):"Not set"}`,"Guardian Angel check-in");
 }
 function startTrip(){
   if(!plan.returnAt||!Number.isFinite(new Date(plan.returnAt).getTime())||new Date(plan.returnAt).getTime()<=Date.now()){setMessage("Choose a future planned return time before starting Guardian Angel.");return;}
   if(!plan.contactName.trim()||!plan.contactPhone.trim()){setMessage("Enter the name and phone number of your emergency contact.");return;}
   setPlan(old=>{const started=Date.now();return addRecord({...old,startedAt:started,nextCheckAt:started+old.checkInterval*60000,lastCheckAt:null},"event","Guardian Angel trip started. Share your trip plan with your contact.",fix);});
   setMessage("Trip active on this device. IMPORTANT: Share your plan with your contact before entering the field.");
   if(typeof Notification!=="undefined"&&Notification.permission==="default")void Notification.requestPermission().catch(()=>{});
 }
 function stopTrip(){if(!window.confirm("Finish Guardian Angel trip? Check-in reminders will stop. Confirm your safe return with your contact."))return;
   setPlan(old=>addRecord({...old,startedAt:null,nextCheckAt:null},"event","Guardian Angel trip ended. Confirm safe return with your contact.",fix));setMessage("Trip ended. Send your contact a safe-return message.");}
 function setDestination(){const lat=Number(newLat),lng=Number(newLng);if(!newLat.trim()||!newLng.trim()||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){setMessage("Enter valid latitude and longitude.");return;}const dest={lat,lng,name:newDestName.trim()||"Destination"};setPlan(p=>({...p,destination:dest,destinationName:dest.name}));setMessage("Destination set. Bearing is straight-line, not trail-safe routing.");}
 function exportRecords(){const blob=new Blob([JSON.stringify({exportedAt:new Date().toISOString(),trip:plan},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="grace-field-guardian-records.json";a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage("Records exported to your device.");}
 function addObservation(){if(!note.trim())return;setPlan(old=>addRecord(old,"observation",note.trim(),fresh?fix:null));setNote("");setMessage("Observation saved locally.");}
 function smsContact(){if(!plan.contactPhone){setMessage("Add an emergency contact phone number first.");return;}
   const content=fresh&&fix?`Guardian Angel check-in: ${coords} ±${Math.round(fix.accuracy)}m ${gpsLink}`:`Guardian Angel: please contact me. My location is unavailable. Trip: ${plan.destinationName}.`;
   window.location.href=`sms:${plan.contactPhone.replace(/[^\d+]/g,"")}?body=${encodeURIComponent(content)}`;
   setMessage("Message composer opened. You must press SEND; Grace cannot verify delivery.");}
 if(!open)return null;
 return <div role="presentation" style={{position:"fixed",inset:0,zIndex:22000,background:"#020805d6",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
   <section role="dialog" aria-modal="true" aria-label="Guardian Angel" style={{width:"100%",maxWidth:700,maxHeight:"min(94dvh,900px)",overflowY:"auto",overscrollBehavior:"contain",background:"linear-gradient(155deg,#0b1a15,#07100d)",color:"#fff4df",border:"1px solid #d5b67c",borderRadius:"22px 22px 0 0",boxShadow:"0 -12px 55px #000c",padding:"19px 15px calc(env(safe-area-inset-bottom,0px) + 22px)",fontFamily:"system-ui,-apple-system,Segoe UI,sans-serif"}}>
     <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><div><div style={label}>GRACE FIELD / SAFETY OPERATIONS</div><h2 style={{fontFamily:"Georgia,serif",fontSize:28,color:"#f4d6a2",fontWeight:500,margin:"5px 0"}}>Guardian Angel</h2><div style={{fontSize:12,color:active?"#91dfa3":"#e2c996"}}>{active?"● TRIP ACTIVE · IN-APP REMINDERS":"○ STANDBY · NO AUTOMATIC MONITORING"}</div></div><button style={{...btn,padding:"9px 13px"}} onClick={()=>setOpen(false)}>✕ CLOSE</button></div>
     {(overdue||checkDue)&&<div role="alert" style={{...box,background:overdue?"#522219":"#403516",borderColor:overdue?"#ff9a76":"#e9c56b",fontWeight:850}}>{overdue?"RETURN TIME PASSED — CONTACT YOUR PERSON NOW":"CHECK-IN DUE — SHARE YOUR POSITION"}<div style={{fontWeight:400,fontSize:12,marginTop:5}}>This warning appears only while Grace is running. Your contact has not been automatically notified.</div></div>}
     <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6,marginTop:15}}>{(["safety","navigate","records"] as const).map(t=><button key={t} style={{...btn,padding:"11px 5px",background:tab===t?"#64502e":"#1a2c20",borderColor:tab===t?"#efc984":"#6f7153",fontSize:12}} onClick={()=>setTab(t)}>{t==="safety"?"🛡 TRIP SAFETY":t==="navigate"?"⌖ NAVIGATION":"▤ RECORDS"}</button>)}</div>
     {tab==="safety"&&<>
       <div style={box}>
         <div style={label}>LIVE POSITION</div>
         <div style={{fontWeight:850,fontSize:20,marginTop:4,fontVariantNumeric:"tabular-nums",overflowWrap:"anywhere"}}>{coords}</div>
         <div style={{fontSize:12,color:fresh?"#a7e6ae":"#ffcf8e",marginTop:5}}>{fix?`±${Math.round(fix.accuracy)} meters · ${Math.round(Math.max(0,now-fix.time)/1000)} sec old${fresh?" · GPS READY":" · STALE / LOW ACCURACY"}`:gpsError}</div>
         <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:11}}><button style={btn} disabled={!fresh} onClick={()=>void sendCheckIn()}>📍 SEND CHECK-IN</button><button style={btn} disabled={!fresh} onClick={recordCheckIn}>✓ RECORD LOCALLY</button></div>
         <button style={{...btn,width:"100%",marginTop:8,background:"#284232"}} onClick={()=>void share(planText,"Guardian Angel trip plan")}>↗ SHARE TRIP PLAN</button>
       </div>
       <div style={box}>
         <div style={label}>TRIP PLAN & TRUSTED CONTACT</div>
         <div style={{marginTop:9}}><label style={{fontSize:12}}>Destination / route description<input style={field} placeholder="North ridge / campsite / fishing hole" value={plan.destinationName} onChange={e=>setPlan(p=>({...p,destinationName:e.target.value}))}/></label></div>
         <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:12}}><label style={{fontSize:12}}>Contact name<input style={field} autoComplete="name" placeholder="Person to check in with" value={plan.contactName} onChange={e=>setPlan(p=>({...p,contactName:e.target.value}))}/></label><label style={{fontSize:12}}>Contact phone<input style={field} inputMode="tel" autoComplete="tel" placeholder="Phone number" value={plan.contactPhone} onChange={e=>setPlan(p=>({...p,contactPhone:e.target.value}))}/></label></div>
         <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:12}}><label style={{fontSize:12}}>Return date & time<input type="datetime-local" style={{...field,colorScheme:"dark"}} value={plan.returnAt} onChange={e=>setPlan(p=>({...p,returnAt:e.target.value}))}/></label><label style={{fontSize:12}}>Check-in interval<select style={field} value={plan.checkInterval} onChange={e=>setPlan(p=>({...p,checkInterval:Number(e.target.value),nextCheckAt:p.startedAt?Date.now()+Number(e.target.value)*60000:null}))}>{[10,15,30,45,60,90,120].map(v=><option key={v} value={v}>{v} minutes</option>)}</select></label></div>
         {active&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8,marginTop:13,textAlign:"center"}}><div style={{padding:9,background:"#1b3125",borderRadius:9}}><div style={label}>TRIP CLOCK</div><div style={{fontSize:21,fontWeight:900}}>{clock(now-(plan.startedAt??now))}</div></div><div style={{padding:9,background:"#1b3125",borderRadius:9}}><div style={label}>NEXT CHECK-IN</div><div style={{fontSize:17,fontWeight:850}}>{plan.nextCheckAt?checkDue?"DUE NOW":new Date(plan.nextCheckAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"—"}</div></div></div>}
         {dueAt&&active&&<div style={{fontSize:12,color:overdue?"#ffa88f":"#d9c9a2",marginTop:10}}>Planned return: {new Date(dueAt).toLocaleString()}{overdue?" · OVERDUE":""}</div>}
         <button style={{...btn,width:"100%",marginTop:11,background:active?"#623027":"linear-gradient(145deg,#2c7a49,#19442a)",borderColor:active?"#ed9c89":"#9ac68d"}} onClick={active?stopTrip:startTrip}>{active?"■ END TRIP / CONFIRM SAFE RETURN":"● START GUARDIAN ANGEL TRIP"}</button>
       </div>
       <div style={{...box,borderColor:"#b78568"}}>
         <div style={label}>EMERGENCY ACTIONS</div>
         <div style={{fontSize:12,margin:"8px 0 10px",color:"#d0d8cb"}}>Use these controls to initiate a call or message yourself. No automatic rescue or dispatch.</div>
         <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8}}><a href="tel:911" style={{...btn,textDecoration:"none",textAlign:"center",background:"#642a20",borderColor:"#ea9e79"}}>☎ CALL 911</a><button style={{...btn,background:"#3c2920"}} onClick={smsContact}>✉ TEXT CONTACT</button></div>
         {plan.contactPhone&&<a href={`tel:${plan.contactPhone.replace(/[^\d+]/g,"")}`} style={{...btn,display:"block",textAlign:"center",textDecoration:"none",marginTop:8}}>☎ CALL {plan.contactName||"MY CONTACT"}</a>}
       </div>
     </>}
     {tab==="navigate"&&<>
       <div style={box}><div style={label}>DESTINATION BEARING</div><div style={{marginTop:9}}><input style={field} placeholder="Name your destination" value={newDestName} onChange={e=>setNewDestName(e.target.value)} aria-label="Destination name"/></div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:7}}><input style={field} placeholder="Latitude" inputMode="decimal" value={newLat} onChange={e=>setNewLat(e.target.value)} aria-label="Destination latitude"/><input style={field} placeholder="Longitude" inputMode="decimal" value={newLng} onChange={e=>setNewLng(e.target.value)} aria-label="Destination longitude"/></div><button style={{...btn,width:"100%",marginTop:9}} onClick={setDestination}>SET DESTINATION</button>
         {plan.destination&&<div style={{marginTop:12}}><strong style={{color:"#f2d7a3"}}>{plan.destination.name}</strong><div style={{fontSize:12,marginTop:4}}>{plan.destination.lat.toFixed(6)}, {plan.destination.lng.toFixed(6)}</div>{fresh&&fix?<div style={{fontWeight:900,fontSize:23,color:"#e0c28e",marginTop:10}}>{Math.round(bearing(fix,plan.destination))}° · {(distance(fix,plan.destination)/1609.344).toFixed(2)} mi</div>:<div style={{fontSize:12,marginTop:10}}>Waiting for fresh GPS…</div>}<button style={{...btn,marginTop:9}} onClick={()=>setPlan(p=>({...p,destination:null}))}>CLEAR DESTINATION</button></div>}
         <p style={{fontSize:11,color:"#b9c7b9"}}>Straight-line true-north bearing, not a safe trail or obstacle-aware route. Use the main map to inspect terrain.</p>
       </div>
       <div style={box}><div style={label}>FIELD NAVIGATION</div><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginTop:10}}><button style={btn} onClick={()=>{setOpen(false);window.dispatchEvent(new Event("grace-field-v2-trail-back"));}}>↶ FOLLOW TRAIL BACK</button><button style={btn} onClick={()=>{setOpen(false);window.dispatchEvent(new Event("grace-field-open-waypoint-library"));}}>⌖ SAVED LOCATIONS</button></div><div style={{fontSize:11,color:"#b9c7b9",marginTop:9}}>Trail Back follows the breadcrumbs previously recorded by START TRACK. No track means no return trail.</div></div>
     </>}
     {tab==="records"&&<>
       <div style={box}><div style={label}>FIELD OBSERVATIONS</div><textarea value={note} onChange={e=>setNote(e.target.value)} style={{...field,resize:"vertical",minHeight:95}} placeholder="Wind, tracks, hazards, sightings, route notes…" aria-label="Field observation"/><div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginTop:9}}><button style={btn} onClick={addObservation}>+ SAVE NOTE</button><button style={btn} onClick={exportRecords}>↓ EXPORT JSON</button></div></div>
       <div style={box}><div style={label}>TRIP HISTORY · {plan.records.length} ENTRIES</div>{plan.records.length===0?<p style={{color:"#c5d0c5",fontSize:13}}>Your check-ins and notes will appear here.</p>:plan.records.slice(0,50).map(r=><div key={r.id} style={{borderTop:"1px solid #465749",padding:"10px 0",marginTop:9}}><div style={{fontSize:11,color:"#dbbc7f"}}>{r.kind.toUpperCase()} · {new Date(r.time).toLocaleString()}</div><div style={{fontSize:13,whiteSpace:"pre-wrap",marginTop:4}}>{r.text}</div>{r.lat!==null&&r.lng!==null&&<div style={{fontSize:11,color:"#b2c9bd",marginTop:3}}>{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</div>}</div>)}</div>
     </>}
     {message&&<div role="status" style={{...box,background:"#273928",color:"#f8df9e",fontSize:13}}>{message}</div>}
     <p style={{fontSize:11,color:"#c4d0be",lineHeight:1.5,marginTop:14}}>Guardian Angel provides on-device GPS, trip planning, check-in reminders, logs and manual contact actions. It does <strong>not</strong> automatically alert anyone if you miss a check-in, work reliably after Grace is closed, or contact emergency services for you. Tell a trusted person your plan, confirm they received it, and carry a dedicated navigation/communication backup.</p>
   </section>
 </div>;
}
