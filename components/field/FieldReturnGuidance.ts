/**
 * Trail Back V2: guidance ONLY along previously recorded GPS breadcrumbs.
 * This never computes a cross-country shortcut or declares terrain safe.
 */
export type Breadcrumb = { lat: number; lng: number; time: string };
export type TrailReturnGuidance = {
  nearestIndex: number;
  distanceToTrailMeters: number;
  recordedDistanceToStartMeters: number;
  nextRecordedPoint: [number, number];
  remainingRecordedPoints: [number, number][];
  largestRecordedGapMeters: number;
  warnings: string[];
  liveGuidanceReliable: boolean;
};
export function trailDistance(a: [number,number], b:[number,number]): number {
  const rad = Math.PI / 180;
  const dLat=(b[0]-a[0])*rad, dLon=(b[1]-a[1])*rad;
  const h = Math.sin(dLat/2)**2 + Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dLon/2)**2;
  return 12742000*Math.asin(Math.sqrt(Math.min(1,h)));
}
const valid=(p:Breadcrumb)=>Number.isFinite(p?.lat)&&Number.isFinite(p?.lng)&&Math.abs(p.lat)<=90&&Math.abs(p.lng)<=180;
export function calculateTrailReturn(
  trail: Breadcrumb[],
  position: [number,number] | null,
  accuracyMeters: number | null,
  gpsFixAt: number | null,
  now: number
): TrailReturnGuidance | null {
  if (trail.length < 2 || !trail.every(valid)) return null;
  const warnings: string[] = [];
  let nearestIndex=trail.length-1;
  let nearestDistance=Infinity;
  if (position && position.every(Number.isFinite)) {
    for(let i=trail.length-1;i>=0;i--){
      const distance=trailDistance(position,[trail[i].lat,trail[i].lng]);
      if(distance<nearestDistance){nearestDistance=distance;nearestIndex=i;}
    }
  }
  let routeMeters=0, largestGap=0;
  for(let i=1;i<trail.length;i++){
    const gap=trailDistance([trail[i-1].lat,trail[i-1].lng],[trail[i].lat,trail[i].lng]);
    largestGap=Math.max(largestGap,gap);
    if(i<=nearestIndex) routeMeters+=gap;
  }
  const fresh = gpsFixAt!==null && now-gpsFixAt>=0 && now-gpsFixAt<60000;
  const accurate=accuracyMeters!==null && Number.isFinite(accuracyMeters) && accuracyMeters<=40;
  const onTrail=position!==null && nearestDistance<=Math.max(60,(accuracyMeters??40)*2);
  if(!position)warnings.push("No live GPS fix: showing your recorded path, not your current route.");
  if(!fresh)warnings.push("GPS fix is stale or unavailable. Do not follow a live direction until it refreshes.");
  if(!accurate)warnings.push("GPS accuracy is insufficient for close breadcrumb guidance (requires ±40 m or better).");
  if(!onTrail && position)warnings.push("You are outside the recorded breadcrumb corridor. No connector route is being invented.");
  if(largestGap>120)warnings.push("Recorded trail contains gaps over 120 m. Terrain between points has not been verified.");
  const remainingRecordedPoints=trail.slice(0,nearestIndex+1).map(p=>[p.lat,p.lng] as [number,number]);
  const step=trail[Math.max(0,nearestIndex-1)];
  return {
    nearestIndex,
    distanceToTrailMeters:nearestDistance,
    recordedDistanceToStartMeters:routeMeters,
    nextRecordedPoint:[step.lat,step.lng],
    remainingRecordedPoints,
    largestRecordedGapMeters:largestGap,
    warnings,
    liveGuidanceReliable:fresh&&accurate&&onTrail&&largestGap<=120
  };
}
