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
 const missedCount=checkDue&&plan.nextCheckAt?1+Math.floor(Math.max(0,now-plan.nextCheckAt)/(Math.max(1,plan.checkInterval)*60000)):0;
 const contactNumber=plan.contactPhone.replace(/[^\d+]/g,"");
 const action:React.CSSProperties={...btn,minHeight:48,fontSize:12,letterSpacing:.25,borderRadius:10};
 const card:React.CSSProperties={...box,marginTop:8,padding:"12px 12px",borderRadius:11,borderColor:"#665c42",background:"linear-gradient(110deg,#0b1a15,#11241b)"};
 const eyebrow:React.CSSProperties={...label,fontSize:10,letterSpacing:1.1};
 const val:React.CSSProperties={fontSize:14,fontWeight:780,color:"#fff2d9"};
 const pair:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:7};
 return <div role="presentation" style={{position:"fixed",inset:0,zIndex:22000,background:"#020805dc",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
  <section role="dialog" aria-modal="true" aria-label="Guardian Angel" style={{width:"100%",maxWidth:610,maxHeight:"min(95dvh,1000px)",overflowY:"auto",overscrollBehavior:"contain",background:"linear-gradient(175deg,#07140f,#091711 58%,#030b08)",color:"#f8ecdb",border:"1px solid #bf9b62",borderRadius:"20px 20px 0 0",boxShadow:"0 -14px 55px #000d",padding:"16px 11px calc(env(safe-area-inset-bottom,0px) + 23px)",fontFamily:"system-ui,-apple-system,Segoe UI,sans-serif"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:9,padding:"1px 4px 9px",borderBottom:"1px solid #4f533f"}}>
    <div><div style={{...eyebrow,color:"#f3d198"}}>GRACE FIELD / SAFETY</div><h2 style={{margin:"2px 0 0",fontFamily:"Georgia,serif",fontSize:25,fontWeight:500,color:"#f3d198",letterSpacing:1}}>GUARDIAN ANGEL</h2></div>
    <button aria-label="Close Guardian Angel" style={{...action,minHeight:40,padding:"8px 13px"}} onClick={()=>setOpen(false)}>✕</button>
   </div>
   <div style={{...card,display:"flex",gap:10,alignItems:"center",borderColor:active?"#72b987":"#bd9f6b"}}>
    <div aria-hidden="true" style={{fontSize:31,color:active?"#90dda5":"#e1bd78",lineHeight:1}}>♢</div>
    <div style={{flex:1}}><div style={eyebrow}>TRIP STATUS</div><div style={{...val,color:active?(overdue?"#ff9d87":"#a6e5b0"):"#e6c88f",fontSize:16}}>{!active?"READY TO START":overdue?"OVERDUE RETURN":missedCount>=2?"MISSED CHECK-INS":checkDue?"CHECK-IN DUE":"GUARDIAN ACTIVE"}</div><div style={{fontSize:11,color:"#c1d0bc",marginTop:3}}>{active?`Elapsed ${clock(now-(plan.startedAt??now))} · ${missedCount} missed check-in(s)`:"Set a contact, return time and share your trip plan"}</div></div>
   </div>
   {(overdue||checkDue)&&<div role="alert" style={{...card,borderColor:"#e8a86e",background:"#422b1a",color:"#ffe3b2",fontSize:13,fontWeight:850}}>{overdue?"EXPECTED RETURN TIME PASSED":`CHECK-IN OVERDUE · ${missedCount} MISSED`}<div style={{fontWeight:400,fontSize:11,marginTop:5}}>Device reminder only. Your trusted contact has NOT been automatically alerted. Open messaging or call them.</div></div>}
   <div style={{display:"flex",gap:6,marginTop:9}}>{(["safety","navigate","records"] as const).map(t=><button key={t} style={{...action,flex:1,padding:"8px 3px",background:tab===t?"#5b472b":"#12231a",borderColor:tab===t?"#e3ba78":"#615c45"}} onClick={()=>setTab(t)}>{t==="safety"?"TRIP / SOS":t==="navigate"?"NAVIGATION":"FIELD LOG"}</button>)}</div>
   {tab==="safety"&&<>
    <div style={card}>
     <div style={eyebrow}>TRUSTED CONTACT</div>
     <div style={pair}>
      <label style={{fontSize:11,color:"#d6d5c6"}}>Name<input style={field} autoComplete="name" placeholder="Trusted person" value={plan.contactName} onChange={e=>setPlan(p=>({...p,contactName:e.target.value}))}/></label>
      <label style={{fontSize:11,color:"#d6d5c6"}}>Mobile number<input style={field} type="tel" autoComplete="tel" placeholder="(555) 123-4567" value={plan.contactPhone} onChange={e=>setPlan(p=>({...p,contactPhone:e.target.value}))}/></label>
     </div>
    </div>
    <div style={card}>
     <div style={eyebrow}>TRIP PLAN</div>
     <label style={{fontSize:11,color:"#d6d5c6"}}>Destination<input style={field} placeholder="Ridge Top Stand / Camp / Creek" value={plan.destinationName} onChange={e=>setPlan(p=>({...p,destinationName:e.target.value}))}/></label>
     <div style={{...pair,marginTop:9}}>
      <label style={{fontSize:11,color:"#d6d5c6"}}>Expected return<input type="datetime-local" style={{...field,colorScheme:"dark",fontSize:12}} value={plan.returnAt} onChange={e=>setPlan(p=>({...p,returnAt:e.target.value}))}/></label>
      <label style={{fontSize:11,color:"#d6d5c6"}}>Check-in reminder<select style={{...field,fontSize:12}} value={plan.checkInterval} onChange={e=>setPlan(p=>({...p,checkInterval:Number(e.target.value),nextCheckAt:p.startedAt?Date.now()+Number(e.target.value)*60000:null}))}>{[10,15,30,45,60,90,120].map(v=><option key={v} value={v}>Every {v} min</option>)}</select></label>
     </div>
     <div style={{...pair,marginTop:10}}>
      <div style={{background:"#07150f",padding:10,border:"1px solid #615b45",borderRadius:9}}><div style={eyebrow}>NEXT CHECK-IN</div><div style={{...val,fontVariantNumeric:"tabular-nums",marginTop:5}}>{!active?"Not started":checkDue?"DUE NOW":new Date(plan.nextCheckAt??now).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</div></div>
      <div style={{background:"#07150f",padding:10,border:"1px solid #615b45",borderRadius:9}}><div style={eyebrow}>MISSED CHECK-INS</div><div style={{...val,marginTop:5,color:missedCount>=2?"#ffb382":"#f8e4c5"}}>{missedCount} · on-device warning</div></div>
     </div>
    </div>
    <div style={card}>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:8}}><div style={eyebrow}>LIVE GPS FIX</div><span style={{color:fresh?"#86d7a3":"#ffbd83",fontSize:11}}>{fresh?"● CURRENT FIX":"● WAITING FOR GPS"}</span></div>
     <div style={{...val,fontVariantNumeric:"tabular-nums",marginTop:4,overflowWrap:"anywhere"}}>{coords}</div>
     <div style={{fontSize:11,color:"#b8c6b6",marginTop:4}}>{fix?`Accuracy ±${Math.round(fix.accuracy)} m · ${Math.round(Math.max(0,now-fix.time)/1000)} seconds old`:gpsError}</div>
     <div style={{...pair,marginTop:10}}><button style={{...action,background:"#185431",borderColor:"#92bd93"}} disabled={!fresh} onClick={()=>void sendCheckIn()}>SEND GPS CHECK-IN</button><button style={action} disabled={!fresh} onClick={()=>void share(`Guardian Angel location (${new Date().toLocaleString()}): ${coords} | Accuracy ${fix?Math.round(fix.accuracy):"?"} m | ${gpsLink}`,"Grace Field GPS location")}>SHARE GPS POSITION</button></div>
     <div style={{fontSize:10,color:"#bfc2b1",marginTop:7}}>Share opens your device share options. You must choose a recipient and send. It is not a continuously updating live link.</div>
    </div>
    <div style={{...pair,marginTop:9}}>
     <div style={{...card,marginTop:0,textAlign:"center"}}><div style={eyebrow}>TRIP CLOCK</div><div style={{fontSize:21,color:"#f3d49e",fontWeight:900,fontVariantNumeric:"tabular-nums",marginTop:5}}>{active?clock(now-(plan.startedAt??now)):"00:00:00"}</div></div>
     <div style={{...card,marginTop:0,textAlign:"center"}}><div style={eyebrow}>RETURN TIME</div><div style={{fontSize:15,color:overdue?"#ffb094":"#f3d49e",fontWeight:850,marginTop:9}}>{plan.returnAt?new Date(plan.returnAt).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"}):"Not set"}</div></div>
    </div>
    <div style={{...pair,marginTop:9}}><button style={action} onClick={()=>void share(planText,"Grace Field Guardian trip plan")}>SHARE TRIP PLAN</button><button style={action} onClick={()=>{setTab("navigate");}}>BEARING / TRAIL BACK</button></div>
    <button style={{...action,width:"100%",marginTop:9,background:active?"linear-gradient(160deg,#652b21,#341811)":"linear-gradient(160deg,#be975c,#e8bf78)",color:active?"#fff3e6":"#112016",borderColor:"#f1cf93",fontWeight:900,fontSize:13}} onClick={active?stopTrip:startTrip}>{active?"END TRIP · CONFIRM SAFE RETURN":"START GUARDIAN SESSION"}</button>
    <div style={{...card,borderColor:"#a25443",marginTop:12,background:"linear-gradient(160deg,#2b1010,#130b0b)"}}><div style={{...eyebrow,color:"#ffc2ad"}}>EMERGENCY SOS</div><div style={{fontSize:11,color:"#ffdbca",margin:"5px 0 9px"}}>Open emergency texting or call emergency services. Sending must be confirmed on your phone.</div><div style={pair}><button style={{...action,borderColor:"#da8179",background:"#822e28"}} onClick={smsContact}>PREPARE SOS TEXT</button><a style={{...action,textAlign:"center",textDecoration:"none",borderColor:"#e9a98a",background:"#5d211c"}} href="tel:911">CALL 911</a></div>{contactNumber&&<a style={{...action,display:"block",textAlign:"center",textDecoration:"none",marginTop:8}} href={`tel:${contactNumber}`}>CALL {plan.contactName||"TRUSTED CONTACT"}</a>}</div>
   </>}
   {tab==="navigate"&&<>
    <div style={card}><div style={eyebrow}>DESTINATION BEARING / NAVIGATION</div><input style={field} placeholder="Destination name" value={newDestName} onChange={e=>setNewDestName(e.target.value)}/><div style={{...pair,marginTop:8}}><input style={field} placeholder="Latitude" value={newLat} inputMode="decimal" aria-label="Destination latitude" onChange={e=>setNewLat(e.target.value)}/><input style={field} placeholder="Longitude" value={newLng} inputMode="decimal" aria-label="Destination longitude" onChange={e=>setNewLng(e.target.value)}/></div><button style={{...action,width:"100%",marginTop:8}} onClick={setDestination}>SET DESTINATION</button>{plan.destination&&<div style={{marginTop:12,color:"#f0d39c",fontWeight:850}}>{plan.destination.name}{fresh&&fix&&<div style={{fontSize:26}}>{Math.round(bearing(fix,plan.destination))}° · {(distance(fix,plan.destination)/1609.344).toFixed(2)} mi</div>}</div>}<div style={{fontSize:11,color:"#bfcbbd",marginTop:8}}>Bearing is straight-line true north. It is not obstacle-aware trail routing.</div></div>
    <div style={card}><div style={eyebrow}>FIELD NAVIGATION</div><button style={{...action,width:"100%",marginTop:8}} onClick={()=>{setOpen(false);window.dispatchEvent(new Event("grace-field-v2-trail-back"));}}>FOLLOW RECORDED TRAIL BACK</button><button style={{...action,width:"100%",marginTop:7}} onClick={()=>{setOpen(false);window.dispatchEvent(new Event("grace-field-open-waypoint-library"));}}>SAVED LOCATIONS / STANDS</button><div style={{fontSize:11,color:"#b9cbb8",marginTop:8}}>Trail Back requires a recorded GPS trail. Always carry backup navigation.</div></div>
   </>}
   {tab==="records"&&<>
    <div style={card}><div style={eyebrow}>TRIP OBSERVATION NOTES</div><textarea style={{...field,minHeight:92,resize:"vertical"}} placeholder="Weather, wildlife, hazards, trail notes..." value={note} onChange={e=>setNote(e.target.value)}/><div style={{...pair,marginTop:8}}><button style={action} onClick={addObservation}>SAVE NOTE</button><button style={action} onClick={exportRecords}>EXPORT TRIP LOG</button></div></div>
    <div style={card}><div style={eyebrow}>CHECK-INS / FIELD HISTORY · {plan.records.length}</div>{plan.records.length===0?<p style={{fontSize:12}}>Records appear as you check in and save observations.</p>:plan.records.slice(0,60).map(r=><div key={r.id} style={{borderTop:"1px solid #4a553f",padding:"9px 0",marginTop:8,fontSize:12}}><div style={{color:"#e7c181",fontSize:10}}>{r.kind.toUpperCase()} · {new Date(r.time).toLocaleString()}</div><div style={{marginTop:3}}>{r.text}</div>{r.lat!==null&&r.lng!==null&&<div style={{color:"#b6cabc",fontSize:11}}>{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</div>}</div>)}</div>
   </>}
   {message&&<div role="status" style={{...card,background:"#2c3828",borderColor:"#a78b5c",fontSize:12,color:"#f5dea9"}}>{message}</div>}
   <div style={{fontSize:10,lineHeight:1.55,color:"#b7c6b6",marginTop:13,padding:"0 3px"}}>Guardian Angel provides GPS, trip recording, planned check-ins, in-app overdue reminders, manual position sharing and emergency call/text shortcuts. It cannot send unattended SMS, monitor after the app closes, or dispatch rescue without an independently configured and tested backend alert service. Do not rely on this feature as your only wilderness emergency system.</div>
  </section>
 </div>;
}
