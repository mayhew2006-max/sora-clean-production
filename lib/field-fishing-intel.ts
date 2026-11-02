/**
 * Fishing planning context for Grace Field. Suggestions are general angling
 * techniques, not evidence a species occurs at a particular waterbody.
 */
export type FishWaterType="lake_or_reservoir"|"river_or_stream"|"pond"|"coast_or_saltwater"|"unclassified";
export type FishingEvidence={title:string;excerpt:string;official:boolean};
export type FishingBrief={
  requestedSpecies:string|null;
  waterType:FishWaterType;
  tactics:string[];
  gaps:string[];
  evidence:FishingEvidence[];
};

const speciesPatterns:ReadonlyArray<[RegExp,string]>=[
  [/\b(walleye|walleyes)\b/i,"walleye"],
  [/\b(smallmouth|smallie|smallies)\b/i,"smallmouth bass"],
  [/\b(largemouth)\b/i,"largemouth bass"],
  [/\b(striped bass|stripers?|rockfish)\b/i,"striped bass"],
  [/\b(bass)\b/i,"bass (species not specified)"],
  [/\b(brook trout|brookie)\b/i,"brook trout"],
  [/\b(rainbow trout)\b/i,"rainbow trout"],
  [/\b(brown trout)\b/i,"brown trout"],
  [/\b(trout)\b/i,"trout (species not specified)"],
  [/\b(crappie|crappies)\b/i,"crappie"],
  [/\b(bluegill|sunfish)\b/i,"panfish"],
  [/\b(catfish|channel cat)\b/i,"catfish"],
  [/\b(yellow perch|perch)\b/i,"perch"],
  [/\b(muskie|musky|muskellunge)\b/i,"muskellunge"],
  [/\b(pike)\b/i,"northern pike"],
  [/\b(flounder|fluke)\b/i,"flounder"],
  [/\b(redfish|red drum|puppy drum)\b/i,"red drum"],
  [/\b(speckled trout|specks)\b/i,"spotted seatrout"],
  [/\b(croaker)\b/i,"croaker"],
  [/\b(bluefish)\b/i,"bluefish"]
];

export function requestedFishSpecies(question:string):string|null {
  for(const [pattern,name] of speciesPatterns)if(pattern.test(question))return name;
  return null;
}
export function classifyFishWater(name:string,notes=""):FishWaterType {
  const value=(name+" "+notes).toLowerCase();
  if(/\b(ocean|surf|seashore|shoreline|beach|coast|sound|inlet|tidal|saltwater|estuary|bay)\b/.test(value))return "coast_or_saltwater";
  if(/\b(river|creek|stream|brook|run|branch|fork)\b/.test(value))return "river_or_stream";
  if(/\b(lake|reservoir|impoundment)\b/.test(value))return "lake_or_reservoir";
  if(/\b(pond)\b/.test(value))return "pond";
  return "unclassified";
}
function tacticsForSpecies(species:string|null):string[] {
 switch(species){
  case "walleye":return ["Consider low-light periods near points, breaklines and transitions if those features actually exist","Slow jigs or bait presentations may be worth trying; adjust depth to conditions"];
  case "smallmouth bass":return ["Look for rock, current seams, points or other hard structure where present","Try bottom-contact or moving presentations and adjust to the fish's response"];
  case "largemouth bass":return ["Check cover, vegetation edges, docks or wood where accessible","Vary retrieve speed and lure profile; water temperature matters more than air temperature"];
  case "bass (species not specified)":return ["Identify whether you're targeting smallmouth, largemouth or another bass before choosing a technique","Look for locally documented structure and change presentations based on conditions"];
  case "trout (species not specified)":
  case "brook trout":
  case "rainbow trout":
  case "brown trout":return ["Look for suitable oxygenated water, seasonal holding areas and current breaks where appropriate","Use tackle and bait or flies allowed under the local regulations"];
  case "crappie":return ["Consider brush, submerged cover and transition edges if present","Small jigs or appropriately sized presentations can be useful"];
  case "panfish":return ["Look for accessible cover or vegetation edges where present","Small hooks or jigs and light tackle can be practical"];
  case "catfish":return ["Consider channel edges, deeper holes and current breaks where present","Match legal baits to the local species and water conditions"];
  case "striped bass":return ["If present, look for current, bait concentrations and channel edges","Tide and water conditions matter in coastal or tidal waters"];
  case "flounder":return ["If present in coastal waters, consider bottom structure and moving water","Check actual tides and regulations; no tide or depth readings are connected yet"];
  case "red drum":
  case "spotted seatrout":
  case "croaker":
  case "bluefish":return ["Consider local tidal movement and bait presence if this is saltwater","Use local species guidance; tides and water temperature have not been measured"];
  default:return ["Confirm your target species and waterbody type before choosing a lure or depth","Treat sunrise, sunset and weather as possible planning windows, not proven bite forecasts"];
 }
}
export function buildFishingBrief(question:string,spotName:string,notes="",evidence:FishingEvidence[]=[]):FishingBrief{
  const requestedSpecies=requestedFishSpecies(question);
  const waterType=classifyFishWater(spotName,notes);
  const gaps=["No verified water temperature or clarity reading","No confirmed fish activity or bite forecast","No verified water level/flow for this exact waterbody","Public access and local regulations not checked"];
  if(waterType==="coast_or_saltwater")gaps.push("No tide, wave or marine hazard forecast has been checked");
  if(!requestedSpecies)gaps.push("Target fish species not specified");
  if(!evidence.some(s=>s.official))gaps.push("Fish presence at this destination has not been verified by an official source");
  return {requestedSpecies,waterType,tactics:tacticsForSpecies(requestedSpecies),gaps,evidence};
}
export async function fetchFishingEvidence(spotName:string,species:string|null):Promise<FishingEvidence[]> {
  const key=process.env.TAVILY_API_KEY;
  const name=spotName.trim().slice(0,100);
  // Avoid searching generic user marker names such as "Fishing Hole" or "Dock".
  if(!key||name.length<5||/^(home|fishing hole|catch|dock|water|pond|lake|river|my spot)$/i.test(name))return [];
  try{
    const search=await fetch("https://api.tavily.com/search",{
      method:"POST",headers:{"Content-Type":"application/json"},
      body:JSON.stringify({api_key:key,query:'"'+name.replace(/["<>]/g,"")+'" fishing '+(species||"species")+" official state wildlife fisheries information",search_depth:"basic",max_results:4}),
      signal:AbortSignal.timeout(6500)
    });
    if(!search.ok)return [];
    const data=await search.json();
    if(!Array.isArray(data?.results))return [];
    const words=name.toLowerCase().split(/\s+/).filter(w=>w.length>=4);
    return data.results.filter((x:unknown):x is Record<string,unknown>=>Boolean(x)&&typeof x==="object")
      .flatMap((x:Record<string,unknown>)=>{
        if(typeof x.url!=="string"||typeof x.content!=="string")return [];
        let hostname="";
        try{hostname=new URL(x.url).hostname.toLowerCase();}catch{return [];}
        const combined=(String(x.title||"")+" "+x.content).toLowerCase();
        // At least one distinctive place-name token must match; unrelated
        // fisheries pages cannot establish species occurrence here.
        if(words.length&&!words.some(w=>combined.includes(w)))return [];
        const official=/(^|\.)gov$|(^|\.)mil$|\.gov\.|\.gc\.ca$|\.gov\.uk$/.test(hostname);
        return [{title:String(x.title||"Fisheries information").slice(0,90),excerpt:x.content.slice(0,850),official}];
      }).slice(0,3);
  }catch{return [];}
}
