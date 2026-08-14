/* Tavola delle sprite su fondo neutro: torri per grado, oppure i nemici
   dei tre atti affiancati. Serve a giudicare leggibilità e silhouette.
   Uso:  node tools/sheet.js torri|nemici [uscita.png] [edificio,edificio]
   Es.:  node tools/sheet.js torri t.png ossario,caldaia,scongiuro
   Con dieci edifici la tavola intera è troppo larga da leggere: indicare
   quali interessano, e restano affiancati grado per grado.               */
const fs = require('fs');
const { createCanvas } = require('@napi-rs/canvas');
const { carica } = require('./harness.js');
const { T } = carica({ grafica: true });
const modo = process.argv[2] || 'torri';
const out = process.argv[3] || (modo + '.png');
const S = T.S;

let righe;
if (modo === 'torri') {
  const quali = process.argv[4] ? process.argv[4].split(',') : T.TORDER;
  righe = [];
  for (let lv = 1; lv <= T.MAXLV; lv++)
    righe.push(quali.map(k => [k + lv, 2]));
} else {
  const ruoli = ['base','fast','tank','ghost','big','boss','final'];
  righe = ruoli.map(r => Array.from({length:T.NSCEN},(_,i)=>i+1)
    .map(a => [T.ROSTER[a][r], r === 'big' || r === 'final' ? 2 : 3]));
}
const PAD = 12, COL = 90;
const W = righe[0].length * COL;
const alt = righe.map(r => Math.max(...r.map(([k,z]) => S[k].cv.height * z)));
const H = alt.reduce((a,b) => a + b + PAD, PAD);
const c = createCanvas(W, H), g = c.getContext('2d');
g.imageSmoothingEnabled = false;
g.fillStyle = '#2a2433'; g.fillRect(0,0,W,H);
g.fillStyle = '#332c3e';
for (let i = 0; i < W; i += 16) for (let j = 0; j < H; j += 16)
  if (((i/16)+(j/16)) % 2) g.fillRect(i,j,16,16);
let y = PAD;
righe.forEach((riga, i) => {
  riga.forEach(([k,z], col) => {
    const sp = S[k].cv, w = sp.width*z, h = sp.height*z;
    g.drawImage(sp, Math.round(col*COL + COL/2 - w/2), y + alt[i] - h, w, h);
  });
  y += alt[i] + PAD;
});
fs.writeFileSync(out, c.toBuffer('image/png'));
console.log('scritto ' + out + ' (' + W + 'x' + H + ')');
