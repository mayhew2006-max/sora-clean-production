import { chargeGraceApiRequest } from "@/lib/grace-usage-guard";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Element = { lat?: number; lon?: number; center?: {lat:number;lon:number}; tags?:Record<string,string> };
type Place = {name:string;description:string;lat:number;lng:number;distanceKm:number};
const RAD=Math.PI/180;
function distance(a:number,b:number,c:number,d:number){
 const x=(c-a)*RAD,y=(d-b)*RAD,z=Math.sin(x/2)**2+Math.cos(a*RAD)*Math.cos(c*RAD)*Math.sin(y/2)**2;
 return 12742*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));
}
function filters(kind:string,near:string){
 if(kind==="fishing")return [
  'nwr["leisure"="fishing"]'+near,
  'nwr["fishing"]'+near,
  'nwr["waterway"="access_point"]'+near,
  'nwr["waterway"="river"]["name"]'+near,
  'nwr["waterway"="stream"]["name"]'+near,
  'nwr["water"="river"]["name"]'+near,
  'nwr["leisure"="marina"]'+near,
  'nwr["water"="lake"]["name"]'+near,
  'nwr["water"="reservoir"]["name"]'+near
 ];
 if(kind==="hiking")return [
  'nwr["route"="hiking"]'+near,
  'nwr["route"="foot"]'+near,
  'nwr["highway"="path"]["name"]'+near,
  'nwr["highway"="footway"]["name"]'+near,
  'nwr["tourism"="information"]["information"="guidepost"]'+near
 ];
 return [
  'nwr["tourism"="camp_site"]'+near,
  'nwr["tourism"="caravan_site"]'+near,
  'nwr["tourism"="wilderness_hut"]'+near
 ];
}
async function queryOsm(lat:number,lng:number,kind:string,radius:number):Promise<Place[]>{
 const near="(around:"+radius+","+lat+","+lng+")";
 // Keep queries small: large river/stream geometries and unnamed paths can overwhelm public servers.
 const selected=kind==="fishing"
  ? ['nwr["leisure"="fishing"]'+near,'nwr["waterway"="access_point"]'+near,'nwr["fishing"]'+near]
  : kind==="hiking"
  ? ['nwr["route"="hiking"]'+near,'nwr["highway"="path"]["name"]'+near]
  : ['nwr["tourism"="camp_site"]'+near,'nwr["tourism"="caravan_site"]'+near];
 const query="[out:json][timeout:8];("+selected.join(";")+";);out center 35;";
 const endpoints=["https://overpass.kumi.systems/api/interpreter","https://overpass-api.de/api/interpreter"];
 const attempts=endpoints.map(async endpoint=>{
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),4500);
  try{
   const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body:"data="+encodeURIComponent(query),signal:controller.signal,cache:"no-store"});
   if(!res.ok)throw new Error("HTTP "+res.status);
   const data=await res.json() as {elements?:Element[]};
   return (data.elements||[]).flatMap((e):Place[]=>{
    const a=e.lat??e.center?.lat,b=e.lon??e.center?.lon;
    if(typeof a!=="number"||typeof b!=="number")return [];
    const t=e.tags||{};
    return [{name:(t.name||t["name:en"]||"Unnamed mapped location").slice(0,100),description:[t.tourism,t.leisure,t.route,t.highway,t.waterway,t.fishing,t.operator].filter(Boolean).join(" / ").slice(0,120)||"Community-mapped outdoor feature",lat:a,lng:b,distanceKm:distance(lat,lng,a,b)}];
   }).filter(p=>p.distanceKm<=radius/1000+0.5).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,12);
  }finally{clearTimeout(timer);}
 });
 // The first responding server wins; do not wait for every provider to time out.
 try{return await Promise.any(attempts);}catch{return [];}
}

