/* Screenshot delle pergamene — le tappe sigillate, quelle aperte e le veglie
   sospese vanno guardate, non dedotte.
   Richiede: npm install
   Uso:  node tools/mappa.js [sbloccate] [file.png] [zoom] [quale]
   Es.:  node tools/mappa.js 2 mappa2.png 4
         node tools/mappa.js 0 tutto.png 4 mondi
   Con 0 come primo argomento affianca tutti gli stati, uno per riga.
   `quale` vale 'tappe' (di default), 'mondi' o 'tutte'.               */
const fs = require('fs');
const { carica } = require('./harness.js');
const { createCanvas } = require('@napi-rs/canvas');

const quante = Number(process.argv[2]);
const out = process.argv[3] || 'mappa.png';
const zoom = Math.max(1, Math.round(Number(process.argv[4]) || 4));
const quale = process.argv[5] || 'tappe';

const { T } = carica({ grafica: true });
const PROG = T.PROG;
const stati = quante ? [quante] : [];
if (!quante) for (let a = 1; a <= T.NSCEN; a++) stati.push(a);

// che cosa disegnare a ogni riga: la mappa delle veglie, quella dei mondi o
// entrambe affiancate
const viste = quale === 'tutte' ? ['tappe', 'mondi'] : [quale];

const w = T.tcv.width, h = T.tcv.height;
const big = createCanvas(w * zoom * viste.length, h * zoom * stati.length);
const bx = big.getContext('2d');
bx.imageSmoothingEnabled = false;

stati.forEach((unl, i) => {
  PROG.unl = Math.max(1, Math.min(T.NSCEN, unl));
  // gli scenari sotto quello aperto si considerano compiuti, e l'ultimo
  // aperto ha una veglia sospesa: così si vede anche quel segno
  PROG.fin = {};
  for (let a = 1; a < PROG.unl; a++) PROG.fin[a] = true;
  for (const k in T.SAVE) delete T.SAVE[k];
  T.SAVE[PROG.unl] = { act: PROG.unl, wave: 7, towers: [], enemies: [], queue: [] };
  viste.forEach((v, j) => {
    if (v === 'mondi') { T.buildMondi(); T.drawMondi(); }
    else { T.buildTappe(); T.drawTappe(); }
    bx.drawImage(T.tcv, j * w * zoom, i * h * zoom, w * zoom, h * zoom);
  });
});

fs.writeFileSync(out, big.toBuffer('image/png'));
console.log(`scritto ${out} — ${viste.join(' + ')}, stati sbloccati: ${stati.join(', ')}, `
  + `tela ${w}x${h} a zoom ${zoom}`);
