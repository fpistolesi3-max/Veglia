/* L'Ultima Veglia — service worker v11
   Per la pagina si prova PRIMA la rete: così un aggiornamento caricato su
   GitHub si vede al primo avvio con connessione, senza dover toccare nulla.
   La cache resta come riserva per l'uso offline.
   La v11 aggiunge la colonna sonora delle schermate. */
const CACHE='ultima-veglia-v13';
/* La colonna sonora è l'unico pezzo grosso che non sta dentro la pagina: si
   scarica una volta e resta in cache, come le icone. In base64 dentro l'HTML
   peserebbe undici mega e il rete-prima la riscaricherebbe a ogni avvio. */
const FILES=['./','./index.html','./manifest.webmanifest','./icona180.png','./icona540.png',
  './colonna-sonora.mp3'];

self.addEventListener('install',e=>{
  e.waitUntil(
    caches.open(CACHE)
      .then(c=>Promise.allSettled(
        FILES.map(f=>c.add(new Request(f,{cache:'reload'})))))
      .then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate',e=>{
  e.waitUntil(
    caches.keys()
      .then(k=>Promise.all(k.filter(x=>x!==CACHE).map(x=>caches.delete(x))))
      .then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const html = e.request.mode==='navigate' ||
    (e.request.headers.get('accept')||'').includes('text/html');

  if(html){
    // rete prima, cache solo se la rete manca
    e.respondWith(
      fetch(new Request(e.request.url,{cache:'reload',credentials:'same-origin'}))
        .then(res=>{
          const copia=res.clone();
          caches.open(CACHE).then(c=>c.put('./index.html',copia));
          return res;
        })
        .catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  // il resto (icone, manifest) resta cache-first: non cambia quasi mai
  e.respondWith(
    caches.match(e.request).then(hit=>hit||fetch(e.request).then(res=>{
      const copia=res.clone();
      caches.open(CACHE).then(c=>c.put(e.request,copia));
      return res;
    }).catch(()=>caches.match('./index.html')))
  );
});