async function queryNominatim(lat:number,lng:number,kind:string):Promise<Place[]>{
 // Independent geocoding fallback: returns mapped destinations, NOT proof of public access.
 const term=kind==="fishing"?"fishing":kind==="hiking"?"hiking trail":"campground";
 const deltaLat=0.29,deltaLng=0.29/Math.max(0.25,Math.cos(lat*RAD));
 const box=[lng-deltaLng,lat+deltaLat,lng+deltaLng,lat-deltaLat].join(",");
 const params=new URLSearchParams({q:term,format:"jsonv2",limit:"15",viewbox:box,bounded:"1",addressdetails:"0"});
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),5500);
 try{
  const res=await fetch("https://nominatim.openstreetmap.org/search?"+params,{headers:{"Accept":"application/json","User-Agent":"GraceField/1.0 (https://grace-assistant.vercel.app)"},signal:controller.signal,cache:"no-store"});
  if(!res.ok)return [];
  const rows=await res.json() as {lat?:string;lon?:string;display_name?:string;type?:string;category?:string}[];
  return rows.flatMap((p):Place[]=>{
   const a=Number(p.lat),b=Number(p.lon);
   if(!Number.isFinite(a)||!Number.isFinite(b))return [];
   const d=distance(lat,lng,a,b);
   if(d>32.187)return [];
   return [{name:String(p.display_name||"Mapped outdoor destination").split(",")[0].slice(0,100),description:"OpenStreetMap place search / "+String(p.type||p.category||"destination")+"; access and activity unverified",lat:a,lng:b,distanceKm:d}];
  }).sort((a,b)=>a.distanceKm-b.distanceKm);
 }catch{return [];}finally{clearTimeout(timer);}
}

type ArcCandidate = {address?:string;location?:{x:number;y:number};attributes?:Record<string,string|number|null>};
async function queryArcGis(lat:number,lng:number,kind:string,radiusMeters:number):Promise<Place[]>{
 const categories:Record<string,string>={fishing:"Fishing",hiking:"Hiking Trail",camping:"Campground"};
 const params=new URLSearchParams({
  f:"json",category:categories[kind],location:lng+","+lat,
  distance:String(Math.round(radiusMeters)),outFields:"*",maxLocations:"20"
 });
 const controller=new AbortController();
 const timer=setTimeout(()=>controller.abort(),6500);
 try{
  const res=await fetch("https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer/findAddressCandidates?"+params.toString(),{signal:controller.signal,cache:"no-store"});
  if(!res.ok)throw new Error("ArcGIS HTTP "+res.status);
  const data=await res.json() as {error?:{message?:string};candidates?:ArcCandidate[]};
  if(data.error)throw new Error(data.error.message||"ArcGIS search error");
  return (data.candidates||[]).flatMap((p):Place[]=>{
   const x=p.location?.x,y=p.location?.y;
   if(typeof x!=="number"||typeof y!=="number")return [];
   const d=distance(lat,lng,y,x);
   if(d>radiusMeters/1000+0.5)return [];
   const name=String(p.attributes?.PlaceName||p.address||"Mapped outdoor destination").slice(0,100);
   return [{name,description:"ArcGIS mapped point of interest; access and activity not independently verified",lat:y,lng:x,distanceKm:d}];
  }).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,12);
 }finally{clearTimeout(timer);}
}
export async function GET(req:NextRequest){
 const quotaFailure = await chargeGraceApiRequest(req);
 if (quotaFailure) return quotaFailure;
 const latParam=req.nextUrl.searchParams.get("lat"),lngParam=req.nextUrl.searchParams.get("lng");
 const lat=Number(latParam),lng=Number(lngParam),kind=req.nextUrl.searchParams.get("kind");
 if(!latParam||!lngParam||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||!["fishing","hiking","camping"].includes(kind||""))
  return NextResponse.json({error:"Invalid coordinates or activity"},{status:400});
 // Independent providers are queried concurrently to avoid serial 20+ second waits.
 const [arc,osm,nominatim]=await Promise.allSettled([
  queryArcGis(lat,lng,kind!,32187),
  queryOsm(lat,lng,kind!,32187),
  queryNominatim(lat,lng,kind!)
 ]);
 const sources=[
  {result:arc,label:"ArcGIS mapped point of interest"},
  {result:osm,label:"OpenStreetMap mapped feature"},
  {result:nominatim,label:"OpenStreetMap place search"}
 ];
 const combined:Place[]=[];
 for(const source of sources){
  if(source.result.status!=="fulfilled")continue;
  for(const place of source.result.value){
   if(combined.some(p=>distance(p.lat,p.lng,place.lat,place.lng)<0.12))continue;
   combined.push(place);
  }
 }
 combined.sort((a,b)=>a.distanceKm-b.distanceKm);
 const nearby=combined.filter(p=>p.distanceKm<=32.187);
 const sourceLabel=sources.filter(p=>p.result.status==="fulfilled"&&p.result.value.length).map(p=>p.label).join("; ");
 return NextResponse.json({
  kind,places:nearby.slice(0,20),searchRadiusMiles:20,
  source:sourceLabel||"No matching destinations returned by public map services",
  notice:"Mapped features do not verify legal public access, fish species, regulations or trail permissions. Confirm locally before visiting.",
  ...(nearby.length===0?{warning:"No mapped destinations found. Providers may be unavailable; this does not prove none exist."}:{})
 },{headers:{"Cache-Control":"private, max-age=300"}});
}
