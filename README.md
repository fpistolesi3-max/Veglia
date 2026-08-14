# Sommario
- Nuova valuta persistente "Frammenti" (❖), distinta da lacrime (in-run) e sigilli (vite)
- Sblocca permanentemente 2 torri avanzate: RELIQUIARIO (450 ❖, mondo I) e ROTAIA (650 ❖, mondo II) — totale 1100
- Guadagno agganciato al sistema di record esistente: prima conquista per scenario (50/80/120/150/190/240),
  record personale battuto (10 mondo I, 15 mondo II), ondate infinite oltre la 20ª con curva decrescente
- Tetto giornaliero morbido di 50 ❖ su record+infinito (esclusa la prima conquista), oltre il tetto guadagno al 20%
- Compatibilità: arretrato una tantum per chi aveva già completato scenari prima di questa versione;
  quaterne salvate con torri non ancora sbloccate vengono ripulite in automatico

## Bilanciamento (scelte consapevoli, non svisti)
- La quaterna iniziale ora usa MANGANO al posto del RELIQUIARIO (che è a pagamento): stesso ruolo
  (colpo grosso anti-corazza), leggermente meno tagliente. Scenari 1-3 partono un filo più magri
  di come erano tarati in origine — primo punto da rivedere se il playtest segnala difficoltà eccessiva lì
- Una prima traversata completa della campagna frutta ~885-905 ❖ (non esattamente 830): fisiologico,
  dato che battere il proprio record capita spesso durante una prima run. Il divario restante per le
  due torri (~200-270 ❖) resta comunque sopra il taglio minimo dello shop futuro (150 ❖) — nessun
  acquisto minimo sblocca tutto istantaneamente

## Non incluso in questa PR
Shop a denaro reale: progettato (3 tagli, niente casse casuali, tetto giornaliero solo sui frammenti
guadagnati) ma NON costruito — bloccato sul bridge nativo di window.storage, che non esiste ancora
nel repo. Da riprendere solo nella fase di packaging nativo per gli store.

## Test eseguiti
Gioco eseguito su server locale (non solo riletto): quaterna iniziale, prima conquista, rigiocata senza
record (paga zero), campagna intera, scalini infinito, tetto giornaliero, sblocco/doppio sblocco/fondi
insufficienti, salvataggio-ricarica, profilo collaudo, arretrato compatibilità. Tutto verde.

## Scoperto minore, rimandato
- Chi abbandona dalla pausa incassa i frammenti del record ma senza un "+10" visibile a schermo, solo dal
  saldo in armeria
- L'ondata 3 dello scenario 6 si chiama già "Frammenti" (WAVENAMES6) — collisione innocua col nome della
  nuova valuta, lasciata com'è
