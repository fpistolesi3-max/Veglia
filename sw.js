/* Tiene il gioco in memoria: dopo la prima apertura funziona senza rete. */
const CACHE='ultima-veglia-v1';
const FILES=['./','./index.html','./manifest.webmanifest','./icona180.png','./icona540.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE)
    .then(c=>Promise.allSettled(FILES.map(f=>c.add(f))))
    .then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys()
    .then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x))))
    .then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      const copia=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copia));
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
