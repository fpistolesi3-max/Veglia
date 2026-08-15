/* Banco di prova: esegue il gioco fuori dal browser.
   Simula il minimo indispensabile di DOM e canvas, poi valuta lo script
   di gioco estratto dall'HTML ed espone gli oggetti interni.
   Uso:  const {T,G} = require('./harness.js').carica();            */
const fs = require('fs');
const path = require('path');

function estraiScript(file) {
  const html = fs.readFileSync(file, 'utf8');
  const m = html.match(/<script>([\s\S]*)<\/script>/);
  if (!m) throw new Error('nessun blocco <script> in ' + file);
  return m[1];
}

function carica(opzioni = {}) {
  // VEGLIA_FILE fa girare un banco qualunque su un'altra copia del gioco: è
  // così che si confronta una modifica con la versione da cui si è partiti
  // (`git show HEAD:ultima-veglia.html > prima.html`) senza toccare i banchi.
  const file = opzioni.file || process.env.VEGLIA_FILE ||
    path.join(__dirname, '..', 'ultima-veglia.html');
  let creaCanvas = null;
  if (opzioni.grafica) {
    // serve solo per gli screenshot: npm i @napi-rs/canvas
    creaCanvas = require('@napi-rs/canvas').createCanvas;
  }
  const finto = () => ({
    getContext: () => new Proxy({}, {
      get(t, k) {
        if (k === 'createRadialGradient' || k === 'createLinearGradient')
          return () => ({ addColorStop() {} });
        if (k === 'canvas') return { width: 0, height: 0 };
        return () => {};
      },
      set() { return true; }
    }),
    width: 0, height: 0, toDataURL: () => 'data:,'
  });
  const elem = (id) => {
    const e = {
      id, style: {}, dataset: {}, children: [], className: '', textContent: '',
      innerHTML: '', disabled: false, offsetWidth: 1,
      clientWidth: 390, clientHeight: 600,
      classList: { add() {}, remove() {}, toggle() {} },
      addEventListener() {}, appendChild(c) { e.children.push(c); },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 360, height: 540 })
    };
    return Object.assign(e, finto());
  };
  const registro = {};
  global.document = {
    getElementById: (id) => {
      if (id === 'game') {
        const c = creaCanvas ? creaCanvas(240, 360) : finto();
        c.addEventListener = () => {};
        c.style = {};
        c.getBoundingClientRect = () => ({ left: 0, top: 0, width: 360, height: 540 });
        return c;
      }
      // fondale delle schermate e mappa della campagna: servono veri quanto
      // il campo, se no non li si può guardare
      if (id === 'menubg' || id === 'tappe') {
        if (!registro[id]) {
          const c = creaCanvas ? creaCanvas(1, 1) : elem(id);
          c.style = {};
          c.classList = { add() {}, remove() {}, toggle() {} };
          c.addEventListener = () => {};
          registro[id] = c;
        }
        return registro[id];
      }
      return registro[id] || (registro[id] = elem(id));
    },
    createElement: (t) => (t === 'canvas' ? (creaCanvas ? creaCanvas(1, 1) : finto()) : elem(t)),
    addEventListener() {}, hidden: false
  };
  global.window = { addEventListener() {} };
  global.performance = { now: () => 0 };
  global.requestAnimationFrame = () => {};

  let js = estraiScript(file);
  js += '\nglobalThis.__T={G,PROG,startGame,startScen,update,render,place,upgrade,sell,startWave,' +
        'endless,spawn,cv,S,TOWERS,ENEMIES,ROSTER,TSKIN,MAXLV,UPMUL,ATTO,NSCEN,' +
        'waveDef,tstats,grid,applyAct,COLS,ROWS,TILE,hpMul,wAbs,' +
        'WPS,buildPercorso,buildGrid,' +
        'mcv,menuBgFit,buildMenuBg,drawMenuBg,menuBgSync,showScreen,menu,' +
        'tcv,mappa,buildTappe,drawTappe,tappeFit,' +
        'MONDO,NMONDI,mondoDi,mondoAperto,mondoCompiuto,ultimoDelMondo,' +
        'mondi,buildMondi,drawMondi,alboScreen,buildAlbo,albo,segna,compiuto,' +
        'istantanea,ripristina,salvaPartita,scartaSalvataggio,riprendi,' +
        'haSalvataggio,scenariSospesi,SAVE,apriPausa,chiudiPausa,gameOver,' +
        'TORDER,NSLOT,QUATERNA_BASE,quaterneValida,ricalcolaTorri,arretra,buildBar,' +
        'edificioAperto,gradoMax,mancaEdificio,mancaGrado,uccMondo,uccTorre,' +
        'ricalcolaSoglie,GRADI_LIEVI,GRADI_ALTRI,contaCaduto,' +
        'DANNI,TDANNO,RES,resDi,mordeDi,nomeDanno,corazzaDice,appicca,' +
        'pergamenaHtml,libro,buildPergamena,tempreHtml,' +
        'armeria,buildArmeria,help,buildHelp,damage,tstats,makeSprite,ART,PAL_TOW,' +
        'cambiaProfilo,MUSICA,musicaAggiorna,musicaToggle,hideScreen,lex};' +
        '\nglobalThis.__T.getProfilo=()=>({collaudo:COLLAUDO,unl:PROG.unl,msel,tsel,smode});' +
        '\nglobalThis.__T.getArm=()=>({armSel:armSel.slice(),armScegli});' +
        '\nglobalThis.__T.setArm=(q)=>{armSel=q.slice();};' +
        '\nglobalThis.__T.setArmInfo=(k)=>{armInfo=k;};' +
        '\nglobalThis.__T.setSel=(m,t)=>{msel=m;tsel=t;};' +
        '\nglobalThis.__T.getSel=()=>({msel,tsel,smode});';
  eval(js);
  const T = globalThis.__T;
  T.G.sound = false;
  /* Un banco che vuole provare una quaterna qualunque deve prima averla
     guadagnata: edifici e gradi si aprono contando caduti, e un profilo appena
     nato ha in mano solo i quattro storici al primo grado. Chi misura il
     bilanciamento di un insieme (quaterne.js) o il salvataggio (salva.js)
     apre tutto e va dritto al punto; sim.js no — quello deve restare il metro
     di chi comincia adesso. */
  T.apriTutto = () => {
    T.PROG.unl = T.NSCEN;
    for (let m = 1; m <= T.NMONDI; m++) T.PROG.ucc[m] = 999999;
    for (const k of T.TORDER) T.PROG.tk[k] = 999999;
    T.ricalcolaSoglie();
  };
  return { T, G: T.G, registro };
}

module.exports = { carica, estraiScript };
