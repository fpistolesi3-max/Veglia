/* Andata e ritorno del salvataggio: una veglia sospesa e ripresa deve
   proseguire esattamente come se non fosse mai stata interrotta.
   Non basta confrontare i campi: un campo dimenticato — la ricarica di una
   torre, il tratto di percorso di una creatura — si vede solo lasciando
   correre il gioco. Quindi si gioca fin dentro un'ondata, si fa l'istantanea,
   si tira avanti mezzo minuto e ci si segna dove si è arrivati; poi si
   ripristina l'istantanea, si tira avanti lo stesso mezzo minuto e i due
   punti d'arrivo devono coincidere.
   Uso:  node tools/salva.js [scenario]                                 */
const { carica } = require('./harness.js');
const { T, G } = carica();

const atto = Number(process.argv[2]) || 2;
const dt = 1 / 60;
let errori = 0;

function ok(nome, cond, dettaglio) {
  console.log(`  ${cond ? '·' : '✗'} ${nome}${cond ? '' : '  →  ' + dettaglio}`);
  if (!cond) errori++;
}

// impronta di tutto ciò che il gioco calcola: se un campo non è stato salvato,
// prima o poi due partite altrimenti identiche divergono qui
function impronta() {
  // solo i vivi: un caduto resta in lista fino al giro dopo, ed è giusto che
  // l'istantanea non se lo porti dietro
  const n = G.enemies.filter(e => e.alive).map(e =>
    `${e.type}:${e.hp.toFixed(2)}:${e.seg}:${e.segD.toFixed(2)}:${e.broken ? 1 : 0}`
  ).sort().join('|');
  // anche il danno delle torri: la salmodia lo cambia dall'esterno, e se il
  // sostegno non venisse rifatto al ritorno si vedrebbe solo qui
  const t = G.towers.map(t =>
    `${t.type}${t.lv}@${t.c},${t.r}:${t.cd.toFixed(3)}:${t.st.dmg}`
  ).sort().join('|');
  const p = G.pozze.map(p => `${Math.round(p.x)},${Math.round(p.y)}:${p.t.toFixed(2)}`).sort().join('|');
  return `ondata ${G.wave} sigilli ${G.sigilli} lacrime ${G.lacrime} `
    + `caduti ${G.killed} stato ${G.state}\n    creature ${n || '—'}\n    torri ${t || '—'}`
    + `\n    pece ${p || '—'}`;
}

function avanza(secondi) {
  for (let i = 0; i < 60 * secondi; i++) T.update(dt);
}

// le lastre libere che toccano la via: le coordinate a mano non servono,
// ogni scenario ha il suo percorso
function lastreSullaVia() {
  const l = [];
  for (let r = 0; r < T.ROWS; r++) for (let c = 0; c < T.COLS; c++) {
    if (T.grid[r][c] !== 0) continue;
    let vicino = false;
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && cc >= 0 && rr < T.ROWS && cc < T.COLS && T.grid[rr][cc] === 1) vicino = true;
    }
    if (vicino) l.push([c, r]);
  }
  return l;
}

// Una veglia portata dentro la sesta ondata, che è quella in cui scende il
// colosso: si aspetta che gli si spezzi la corazza, perché quello è lo stato
// più difficile da salvare bene — armatura e andatura sono state cambiate una
// volta sola, e se al ritorno `broken` si perde il colpo si ripete.
// Le lacrime sono generose di proposito: qui non si misura il bilanciamento,
// si controlla che l'istantanea regga, e per farlo serve arrivarci vivi.
function finoAlColosso() {
  // una quaterna che tocca le meccaniche più difficili da salvare: la caldaia
  // lascia pece per terra, la salmodia cambia le statistiche dei vicini
  T.startScen(atto, ['spine', 'caldaia', 'salmodia', 'reliquiario']);
  G.lacrime = 40000;
  const tipi = ['spine','caldaia','salmodia','reliquiario'];
  const liv = [4,3,2,5,1,3,4,2,5,3];
  lastreSullaVia().slice(0, 10).forEach(([c, r], i) => {
    T.place(tipi[i % 4], c, r);
    const tw = G.towers[G.towers.length - 1];
    for (let k = 1; k < liv[i]; k++) { G.sel = tw; T.upgrade(); }
  });
  G.sel = null; G.build = null; G.lacrime = 900;
  for (let w = 1; w <= 5; w++) {
    T.startWave();
    let g = 0;
    while (G.waveOn && g++ < 60 * 600) T.update(dt);
    if (G.state !== 'play') return false;
  }
  T.startWave();          // la sesta: fanteria, corridori, portatori e colosso
  const rotto = () => G.enemies.some(e => e.def.big && e.broken);
  for (let i = 0; i < 60 * 90 && !rotto(); i++) {
    T.update(dt);
    if (G.state !== 'play') return false;
  }
  return G.state === 'play' && rotto();
}

