# L'Ultima Veglia — istruzioni di progetto

Tower defense 2D in pixel art con due mondi: dark fantasy (riferimento visivo
*Blasphemous*) e neon sci-fi/cyberpunk. Gira su iPhone come app installata dalla
schermata Home.

## Struttura

Il gioco è **un unico file HTML autosufficiente**: `ultima-veglia.html`.
Niente build, niente dipendenze a runtime, niente moduli. Tutto — CSS, sprite,
audio, logica — sta lì dentro. Questa non è una limitazione da superare: è la
scelta portante del progetto. **Non spezzare il file in moduli, non introdurre
bundler, non aggiungere librerie esterne.**

| File | Ruolo |
|---|---|
| `ultima-veglia.html` | il gioco. È la sorgente di verità |
| `index.html` | copia di `ultima-veglia.html` + meta PWA + icona in base64 |
| `sw.js` | service worker (rete-prima per l'HTML, cache per il resto) |
| `manifest.webmanifest`, `icona*.png` | icona e configurazione dell'app |
| `tools/` | banco di prova headless (vedi sotto) |

Dopo ogni modifica al gioco **rigenera `index.html`** (vedi "Rilascio").

## Verifica: non modificare a occhio

Il progetto ha un banco di prova che esegue il gioco fuori dal browser, con un
DOM finto. Va usato: è così che sono stati trovati bug reali (danno da ustione
che scavalcava la rottura della corazza; vittoria che sovrascriveva la
sconfitta nello stesso frame; ondata 60 che non chiudeva l'atto).

```bash
npm run check                 # estrae lo script e ne controlla la sintassi
node tools/sim.js             # tutti gli scenari, uno per uno, ondata per ondata
node tools/sim.js 2           # solo la Discesa
node tools/quaterne.js tutte  # confronto fra quaterne, uno scambio per volta
node tools/salva.js 2         # sospendere e riprendere: andata e ritorno
node tools/shot.js 3 46 x.png # screenshot reale (atto 3, ondata 46)
node tools/vie.js vie.png 2   # i tre percorsi affiancati, campo nudo
node tools/menu.js 2 0 m.png 3      # fondale in parallasse delle schermate
node tools/mappa.js 0 map.png 4 tutte  # mondi e mappa, tutti gli stati
node tools/sheet.js nemici    # tavola sprite: tutti gli atti affiancati
node tools/sheet.js torri     # tavola sprite: i cinque gradi
node tools/rilascio.js        # rigenera index.html dal gioco
```

Tutto tranne `sim.js` e `check` richiede `npm install` (solo `@napi-rs/canvas`).

> **Nota su Windows:** `npm run check` scrive in `/tmp/g.js`, che Node risolve
> come `C:\tmp\g.js`. Su Windows fallisce sempre con `ENOENT`, anche a sintassi
> corretta — non è un errore del gioco. L'equivalente a mano:
> `node -e "const{estraiScript}=require('./tools/harness.js');require('fs').writeFileSync('X',estraiScript('ultima-veglia.html'))"` e poi `node --check X`.

**Regole di lavoro:**
- Dopo ogni modifica: `npm run check`. Sempre.
- Se tocchi il bilanciamento: `node tools/sim.js` e confronta l'esito.
- Se tocchi lo stato della partita: `node tools/salva.js 1 2 3`. La prova non
  confronta i campi, fa proseguire la partita per mezzo minuto da entrambe le
  parti: è così che si scopre il campo dimenticato.
- Se tocchi la grafica: genera un PNG e **guardalo** prima di dire che è fatto.
  Giudicare il pixel art dal codice non funziona.
- Tara per prove successive, non a intuito: cambia un valore, rilancia la
  simulazione, confronta. I numeri attuali vengono da questo procedimento.

## Come è fatto il gioco

**Campo e cornice.** Il campo di gioco è 192×288 px (12×18 caselle da 16 px).
La tela è 240×360: 24 px di cornice ai lati, 36 sopra e sotto — stesso rapporto
2:3. `OX`/`OY` sono lo scostamento. **Il campo non si tocca**: se serve più
spazio scenografico si allarga la cornice mantenendo il rapporto.

**Un percorso per scenario** (`WPS`, `buildPercorso`). Quanto la via serpeggia
è una leva di difficoltà come le altre: quattro traverse nella Veglia (46
caselle), tre nella Discesa (36), due nel Giudizio (28). Meno curve vuol dire
meno tiri prima della soglia, ed è per questo che `ATTO[a].hp` è più basso di
quanto sembri — il gradino è già in parte nel tracciato.

**Gli estremi del percorso non si toccano**: entrata `[1,-2]`, uscita `[5,19]`.
Il valico a nord è disegnato sulla colonna 1 (`drawNord`) e il cancello in
basso sulla colonna 5 (`buildBG`, `drawSagrato`, `buildFG`, e il punto in cui
si conta una fuga). A variare è solo il modo di andare dall'uno all'altro.

`buildPercorso(a)` rifà `PATHPX`, `SEGLEN`, `pathSet` e le decorazioni —
`DECOR_ALL` è una lista sola e quelle che cadono sulla via si scartano — poi
`buildGrid()` rifà la griglia. La chiama `applyAct` **prima** di `buildFG`/
`buildBG`, che leggono `isPath`. **Solo a campo vuoto**: le creature portano
`seg`/`segD`, indici dentro `SEGLEN`, e cambiare il tracciato sotto ai loro
piedi le spedisce fuori strada.

**Profondità.** Torri e creature finiscono in una sola lista (`ZLIST`) ordinata
per il punto in cui toccano terra (`zy`). Chi ha i piedi più in alto sta dietro.
Non reintrodurre due cicli separati: era il bug per cui i mob passavano sempre
davanti alle torri.

**Sei scenari da venti ondate**, ognuno una partita a sé. Ogni scenario ha il
proprio percorso; `ROSTER`
traduce i ruoli (`base`, `fast`, `tank`, `ghost`, `big`, `boss`, `final`) nella
creatura dello scenario corrente. `waveDef` ragiona per ruoli, mai per nomi.

**La campagna** è a due piani: **mondi**, e dentro ognuno le sue **veglie**.
Il Campanaro contiene le prime tre; La Città Senza Alba contiene le tre veglie
neon. I mondi III–V restano PROSSIMAMENTE. `G.wave` è **relativo allo scenario** (1-20, poi oltre solo
nell'infinito), non assoluto. Compiute le venti ondate si sceglie: restare a
vegliare senza fine, oppure scendere allo scenario dopo — e lì **si ricomincia
da zero**: nessuna torre, ondata a 0, solo le lacrime e i sigilli concessi da
`ATTO[a]`. Uno scenario compiuto resta sbloccato e si rigioca dalla mappa.

Due tabelle, due piani. `ATTO` è la sorgente unica degli scenari: `hp`
(moltiplicatore di partenza delle creature), `lac` (lacrime iniziali), `sig`
(sigilli in mano), più le etichette. `MONDO` è quella dei mondi, e `scen` è
l'unica cosa che lega i due piani — `ATTO` non sa dei mondi, così `hpMul`,
`wAbs` e la simulazione restano quelli. **Per aggiungere uno scenario basta una
riga in `ATTO`** (più la sua tavolozza, il suo `ROSTER` e il suo `WPS`) e il
suo numero in un `scen`; **per aggiungere un mondo, una riga in `MONDO`**.
Mappa, albo e sblocchi si riadattano da `NSCEN` e `NMONDI`.

**Le due pergamene** condividono il canvas `#tappe`: `buildMondi`/`drawMondi`
sotto `#screen.mondi`, `buildTappe`/`drawTappe` sotto `#screen.mappa`. Un
sentiero, un medaglione per voce — emblema per quelle aperte, ceralacca per
quelle sigillate, una candela accesa sopra la veglia sospesa — e selezione a
tocco. Il ciclo di disegno le smista su `smode`. Le posizioni escono da
`viaPos`, la tavolozza `TCOL` è tutta loro: sono pergamene, non scene, e non
devono cambiare tinta con l'atto in corso.

**L'albo d'oro** (`alboScreen`, riusa `#screen.wide`): le cinque serie più
lunghe di ogni veglia, ondata e caduti. Nessuna distinzione fra chi si è
fermato alle venti e chi ha tirato avanti nell'infinito — conta l'ondata.
`segna()` infila, riordina e taglia a `NALBO`; ci passa anche l'abbandono.

**Memoria**, due chiavi via `window.storage`, mai `localStorage`:
- `veglia:prog` → `PROG` = `{unl, fin, rec}`: fin dove si è arrivati, quali
  scenari sono **compiuti** (`unl` non basta: l'ultimo scenario non ha un
  successivo da sbloccare) e l'albo. Migra dal vecchio `veglia:best` e dal
  vecchio `rec[a]` a record singolo (`migraProg`).
- `veglia:save` → `SAVE`, una partita sospesa per scenario. Separata apposta:
  un salvataggio malandato non si deve portare dietro l'albo d'oro.
- L'account Collaudo usa `veglia:prog:test` e `veglia:save:test`: apre tutte le
  veglie realizzate senza contaminare progressi, record o sospesi normali.

**Partite sospese** (`istantanea`/`ripristina`). Si salva quel che non si può
ricavare da capo; sagome (`sp`), statistiche (`st`) e scheda della creatura
(`def`) si rimettono a mano al ritorno. Non si salva solo ciò che dura meno di
mezzo secondo ed è pura scena: raggi, anelli, faville.

I **proiettili sì**, e non è un dettaglio: un colpo insegue un *oggetto*, e un
oggetto non si scrive su disco — il bersaglio si salva come posto nella lista
delle creature e si riaggancia al ritorno (`CAMPI_COLPO`, `ti`). Prima non si
salvavano, e con la caldaia — proiettili lenti, quasi sempre uno per aria — due
partite altrimenti identiche divergevano di un colpo. L'ha trovato `salva.js`
facendo proseguire le due partite, non confrontando i campi.

`ripristina` passa da `azzeraCampo`, che rifà percorso e griglia dell'atto
giusto **prima** di rimettere le creature, se no `seg`/`segD` puntano altrove.
Si salva da soli (pausa, fine ondata, app in secondo piano) e si scarta quando
la veglia finisce: morte, abbandono, ricominciare da capo, scendere oltre.
Restare a vegliare è l'unico ramo che non scarta — la partita continua.

**Pausa** (overlay `#pausa`, **non** una schermata): il campo resta dietro il
velo, che è il motivo per cui non passa da `#screen` e non tira su il fondale
in parallasse. Due stati nello stesso blocco: RIPRENDI / SALVA ED ESCI /
ABBANDONA, e la conferma dell'abbandono — una veglia lunga non si deve poter
buttare via con un tocco storto.

1. **La Veglia** — sagrato consacrato, penitenti.
2. **La Discesa** — inferno, demoni e scheletri. `applyAct(2)`.
3. **Il Giudizio** — apocalisse, schiere d'osso e oro. `applyAct(3)`.
4. **I Bassifondi** — pioggia al neon e sorveglianza urbana. `applyAct(4)`.
5. **Il Distretto Acido** — fabbriche, vapore verde e mutanti. `applyAct(5)`.
6. **La Griglia Nera** — spazio dati blu-bianco e protocolli ostili. `applyAct(6)`.

`applyAct` riparte sempre dalla tavolozza del primo atto e poi applica quella
dell'atto, così nessuna tinta resta appiccicata. Ricostruisce fondale e primo
piano.

**Torri:** sedici tipi, cinque gradi, **quattro in campo**. Sei sono cyber:
Impulso, Plasma, Stasi, Rotaia, Sciame e Disturbo. I gradi 1-4 crescono
di sagoma; il **quinto non cresce**: cambia materia (marmo bianco e oro, fiamma
azzurra) e aggiunge aureola e sigillo. Regola voluta dal progettista: al quinto
grado niente ingrandimenti.

**La quaterna** (`G.loadout`, `NSLOT`): si sceglie in armeria prima di scendere
e non cambia più fino alla fine della veglia. La barra si costruisce da lì
(`buildBar`), l'ultima usata per ogni scenario sta in `PROG.arm[a]`, e la
quaterna attiva entra nell'istantanea — una partita ripresa ritrova i suoi
edifici. `quaterneValida` ripulisce qualunque cosa arrivi dalla memoria.

I quattro storici — spine, braciere, campana, reliquiario — sono anche la
**quaterna di riferimento**: è su quella che sono tarati i numeri di `ATTO`, ed
è l'unica che deve dare sempre lo stesso esito in `sim.js`.

Sei edifici hanno meccaniche proprie, non solo numeri diversi:
- **ossario** riusa il ramo `aura` senza rallentamento (`slow:0`);
- **salmodia** non spara: `ricalcolaTorri()` applica `sostegno` ai vicini, e va
  richiamata a ogni cambio del campo — erigere, potenziare, demolire,
  ripristinare. Le statistiche di un edificio non dipendono più solo da lui;
- **mangano** è il ramo proiettile con numeri estremi;
- **arpione** usa `pull`: `arretra()` fa scendere `seg`/`segD` lungo la via, si
  ferma all'imbocco, e smuove poco ciò che è grosso (`final` quasi per niente,
  se no lo si terrebbe fermo finché non muore);
- **caldaia** non scoppia: posa una `pozza` che resta a bruciare. `G.pozze` è
  una lista a sé, aggiornata e disegnata a terra sotto tutto, e **si salva** —
  dura secondi, troppo per buttarla via come una favilla;
- **scongiuro** non colpisce: mette `e.armorCut`, che `damage()` toglie alla
  corazza. Si azzera a ogni giro come `slowAmt`: vale finché si sta nell'aura.

**Armeria** (`armeria(scegli)`): una schermata, due modi — si sfoglia dai mondi,
si sceglie dalla mappa prima di scendere. Tiene la legenda degli **edifici**,
che è roba della campagna: le pietre sono le stesse dappertutto. Il compendio
(`IL RITO`) tiene le **creature**, che sono roba di un mondo, e mostra le
colonne di `MONDO[msel].scen` — per questo il suo HTML si rifà ogni volta
invece di restare in cache. In alto mostra sempre i quattro slot della quaterna:
in modalità scelta si tocca prima lo slot e poi `SCEGLI` sull'edificio. Se
l'edificio è già equipaggiato, i due slot si scambiano. Ogni riga ha un tasto
`INFO` che apre sprite, costi e statistiche di tutti e cinque i gradi.

**Sigilli (vite):** se ne guadagna **1 per ondata** e si muore quando scendono
sotto zero. Nella Veglia si parte da **0** e le prime ondate non perdonano
nulla. Gli scenari successivi ne concedono qualcuno in mano (`ATTO[a].sig`):
aprono già duri, e con un solo sigillo di margine la prima ondata sarebbe o
passa o morte — uno scalino, non una difficoltà.

**Boss finale di scenario** (`final: true`): Santo Sepolto, Signore del Fondo,
Agnello. Se raggiungono la soglia **la partita è persa comunque**, a sigilli
pieni. Hanno una barra dedicata in cima alla scena. Nelle prove è quasi sempre
loro il muro vero, non la truppa: se un bilanciamento «regge fino alla 19»,
è il boss che non passa.

**Curve di difficoltà.** Dentro uno scenario `hpCurva` fa 1.16 per ondata fino
alla 20ª, poi 1.115 nell'infinito. A cambiare fra scenari sono il **gradino di
partenza** `ATTO[a].hp` (1 / 2.8 / 4.6), compensato dalle lacrime iniziali, e
la forma del percorso. I tre valori vengono da sweep su `sim.js`: ognuno è il
più alto per cui il giocatore-tipo arriva in fondo, e si rompe attorno a
×1.15-1.3 — lo stesso agio che ha sempre avuto la Veglia. Sono più bassi di
quanto sembri perché la parte restante del gradino sta nel tracciato, che dopo
il primo scenario si accorcia.

Il bot di `sim.js` erige sulle venti posizioni scelte a mano di `BASE1`, e
**quelle non si toccano**: sono il metro con cui è stato tarato tutto, e
cambiarle rende incomparabili le simulazioni vecchie e nuove. Vale solo per la
Veglia; gli altri scenari hanno un altro percorso e ricavano le posizioni dalla
griglia, in ordine di percorrenza.

**Quaterne** (`tools/quaterne.js`). Da quando gli edifici sono otto, il bersaglio
non è più «le quattro torri» ma *qualunque quaterna legale*. Il banco gioca la
stessa partita con quaterne diverse e le mette una accanto all'altra; ordina la
quaterna per costo diviso gittata, perché una quaterna è un **insieme** e senza
ordinare si finisce per misurare in quale riquadro è finito un edificio.
Due limiti da tenere a mente, che sono scritti anche nell'output:
- la colonna **VEGLIA non discrimina**: si apre con 130 lacrime e zero sigilli,
  cioè con due edifici, e a decidere è *quali* due il banco compra;
- il bot è un gradino più debole di quello di `sim.js`, quindi un `OK` lì vuol
  dire «meglio dei quattro storici», non «facile».
Il metro assoluto resta `sim.js` sulla quaterna di riferimento.

Corazza e andatura **non** usano l'ondata assoluta ma `wDur` (mezzo gradino
per scenario), perché il giocatore le affronta con torri appena erette: un
salto pieno di venti ondate lo schiaccia alla prima. L'economia invece usa
`wAbs` (gradino pieno): le lacrime devono tenere il passo delle creature.

**Sprite:** disegnate come array di stringhe (una lettera = un colore, `.` =
trasparente) e convertite da `makeSprite`, che aggiunge il contorno. Tutte le
righe di una sprite devono avere **la stessa lunghezza** e non contenere spazi.
Non serve più controllarlo a mano: `controllaArt` si ferma e dice quale riga —
prima passava silenzioso e la sprite scivolava di un pixel per volta.

**Dieci sagome che devono distinguersi fra loro**, non solo essere belle: a
quattordici pixel conta il profilo, non il dettaglio. Le regole che sono venute
fuori disegnandole, e che valgono per la prossima:
- il colore da solo non basta, serve una sagoma diversa — l'ossario è basso e
  largo dove tutti gli altri sono alti e stretti, l'arpione si allarga in cima
  invece di stringersi;
- due toni vicini si impastano: il primo mangano aveva braccio e contrappeso
  entrambi in legno ed era una macchia marrone. Braccio grigio metallo e
  contrappeso nero, e si legge;
- attenzione a quello che la sagoma dice per conto suo: il primo scongiuro
  aveva la cima tonda e sembrava una lapide, cioè un'altra cosa già suggerita
  dall'ossario. Cima a punta e occhio a mandorla.

`tools/sheet.js torri` le affianca tutte grado per grado; con un quarto
argomento (`spine,ossario,caldaia`) se ne guardano poche per volta, che a dieci
colonne non si legge niente.

**Vincoli tecnici da rispettare:**
- Niente `localStorage`/`sessionStorage`. Il record usa `window.storage` se c'è.
- Ottimizzazioni già presenti da non annullare: texture pre-renderizzate per i
  bagliori e la vignettatura, distanze al quadrato invece di `Math.hypot` nei
  cicli caldi, pool di particelle con tetto, ordinamento torri solo quando
  cambiano, HUD aggiornato solo sui valori cambiati.
- Il gioco gira a ×3 velocità: 180 update al secondo. Attenzione al costo.

## Lingua

Interfaccia, testi e nomi in **italiano**. Commenti nel codice in italiano.

## Rilascio

```bash
node tools/rilascio.js
```

`index.html` si ottiene da `ultima-veglia.html` aggiungendo nel `<head>`, prima
del `<title>`, i meta PWA e l'icona in base64, e registrando il service worker
prima del blocco `/* ─────────── AVVIO ─────────── */`. Lo fa `rilascio.js`:
non ricopiarlo a mano, è così che si finisce col pubblicare una versione
vecchia.

Quando cambi `sw.js`, **incrementa `CACHE`** (`ultima-veglia-vN`), altrimenti
i dispositivi che hanno già installato l'app restano alla versione vecchia.

Pubblicazione: GitHub Pages, ramo `main`, cartella root. L'app si installa da
Safari con "Aggiungi alla schermata Home".
