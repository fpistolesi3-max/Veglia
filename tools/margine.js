/* Quanto margine ha una veglia.
   Un bilanciamento non si giudica dall'esito a ×1: si giudica da quanto lo si
   può stringere prima che ceda. Il criterio del progetto è che ogni scenario si
   compia a ×1 e si rompa fra ×1.10 e ×1.30 — se cede a ×1.02 è un caso, se
   regge a ×1.5 è una passeggiata.

   La veglia si gioca **dopo aver giocato quelle prima**, perché i gradi degli
   edifici si guadagnano contando caduti: misurare la Discesa a gradi vergini
   direbbe una difficoltà che nessun giocatore incontra. Costa qualche secondo
   in più ed è l'unico modo di misurare quello che succede davvero.

   Uso:  node tools/margine.js 2                 la Discesa a 1 · 1.1 · 1.2 · 1.3
         node tools/margine.js 2 1 1.05 1.1      i moltiplicatori che vuoi
         node tools/margine.js tutte             tutte le veglie, il solo limite */
const path = require('path');

const scen = process.argv[2] || 'tutte';
const multi = process.argv.slice(3).map(Number).filter(x => x > 0);
const SCALA = multi.length ? multi : [1, 1.1, 1.2, 1.3];

/* Una prova sola per volta, in un processo pulito: il conto dei caduti e i
   gradi sopravvivono a una partita, quindi due prove nella stessa memoria non
   sarebbero più la stessa prova. */
function prova(a, m) {
  const { execFileSync } = require('child_process');
  const out = execFileSync(process.execPath, [__filename, '--una', String(a), String(m)],
    { encoding: 'utf8' });
  return JSON.parse(out.trim().split('\n').pop());
}

if (process.argv[2] === '--una') {
  const a = Number(process.argv[3]), m = Number(process.argv[4]);
  const silenzio = console.log;
  console.log = () => {};
  const { T, G, veglia } = require('./sim.js');
  // le veglie prima: servono a portarsi dietro i gradi, come farebbe un giocatore
  for (let i = 1; i < a; i++) veglia(i, 20);
  const orig = T.ATTO[a].hp;
  T.ATTO[a].hp = orig * m;
  const r = veglia(a, 20);
  T.ATTO[a].hp = orig;
  console.log = silenzio;
  console.log(JSON.stringify({ esito: r.esito, w: r.w, sig: G.sigilli }));
  return;
}

const { T } = require('./sim.js');
const scenari = scen === 'tutte' ? Array.from({ length: T.NSCEN }, (_, i) => i + 1) : [Number(scen)];

console.log('\nmargine: fin dove si può stringere prima che ceda');
console.log('il criterio del progetto è compiuta a ×1 e rotta fra ×1.10 e ×1.30\n');
for (const a of scenari) {
  const righe = [];
  let ultimoOk = 0;
  for (const m of SCALA) {
    const r = prova(a, m);
    if (r.esito === 'compiuta' && m > ultimoOk) ultimoOk = m;
    righe.push(`×${m.toFixed(2)} ${r.esito === 'compiuta' ? 'OK' : '··'}` +
      `(${String(r.w).padStart(2)}${r.esito === 'compiuta' ? ',s' + r.sig : ''})`);
  }
  // il punto di rottura non è un numero ma un intervallo: fra l'ultimo che
  // regge e il primo che cede. Dirlo come numero secco sarebbe una bugia
  const primoNo = SCALA.find(m => m > ultimoOk);
  const giudizio = !ultimoOk ? '  ← NON SI COMPIE'
    : `  rotta fra ×${ultimoOk.toFixed(2)} e ×${primoNo ? primoNo.toFixed(2) : '?'}`;
  console.log(`  ${T.ATTO[a].nome.padEnd(20)} ${righe.join('  ')}${giudizio}`);
}
console.log();
