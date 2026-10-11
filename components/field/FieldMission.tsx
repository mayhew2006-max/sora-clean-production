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

type GuardianGlyphName="shield"|"warning"|"location"|"clock"|"person"|"compass";
function GuardianGlyph({name,size=22}:{name:GuardianGlyphName,size?:number}){
 const paths:Record<GuardianGlyphName,string>={shield:"M12 2 21 6v6c0 5-4 9-9 10-5-1-9-5-9-10V6zM8 12l3 3 5-6",warning:"M12 2 23 21H1zM12 9v5m0 4v.2",location:"M12 22s-8-7-8-13a8 8 0 0 1 16 0c0 6-8 13-8 13zm0-17a4 4 0 1 0 .1 0",clock:"M12 2a10 10 0 1 0 .1 0M12 7v6l4 2",person:"M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21c0-8 16-8 16 0",compass:"M12 2a10 10 0 1 0 .1 0M15 9l-2 5-4 1 2-5z"};
 return <svg aria-hidden="true" viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="#e8c58c" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0}}><path d={paths[name]}/></svg>;
}

export default function FieldMission(){
 const [open,setOpen]=useState(false);
 const [tab,setTab]=useState<"safety"|"navigate"|"records">("safety");
 const [plan,setPlan]=useState<TripPlan>(DEFAULT);
 const [ready,setReady]=useState(false);
 const [fix,setFix]=useState<Fix|null>(null);
 const [gpsError,setGpsError]=useState("Acquiring GPS…");
 const [mapTracking,setMapTracking]=useState(false);
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
 useEffect(()=>{
  const show=()=>{setOpen(true);setTab("safety");};
  const tracking=(event:Event)=>setMapTracking(!!(event as CustomEvent<{tracking:boolean}>).detail?.tracking);
  window.addEventListener("grace-field-open-mission",show);
  window.addEventListener("grace-field-tracking-state",tracking);
  return()=>{window.removeEventListener("grace-field-open-mission",show);window.removeEventListener("grace-field-tracking-state",tracking);};
 },[]);
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
   window.dispatchEvent(new Event("grace-field-v2-start-track"));
   setMessage("Guardian trip started. Requested breadcrumb recording; verify the green TRACKING status before leaving. You must separately share your trip plan with your contact.");
   if(typeof Notification!=="undefined"&&Notification.permission==="default")void Notification.requestPermission().catch(()=>{});
 }
 function stopTrip(){if(!window.confirm("Finish Guardian Angel trip? Check-in reminders will stop. Confirm your safe return with your contact."))return;
   setPlan(old=>addRecord({...old,startedAt:null,nextCheckAt:null},"event","Guardian Angel trip ended. Confirm safe return with your contact.",fix));setMessage("Guardian reminders ended. If your map is still recording, press STOP TRACK. Contact your trusted person to confirm safe return.");}
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
 const action:React.CSSProperties={...btn,minHeight:44,fontSize:12,letterSpacing:.3,borderRadius:9,background:"linear-gradient(135deg,#172c22,#0a1913)",borderColor:"#9d855f",color:"#f3e9d6"};
 const card:React.CSSProperties={...box,marginTop:10,padding:"13px 12px",borderRadius:11,borderColor:"#806b4a",background:"linear-gradient(135deg,#0e2119,#07140e)"};
 const eyebrow:React.CSSProperties={...label,fontSize:10,letterSpacing:1.4};
 const val:React.CSSProperties={fontSize:14,fontWeight:800,color:"#fff2d9"};
 const pair:React.CSSProperties={display:"grid",gridTemplateColumns:"repeat(2,minmax(0,1fr))",gap:8};
 const caption:React.CSSProperties={fontSize:11,color:"#c1cbb9",lineHeight:1.55,marginTop:6};
 const kpi:React.CSSProperties={border:"1px solid #7a7154",borderRadius:9,padding:"10px 8px",background:"#071810",minWidth:0};
 const isLate = !!overdue || missedCount>1;
 return <div role="presentation" style={{position:"fixed",inset:0,zIndex:22000,background:"#020805e8",display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
  <section role="dialog" aria-modal="true" aria-label="Guardian Angel" style={{width:"100%",maxWidth:610,maxHeight:"min(97dvh,1000px)",overflowY:"auto",overscrollBehavior:"contain",background:"linear-gradient(165deg,#0b1f17,#07120e 70%,#030a07)",color:"#f8ecdb",border:"1px solid #c6a36a",borderRadius:"18px 18px 0 0",boxShadow:"0 -18px 55px #000d",padding:"15px 12px calc(env(safe-area-inset-bottom,0px) + 24px)",fontFamily:"system-ui,-apple-system,Segoe UI,sans-serif"}}>
   <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:9,paddingBottom:12,borderBottom:"1px solid #6a6547"}}>
    <div style={{display:"flex",gap:12,alignItems:"center"}}><span aria-hidden="true" style={{height:42,width:42,display:"grid",placeItems:"center",background:"#152c20",border:"1px solid #bfa16f",borderRadius:11}}><GuardianGlyph name="shield" size={27}/></span><div><div style={{...eyebrow,letterSpacing:2.2}}>GRACE FIELD / STAY SAFE</div><h2 style={{margin:"3px 0 0",fontFamily:"Georgia,serif",letterSpacing:1,fontSize:24,fontWeight:500,color:"#f0d198"}}>GUARDIAN ANGEL</h2></div></div>
    <button type="button" aria-label="Close Guardian Angel" style={{...action,width:43,minWidth:43,padding:0,fontSize:24}} onClick={()=>setOpen(false)}>×</button>
   </div>
   <div style={{...card,display:"flex",alignItems:"center",gap:11,borderColor:isLate?"#cb7457":active?"#8bce99":"#b49766"}}>
    <GuardianGlyph name={isLate?"warning":"shield"} size={30}/>
    <div style={{flex:1}}><div style={eyebrow}>TRIP STATUS</div><div style={{...val,fontSize:16,color:isLate?"#ffa58e":active?"#a0eab2":"#e9cb95"}}>{!active?"READY TO START":overdue?"RETURN TIME OVERDUE":missedCount>=2?"MISSED CHECK-INS":checkDue?"CHECK-IN DUE":"GUARDIAN ACTIVE"}</div><div style={caption}>{active?`Trip time ${clock(now-(plan.startedAt??now))} · ${missedCount} missed check-in(s)`:"Set your plan and tell a trusted person before you leave"}</div></div>
   </div>
   {(overdue||checkDue)&&<div role="alert" style={{...card,borderColor:"#d89067",background:"#381f17",color:"#ffe0b6",fontSize:13,fontWeight:800}}>{overdue?"RETURN TIME PASSED":"CHECK-IN REMINDER OVERDUE"}<p style={{fontSize:11,fontWeight:400,margin:"5px 0 0"}}>These are reminders on your device only. NO automatic alert was delivered to your trusted contact.</p></div>}
   <div style={{...pair,marginTop:9}}>
    <div style={kpi}><div style={eyebrow}>GPS FIX</div><div style={{...val,color:fresh?"#a5e6b2":"#f1bb87",marginTop:5}}>{fresh?"● LIVE":"● WAITING"}</div><div style={caption}>{fix?`±${Math.round(fix.accuracy*3.28084)} ft · ${Math.max(0,Math.round((now-fix.time)/1000))}s old`:gpsError}</div></div>
    <div style={kpi}><div style={eyebrow}>BREADCRUMB TRAIL</div><div style={{...val,color:mapTracking?"#a5e6b2":"#e7b887",marginTop:5}}>{mapTracking?"● TRACKING":"NOT RECORDING"}</div><div style={caption}>{active?"Started by Guardian only if GPS tracking is permitted":"Start Guardian to request tracking"}</div></div>
   </div>
   <div style={{display:"grid",gridTemplateColumns:"repeat(3,minmax(0,1fr))",gap:6,marginTop:10}}>
    {(["safety","navigate","records"] as const).map(t=><button type="button" key={t} style={{...action,background:tab===t?"#584429":"#0d2118",borderColor:tab===t?"#e0b87b":"#746346",padding:"9px 2px",fontSize:11}} onClick={()=>setTab(t)}>{t==="safety"?"TRIP & SOS":t==="navigate"?"NAVIGATION":"FIELD LOG"}</button>)}
   </div>
   {tab==="safety"&&<>
    <div style={card}>
     <div style={{display:"flex",gap:8,alignItems:"center"}}><GuardianGlyph name="person"/><div style={eyebrow}>TRUSTED CONTACT</div></div>
     <div style={{...pair,marginTop:7}}><label style={caption}>Contact name<input style={field} autoComplete="name" placeholder="Who knows you're out there?" value={plan.contactName} onChange={e=>setPlan(v=>({...v,contactName:e.target.value}))}/></label><label style={caption}>Phone number<input type="tel" autoComplete="tel" style={field} placeholder="Mobile number" value={plan.contactPhone} onChange={e=>setPlan(v=>({...v,contactPhone:e.target.value}))}/></label></div>
     <div style={caption}>Your contact is not automatically monitored or notified. Share your trip plan before heading out.</div>
    </div>
    <div style={card}>
     <div style={{display:"flex",gap:8,alignItems:"center"}}><GuardianGlyph name="clock"/><div style={eyebrow}>TRIP PLAN & CHECK-IN SCHEDULE</div></div>
     <label style={caption}>Destination<input style={field} placeholder="Ridge stand / Campsite / Creek" value={plan.destinationName} onChange={e=>setPlan(v=>({...v,destinationName:e.target.value}))}/></label>
     <div style={{...pair,marginTop:9}}><label style={caption}>Expected return<input type="datetime-local" style={{...field,colorScheme:"dark"}} value={plan.returnAt} onChange={e=>setPlan(v=>({...v,returnAt:e.target.value}))}/></label><label style={caption}>Check-in reminder<select style={field} value={plan.checkInterval} onChange={e=>setPlan(v=>({...v,checkInterval:Number(e.target.value),nextCheckAt:v.startedAt?Date.now()+Number(e.target.value)*60000:null}))}>{[10,15,30,45,60,90,120].map(v=><option key={v} value={v}>Every {v} min</option>)}</select></label></div>
     <div style={{...pair,marginTop:9}}><div style={kpi}><div style={eyebrow}>NEXT REMINDER</div><div style={{...val,marginTop:5}}>{!active?"NOT STARTED":checkDue?"DUE NOW":new Date(plan.nextCheckAt??now).toLocaleTimeString([],{hour:"numeric",minute:"2-digit"})}</div></div><div style={kpi}><div style={eyebrow}>MISSED CHECK-INS</div><div style={{...val,marginTop:5,color:missedCount>=2?"#ff9b84":"#f5d8ac"}}>{missedCount} · LOCAL ONLY</div></div></div>
    </div>
    <div style={card}>
     <div style={{display:"flex",gap:8,alignItems:"center"}}><GuardianGlyph name="location"/><div style={eyebrow}>CURRENT GPS POSITION</div></div>
     <div style={{...val,fontVariantNumeric:"tabular-nums",marginTop:10,overflowWrap:"anywhere"}}>{coords}</div><div style={caption}>{fresh?`Accuracy ±${Math.round(fix!.accuracy)} meters`:"A fresh accurate GPS reading is required before sharing your location."}</div>
     <div style={{...pair,marginTop:9}}><button style={{...action,background:"#145132",borderColor:"#83be8f"}} disabled={!fresh} onClick={()=>void sendCheckIn()}>PREPARE CHECK-IN</button><button style={action} disabled={!fresh} onClick={()=>void share(`Guardian Angel GPS position: ${coords} | ${gpsLink} | Accuracy ±${fix?Math.round(fix.accuracy):"?"} m`,"Grace Field position")}>SHARE GPS POSITION</button></div>
     <div style={caption}>Manual sharing opens the phone's share menu. Select a recipient and press Send; this is NOT a continuously updating live location link.</div>
    </div>
    <div style={{...pair,marginTop:10}}><div style={{...kpi,textAlign:"center"}}><div style={eyebrow}>TRIP CLOCK</div><div style={{...val,fontSize:21,marginTop:6,fontVariantNumeric:"tabular-nums"}}>{active?clock(now-(plan.startedAt??now)):"00:00:00"}</div></div><div style={{...kpi,textAlign:"center"}}><div style={eyebrow}>RETURN TIME</div><div style={{...val,fontSize:15,marginTop:9}}>{plan.returnAt?localDateTime(plan.returnAt):"NOT SET"}</div></div></div>
    <div style={{...pair,marginTop:10}}><button style={action} onClick={()=>void share(planText,"Grace Field Guardian trip plan")}>SHARE TRIP PLAN</button><button style={action} onClick={()=>setTab("navigate")}>DESTINATION / TRAIL BACK</button></div>
    <button style={{...action,width:"100%",minHeight:51,marginTop:10,fontSize:13,fontWeight:900,background:active?"linear-gradient(145deg,#6b2d24,#341712)":"linear-gradient(145deg,#f1ce90,#bc8745)",color:active?"#fff1e8":"#132017",borderColor:"#f3d08c"}} onClick={active?stopTrip:startTrip}>{active?"END GUARDIAN SESSION · CONFIRM SAFE RETURN":"START GUARDIAN SESSION + REQUEST GPS TRACK"}</button>
    <div style={{...card,borderColor:"#b6594e",background:"linear-gradient(145deg,#311611,#170a08)"}}>
     <div style={{display:"flex",gap:8,alignItems:"center",color:"#ffd0b5"}}><GuardianGlyph name="warning"/><div style={{...eyebrow,color:"#ffd0b5"}}>EMERGENCY SOS</div></div>
     <div style={caption}>Prepares an SOS message with your last verified coordinates, or opens emergency calling. Grace cannot send without confirmation.</div>
     <div style={{...pair,marginTop:9}}><button type="button" style={{...action,background:"#6c2822",borderColor:"#d38c78"}} onClick={smsContact}>PREPARE SOS TEXT</button><a href="tel:911" style={{...action,display:"grid",placeItems:"center",textDecoration:"none",background:"#58201e",borderColor:"#df9484"}}>CALL 911</a></div>
     {contactNumber&&<a href={`tel:${contactNumber}`} style={{...action,display:"grid",placeItems:"center",marginTop:8,textDecoration:"none"}}>CALL {plan.contactName||"TRUSTED CONTACT"}</a>}
    </div>
   </>}
   {tab==="navigate"&&<>
    <div style={card}><div style={{display:"flex",gap:8,alignItems:"center"}}><GuardianGlyph name="compass"/><div style={eyebrow}>DESTINATION BEARING</div></div>
     <label style={caption}>Destination name<input style={field} placeholder="Ridge Top Stand" value={newDestName} onChange={e=>setNewDestName(e.target.value)}/></label>
     <div style={{...pair,marginTop:7}}><input style={field} inputMode="decimal" aria-label="Destination latitude" placeholder="Latitude" value={newLat} onChange={e=>setNewLat(e.target.value)}/><input style={field} inputMode="decimal" aria-label="Destination longitude" placeholder="Longitude" value={newLng} onChange={e=>setNewLng(e.target.value)}/></div>
     <button style={{...action,width:"100%",marginTop:10}} onClick={setDestination}>SET DESTINATION</button>
     {plan.destination&&<div style={{color:"#f6d9a4",marginTop:10,fontWeight:800}}>{plan.destination.name}{fresh&&fix&&<div style={{fontSize:26}}>{Math.round(bearing(fix,plan.destination))}° · {(distance(fix,plan.destination)/1609.344).toFixed(2)} mi</div>}</div>}
     <div style={caption}>Straight-line true-north bearing only. Not trail-aware routing or obstacle avoidance.</div>
    </div>
    <div style={card}><div style={eyebrow}>FIELD NAVIGATION</div>
     <button style={{...action,width:"100%",marginTop:9}} onClick={()=>{setOpen(false);window.dispatchEvent(new Event("grace-field-v2-trail-back"));}}>FOLLOW RECORDED TRAIL BACK</button>
     <button style={{...action,width:"100%",marginTop:8}} onClick={()=>{setOpen(false);window.dispatchEvent(new Event("grace-field-open-waypoint-library"));}}>OPEN SAVED STANDS & LOCATIONS</button>
     <div style={caption}>The app displays your recorded GPS breadcrumb line. Trail Back is only as accurate as GPS and is not an emergency rescue service.</div>
    </div>
   </>}
   {tab==="records"&&<>
    <div style={card}><div style={eyebrow}>FIELD NOTES & OBSERVATIONS</div><textarea style={{...field,minHeight:90,resize:"vertical"}} placeholder="Wildlife, weather, hazards, access notes…" value={note} onChange={e=>setNote(e.target.value)}/>
     <div style={{...pair,marginTop:9}}><button style={action} onClick={addObservation}>SAVE NOTE</button><button style={action} onClick={exportRecords}>EXPORT TRIP LOG</button></div></div>
    <div style={card}><div style={eyebrow}>CHECK-IN & TRIP HISTORY · {plan.records.length}</div>
     {plan.records.length===0?<p style={caption}>Check-ins and notes appear here after you record them.</p>:plan.records.slice(0,80).map(r=><div key={r.id} style={{borderTop:"1px solid #495a46",marginTop:10,paddingTop:10,fontSize:12}}><div style={{color:"#e4c08a",fontSize:10}}>{r.kind.toUpperCase()} · {new Date(r.time).toLocaleString()}</div><div style={{marginTop:4}}>{r.text}</div>{r.lat!==null&&r.lng!==null&&<div style={caption}>{r.lat.toFixed(5)}, {r.lng.toFixed(5)}</div>}</div>)}
    </div>
   </>}
   {message&&<div role="status" style={{...card,borderColor:"#b9a275",background:"#23382a",fontSize:12,color:"#f2dda9"}}>{message}</div>}
   <p style={{...caption,marginTop:15,padding:"0 3px"}}>SAFETY LIMIT: GPS tracking and reminders depend on Grace running with permissions and power. Automatic emergency SMS, closed-app monitoring, and actual live-location links are NOT provided. Tell a trusted person your route and return time; carry a separate navigation and emergency backup.</p>
  </section>
 </div>;
}
