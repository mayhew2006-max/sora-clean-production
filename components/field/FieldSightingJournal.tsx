"use client";
import {useEffect,useState} from "react";
type Sighting={id:string;time:string;species:string;count:number;note:string;lat:number|null;lng:number|null};
const KEY="grace-field-sightings-v1";
function load():Sighting[]{try{const raw=JSON.parse(localStorage.getItem(KEY)||"[]");return Array.isArray(raw)?raw.filter((v:unknown)=>v&&typeof v==="object").slice(0,100) as Sighting[]:[];}catch{return [];}}
export default function FieldSightingJournal({open,onClose,position}:{open:boolean;onClose:()=>void;position:[number,number]|null}){
 const [items,setItems]=useState<Sighting[]>([]);
 const [species,setSpecies]=useState("Deer");const [count,setCount]=useState("1");const [note,setNote]=useState("");const [message,setMessage]=useState("");
 useEffect(()=>{if(open){setItems(load());setMessage("");}},[open]);
 function save(){
  const amount=Number(count);
  if(!Number.isInteger(amount)||amount<1||amount>100){setMessage("Enter an animal count from 1 to 100.");return;}
  const entry:Sighting={id:typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():String(Date.now()),time:new Date().toISOString(),species,count:amount,note:note.slice(0,800),lat:position?.[0]??null,lng:position?.[1]??null};
  const next=[entry,...items].slice(0,100);
  try{localStorage.setItem(KEY,JSON.stringify(next));setItems(next);setNote("");setMessage("Sighting saved locally on this device.");}catch{setMessage("Could not save: device storage unavailable.");}
 }
 function remove(id:string){if(!window.confirm("Delete this sighting?"))return;const next=items.filter(x=>x.id!==id);try{localStorage.setItem(KEY,JSON.stringify(next));setItems(next);}catch{setMessage("Storage error; nothing deleted.");}}
 function exportData(){const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),sightings:items},null,2)],{type:"application/json"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="grace-field-sightings.json";a.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);}
 if(!open)return null;
 const input:React.CSSProperties={background:"#12271f",border:"1px solid #9b8056",borderRadius:9,color:"#f8e9d4",padding:10,minWidth:0};
 return <section role="dialog" aria-label="Field sighting journal" style={{position:"absolute",zIndex:3501,top:"calc(env(safe-area-inset-top,0px) + 78px)",left:12,right:12,maxWidth:500,maxHeight:"73dvh",margin:"0 auto",overflowY:"auto",background:"#0d2119",border:"1px solid #c9a66b",borderRadius:17,padding:15,color:"#f2e9db"}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}><strong style={{fontSize:19,color:"#e4c38c"}}>📓 Field Sightings</strong><button onClick={onClose} style={input}>CLOSE</button></div>
  <p style={{fontSize:12,color:"#c8bb9e"}}>Record what you actually observe. Entries are private to this device, not cloud-synced; export a backup before clearing app data.</p>
  <div style={{display:"grid",gridTemplateColumns:"2fr 1fr",gap:8}}>
   <label style={{display:"grid",fontSize:12,gap:5}}>Species<select style={input} value={species} onChange={e=>setSpecies(e.target.value)}>{["Deer","Turkey","Bear","Other"].map(s=><option key={s}>{s}</option>)}</select></label>
   <label style={{display:"grid",fontSize:12,gap:5}}>Count<input style={{...input,width:"100%"}} type="number" min="1" max="100" value={count} onChange={e=>setCount(e.target.value)}/></label>
  </div>
  <textarea value={note} onChange={e=>setNote(e.target.value)} maxLength={800} placeholder="Direction, behavior, wind, trail or stand notes..." style={{...input,display:"block",width:"100%",boxSizing:"border-box",minHeight:82,marginTop:10}}/>
  <div style={{fontSize:11,color:"#c6c7ad",margin:"7px 0"}}>{position?"Includes latest displayed GPS coordinates (verify accuracy first).":"GPS unavailable — entry will have no coordinates."}</div>
  <button onClick={save} style={{...input,background:"#305b3d",fontWeight:800,width:"100%"}}>SAVE OBSERVATION</button>
  {message&&<p role="status" style={{fontSize:12}}>{message}</p>}
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"15px 0 3px"}}><strong>Saved sightings ({items.length})</strong><button onClick={exportData} disabled={!items.length} style={{...input,opacity:items.length?1:.5,fontSize:12}}>EXPORT JSON</button></div>
  {items.length===0&&<p style={{fontSize:13}}>No sightings recorded yet.</p>}
  {items.map(s=><div key={s.id} style={{borderTop:"1px solid #5a644e",padding:"10px 0"}}>
   <div style={{display:"flex",justifyContent:"space-between",gap:10}}><strong>{s.count} × {s.species}</strong><button onClick={()=>remove(s.id)} style={{background:"#442722",border:"1px solid #955e51",borderRadius:7,color:"#fff1df",padding:"5px 9px",fontSize:11}}>Delete</button></div>
   <div style={{fontSize:12,color:"#c9c3a7"}}>{new Date(s.time).toLocaleString()}{s.lat!==null&&s.lng!==null?` · ${Number(s.lat).toFixed(5)}, ${Number(s.lng).toFixed(5)}`:" · No GPS"}</div>
   {s.note&&<div style={{fontSize:13,whiteSpace:"pre-wrap",marginTop:4}}>{s.note}</div>}
  </div>)}
 </section>;
}
