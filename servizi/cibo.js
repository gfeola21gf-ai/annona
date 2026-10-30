/* =========================================================
   cibo.js — trovare un alimento e trasformarlo in una voce del diario.

   Due fonti:
   1. la TABELLA INTERNA (dati/alimenti.js): immediata, anche offline
   2. OPEN FOOD FACTS: prodotti confezionati
      - per nome → via la funzione su Supabase (la ricerca non accetta chiamate dal browser)
      - per codice a barre → direttamente dal telefono (quella sì)
   ========================================================= */

import { ALIMENTI } from "../dati/alimenti.js";
import { cercaProdotti } from "./ia.js";
import { perGrammi } from "../logica/energia.js";

/** Minuscolo e senza accenti: "Caffè" → "caffe" (per confrontare) */
export const normalizza = (t) => t.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

/** Ricerca istantanea nella tabella interna (+ alimenti usati di recente) */
export function cercaLocale(testo, recenti = []) {
  const parole = normalizza(testo).split(/\s+/).filter(Boolean);
  if (!parole.length) return [];
  const tutti = [...recenti, ...ALIMENTI];
  const visti = new Set();
  return tutti
    .filter((a) => {
      const n = normalizza(a.nome);
      if (visti.has(n)) return false;
      visti.add(n);
      return parole.every((p) => n.includes(p));
    })
    // prima quelli che INIZIANO con la parola cercata
    .sort((a, b) => Number(!normalizza(a.nome).startsWith(parole[0])) - Number(!normalizza(b.nome).startsWith(parole[0])))
    .slice(0, 8);
}

/** Ricerca online (prodotti di marca). Restituisce [] se non c'è rete. */
export async function cercaOnline(testo) {
  try {
    const prodotti = await cercaProdotti(testo);
    return prodotti.map((p) => {
      // se il produttore indica una porzione (es. 1 biscotto = 8 g), la usiamo come "pezzo"
      const pezzo = p.porzione && p.porzione !== 100 ? { nome: "porzione", plurale: "porzioni", g: p.porzione } : null;
      return {
        nome: p.marca ? `${p.nome} · ${p.marca}` : p.nome,
        per100: { ...p.per100, ...(pezzo && { pezzo }) },
        porzione: p.porzione || 100,
        fonte: "openfoodfacts",
        codice: p.codice,
      };
    });
  } catch {
    return [];
  }
}

/**
 * Un prodotto dal suo codice a barre (EAN), da Open Food Facts.
 * @returns l'alimento (come quelli della ricerca), oppure null se non c'è o mancano le calorie
 */
export async function prodottoDaCodice(codice) {
  if (!navigator.onLine) throw new Error("Serve internet per cercare il prodotto.");
  const campi = "product_name,product_name_it,generic_name_it,brands,nutriments,serving_quantity,serving_size";
  let r;
  try {
    r = await fetch(`https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(codice)}?fields=${campi}`);
  } catch {
    throw new Error("Il database dei prodotti non risponde, riprova tra poco.");
  }
  if (r.status === 404) return null;
  if (!r.ok) throw new Error("Il database dei prodotti non risponde, riprova tra poco.");
  const p = (await r.json()).product;
  const n = p?.nutriments ?? {};
  // le kcal; se il produttore ha scritto solo i kJ, le ricaviamo (1 kcal = 4,184 kJ)
  const kcal = Number(n["energy-kcal_100g"] ?? (n.energy_100g != null ? n.energy_100g / 4.184 : NaN));
  const nome = (p?.product_name_it || p?.product_name || p?.generic_name_it || "").trim();
  if (!nome || !(kcal >= 0)) return null;
  const marca = String(p.brands ?? "").split(",")[0].trim();
  const porzione = Number(p.serving_quantity) || 0;
  // la porzione del produttore (es. 3 biscotti = 28 g) diventa il "pezzo" del dosatore
  const pezzo = porzione > 0 && porzione !== 100 ? { nome: "porzione", plurale: "porzioni", g: porzione } : null;
  return {
    nome: marca && !nome.toLowerCase().includes(marca.toLowerCase()) ? `${nome} · ${marca}` : nome,
    per100: { kcal, p: Number(n.proteins_100g) || 0, c: Number(n.carbohydrates_100g) || 0, g: Number(n.fat_100g) || 0, ...(pezzo && { pezzo }) },
    porzione: porzione || 100,
    porzioneTesto: String(p.serving_size ?? "").trim(),
    fonte: "openfoodfacts",
  };
}

