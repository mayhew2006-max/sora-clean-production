"use client";
import {useState} from "react";
type Place={id:string;name:string;label:string;lat:number;lng:number;zoom:number;kind:string};
export default function FieldPlaceSearch({open,onClose,onChoose}:{open:boolean;onClose:()=>void;onChoose:(place:Place,activity:string)=>void}){
 const [query,setQuery]=useState("");const [loading,setLoading]=useState(false);const [error,setError]=useState("");
 const [results,setResults]=useState<Place[]>([]);const [activity,setActivity]=useState("explore");
 async function search(e:React.FormEvent){e.preventDefault();if(loading)return;setLoading(true);setError("");setResults([]);
  try{const response=await fetch("/api/field-place-search?q="+encodeURIComponent(query.trim()),{cache:"no-store"});
   const data=await response.json();
   if(!response.ok)throw new Error(String(data.error||"Search unavailable"));
   setResults(Array.isArray(data.results)?data.results:[]);
   if(!data.results?.length)setError("No places found. Try a more specific name, city, or state.");
  }catch(e){setError(e instanceof Error?e.message:"Place search failed");}
  finally{setLoading(false);}
 }
 if(!open)return null;
 const button:React.CSSProperties={border:"1px solid #bfa574",borderRadius:9,background:"#1c392c",color:"#fff1d7",padding:"10px 12px"};
 return <section role="dialog" aria-label="Find places worldwide" data-grace-field-overlay="true" style={{position:"absolute",zIndex:3500,inset:"calc(env(safe-area-inset-top, 0px) + 80px) 10px auto",maxWidth:540,margin:"0 auto",background:"#10231c",color:"#f9ead2",border:"1px solid #cfb078",borderRadius:17,padding:15,maxHeight:"75dvh",overflowY:"auto",boxShadow:"0 12px 35px #000b"}}>
  <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10}}><strong style={{fontSize:20,color:"#eac88e"}}>🔎 Find Places</strong><button style={button} onClick={onClose}>CLOSE</button></div>
  <p style={{fontSize:12,color:"#c9d2c5"}}>Search destinations anywhere. Results are temporary until you choose to save a waypoint.</p>
  <form onSubmit={search} style={{display:"flex",gap:7}}>
   <input aria-label="Destination search" required minLength={3} maxLength={100} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Jennings Randolph Lake, WV…" style={{flex:1,minWidth:0,borderRadius:9,padding:12,background:"#20392d",border:"1px solid #937b53",color:"#fff"}}/>
   <button type="submit" disabled={loading||query.trim().length<3} style={{...button,opacity:loading?.6:1}}>{loading?"Searching…":"SEARCH"}</button>
  </form>
  <label style={{display:"grid",gap:5,margin:"13px 0",fontSize:12,color:"#e5d09d"}}>What are you considering at this place?
   <select value={activity} onChange={e=>setActivity(e.target.value)} style={{...button,width:"100%"}}>
    <option value="explore">Explore / look around</option>
    <option value="camp">Camping</option>
    <option value="fish">Fishing</option>
    <option value="hunt">Hunting</option>
    <option value="hike">Hiking</option>
    <option value="paddle">Paddling</option>
   </select>
  </label>
  {error&&<p role="alert" style={{fontSize:13,color:"#ffcb9e"}}>{error}</p>}
  {results.map(place=><button type="button" key={place.id} onClick={()=>onChoose(place,activity)} style={{...button,width:"100%",marginTop:8,textAlign:"left",display:"grid",gap:4}}>
    <strong>{place.label}</strong><span style={{fontSize:11,opacity:.8}}>{place.kind} · {place.lat.toFixed(4)}, {place.lng.toFixed(4)} · VIEW ON MAP</span>
  </button>)}
  <p style={{fontSize:11,color:"#c4b99e",lineHeight:1.5,marginTop:12}}>Place data © OpenStreetMap contributors, via Photon. A pin is an approximate mapped location, NOT confirmed public access, a campsite, fishing access, safe water, or a navigable trail.</p>
 </section>;
}
