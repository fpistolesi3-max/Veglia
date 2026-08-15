/* La matrice dei danni: che cosa arriva davvero addosso.
   Fra il numero scritto in TOWERS e il numero che una creatura si prende ci
   sono due passaggi — la tempra e la corazza — e a occhio non si vedono. Questo
   banco li applica e stampa la tabella, edificio per schiera, così si può
   guardare invece che immaginare. È il modo di accorgersi che una natura non
   passa da nessuna parte, o che un edificio è diventato la risposta a tutto.

   Uso:  node tools/danni.js            tutte le veglie, al primo grado
         node tools/danni.js 2          solo la Discesa
         node tools/danni.js 2 5        la Discesa, edifici al quinto grado
         node tools/danni.js nature     riepilogo per natura, non per edificio */
const { carica } = require('./harness.js');
const { T } = carica();

const RUOLI = ['base', 'fast', 'tank', 'ghost', 'big', 'boss', 'final'];

/* il conto di ultima-veglia.html, rifatto qui sopra i soli numeri: se i due
   divergono è questo che va corretto, non il gioco */
function colpo(st, e, a) {
  const res = T.resDi(a, e)[st.nat] || 0;
  const arm = T.ENEMIES[e].armor * st.morde;
  return { v: Math.max(1, st.dmg * (1 - res) - arm), res };
}

function tabella(a, lv) {
  const schiere = RUOLI.map(r => T.ROSTER[a][r]);
  console.log(`\n── ${T.ATTO[a].nome} · danno per colpo al grado ${lv} ──`);
  console.log('  ' + 'edificio'.padEnd(13) + 'natura'.padEnd(9) +
    schiere.map(k => T.ENEMIES[k].name.slice(0, 8).padStart(9)).join(''));
  console.log('  ' + ''.padEnd(22) + schiere.map(k =>
    ('cor ' + T.ENEMIES[k].armor).padStart(9)).join(''));
  for (const k of T.TORDER) {
    const cfg = T.TOWERS[k];
    if (!cfg.nat || !cfg.dmg) continue;
    const st = T.tstats({ type: k, lv });
    const celle = schiere.map(e => {
      const c = colpo(st, e, a);
      // il segno dice se quella schiera lo regge (·) o gli è scoperta (!)
      const marca = c.res > 0 ? '·' : (c.res < 0 ? '!' : ' ');
      return (Math.round(c.v) + marca).padStart(9);
    });
    console.log('  ' + cfg.short.toLowerCase().padEnd(13) + st.nat.padEnd(9) + celle.join(''));
  }
  console.log('  · la schiera regge quella natura   ! le è scoperta');
}

/* Quanto vale ogni natura in ogni veglia, a parità di numero: 100 di danno
   nudo contro il corazzato tipico. Serve a vedere se una natura è diventata
   inutile dappertutto — o buona dappertutto, che è peggio. */
function nature() {
  console.log('\n── 100 di danno, per natura e per veglia, contro il corazzato della veglia ──');
  console.log('  ' + 'veglia'.padEnd(28) + T.TDANNO.map(n => n.slice(0, 7).padStart(9)).join(''));
  for (let a = 1; a <= T.NSCEN; a++) {
    const e = T.ROSTER[a].tank;
    const celle = T.TDANNO.map(n => {
      const res = T.resDi(a, e)[n] || 0;
      const v = Math.max(1, 100 * (1 - res) - T.ENEMIES[e].armor * T.DANNI[n].corazza);
      return String(Math.round(v)).padStart(9);
    });
    console.log('  ' + (T.ATTO[a].nome + ' [cor ' + T.ENEMIES[e].armor + ']').padEnd(28) +
      celle.join(''));
  }
  console.log('\n  Nessuna colonna dev\'essere la migliore dappertutto, e nessuna riga');
  console.log('  dev\'essere piatta: una veglia senza scoperture non chiede di mescolare.');
}

const arg = process.argv[2];
const lv = Number(process.argv[3]) || 1;
if (arg === 'nature') nature();
else if (arg) tabella(Number(arg), lv);
else { for (let a = 1; a <= T.NSCEN; a++) tabella(a, lv); nature(); }
console.log();
