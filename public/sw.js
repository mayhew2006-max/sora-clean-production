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
  for(const pathname of [...CORE_PAGES,...CORE_ASSETS,...extraPaths]){
    const url=new URL(pathname,self.location.origin);
    if(!CORE_PAGES.includes(url.pathname) && !localAsset(url))continue;
    // Use normalized URLs so native launch timestamp query strings never miss.
    url.search="";
    try{
      const req=new Request(url.href,{credentials:"same-origin",cache:"reload"});
      const res=await fetch(req);
      if(res.ok&&!res.redirected && (CORE_PAGES.includes(url.pathname)
        ? res.headers.get("content-type")?.includes("text/html")
        : true)) {
        await store(cache,req,res); successful++;
      }
    }catch {}
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
