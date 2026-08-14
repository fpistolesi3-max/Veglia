/* Screenshot del gioco senza browser — serve per giudicare la grafica.
   Richiede: npm install
   Uso:  node tools/shot.js [atto] [ondata] [file.png]
   Es.:  node tools/shot.js 3 46 apocalisse.png                        */
const fs = require('fs');
const path = require('path');
const { carica } = require('./harness.js');

const atto = Number(process.argv[2]) || 1;
const ondata = Number(process.argv[3]) || (atto - 1) * 20 + 6;
const out = process.argv[4] || 'scena.png';

const { T, G } = carica({ grafica: true });
T.startGame();
G.lacrime = 999999;
const layout = atto>=4
  ? [['impulso',2,3],['plasma',5,7],['stasi',8,9],['rotaia',4,9],
     ['sciame',6,13],['disturbo',7,11],['impulso',3,7],['plasma',6,15]]
  : [['spine',2,3],['braciere',5,7],['campana',8,9],['reliquiario',4,9],
     ['spine',6,13],['braciere',7,11],['campana',3,7],['reliquiario',6,15]];
const liv = [5,4,5,5,3,4,2,5];
layout.forEach(([t,c,r],i) => {
  T.place(t,c,r);
  const tw = G.towers[G.towers.length-1];
  for (let k = 1; k < liv[i]; k++) { G.sel = tw; T.upgrade(); }
});
G.sel = null; G.build = null; G.lacrime = 600;
if (atto > 1) T.applyAct(atto);
G.wave = ondata - 1;
T.startWave();
for (let i = 0; i < 60 * 26; i++) T.update(1/60);
T.render();
fs.writeFileSync(out, T.cv.toBuffer('image/png'));
console.log(`scritto ${out} — atto ${G.act}, ondata ${G.wave}, ` +
  `in campo: ${[...new Set(G.enemies.map(e => e.type))].join(', ') || 'nessuno'}`);
