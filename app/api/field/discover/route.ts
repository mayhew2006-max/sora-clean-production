import { NextRequest, NextResponse } from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Element={lat?:number;lon?:number;center?:{lat:number;lon:number};tags?:Record<string,string>};
function distance(a:number,b:number,c:number,d:number){const r=Math.PI/180,x=(c-a)*r,y=(d-b)*r,z=Math.sin(x/2)**2+Math.cos(a*r)*Math.cos(c*r)*Math.sin(y/2)**2;return 12742*Math.atan2(Math.sqrt(z),Math.sqrt(1-z));}
export async function GET(req:NextRequest){
 const lat=Number(req.nextUrl.searchParams.get("lat")),lng=Number(req.nextUrl.searchParams.get("lng")),kind=req.nextUrl.searchParams.get("kind");
 if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180||!["fishing","hiking","camping"].includes(kind||""))return NextResponse.json({error:"Invalid location or activity"},{status:400});
 const near="(around:18000,"+lat+","+lng+")";
 const filter=kind==="fishing"?'nwr["leisure"="fishing"]'+near+';nwr["fishing"]'+near+';':kind==="hiking"?'nwr["route"="hiking"]'+near+';nwr["highway"="path"]["name"]'+near+';':'nwr["tourism"="camp_site"]'+near+';nwr["tourism"="caravan_site"]'+near+';nwr["tourism"="wilderness_hut"]'+near+';';
 const query="[out:json][timeout:15];("+filter+");out center 60;";
 try{
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  let res:Response;
  try{res=await fetch("https://overpass.kumi.systems/api/interpreter",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({data:query}),signal:ctrl.signal,cache:"no-store"});}finally{clearTimeout(timer);}
  if(!res.ok)throw new Error("Unavailable");
  const data=await res.json() as {elements?:Element[]};
  const places=(data.elements||[]).flatMap(e=>{const a=e.lat??e.center?.lat,b=e.lon??e.center?.lon;if(typeof a!=="number"||typeof b!=="number")return [];const t=e.tags||{};return [{name:(t.name||t["name:en"]||"Unnamed mapped location").slice(0,100),description:[t.tourism,t.leisure,t.route,t.highway,t.fishing,t.operator].filter(Boolean).join(" / ").slice(0,120)||"Community-mapped outdoor feature",lat:a,lng:b,distanceKm:distance(lat,lng,a,b)}];}).sort((a,b)=>a.distanceKm-b.distanceKm).slice(0,12);
  return NextResponse.json({kind,places,source:"OpenStreetMap community data; access and conditions unverified"},{headers:{"Cache-Control":"private, max-age=300"}});
 }catch{return NextResponse.json({error:"Public map service unavailable"},{status:503});}
}
