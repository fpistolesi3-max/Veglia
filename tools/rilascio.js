/* Rigenera index.html da ultima-veglia.html.
   La sorgente di verità è una sola: il gioco. index.html ne è la copia
   installabile, cioè lo stesso file più i meta della PWA, l'icona in base64 e
   la registrazione del service worker. Farlo a mano vuol dire prima o poi
   pubblicare una versione vecchia: si fa da qui.
   Uso:  node tools/rilascio.js                                         */
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..');
const src = path.join(dir, 'ultima-veglia.html');
const out = path.join(dir, 'index.html');

let html = fs.readFileSync(src, 'utf8');

// l'icona viaggia dentro la pagina: l'app installata dalla schermata Home
// deve poter partire anche senza rete al primo avvio
const icona = fs.readFileSync(path.join(dir, 'icona180.png')).toString('base64');
const dataURI = 'data:image/png;base64,' + icona;

const meta = [
  '<meta name="apple-mobile-web-app-title" content="Ultima Veglia">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="apple-touch-icon" href="' + dataURI + '">',
  '<link rel="icon" type="image/png" href="' + dataURI + '">'
].join('\n');

if (!html.includes('<title>')) throw new Error('manca <title> in ultima-veglia.html');
html = html.replace('<title>', meta + '\n<title>');

const avvio = '/* ─────────── AVVIO ─────────── */';
if (!html.includes(avvio)) throw new Error('manca il blocco AVVIO in ultima-veglia.html');
html = html.replace(avvio,
  "if('serviceWorker' in navigator&&location.protocol.startsWith('http'))\n" +
  "  navigator.serviceWorker.register('sw.js').catch(()=>{});\n\n" + avvio);

fs.writeFileSync(out, html);

// la cache del service worker va rinfrescata, se no chi ha già installato
// l'app resta alla versione vecchia
const swFile = path.join(dir, 'sw.js');
const sw = fs.readFileSync(swFile, 'utf8');
const ver = (sw.match(/ultima-veglia-v(\d+)/) || [])[1];
console.log(`scritto index.html — ${html.length} byte, icona ${icona.length} byte in base64`);
console.log(`sw.js è alla cache v${ver}: se il gioco è cambiato dev'essere salita.`);
