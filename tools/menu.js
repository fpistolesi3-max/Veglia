/* Screenshot del fondale in parallasse delle schermate — il pixel art
   non si giudica dal codice.
   Richiede: npm install
   Uso:  node tools/menu.js [atto] [secondi] [file.png] [zoom] [largh] [alt]
   Es.:  node tools/menu.js 2 0 discesa.png 3 375 812
   La misura predefinita è quella di un iPhone: la composizione dipende dal
   rapporto dello schermo, giudicarla su una finestra quadrata non serve.
   I secondi servono a controllare la cucitura del loop: due scatti a
   distanza di mezzo giro non devono mostrare righe verticali.
   Lo zoom è a fattore intero e senza interpolazione: è esattamente come
   la tela viene mostrata sul telefono.                                 */
const fs = require('fs');
const { carica } = require('./harness.js');

const atto = Number(process.argv[2]) || 1;
const secondi = process.argv[3] === undefined ? 0 : Number(process.argv[3]);
const out = process.argv[4] || 'menu.png';
const zoom = Math.max(1, Math.round(Number(process.argv[5]) || 3));
const vw = Number(process.argv[6]) || 375;
const vh = Number(process.argv[7]) || 812;

const { T, G, registro } = carica({ grafica: true });
registro.app.clientWidth = vw;
registro.app.clientHeight = vh;
if (atto > 1) T.applyAct(atto);
G.act = atto;
T.menuBgFit();
T.buildMenuBg();

// il tempo avanza a passi da 1/60: gli scorrimenti sono cumulativi
const passi = Math.max(1, Math.round(secondi * 60));
for (let i = 0; i < passi; i++) T.drawMenuBg(secondi === 0 ? 0 : 1 / 60);

const { createCanvas } = require('@napi-rs/canvas');
const big = createCanvas(T.mcv.width * zoom, T.mcv.height * zoom);
const bx = big.getContext('2d');
bx.imageSmoothingEnabled = false;
bx.drawImage(T.mcv, 0, 0, big.width, big.height);

fs.writeFileSync(out, big.toBuffer('image/png'));
console.log(`scritto ${out} — atto ${G.act}, ${secondi}s, ` +
  `tela ${T.mcv.width}x${T.mcv.height} a zoom ${zoom}`);
