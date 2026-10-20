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
 const query="[out:json][timeout:12];("+filters(kind,near).join(";")+";);out center 60;";
 const endpoints=["https://overpass.kumi.systems/api/interpreter","https://overpass.nchc.org.tw/api/interpreter","https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter"];
 const failures:string[]=[];
 for(const endpoint of endpoints){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),6500);
  try{
   const url=endpoint+"?data="+encodeURIComponent(query);
   const res=await fetch(url,{method:"GET",headers:{"Accept":"application/json","User-Agent":"GraceField/1.0 (outdoor map lookup)","Referer":"https://grace-assistant.vercel.app/"},signal:controller.signal,cache:"no-store"});
   if(!res.ok){failures.push(new URL(endpoint).host+": HTTP "+res.status);continue;}
   const data=await res.json() as {elements?:Element[]};
   const places=(data.elements||[]).flatMap((e):Place[]=>{
    const a=e.lat??e.center?.lat,b=e.lon??e.center?.lon;
    if(typeof a!=="number"||typeof b!=="number")return [];
    const t=e.tags||{};
    return [{name:(t.name||t["name:en"]||"Unnamed mapped location").slice(0,100),description:[t.tourism,t.leisure,t.route,t.highway,t.water,t.waterway,t.fishing,t.operator].filter(Boolean).join(" / ").slice(0,120)||"Community-mapped outdoor feature",lat:a,lng:b,distanceKm:distance(lat,lng,a,b)}];
   }).filter(p=>p.distanceKm<=radius/1000+0.5);
   return places.sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,12);
  }catch(e){failures.push(new URL(endpoint).host+": "+(e instanceof Error?e.name:"network error"));}
  finally{clearTimeout(timer);}
 }
 throw new Error(failures.join("; ")||"Public map providers unavailable");
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
 const latParam=req.nextUrl.searchParams.get("lat"),lngParam=req.nextUrl.searchParams.get("lng");
 const lat=Number(latParam),lng=Number(lngParam),kind=req.nextUrl.searchParams.get("kind");
 if(!latParam||!lngParam||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||!["fishing","hiking","camping"].includes(kind||""))
  return NextResponse.json({error:"Invalid coordinates or activity"},{status:400});
 const radii=[16093,40234,80467];
 const errors:string[]=[];
 // Independent POI search first. A mapped river is NOT proof of public access.
 for(const radius of radii){
  try{
   const places=await queryArcGis(lat,lng,kind!,radius);
   if(places.length)return NextResponse.json({kind,places,searchRadiusMiles:Math.round(radius/1609.344),source:"ArcGIS POI data; public access, fish species and regulations not verified"},{headers:{"Cache-Control":"private, max-age=300"}});
  }catch(e){errors.push("ArcGIS: "+(e instanceof Error?e.message:"unavailable"));break;}
 }
 // Fallback to community maps, limited to one radius to avoid long waits.
 try{
  const places=await queryOsm(lat,lng,kind!,16093);
  if(places.length)return NextResponse.json({kind,places,searchRadiusMiles:10,source:"OpenStreetMap community data; access, species and regulations not verified"},{headers:{"Cache-Control":"private, max-age=300"}});
 }catch(e){errors.push("OpenStreetMap: "+(e instanceof Error?e.message:"unavailable"));}
 if(errors.length===2)return NextResponse.json({error:"Outdoor search providers unavailable. No access or species verified.",detail:errors.join("; ")},{status:503});
 return NextResponse.json({kind,places:[],searchRadiusMiles:50,source:"No matching mapped destinations; this does not establish whether public access exists"},{headers:{"Cache-Control":"private, max-age=300"}});
}
