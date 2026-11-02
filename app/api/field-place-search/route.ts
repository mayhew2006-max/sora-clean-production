import {NextRequest,NextResponse} from "next/server";

/** Grace Field's interactive, manual place finder.
 * Photon public demo is for low-volume prototyping only. No autocomplete,
 * background lookups or bulk queries; replace with a provisioned geocoder
 * before releasing to a large customer base.
 */
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Place={id:string;name:string;label:string;lat:number;lng:number;zoom:number;kind:string};
const cache=new Map<string,{until:number;results:Place[]}>();
let lastRequest=0;
function goodNumber(n:unknown){const v=Number(n);return Number.isFinite(v)?v:null;}
function chooseZoom(kind:string,value:string){
 if(kind==="place")return /^(city|town|municipality|county|state)$/.test(value)?10:12;
 if(kind==="natural"&&/^(water|bay|beach|coastline)$/.test(value))return 12;
 if(kind==="waterway")return 12;
 if(kind==="tourism"&&/^(camp_site|caravan_site)$/.test(value))return 15;
 return 14;
}
export async function GET(req:NextRequest){
 const query=(req.nextUrl.searchParams.get("q")||"").trim().replace(/\s+/g," ");
 if(query.length<3||query.length>100)
   return NextResponse.json({error:"Enter a place name between 3 and 100 characters."},{status:400});
 const key=query.toLocaleLowerCase("en-US"),now=Date.now();
 const hit=cache.get(key);
 if(hit&&hit.until>now)return NextResponse.json({results:hit.results,source:"OpenStreetMap / Photon",temporary:true});
 // Globally rate-limited in each server process. This public demo is unsuitable
 // for substantial production volume; never add a search-as-you-type client.
 if(now-lastRequest<1600)return NextResponse.json({error:"Place search is cooling down. Try again in a moment."},{status:429,headers:{"Retry-After":"2"}});
 lastRequest=now;
 try{
  const url=new URL("https://photon.komoot.io/api/");
  url.searchParams.set("q",query);
  url.searchParams.set("limit","7");
  url.searchParams.set("lang","en");
  const response=await fetch(url.toString(),{
    signal:AbortSignal.timeout(10000),
    headers:{"Accept":"application/json","User-Agent":"GraceField/0.1 (https://github.com/mayhew2006-max/sora-clean-production)"}
  });
  if(!response.ok)throw new Error("Place search provider returned "+response.status);
  const data=await response.json();
  const features=Array.isArray(data?.features)?data.features:[];
  const results:Place[]=[];
  const seen=new Set<string>();
  for(const feature of features){
    const p=feature?.properties,coordinates=feature?.geometry?.coordinates;
    if(!p||!Array.isArray(coordinates))continue;
    const lng=goodNumber(coordinates[0]),lat=goodNumber(coordinates[1]);
    if(lat===null||lng===null||Math.abs(lat)>90||Math.abs(lng)>180)continue;
    const name=String(p.name||p.city||p.street||"").trim().slice(0,100);
    if(!name)continue;
    const kind=String(p.osm_key||"place").slice(0,35),value=String(p.osm_value||"").slice(0,35);
    const id=String(p.osm_type||"N").slice(0,3)+":"+String(p.osm_id||results.length).slice(0,40);
    if(seen.has(id))continue;
    seen.add(id);
    const fragments=[name,p.city,p.county,p.state,p.country]
      .filter((x):x is string=>typeof x==="string"&&x.trim().length>0)
      .map(s=>s.trim()).filter((s,i,a)=>a.findIndex(x=>x.toLocaleLowerCase()===s.toLocaleLowerCase())===i);
    results.push({id,name,label:fragments.join(", ").slice(0,180),lat,lng,kind:kind+(value?"/"+value:""),zoom:chooseZoom(kind,value)});
  }
  if(cache.size>80)cache.clear();
  cache.set(key,{until:now+20*60*1000,results});
  return NextResponse.json({results,source:"OpenStreetMap / Photon",temporary:true});
 }catch{
  return NextResponse.json({error:"Place search is unavailable. Try again later, or choose a location directly on the map."},{status:503});
 }
}
