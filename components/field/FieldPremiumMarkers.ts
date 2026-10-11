// Grace Field 2.0: original, self-contained vector map markers.
// No external icon servers or emoji fonts required.
export type MarkerKind = "stand" | "blind" | "camera" | "deer" | "scrape" | "bedding" | "trail" | "food" | "water" | "kill" | "blood" | "hazard" | "parking" | "hole" | "catch" | "structure" | "weed" | "dropoff" | "dock" | "ramp" | "current" | "truck" | "camp" | "cabin" | "fire" | "custom" | "trail-start";
export const markerOptions: {type: MarkerKind; label: string; category: "Hunting"|"Fishing"|"Camping & Base"|"Other"}[] = [
 {type:"stand",label:"Tree Stand",category:"Hunting"},{type:"blind",label:"Ground Blind",category:"Hunting"},{type:"camera",label:"Trail Camera",category:"Hunting"},{type:"deer",label:"Deer Sign",category:"Hunting"},{type:"trail",label:"Game Trail",category:"Hunting"},{type:"food",label:"Food Plot",category:"Hunting"},
 {type:"hole",label:"Fishing Hole",category:"Fishing"},{type:"catch",label:"Catch",category:"Fishing"},{type:"dock",label:"Dock",category:"Fishing"},{type:"ramp",label:"Boat Ramp",category:"Fishing"},{type:"water",label:"Water Source",category:"Fishing"},
 {type:"truck",label:"My Truck",category:"Camping & Base"},{type:"camp",label:"Campsite",category:"Camping & Base"},{type:"cabin",label:"Cabin",category:"Camping & Base"},{type:"fire",label:"Campfire",category:"Camping & Base"},
 {type:"parking",label:"Parking",category:"Other"},{type:"hazard",label:"Hazard",category:"Other"},{type:"custom",label:"Custom Spot",category:"Other"},
];
const icons: Record<string,string> = {
 stand:'<path d="M9 17h22l-3-9H12z"/><path d="M13 17 9 39m18-22 4 22M9 29h22M11 35h18"/><path d="M13 8 20 3l8 5"/>',
 blind:'<path d="M5 20 20 8l15 12v17H5z"/><path d="M14 37V25h12v12M10 19h5m10 0h5"/>',
 camera:'<rect x="9" y="6" width="22" height="30" rx="5"/><circle cx="20" cy="20" r="7"/><circle cx="20" cy="20" r="3"/><path d="M15 11h10m-9 21h8"/>',
 deer:'<path d="M20 20c-5-3-8-2-8 3 0 5 4 11 8 12 4-1 8-7 8-12 0-5-3-6-8-3z"/><path d="M13 22 7 16 5 7m8 9-4-8m4 9-1-10m15 15 6-6 2-9m-8 9 4-8m-4 9 1-10"/><path d="M17 28h6"/>',
 scrape:'<path d="M20 5v29m-9-21 9 8 9-8M9 35h22"/>', bedding:'<path d="M7 30c4-12 22-12 26 0M7 30h26M12 22l-3-7m19 7 3-7"/>',
 trail:'<circle cx="11" cy="15" r="3"/><circle cx="19" cy="11" r="3"/><circle cx="27" cy="15" r="3"/><path d="M11 30c0-7 5-11 9-11s9 4 9 11c0 5-5 5-9 2-4 3-9 3-9-2z"/>',
 food:'<path d="M20 36V8m0 11c-9-1-11-5-10-11 7 0 10 3 10 11zm0 8c9-1 11-5 10-11-7 0-10 3-10 11z"/>',
 water:'<path d="M20 4C15 12 9 19 9 26a11 11 0 0 0 22 0c0-7-6-14-11-22z"/><path d="M14 27c0 4 2 6 6 7"/>',
 kill:'<circle cx="20" cy="20" r="13"/><circle cx="20" cy="20" r="6"/><path d="M20 3v10m0 14v10M3 20h10m14 0h10"/>',
 blood:'<path d="M20 5C16 12 10 20 10 26a10 10 0 0 0 20 0c0-6-6-14-10-21z"/>',
 hazard:'<path d="M20 5 37 35H3z"/><path d="M20 15v10m0 5v1"/>',
 parking:'<rect x="8" y="6" width="24" height="29" rx="5"/><path d="M16 30V12h6c9 0 9 12 0 12h-6"/>',
 hole:'<path d="M5 21c9-13 21-13 29 0-8 13-20 13-29 0z"/><circle cx="13" cy="19" r="2"/><path d="M30 21l7-8v16zM16 27l4-5 4 5"/>',
 catch:'<path d="M5 21c9-13 21-13 29 0-8 13-20 13-29 0z"/><circle cx="13" cy="19" r="2"/><path d="M30 21l7-8v16zM18 13l5-7 3 9"/>',
 structure:'<path d="M5 32 14 9l12 21 9-16M5 32h30"/>',
 weed:'<path d="M20 35V9m0 17C9 24 8 17 9 11c7 1 11 5 11 15zm0 5c11-2 12-9 11-15-7 1-11 5-11 15z"/>',
 dropoff:'<path d="M5 12h30M8 18h13v13h14M29 22l-8 9 8 5"/>',
 dock:'<path d="M7 9v26m9-26v26m9-26v26M4 15h32M4 27h32"/>',
 ramp:'<path d="M6 10h28L20 26zM9 32h22M14 36h12"/>',
 current:'<path d="M4 12c8-7 12 7 20 0s11 0 12 0M4 23c8-7 12 7 20 0s11 0 12 0M4 34c8-7 12 7 20 0s11 0 12 0"/>',
 truck:'<path d="M4 12h20v17H4zM24 18h7l5 6v5H24z"/><circle cx="11" cy="30" r="4"/><circle cx="29" cy="30" r="4"/><path d="M8 16h11"/>',
 camp:'<path d="M20 5 3 34h34zM20 5v29m-8 0 8-14 8 14"/>',
 cabin:'<path d="M5 17 20 6l15 11v19H5zM15 36V24h10v12M8 20h24"/>',
 fire:'<path d="M20 4c6 9-2 10 5 17 2-5 6-6 6-6 6 14-1 21-11 21S4 29 10 17c0 7 5 7 5 7 0-9 5-13 5-20z"/><path d="M20 21c4 6 2 11 0 12-4-2-5-7 0-12z"/>',
 custom:'<path d="M20 37s-13-11-13-21a13 13 0 0 1 26 0c0 10-13 21-13 21z"/><circle cx="20" cy="16" r="5"/>',
 'trail-start':'<path d="M8 29c0-7 5-11 10-11s10 4 10 11M12 13l5-8 5 8M12 33h16"/>',
};
const palette:Record<string,string>={stand:"#D7B579",blind:"#D7B579",camera:"#C9B18C",deer:"#D9BC83",trail:"#98BF83",food:"#94B67C",hole:"#79C9E9",catch:"#79C9E9",dock:"#7DC8DF",ramp:"#7DC8DF",water:"#7DC8DF",truck:"#E2BE86",camp:"#D9A96C",cabin:"#D9A96C",fire:"#F4AD62",hazard:"#EF9881",parking:"#D1D8CA",custom:"#E2C88F"};
export function markerColor(type:string){return palette[type]||"#C7B88C";}
// Filled, layered illustrations designed for clear outdoor satellite maps.
// No emoji fonts, remote image services, or licensing dependencies.
const premiumArt: Record<string,string> = {
 stand:`<path d="M9 16 20 8 31 16" fill="none" stroke="#f7db9b" stroke-width="2.4"/><path d="M11 17h18v8H11z" fill="#926e43" stroke="#edcc89" stroke-width="1.5"/><path d="M14 25 9 39m17-14 5 14M13 34h14M13 29h14" stroke="#d9b77b" stroke-width="2"/><rect x="15" y="18" width="10" height="4" rx="1" fill="#171f17"/><path d="M17 12h6" stroke="#f1d5a0"/>`,
 blind:`<path d="M5 19 20 8l15 11v18H5z" fill="#755e3c" stroke="#e4c386" stroke-width="2"/><path d="M8 20h24M12 26h5m6 0h5" stroke="#e9d2a3" stroke-width="2"/><path d="M15 37V29h10v8" fill="#242d21" stroke="#d8b37a" stroke-width="1.5"/>`,
 camera:`<rect x="9" y="5" width="22" height="34" rx="5" fill="#4d5643" stroke="#ddc79e" stroke-width="2"/><rect x="13" y="9" width="14" height="5" rx="2" fill="#191f19"/><circle cx="20" cy="24" r="9" fill="#1c2725" stroke="#d6b77b" stroke-width="2"/><circle cx="20" cy="24" r="5" fill="#527d80"/><circle cx="18" cy="22" r="2" fill="#b7e1e0"/><circle cx="14" cy="34" r="1.5" fill="#e5b55f"/>`,
 deer:`<path d="M20 18c-6-4-10-1-9 6 1 8 5 12 9 13 4-1 8-5 9-13 1-7-3-10-9-6" fill="#9d6840" stroke="#edcf91" stroke-width="1.6"/><path d="M13 21 6 15 4 5m9 11-4-8m4 9-1-11m15 15 7-6 2-10m-9 11 4-8m-4 9 1-11" fill="none" stroke="#e9cb93" stroke-width="2.6" stroke-linecap="round"/><path d="M16 26h2m4 0h2" stroke="#171c16" stroke-width="2"/><path d="m18 32 2 2 2-2" fill="#30241e"/>`,
 hole:`<path d="M4 23c7-10 20-12 28-3l6-7v19l-6-7c-9 9-22 8-28-2z" fill="#668d94" stroke="#d4e7de" stroke-width="1.6"/><path d="M10 21c8-4 15-4 21 0M9 27c7 3 15 2 22-2" fill="none" stroke="#c3e6e6" stroke-width="2"/><circle cx="12" cy="21" r="2" fill="#142321"/><path d="M19 15 25 9l3 9" fill="#8da5a0" stroke="#d5e7dc"/>`,
 catch:`<path d="M4 23c7-10 20-12 28-3l6-7v19l-6-7c-9 9-22 8-28-2z" fill="#8b9e69" stroke="#e0dfad" stroke-width="1.6"/><path d="M10 21c8-4 15-4 21 0M9 27c7 3 15 2 22-2" fill="none" stroke="#e6e2a6" stroke-width="2"/><circle cx="12" cy="21" r="2" fill="#142321"/><path d="M19 15 25 9l3 9" fill="#b1bd85" stroke="#e6e2a6"/>`,
 truck:`<path d="M3 16h22v15H3z" fill="#c9c9b9" stroke="#f3e3c4" stroke-width="1.5"/><path d="M25 21h7l5 7v3H25z" fill="#a5a89a" stroke="#f3e3c4" stroke-width="1.5"/><path d="M8 19h12v7H8zM28 23h4l3 5h-7z" fill="#263d3b"/><circle cx="11" cy="32" r="4" fill="#222621" stroke="#ddd5bc"/><circle cx="30" cy="32" r="4" fill="#222621" stroke="#ddd5bc"/><circle cx="11" cy="32" r="1.5" fill="#e2d6b5"/><circle cx="30" cy="32" r="1.5" fill="#e2d6b5"/>`,
 camp:`<path d="M20 5 3 36h34z" fill="#bd8b56" stroke="#f2d5a2" stroke-width="1.8"/><path d="M20 5v31L9 36z" fill="#547451"/><path d="M20 19 12 36h16z" fill="#252a20" stroke="#e8bf87" stroke-width="1.4"/><path d="M5 37h30" stroke="#d6a56d" stroke-width="2"/>`,
 cabin:`<path d="M4 17 20 6l16 11v20H4z" fill="#805734" stroke="#edcb8f" stroke-width="1.8"/><path d="M4 17 20 6l16 11" fill="none" stroke="#f4d89f" stroke-width="3"/><path d="M6 24h28M6 29h28M6 34h28" stroke="#bd8d58"/><path d="M16 37V24h9v13" fill="#24251b" stroke="#d8ba85" stroke-width="1.5"/><path d="M9 19h5m13 0h5" stroke="#e9cf9e"/>`,
 fire:`<path d="M9 35 31 39M31 35 9 39" stroke="#bd9165" stroke-width="4" stroke-linecap="round"/><path d="M20 5c7 10-2 12 6 18 2-6 6-8 6-8 6 15-2 22-12 22S4 29 10 17c0 8 5 8 5 8 0-10 5-15 5-20z" fill="#e86d2f" stroke="#ffd08a" stroke-width="1.5"/><path d="M20 18c5 7 4 13 0 16-5-4-5-9 0-16z" fill="#ffe49c"/>`,
 trail:`<circle cx="11" cy="14" r="3" fill="#b4cba0"/><circle cx="19" cy="10" r="3" fill="#b4cba0"/><circle cx="27" cy="14" r="3" fill="#b4cba0"/><path d="M11 30c0-7 5-11 9-11s9 4 9 11c0 5-5 5-9 2-4 3-9 3-9-2z" fill="#94ac7d" stroke="#d6e5b8" stroke-width="1.3"/>`,
 food:`<path d="M20 38V8" stroke="#c9df9e" stroke-width="2.4"/><path d="M20 20C8 19 7 12 9 7c8 1 11 6 11 13zM20 28c12-1 13-8 11-13-8 1-11 6-11 13z" fill="#7fa66d" stroke="#d2e3a3" stroke-width="1.5"/>`,
 water:`<path d="M20 3C14 12 8 20 8 27a12 12 0 0 0 24 0c0-7-6-15-12-24z" fill="#4589b0" stroke="#c0e5ed" stroke-width="1.8"/><path d="M14 27c0 5 3 7 7 8" fill="none" stroke="#c4e9ef" stroke-width="2.2"/>`,
};
export function markerSvg(type:string, size=44, withPin=true){
 const c=markerColor(type);const art=premiumArt[type];
 const base=withPin?`<path d="M20 1.5C9.5 1.5 2.5 9 2.5 19c0 12 17.5 26 17.5 26S37.5 31 37.5 19C37.5 9 30.5 1.5 20 1.5z" fill="url(#pinbg)" stroke="${c}" stroke-width="1.6"/>`:`<circle cx="20" cy="21" r="18" fill="url(#pinbg)" stroke="${c}" stroke-width="1.6"/>`;
 const interior=art||`<g transform="translate(4 5) scale(.8)" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">${icons[type]||icons.custom}</g>`;
 const artGroup=art?`<g transform="translate(5 5) scale(.75)">${art}</g>`:interior;
 return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 40 46" role="img" aria-label="${type.replace(/[^a-z-]/g,'')}"><defs><linearGradient id="pinbg" x1="0" y1="0" x2=".85" y2="1"><stop stop-color="#263e30"/><stop offset=".55" stop-color="#111e17"/><stop offset="1" stop-color="#050b09"/></linearGradient></defs>${base}<path d="M8 15c3-9 15-13 23-5" fill="none" stroke="#ffffff" stroke-opacity=".12" stroke-width="2"/>${artGroup}</svg>`;
}
