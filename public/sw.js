// Grace Field offline shell v3: same-origin resources ONLY.
// Never cache API calls, personal responses, third-party map tiles or login pages.
const CACHE_NAME="grace-offline-shell-v3";
const CORE_PAGES=["/field","/chat"];
const CORE_ASSETS=["/grace-field-logo.webp","/grace-avatar.png","/manifest.webmanifest"];

function localAsset(url) {
  if(url.origin!==self.location.origin)return false;
  if(url.pathname.startsWith("/api/"))return false;
  if(/\/(?:login|pay|admin|auth|account)(?:\/|$)/.test(url.pathname))return false;
  return url.pathname.startsWith("/_next/static/") ||
    /^\/(?:icons\/|grace-field-logo|grace-avatar)/.test(url.pathname) ||
    url.pathname==="/manifest.webmanifest";
}
async function store(cache,request,response) {
  if(response.ok && response.type!=="opaque" && !response.redirected &&
     (!response.headers.get("content-type")?.includes("text/html") || !request.url.includes("/_next/"))) {
    await cache.put(request,response.clone()).catch(()=>{});
  }
}
async function warmField(extraPaths=[]) {
  const cache=await caches.open(CACHE_NAME);
  let successful=0;
  const paths=[...new Set([...CORE_PAGES,...CORE_ASSETS,...extraPaths])];
  const batches=[];
  for(let i=0;i<paths.length;i+=8)batches.push(paths.slice(i,i+8));
  for(const batch of batches){
    await Promise.all(batch.map(async pathname=>{
      const url=new URL(pathname,self.location.origin);
      if(!CORE_PAGES.includes(url.pathname) && !localAsset(url))return;
      // Native launch URLs add unique timestamps; use a stable cache key.
      url.search="";
      try{
        const req=new Request(url.href,{credentials:"same-origin",cache:"reload"});
        const res=await fetch(req,{signal:AbortSignal.timeout(9000)});
        if(res.ok&&!res.redirected && (CORE_PAGES.includes(url.pathname)
          ? res.headers.get("content-type")?.includes("text/html")
          : true)) {
          await store(cache,req,res); successful++;
        }
      }catch{}
    }));
  }
  const ready=(await Promise.all(CORE_PAGES.map(p=>cache.match(new URL(p,self.location.origin)))))
    .every(Boolean);
  return {ready,successful};
}
self.addEventListener("install",event=>{
  self.skipWaiting();
  event.waitUntil(warmField().catch(()=>null));
});
self.addEventListener("activate",event=>{
  event.waitUntil((async()=>{
    const names=await caches.keys();
    await Promise.all(names.filter(x=>x.startsWith("grace-")&&x!==CACHE_NAME)
      .map(x=>caches.delete(x)));
    await self.clients.claim();
  })());
});
self.addEventListener("message",event=>{
  if(event.data?.type!=="GRACE_PREPARE_OFFLINE")return;
  const port=event.ports?.[0];
  event.waitUntil(warmField(Array.isArray(event.data.assets)?
    event.data.assets.filter(s=>typeof s==="string").slice(0,150):[])
    .then(result=>port?.postMessage(result))
    .catch(()=>port?.postMessage({ready:false,successful:0})));
});
self.addEventListener("fetch",event=>{
  const request=event.request;
  if(request.method!=="GET")return;
  const url=new URL(request.url);
  if(url.origin!==self.location.origin || url.pathname.startsWith("/api/"))return;
  const isPage=request.mode==="navigate"&&CORE_PAGES.includes(url.pathname);
  if(isPage){
    const normalized=new Request(new URL(url.pathname,self.location.origin).href);
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      try{
        const response=await fetch(request,{signal:AbortSignal.timeout(4500)});
        if(response.ok&&!response.redirected&&response.headers.get("content-type")?.includes("text/html")){
          await store(cache,normalized,response);
        }
        return response;
      }catch{
        if(url.pathname==="/chat" && await cache.match(new URL("/field",self.location.origin))){
          // Android launches /chat; when disconnected, give a dependable
          // offline entrance to Field rather than running cloud-only chat.
          const html=`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="background:#10231c;color:#f7e4bc;font:17px system-ui;padding:35px 18px;text-align:center"><h1 style="color:#d6b477">GRACE FIELD</h1><h2>Offline Field Mode</h2><p>Live AI, research and map imagery need internet. Saved local GPS markers and trail tools may work if prepared.</p><a href="/field" style="display:block;margin:30px auto;max-width:320px;padding:17px;background:#285a3a;border:2px solid #d6b477;border-radius:12px;color:#fff;text-decoration:none;font-weight:bold">OPEN OFFLINE FIELD MAP</a><p style="font-size:13px">The map may be blank without downloaded terrain. Check your GPS accuracy and surroundings; never rely on Grace as your only navigation tool.</p></body></html>`;
          return new Response(html,{status:200,headers:{"content-type":"text/html; charset=utf-8","cache-control":"no-store"}});
        }
        return (await cache.match(normalized))||
          new Response("Grace Field offline shell has not been prepared. Connect once and open Field.",{
            status:503,headers:{"content-type":"text/plain; charset=utf-8"}});
      }
    })());
    return;
  }
  if(localAsset(url)){
    // Cache-first for hashed assets, network-first for other same-origin assets.
    event.respondWith((async()=>{
      const cache=await caches.open(CACHE_NAME);
      const saved=await cache.match(request);
      if(saved && url.pathname.startsWith("/_next/static/"))return saved;
      try{
        const response=await fetch(request);
        if(response.ok)event.waitUntil(store(cache,request,response));
        return response;
      }catch{return saved||Response.error();}
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
