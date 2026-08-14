/* I percorsi dei tre scenari affiancati, campo nudo: niente torri, niente
   creature, solo la via. Serve per giudicare la serpentina — quattro traverse
   nella Veglia, tre nella Discesa, due nel Giudizio — e per controllare che i
   bordi del sentiero chiudano e che nessuna decorazione sia caduta lasciando
   la scena spoglia.
   Richiede: npm install
   Uso:  node tools/vie.js [file.png] [zoom]                            */
const fs = require('fs');
const { carica } = require('./harness.js');
const { createCanvas } = require('@napi-rs/canvas');

const out = process.argv[2] || 'vie.png';
const zoom = Math.max(1, Math.round(Number(process.argv[3]) || 2));

const { T } = carica({ grafica: true });
const w = T.cv.width, h = T.cv.height;
const big = createCanvas(w * zoom * T.NSCEN, h * zoom);
const bx = big.getContext('2d');
bx.imageSmoothingEnabled = false;

const conta = () => {
  let n = 0;
  for (let r = 0; r < T.ROWS; r++) for (let c = 0; c < T.COLS; c++)
    if (T.grid[r][c] === 1) n++;
  return n;
};

const caselle = [];
for (let a = 1; a <= T.NSCEN; a++) {
  T.startScen(a);           // rifà percorso, griglia e fondale dell'atto
  caselle.push(conta());
  T.render();
  bx.drawImage(T.cv, (a - 1) * w * zoom, 0, w * zoom, h * zoom);
}

fs.writeFileSync(out, big.toBuffer('image/png'));
console.log(`scritto ${out} — ${T.NSCEN} percorsi a zoom ${zoom}, `
  + `caselle di via: ${caselle.join(' · ')}`);
