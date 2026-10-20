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
  'nwr["waterway"="fish_pass"]'+near,
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
 const query="[out:json][timeout:8];("+filters(kind,near).join(";")+";);out center 30;";
 const endpoints=["https://overpass-api.de/api/interpreter","https://overpass.private.coffee/api/interpreter"];
 const failures:string[]=[];
 for(const endpoint of endpoints){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),5500);
  try{
   const res=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({data:query}),signal:controller.signal,cache:"no-store"});
   if(!res.ok){failures.push(new URL(endpoint).host+": HTTP "+res.status);continue;}
   const data=await res.json() as {elements?:Element[]};
   const places=(data.elements||[]).flatMap((e):Place[]=>{
    const a=e.lat??e.center?.lat,b=e.lon??e.center?.lon;
    if(typeof a!=="number"||typeof b!=="number")return [];
    const t=e.tags||{};
    return [{name:(t.name||t["name:en"]||"Unnamed mapped location").slice(0,100),description:[t.tourism,t.leisure,t.route,t.highway,t.water,t.fishing,t.operator].filter(Boolean).join(" / ").slice(0,120)||"Community-mapped outdoor feature",lat:a,lng:b,distanceKm:distance(lat,lng,a,b)}];
   }).filter(p=>p.distanceKm<=radius/1000+0.5);
   return places.sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,12);
  }catch(e){failures.push(new URL(endpoint).host+": "+(e instanceof Error?e.name:"network error"));}
  finally{clearTimeout(timer);}
 }
 throw new Error(failures.join("; ")||"Public map providers unavailable");
}
export async function GET(req:NextRequest){
 const latParam=req.nextUrl.searchParams.get("lat"),lngParam=req.nextUrl.searchParams.get("lng");
 const lat=Number(latParam),lng=Number(lngParam),kind=req.nextUrl.searchParams.get("kind");
 if(!latParam||!lngParam||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||!["fishing","hiking","camping"].includes(kind||""))
  return NextResponse.json({error:"Invalid coordinates or activity"},{status:400});
 // Expand only after a successful empty result. Provider failures are not evidence of no locations.
 const radii=[16093,40234,80467]; // 10, 25, 50 miles
 try{
  for(const radius of radii){
   const places=await queryOsm(lat,lng,kind!,radius);
   if(places.length)return NextResponse.json({kind,places,searchRadiusMiles:Math.round(radius/1609.344),source:"OpenStreetMap community data; public access, species and regulations not verified"},{headers:{"Cache-Control":"private, max-age=300"}});
  }
  return NextResponse.json({kind,places:[],searchRadiusMiles:50,source:"OpenStreetMap community data; no mapped matches in searched area"},{headers:{"Cache-Control":"private, max-age=300"}});
 }catch(e){
  console.error("Field discovery provider error",e);
  return NextResponse.json({error:"Public map services unavailable; no conclusion about nearby destinations",detail:e instanceof Error?e.message:"Unknown error"},{status:503});
 }
}