console.log(`\n── ${T.ATTO[atto].nome}: sospendere e riprendere ──`);
ok('si arriva al colosso e gli si spezza la corazza', finoAlColosso(),
   `la partita di prova non c'è arrivata (stato ${G.state}, ondata ${G.wave})`);
const s = T.istantanea();
console.log(`  istantanea a ondata ${G.wave}: ${s.towers.length} torri, `
  + `${s.enemies.length} creature, ${s.queue.length} in coda, `
  + `${JSON.stringify(s).length} byte`);
ok('c\'è roba in campo da salvare', s.towers.length > 0 && s.enemies.length > 0,
   'la prova non sta provando niente');
ok('fra le creature salvate c\'è un colosso già spezzato',
   s.enemies.some(e => e.broken), 'la corazza rotta non finisce nell\'istantanea');
ok('la quaterna viaggia con l\'istantanea',
   Array.isArray(s.loadout) && s.loadout.indexOf('caldaia') >= 0,
   'senza la quaterna una veglia ripresa cambia edifici sotto le mani');

const primaSospensione = impronta();
avanza(30);
const senzaSospensione = impronta();

// ora la stessa partita, ma passando per il salvataggio
T.startScen(atto === 1 ? 2 : 1);      // sporca tutto: altro scenario, altro percorso
ok('il ripristino riesce', T.ripristina(JSON.parse(JSON.stringify(s))), 'ripristina() ha detto no');
const dopoRipristino = impronta();
ok('si torna esattamente al punto in cui si era sospeso',
   dopoRipristino === primaSospensione,
   `\n      sospeso:     ${primaSospensione}\n      ripristinato:${dopoRipristino}`);
avanza(30);
const conSospensione = impronta();
ok('mezzo minuto dopo le due partite sono ancora la stessa partita',
   conSospensione === senzaSospensione,
   `\n      mai sospesa: ${senzaSospensione}\n      ripresa:     ${conSospensione}`);

// e nell'infinito, che è dove una serie lunga si sospende davvero
console.log(`\n── ${T.ATTO[atto].nome}: sospendere nell'infinito ──`);
T.startScen(atto);
G.lacrime = 99999; G.endless = true; G.wave = 23;
T.place('reliquiario', 4, 9); G.sel = G.towers[0];
for (let k = 1; k < 5; k++) T.upgrade();
G.sel = null;
T.startWave();
avanza(8);
const sInf = T.istantanea();
ok('l\'infinito si porta dietro il suo contatore', sInf.endless === true && sInf.wave === 24,
   `endless=${sInf.endless} wave=${sInf.wave}`);
const primaInf = impronta();
avanza(20);
const senzaInf = impronta();
T.startScen(atto);
T.ripristina(JSON.parse(JSON.stringify(sInf)));
ok('si torna al punto anche oltre la ventesima', impronta() === primaInf,
   `\n      sospeso:     ${primaInf}\n      ripristinato:${impronta()}`);
avanza(20);
ok('e da lì prosegue identica', impronta() === senzaInf,
   `\n      mai sospesa: ${senzaInf}\n      ripresa:     ${impronta()}`);

console.log(errori ? `\n>>> ${errori} PROVE FALLITE\n` : '\n=== tutto a posto ===\n');
process.exit(errori ? 1 : 0);
