# Il sistema dei danni e delle difese

Documento di riferimento del sistema di combattimento de *L'Ultima Veglia*.
Descrive **come si conta un colpo**, quali nature di danno esistono, come si
difendono le schiere, e con che criterio sono stati scelti i numeri.

Le tabelle vive stanno in `ultima-veglia.html` (`DANNI`, `TOWERS`, `RES`,
`ENEMIES`). Questo documento spiega il *perché*; la sorgente di verità dei
*quanto* è il codice. Se i due divergono, ha ragione il codice — e questo
documento va corretto.

---

## 1. Il conto di un colpo

Un colpo non è un numero: è **un numero e una natura**. La natura decide due
cose, e sono le sole due che entrano nel conto.

```
danno effettivo  =  max( 1 ,  danno × (1 − tempra)  −  corazza × morde )
```

| termine | che cos'è | dove sta |
|---|---|---|
| `danno` | il numero dell'edificio al suo grado | `tstats(t).dmg` |
| `tempra` | quanto quella creatura sopporta quella natura | `RES[atto]` + `ENEMIES[x].res` |
| `corazza` | la sottrazione fissa della creatura, già scrostata | `e.armor × (1 − armorCut)` |
| `morde` | quanta di quella corazza conta contro questa natura | `DANNI[nat].corazza`, o `1 − ap` |

**Prima la tempra, poi la corazza.** La creatura assorbe la sua parte, e la
piastra ferma quel che resta. L'ordine inverso renderebbe la corazza più forte
proprio contro le nature che dovrebbero scavalcarla.

**Il fondo di 1 c'è sempre.** Senza, un bersaglio molto corazzato non sarebbe
duro: sarebbe immortale, e il giocatore non avrebbe modo di capire perché non
succede niente.

### Perché la corazza è una sottrazione e non una percentuale

Perché deve **discriminare fra i modi di sparare**, non scalare tutto allo
stesso modo. Una sottrazione punisce chi colpisce spesso e piano e lascia quasi
indifferente chi colpisce raro e forte: trenta quadrelli da 9 contro corazza 7
non fanno quasi niente, un colpo di mangano da 84 non se ne accorge. È da qui
che nasce l'esistenza stessa dei ruoli.

---

## 2. Le sei nature

| natura | corazza morde | resta addosso | edifici |
|---|---|---|---|
| **fisico** | 100% | — | spine, mangano¹, arpione¹ |
| **fuoco** | 50% | ustione | braciere, caldaia, plasma |
| **arcano** | 0% | — | campana, reliquiario |
| **gelo** | 60% | — | stasi |
| **folgore** | 35% | — | impulso, rotaia¹ |
| **veleno** | 0% | marciume | ossario |

¹ *deroga con `ap`: vedi sotto.*

Nella Città Senza Alba l'arcano si chiama **quantistico** (`DANNI.arcano.nomeM`).
È la stessa natura: cambia la parola, come per «rito» e «innesto».

### La deroga `ap`

Un edificio eredita la corazza della sua natura, **salvo che dichiari `ap`** —
quanto trapassa. La deroga è ammessa solo quando è il carattere dell'edificio a
dirlo a parole:

- **mangano** `ap:.8` — «sfonda quasi ogni corazza»
- **arpione** `ap:.5` — un rampone che entra fra le piastre
- **rotaia** `ap:1` — «oltre ogni corazza»

Senza `ap`, un edificio nuovo nasce già coerente col resto: è il motivo per cui
la deroga esiste come eccezione dichiarata e non come numero libero per tutti.

### Quel che resta addosso

Due nature non finiscono col colpo:

- **ustione** (fuoco) — `burn`, applicata da braciere e plasma sull'area
- **marciume** (veleno) — `tox`, applicato dall'ossario nella sua aura

Ignorano la corazza **per definizione**: bruciano e marciscono dentro. Non
ignorano la tempra, che si applica **una volta sola quando si appiccano**
(`appicca()`): al tic per fotogramma non deve restare che una sottrazione, e a
180 aggiornamenti al secondo la differenza si sente.

La **pece** della caldaia non è un danno persistente sulla creatura ma una
pozza a terra (`G.pozze`) che colpisce chi ci passa: un danno normale ripetuto,
con la sua natura e la sua corazza.

---

## 3. Come si difendono le schiere

Tre difese, e sono diverse fra loro perché si battono in tre modi diversi.

### 3.1 La corazza — si scrosta o si scavalca

Sottrazione fissa (`armor`, da 0 a 24 lungo la campagna). Due risposte:

- **scavalcarla**: arcano e veleno non la vedono, folgore quasi;
- **scrostarla**: scongiuro e jammer non fanno male a nessuno — mettono
  `armorCut` a chi passa nella loro aura, e i colpi degli altri mordono.
  `armorCut` si azzera a ogni giro: vale finché si sta nell'aura.

### 3.2 Le piastre — si spezzano

Le creature grosse (`breakAt`) portano piastre che cedono a metà vita: la
corazza cala di colpo e l'andatura aumenta. È un cambio di fase, non una
resistenza.

### 3.3 La tempra — si aggira cambiando natura

Quanto una schiera sopporta una natura. **Positivo resiste, negativo scopre il
fianco**: `.35` significa che ne prende il 35% in meno, `-.3` che ne prende il
30% in più.

La tempra è **di un mondo prima che di una creatura**, perché è la sua storia a
deciderla. Sta quindi in `RES[atto]`; una singola creatura la corregge con
`res` solo quando è lei a essere diversa dalle sue.

