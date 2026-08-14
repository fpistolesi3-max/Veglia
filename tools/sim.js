/* Simulazione di bilanciamento: gioca la campagna senza browser.
   Ogni scenario è a sé — si riparte senza torri, con le sole lacrime
   concesse — quindi si simulano uno per uno.
   Uso:  node tools/sim.js [scenario] [ondate]
   Es.:  node tools/sim.js          tutti e tre, venti ondate l'uno
         node tools/sim.js 2        solo la Discesa
         node tools/sim.js 1 45     la Veglia e poi l'infinito fino a 45  */
const path = require('path');
const { carica } = require('./harness.js');
const { T, G } = carica();

// Un giocatore plausibile: costruisce lungo il percorso, poi potenzia,
// poi continua a occupare le lastre libere adiacenti alla via.
//
// Le venti posizioni della Veglia sono scelte a mano e NON si toccano: sono
// il metro con cui sono stati tarati tutti i numeri di ATTO, e cambiarle
// renderebbe incomparabili le simulazioni vecchie e nuove. Gli altri scenari
// hanno un percorso diverso — quelle coordinate finirebbero in mezzo al nulla
// — e le ricavano dalla griglia: le lastre libere che toccano la via, in
// ordine di percorrenza, così il bot erige dall'imbocco verso il cancello
// come farebbe un giocatore.
const BASE1 = [['spine',2,3],['spine',9,3],['spine',3,7],['braciere',5,7],
 ['spine',8,11],['campana',8,9],['braciere',7,11],['reliquiario',4,9],
 ['spine',6,13],['reliquiario',6,15],['braciere',3,11],['campana',4,5],
 ['spine',0,3],['reliquiario',7,5],['braciere',10,11],['spine',4,15],
 ['campana',8,13],['reliquiario',3,5],['braciere',6,7],['spine',10,9]];
// stessa mescolanza della lista a mano: metà spine, il resto diviso in tre
const GIRO = ['spine','spine','braciere','reliquiario','spine','campana'];

// ordine di percorrenza di ogni casella di via, ricavato camminando i vertici
function ordineVia(a) {
  const ord = new Map();
  const wp = T.WPS[a] || T.WPS[1];
  let n = 0;
  for (let i = 0; i < wp.length - 1; i++) {
    const [c1, r1] = wp[i], [c2, r2] = wp[i + 1];
    const dc = Math.sign(c2 - c1), dr = Math.sign(r2 - r1);
    let c = c1, r = r1;
    for (let g = 0; g < 80; g++) {
      const k = r * T.COLS + c;
      if (!ord.has(k)) ord.set(k, n++);
      if (c === c2 && r === r2) break;
      c += dc; r += dr;
    }
  }
  return ord;
}

function piano(a) {
  const ord = ordineVia(a);
  // ogni lastra libera che tocca la via, con l'ordine del tratto più a monte
  const cand = [];
  for (let r = 0; r < T.ROWS; r++) for (let c = 0; c < T.COLS; c++) {
    if (T.grid[r][c] !== 0) continue;
    let q = Infinity;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const v = ord.get((r + dr) * T.COLS + (c + dc));
      if (v !== undefined && v < q) q = v;
    }
    if (q < Infinity) cand.push({ c, r, q });
  }
  // a parità di tratto si scende in ordine di griglia: deve essere ripetibile
  cand.sort((x, y) => x.q - y.q || (x.r - y.r) || (x.c - y.c));
  const tutte = cand.map((p, i) => [GIRO[i % GIRO.length], p.c, p.r]);
  if (a === 1) {
    const usate = new Set(BASE1.map(([, c, r]) => r * T.COLS + c));
    return { base: BASE1.slice(), extra: tutte.filter(([, c, r]) => !usate.has(r * T.COLS + c)) };
  }
  return { base: tutte.slice(0, 20), extra: tutte.slice(20) };
}

function veglia(a, maxOndate) {
  T.startScen(a);
  const { base, extra } = piano(a);
  const coda = base.slice();
  const dt = 1 / 60;
  const bot = () => {
    if (!coda.length && extra.length && G.lacrime > 600) coda.push(extra.shift());
    while (coda.length) {
      const [tipo, c, r] = coda[0];
      // oltre le prime sei non si costruisce a vuoto: si tiene da parte per
      // potenziare, come farebbe un giocatore che ha appena ricominciato
      const riserva = G.towers.length >= 6 ? 260 : 0;
      if (G.lacrime - riserva < T.TOWERS[tipo].cost) break;
      T.place(tipo, c, r); G.sel = null; G.build = null; coda.shift();
    }
    for (const t of G.towers) {
      if (t.lv >= T.MAXLV) continue;
      const costo = Math.round(T.TOWERS[t.type].cost * T.UPMUL[t.lv - 1]);
      if (G.lacrime > costo + (coda.length ? 200 : 0)) { G.sel = t; T.upgrade(); G.sel = null; }
    }
  };
  // Il bot gioca un profilo che comincia adesso: edifici e gradi se li deve
  // guadagnare contando caduti, e la prima Veglia si apre con i quattro storici
  // al primo grado. È voluto — questo banco è il metro di chi comincia, non di
  // chi torna. Chi vuole misurare a gradi liberi chiama T.apriTutto().
  const gradi = () => G.loadout.map(k => `${T.TOWERS[k].short.toLowerCase()} ${T.gradoMax(k)}`).join(' · ');
  console.log(`\n── ${T.ATTO[a].nome} · base HP ×${T.ATTO[a].hp} · ${T.ATTO[a].lac} lacrime ──`);
  console.log(`  gradi in mano all'inizio: ${gradi()}`);
  for (let w = 1; w <= maxOndate; w++) {
    bot();
    T.startWave();
    let g = 0;
    while (G.waveOn && g++ < 60 * 600) {
      T.update(dt);
      if (G.state !== 'play') break;
      if (g % 120 === 0) bot();
    }
    console.log(`  ondata${String(G.wave).padStart(3)}`
      + ` sigilli=${String(G.sigilli).padStart(3)}`
      + ` lacrime=${String(G.lacrime).padStart(6)}`
      + ` torri=${String(G.towers.length).padStart(3)}`
      + ` caduti=${String(G.killed).padStart(5)}`);
    if (G.state === 'over') {
      console.log(`  >>> SCONFITTA all'ondata ${G.wave} di ${T.ATTO[a].nome}`);
      return { a, esito: 'sconfitta', w: G.wave };
    }
    if (G.state === 'won') {
      // venti ondate compiute: oltre si va solo per l'infinito
      if (w >= maxOndate) {
        console.log(`  gradi alla fine: ${gradi()}`);
        console.log(`  === ${T.ATTO[a].nome}: compiuta ===`);
        return { a, esito: 'compiuta', w: G.wave };
      }
      T.endless();
    }
  }
  console.log(`  gradi alla fine: ${gradi()}`);
  console.log(`  === ${T.ATTO[a].nome}: retta fino alla ${G.wave} ===`);
  return { a, esito: 'retta', w: G.wave };
}

const solo = Number(process.argv[2]) || 0;
const ondate = Number(process.argv[3]) || 20;
const esiti = [];
if (solo) esiti.push(veglia(solo, ondate));
else for (let a = 1; a <= T.NSCEN; a++) esiti.push(veglia(a, ondate));

console.log('\n── riepilogo ──');
for (const e of esiti)
  console.log(`  ${T.ATTO[e.a].nome.padEnd(12)} ${e.esito.padEnd(10)} ondata ${e.w}`);
