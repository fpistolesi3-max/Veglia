/* Bilanciamento delle quaterne.
   Da quando gli edifici sono otto e in campo se ne portano quattro, il
   bersaglio del bilanciamento non è più «le quattro torri»: è *qualunque
   quaterna legale*. Questo banco gioca la stessa partita con quaterne diverse
   e mette gli esiti uno accanto all'altro.
   Non serve che siano tutte uguali — serve che nessuna sia una scelta
   sbagliata a prescindere, e che nessuna renda la veglia una passeggiata.

   La quaterna di riferimento è quella storica: su quella sono tarati i numeri
   di ATTO, ed è l'unica riga che deve restare identica nel tempo.

   Uso:  node tools/quaterne.js            le quaterne di prova
         node tools/quaterne.js spine,ossario,salmodia,mangano
         node tools/quaterne.js tutte 2    ogni scambio singolo, solo atto 2  */
const { carica } = require('./harness.js');
const { T, G } = carica();

const dt = 1 / 60;

// le lastre libere che toccano la via, in ordine di percorrenza: le stesse
// posizioni per ogni quaterna, così a cambiare è solo che cosa ci si erige
function ordineVia(a) {
  const ord = new Map(); const wp = T.WPS[a] || T.WPS[1]; let n = 0;
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
/* Le lastre su cui vale la pena erigere, dalla migliore alla peggiore.
   Il criterio è quanta via sta a tiro, non da dove la via comincia: un angolo
   dove il sentiero torna su sé stesso vale il doppio di un rettilineo, ed è lì
   che un giocatore mette la prima torre. Ordinare per «inizio del percorso»
   ammassa tutto all'imbocco e fa morire la Veglia alla prima ondata — che
   apre con 130 lacrime e zero sigilli e non perdona un acquisto sprecato. */
const RAGGIO = 45;                       // gittata tipica al primo grado
function posti(a) {
  const ord = ordineVia(a); const cand = [];
  const vie = [...ord.keys()].map(k => ({ c: k % T.COLS, r: (k / T.COLS) | 0, q: ord.get(k) }));
  for (let r = 0; r < T.ROWS; r++) for (let c = 0; c < T.COLS; c++) {
    if (T.grid[r][c] !== 0) continue;
    const x = c * T.TILE + 8, y = r * T.TILE + 8;
    let copre = 0, q = Infinity;
    for (const v of vie) {
      const dx = v.c * T.TILE + 8 - x, dy = v.r * T.TILE + 8 - y;
      if (dx * dx + dy * dy <= RAGGIO * RAGGIO) { copre++; if (v.q < q) q = v.q; }
    }
    if (copre) cand.push({ c, r, q, copre });
  }
  cand.sort((x, y) => y.copre - x.copre || x.q - y.q || (x.r - y.r) || (x.c - y.c));
  return cand;
}

function veglia(a, quaterna0) {
  T.startScen(a, quaterna0);
  // Una quaterna è un insieme, non una lista: in campo il giocatore erige
  // quello che gli serve, non quello che ha messo nel primo riquadro. Senza
  // ordinare, la casella in cui è finito un edificio decide da sola l'esito e
  // il banco finisce per misurare l'ordine invece del valore.
  // L'ordine è per costo diviso gittata: quanta via si copre per lacrima
  // spesa. Non è un'euristica neutra — nessuna lo è — ma è quella che apre
  // come apre un giocatore, e soprattutto è la stessa per tutte le quaterne.
  // Il metro assoluto resta sim.js, con le sue posizioni scelte a mano.
  const valore = k => T.TOWERS[k].cost / T.TOWERS[k].range;
  const quaterna = quaterna0.slice().sort((p, q) => valore(p) - valore(q));
  const coda = posti(a).slice();
  // La rotazione non è rigida: se il prossimo tipo non è pagabile si prova il
  // successivo, e si torna su quello lasciato indietro appena si può. Un
  // giocatore fa così, e senza questo la Veglia — che apre con 130 lacrime e
  // zero sigilli — muore alla prima ondata per aver speso male i primi due
  // acquisti, qualunque quaterna abbia in mano.
  let giro = 0;
  const bot = () => {
    while (coda.length) {
      const riserva = G.towers.length >= 6 ? 260 : 0;
      let scelto = -1;
      for (let k = 0; k < quaterna.length; k++) {
        const i = (giro + k) % quaterna.length;
        if (G.lacrime - riserva >= T.TOWERS[quaterna[i]].cost) { scelto = i; break; }
      }
      if (scelto < 0) break;
      const p = coda.shift();
      T.place(quaterna[scelto], p.c, p.r); G.sel = null; G.build = null;
      giro = scelto + 1;
    }
    for (const t of G.towers) {
      if (t.lv >= T.MAXLV) continue;
      const costo = Math.round(T.TOWERS[t.type].cost * T.UPMUL[t.lv - 1]);
      if (G.lacrime > costo + (coda.length ? 200 : 0)) { G.sel = t; T.upgrade(); G.sel = null; }
    }
  };
  for (let w = 1; w <= 20; w++) {
    bot(); T.startWave();
    let g = 0;
    while (G.waveOn && g++ < 60 * 600) {
      T.update(dt);
      if (G.state !== 'play') break;
      if (g % 120 === 0) bot();
    }
    if (G.state === 'over') return { esito: 'x' + G.wave, sig: 0 };
    if (G.state === 'won') return { esito: 'OK', sig: G.sigilli, torri: G.towers.length };
  }
  return { esito: '?', sig: G.sigilli };
}

const BASE = T.QUATERNA_BASE;
const NUOVE = T.TORDER.filter(k => BASE.indexOf(k) < 0);

let quaterne;
const arg = process.argv[2];
const soloAtto = Number(process.argv[3]) || 0;
if (arg && arg !== 'tutte') {
  quaterne = [arg.split(',')];
} else if (arg === 'tutte') {
  // ogni edificio nuovo al posto di ognuno dei quattro storici, senza ripetere
  // gli insiemi che coincidono
  quaterne = [BASE.slice()];
  const visti = new Set([BASE.slice().sort().join()]);
  for (const n of NUOVE) for (let i = 0; i < BASE.length; i++) {
    const q = BASE.slice(); q[i] = n;
    const chiave = q.slice().sort().join();
    if (visti.has(chiave)) continue;
    visti.add(chiave); quaterne.push(q);
  }
} else {
  quaterne = [
    BASE.slice(),                                          // il riferimento
    ['ossario', 'braciere', 'campana', 'reliquiario'],     // macina al posto del tiro
    ['spine', 'braciere', 'salmodia', 'reliquiario'],      // sostegno al posto del rallentamento
    ['spine', 'braciere', 'campana', 'mangano'],           // colpo grosso al posto della gittata
    ['spine', 'arpione', 'campana', 'reliquiario'],        // arretra al posto dell'area
    ['ossario', 'salmodia', 'mangano', 'arpione']          // solo i nuovi
  ];
}

const atti = soloAtto ? [soloAtto] : [1, 2, 3];
console.log('\nesito per quaterna — OK = venti ondate compiute, xN = caduta alla N');
console.log('fra parentesi i sigilli rimasti alla fine: è il margine');
console.log('\nLa colonna VEGLIA vale poco: si apre con 130 lacrime e zero sigilli, cioè con');
console.log('due edifici, e a decidere l\'esito è *quali* due il banco compra — non la');
console.log('quaterna. Il confronto si legge su DISCESA e GIUDIZIO, che aprono con di che');
console.log('erigerne sei o più. Questo banco è anche un gradino più debole di sim.js:');
console.log('un OK qui vuol dire «meglio dei quattro storici», non «facile».\n');
const intest = atti.map(a => T.ATTO[a].nome.replace(/^(LA|IL) /, '').padEnd(11)).join(' ');
console.log('  ' + ''.padEnd(46) + intest);
for (const q of quaterne) {
  const et = q.map(k => T.TOWERS[k].short.slice(0, 4).toLowerCase()).join('+');
  const celle = atti.map(a => {
    const r = veglia(a, q);
    return (r.esito === 'OK' ? `OK (${r.sig})` : r.esito).padEnd(11);
  });
  const rif = q.join() === BASE.join() ? ' ◄ riferimento' : '';
  console.log('  ' + et.padEnd(46) + celle.join(' ') + rif);
}
console.log();
