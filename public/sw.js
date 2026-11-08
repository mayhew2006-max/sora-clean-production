// Grace Field offline shell v4. Cache only public same-origin app resources.
// The map provider's online satellite/topo tiles are intentionally NOT cached.
const OFFLINE_VERSION=4;
const CACHE_NAME="grace-offline-shell-v4";
const FIELD_PATH="/field";
const MAP_MARKERS=["blind","cabin","camera","camp","cave","custom","deer","fire",
  "food","game","hole","ramp","saddle","scenic","stand","trail","truck","water"]
  .map(name=>"/field-markers/"+name+".png");
const SHELL_FILES=["/grace-field-logo.webp","/grace-avatar.png","/manifest.json"];
const REQUIRED_FILES=[FIELD_PATH,...MAP_MARKERS,...SHELL_FILES];

function asUrl(value){try{return new URL(value,self.location.origin)}catch{return null}}
function isSafeAsset(url){
  if(!url || url.origin!==self.location.origin)return false;
  if(url.pathname.startsWith("/api/"))return false;
  if(/\/(?:login|pay|admin|auth|account)(?:\/|$)/.test(url.pathname))return false;
  return url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/field-markers/") ||
    url.pathname.startsWith("/icons/") ||
    SHELL_FILES.includes(url.pathname);
}
function isFieldPage(response){
  if(!response.ok || response.type==="opaque")return false;
  const finalUrl=asUrl(response.url);
  return Boolean(finalUrl && finalUrl.pathname.replace(/\/$/,"")===FIELD_PATH &&
    response.headers.get("content-type")?.includes("text/html"));
}
function isUsableAsset(response){
  return response.ok && response.type!=="opaque" &&
    !response.headers.get("content-type")?.includes("text/html") &&
    Boolean(asUrl(response.url)?.origin===self.location.origin);
}
async function saveResponse(cache,key,response){
  try{await cache.put(key,response.clone());return true}catch{return false}
}
function stableFieldRequest(){return new Request(new URL(FIELD_PATH,self.location.origin).href)}
async function cacheStatus(cache,staticAssets=[]){
  const fieldSaved=Boolean(await cache.match(stableFieldRequest()));
  const missingMarkers=[];
  for(const path of MAP_MARKERS)if(!await cache.match(new URL(path,self.location.origin).href))missingMarkers.push(path);
  const missingStatic=[];
  const essentialStatic=staticAssets.filter(path=>{
    const url=asUrl(path);
    return url && url.pathname.startsWith("/_next/static/") && /\.(?:js|css)$/.test(url.pathname);
  });
  for(const path of essentialStatic){
    if(!await cache.match(path,{ignoreSearch:true}))missingStatic.push(asUrl(path)?.pathname||path);
  }
  const keys=await cache.keys();
  const jsCount=keys.filter(req=>asUrl(req.url)?.pathname.startsWith("/_next/static/") &&
    asUrl(req.url)?.pathname.endsWith(".js")).length;
  const cssCount=keys.filter(req=>asUrl(req.url)?.pathname.startsWith("/_next/static/") &&
    asUrl(req.url)?.pathname.endsWith(".css")).length;
  // Cached HTML and imagery alone do NOT prove that the interactive map will run.
  const ready=fieldSaved && missingMarkers.length===0 && missingStatic.length===0 && jsCount>0;
  return {version:OFFLINE_VERSION,ready,fieldSaved,markersSaved:MAP_MARKERS.length-missingMarkers.length,
    markersTotal:MAP_MARKERS.length,jsCount,cssCount,
    missing:[...missingMarkers,...missingStatic].slice(0,8)};
}
async function warmField(extraAssets=[]){
  const cache=await caches.open(CACHE_NAME);
  const candidates=[...new Set([...REQUIRED_FILES,...extraAssets])];
  const safe=candidates.filter(path=>{
    const url=asUrl(path);
    return url && (url.pathname===FIELD_PATH||isSafeAsset(url));
  }).slice(0,180);
  let fetched=0;
  // Concurrent, bounded requests prevent dozens of failed icons from
  // keeping Android waiting for minutes on a weak connection.
  for(let i=0;i<safe.length;i+=12){
    await Promise.all(safe.slice(i,i+12).map(async path=>{
      const url=asUrl(path);
      if(!url)return;
      const isPage=url.pathname===FIELD_PATH;
      if(isPage)url.search="";
      const request=new Request(url.href,{credentials:"same-origin",cache:"reload"});
      try{
        const response=await fetch(request,{signal:AbortSignal.timeout(7500)});
        if(isPage ? isFieldPage(response) : isUsableAsset(response)){
          if(await saveResponse(cache,request,response))fetched++;
        }
      }catch{}
    }));
  }
  const result=await cacheStatus(cache,extraAssets);
  return {...result,fetched};
}
self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(warmField().catch(()=>null));
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const activeCache=await caches.open(CACHE_NAME);
    // Only discard older Grace offline shell revisions after new Field HTML exists.
    // Never delete unrelated caches for other website features.
    if(await activeCache.match(stableFieldRequest())){
      const keys=await caches.keys();
      await Promise.all(keys.filter(key=>/^grace-offline-shell-v\d+$/.test(key) && key!==CACHE_NAME)
        .map(key=>caches.delete(key)));
    }
    await self.clients.claim();
  })());
});
self.addEventListener("message",event=>{
  if(event.data?.type!=="GRACE_PREPARE_OFFLINE")return;
  const port=event.ports?.[0];
  const assets=Array.isArray(event.data.assets)?event.data.assets.filter(x=>typeof x==="string").slice(0,120):[];
  event.waitUntil(warmField(assets).then(result=>port?.postMessage(result))
    .catch(()=>port?.postMessage({version:OFFLINE_VERSION,ready:false,fieldSaved:false,
      markersSaved:0,markersTotal:MAP_MARKERS.length,jsCount:0,cssCount:0,missing:["Cache preparation failed"]})));
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=asUrl(request.url);
  if(!url || url.origin!==self.location.origin || url.pathname.startsWith("/api/"))return;
  const isField=url.pathname.replace(/\/$/,"")===FIELD_PATH;
  const isChat=url.pathname.replace(/\/$/,"")==="/chat";
  if(request.mode==="navigate" && (isField||isChat)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(request,{signal:AbortSignal.timeout(4000)});
        if(isField && isFieldPage(response))await saveResponse(cache,stableFieldRequest(),response);
        return response;
      }catch{
        if(isField){
          const saved=await cache.match(stableFieldRequest());
          if(saved)return saved;
        }
        if(isChat && await cache.match(stableFieldRequest())){
          const html=['<!doctype html><html lang="en"><head><meta charset="utf-8">',
            '<meta name="viewport" content="width=device-width,initial-scale=1"></head>',
            '<body style="background:#10231c;color:#f7e4bc;font:17px system-ui;padding:35px 18px;text-align:center">',
            '<h1 style="color:#d6b477">GRACE FIELD</h1><h2>Offline Field Mode</h2>',
            '<p>Live chat and map imagery need internet. Cached Field tools may work without service.</p>',
            '<a href="/field" style="display:block;margin:30px auto;max-width:320px;padding:17px;background:#285a3a;border:2px solid #d6b477;border-radius:12px;color:white;text-decoration:none;font-weight:bold">OPEN OFFLINE FIELD MAP</a>',
            '<p style="font-size:13px">Downloaded terrain is not included. Verify GPS accuracy and landmarks; never rely on Grace as your only navigation method.</p>',
            '</body></html>'].join("");
          return new Response(html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
        }
        return new Response("Grace Field is not yet prepared. Connect to Wi-Fi, open Field, then use Prepare Offline Field.",
          {status:503,headers:{"content-type":"text/plain; charset=utf-8"}});
      }
    })());
    return;
  }
  if(isSafeAsset(url)){
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const saved=await cache.match(request,{ignoreSearch:true});
      if(saved && (url.pathname.startsWith("/_next/static/") ||
        url.pathname.startsWith("/field-markers/")))return saved;
      try{
        const response=await fetch(request,{signal:AbortSignal.timeout(6500)});
        if(isUsableAsset(response))event.waitUntil(saveResponse(cache,request,response));
        return response;
      }catch{return saved||Response.error()}
    })());
  }
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      title: "Grace",
      body: event.data ? event.data.text() : "",
    };
  }

  const title = data.title || "Grace";

  const options = {
    body:
      data.body ||
      "Grace found something worth checking.",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    data: {
      url: data.url || "/chat",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url =
    event.notification?.data?.url || "/chat";

  event.waitUntil(
    clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    }).then((clientList) => {
      for (const client of clientList) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