/** Alimento (valori per 100 g) + grammi → voce del diario */
export function voceDa(alimento, grammi, extra = {}) {
  const p = alimento.per100;
  return {
    nome: alimento.nome,
    grammi: Math.round(grammi),
    kcal: Math.round(perGrammi(p.kcal, grammi)),
    proteine: perGrammi(p.p, grammi),
    carboidrati: perGrammi(p.c, grammi),
    grassi: perGrammi(p.g, grammi),
    per100: p,
    fonte: alimento.fonte,
    ...extra,
  };
}

/**
 * Una stima dell'IA ({nome, grammi, kcal, …}) → voce del diario (con i valori per 100 g, per poter cambiare i grammi).
 * Se l'IA ha riconosciuto un alimento della TABELLA INTERNA (campo "tabella"), l'IA ci dà solo
 * COSA e QUANTO: calorie e macro le calcoliamo noi dai valori ufficiali (CREA).
 * Rete di sicurezza: se i due conti sono lontanissimi (es. pasta cotta scambiata per cruda), teniamo la stima.
 * Lo scambio cotto/crudo pesa ×2-3 solo per ciò che in tabella è CRUDO o SECCO (pasta, riso, legumi secchi…):
 * lì basta ×1,8. Per il resto (gnocchi, pane, carne…) la tabella vince fino a ×3: un'IA che sottostima
 * (gnocchi 200 g = 170 invece di 320) non deve più passare.
 */
export const pesaCrudo = (nome) => /\(crud[oa]\)$| secch[ei]$/.test(nome);
export function voceDaStima(a) {
  const g = Math.max(1, Number(a.grammi) || 100);
  const daTabella = a.tabella && ALIMENTI.find((x) => x.nome === a.tabella);
  if (daTabella) {
    const kcalTabella = (daTabella.per100.kcal * g) / 100;
    const rapporto = a.kcal > 0 ? kcalTabella / a.kcal : 1;
    const limite = pesaCrudo(daTabella.nome) ? 1.8 : 3;
    if (rapporto > 0.55 && rapporto < limite) {
      // il "pezzo" della tabella (es. 1 uovo = 60 g) vince; se non c'è, quello suggerito dall'IA
      const pezzo = daTabella.per100.pezzo ?? (a.pezzo_nome && a.pezzo_grammi > 0
        ? { nome: a.pezzo_nome, plurale: a.pezzo_plurale || a.pezzo_nome, g: Number(a.pezzo_grammi) } : null);
      return voceDa({ ...daTabella, per100: { ...daTabella.per100, ...(pezzo && { pezzo }) } }, g);
    }
  }
  const per100 = {
    kcal: (a.kcal / g) * 100,
    p: ((a.proteine || 0) / g) * 100,
    c: ((a.carboidrati || 0) / g) * 100,
    g: ((a.grassi || 0) / g) * 100,
  };
  // se l'IA dice che si conta a pezzi (es. "galletta", 9 g), lo ricordiamo per il dosatore
  if (a.pezzo_nome && a.pezzo_grammi > 0) {
    per100.pezzo = { nome: a.pezzo_nome, plurale: a.pezzo_plurale || a.pezzo_nome, g: Number(a.pezzo_grammi) };
  }
  return voceDa({ nome: a.nome, per100, fonte: "ia" }, g);
}

/** Cambia i grammi di una voce ricalcolando kcal e macro */
export const conGrammi = (voce, grammi) =>
  voce.per100 ? { ...voce, ...voceDa({ nome: voce.nome, per100: voce.per100, fonte: voce.fonte }, grammi) } : { ...voce, grammi };

/** Quanti pezzi sono questi grammi (arrotondato al mezzo pezzo), o null se l'alimento non si conta a pezzi */
export function pezziDi(voce) {
  const pz = voce.per100?.pezzo;
  return pz ? Math.round((voce.grammi / pz.g) * 2) / 2 : null;
}

/** "3 gallette · 27 g"  oppure  "200 g" */
export function testoQuantita(voce) {
  const pz = voce.per100?.pezzo, n = pezziDi(voce);
  const g = `${Math.round(voce.grammi)} g`;
  if (!pz || !n) return g;
  const quanti = String(n).replace(".", ",").replace(",5", "½").replace(/^0½$/, "½");
  return `${quanti} ${n > 1 ? pz.plurale : pz.nome} · ${g}`;
}