| veglia | regge | è scoperta a |
|---|---|---|
| I · La Veglia | — | — |
| II · La Discesa | fuoco 35%, veleno 30% | gelo 30%, arcano 20% |
| III · Il Giudizio | arcano 25% | veleno 30%, fisico 25% |
| IV · I Bassifondi | arcano 20% | folgore 30% |
| V · Il Distretto Acido | veleno 50%, fuoco 25% | folgore 30%, gelo 20% |
| VI · La Griglia Nera | folgore 40%, fisico 25% | arcano 30% |

Le eccezioni per creatura:

- **i fantasmi** (ombra, dannata, voce, eco, fantasma di dati, spettro null):
  `fisico 50-60%` — il ferro li passa attraverso. Alcuni aggiungono la tempra
  della loro materia: l'Anima Dannata regge il fuoco, quelli di dati reggono il
  veleno perché non c'è niente da guastare.
- **i Signori** (i sette boss finali): ognuno ha la sua virtù, ed è la firma
  della veglia che chiude. Il Signore del Fondo regge il fuoco al 50% ma è
  scoperto al gelo; la Matrice Nera regge la folgore al 60% ed è scoperta
  all'arcano.

### Le due regole delle tempre

1. **Ogni veglia ne regge una e ne scopre un'altra.** Un muro senza porta non
   chiede di mescolare: chiede di cambiare quaterna, che è un'altra cosa e si
   fa fuori dalla partita.
2. **La prima veglia non ha tempre.** Il sagrato è carne e cilicio: si impara a
   giocare prima di imparare il sistema.

---

## 4. Come sono stati scelti i numeri

Non a intuito. Il criterio è quello di tutto il progetto: **una modifica per
volta, e la simulazione decide.**

### Il metro

- `node tools/sim.js` — la campagna con la quaterna storica, giocata da un
  profilo appena nato. Ogni veglia deve **compiersi**.
- `node tools/margine.js tutte` — quanto si può stringere prima che ceda: ogni
  veglia deve **rompersi fra ×1.10 e ×1.30**. Un bilanciamento che regge a ×1.5
  è una passeggiata; uno che cede a ×1.02 è un caso fortunato.
- `node tools/danni.js nature` — la tabella di quanto vale ogni natura in ogni
  veglia. **Nessuna colonna dev'essere la migliore dappertutto** e nessuna riga
  dev'essere piatta.
- `node tools/quaterne.js tutte` — nessuna quaterna dev'essere una scelta
  sbagliata a prescindere, né rendere la veglia una passeggiata.

### Che cosa è stato mosso, e perché

Introdurre le tempre ha spostato il bilanciamento, perché la quaterna di
riferimento — spine, braciere, campana, reliquiario — è **due quarti arcano**:
dove l'arcano è resistito, perde metà del suo mestiere. I gradini di partenza
`ATTO[a].hp` sono stati ritarati di conseguenza:

| veglia | prima | dopo | perché |
|---|---|---|---|
| II · La Discesa | 2.8 | **2.5** | il fuoco del braciere vale il 35% in meno |
| III · Il Giudizio | 4.6 | **3.4** | campana e reliquiario, cioè metà quaterna, resistiti |
| V · Il Distretto Acido | 7.2 | **5.9** | fuoco resistito, e nessuna delle nature storiche è scoperta |

Le veglie I, IV e VI non sono state toccate: alla prima non ci sono tempre, e
nelle altre due la scopertura compensa la resistenza già per conto suo.

L'**ossario** è stato ritarato quando è diventato veleno: da `dmg 8` a `dmg 5`,
`tox` da 3 a 2. I suoi numeri erano tarati per un danno che la corazza smussava
(`ap .25`); passato a una natura che la corazza non vede, con gli stessi numeri
raddrizzava da solo quaterne che cadevano. Contemporaneamente il fondo ha
guadagnato `veleno 30%`: ciò che è già dannato non marcisce.

### Che cosa **non** è stato mosso

I numeri di corazza delle creature, la curva `hpCurva`, l'economia, i costi
degli edifici. Toccare più di una leva per volta rende impossibile capire quale
ha prodotto l'effetto: è la ragione per cui questa tabella ha tre righe e non
trenta.

---

## 5. Dove il sistema si vede, nel gioco

Un sistema che il giocatore non può leggere è rumore. Sta scritto in quattro
posti, tutti generati dalle stesse tabelle e mai ricopiati a mano:

- **Il Libro della Veglia** (home → `IL LIBRO DELLA VEGLIA`) — la pergamena:
  le sei nature, la corazza, le tempre di ogni veglia, il conto in chiaro con
  un esempio calcolato sui numeri veri.
- **Il compendio delle schiere** (`IL RITO`, dentro ogni mondo) — corazza e
  tempre di ogni veglia del mondo, più le eccezioni di ogni creatura.
- **L'armeria** — ogni edificio porta la pastiglia della sua natura e, nella
  scheda, quanta corazza gli morde contro.
- **Il pannello in partita** — natura e corazza dell'edificio selezionato.

---

## 6. Aggiungere roba senza rompere niente

**Un edificio nuovo**: una riga in `TOWERS` con la sua `nat`. Eredita corazza e
danni persistenti dalla natura; dichiara `ap` solo se la sua descrizione lo
promette. Poi `node tools/quaterne.js tutte` per vedere se ha spostato qualcosa.

**Una natura nuova**: una riga in `DANNI` e il suo nome in `TDANNO`. Serve
`corazza` (0-1), un colore leggibile **sia sul campo nero sia sulla pergamena**,
e — è la parte che conta — almeno una veglia che la regge e una che le è
scoperta, se no è un'altra parola per una che c'è già. Il Libro e il compendio
la mostrano da soli.

**Una veglia nuova**: una riga in `RES`. Se la si lascia vuota la veglia non
chiede di mescolare, che va bene solo per la prima.

Dopo ogni modifica: `node tools/danni.js nature`, `node tools/sim.js`,
`node tools/margine.js tutte`. In quest'ordine.
