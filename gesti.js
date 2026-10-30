/* =========================================================
   gesti.js — i GESTI come sull'iPhone (scelta dell'utente 2026-10-29).

   Su una riga (un alimento, un pasto…):
     SCORRI a destra / a sinistra → compare sotto un'azione colorata;
                                    oltre metà corsa la fa (es. Duplica / Elimina)
     TIENI PREMUTO               → la riga si «solleva»: lasciando il dito si apre
                                    il MENU (sfondo sfocato, voci una sotto l'altra)
     TIENI PREMUTO E TRASCINA    → la porti sopra un «bersaglio» (es. un altro pasto)
   Il tocco semplice resta un tocco normale (click).
   ========================================================= */

import { icona } from "./grafica/icone.js";
import { esc } from "./ui.js";

const ATTESA_LUNGA = 450;     // ms: quanto tenere premuto
const SOGLIA = 10;            // px: oltre, il dito «si sta muovendo»

let bloccaScorrimento = false;
// Mentre trascini, la pagina sotto non deve scorrere (su iPhone serve un ascoltatore «non passivo»)
document.addEventListener("touchmove", (e) => { if (bloccaScorrimento) e.preventDefault(); }, { passive: false });

/** Il prossimo click (quello che segue un gesto) non deve aprire niente */
function ingoiaClick() {
  const via = (e) => { e.stopPropagation(); e.preventDefault(); };
  window.addEventListener("click", via, { capture: true, once: true });
  setTimeout(() => window.removeEventListener("click", via, { capture: true }), 400);
}

/**
 * Attiva i gesti sulle righe di un contenitore (anche quelle disegnate dopo).
 * @param contenitore  l'elemento che contiene le righe
 * @param selettore    quali elementi sono righe (es. "[data-voce]")
 * @param destra       { testo, icona, classe, fai(riga) }  scorrendo verso destra (facoltativo;
 *                     può essere anche una funzione (riga) => azione | null, se cambia da riga a riga)
 * @param sinistra     come destra, scorrendo verso sinistra
 * @param lungo        (riga) => …   tieni premuto e lascia (di solito: apri il menu)
 * @param trascina     { bersagli: "selettore", lascia(riga, bersaglio), inizio?(riga), fine?() }
 */
export function gesti(contenitore, selettore, { destra: aDestra, sinistra: aSinistra, lungo, trascina } = {}) {
  let s = null;     // lo stato del gesto in corso
  let destra = null, sinistra = null;     // le azioni della riga premuta
  const azione = (a, riga) => (typeof a === "function" ? a(riga) : a) ?? null;

  contenitore.addEventListener("pointerdown", (e) => {
    const riga = e.target.closest(selettore);
    if (!riga || !contenitore.contains(riga) || e.button > 0 || e.target.closest("[data-niente-gesti]")) return;
    s = { riga, id: e.pointerId, x0: e.clientX, y0: e.clientY, dx: 0, modo: "attesa", fondo: null };
    destra = azione(aDestra, riga); sinistra = azione(aSinistra, riga);
    if (lungo || trascina) {
      s.timer = setTimeout(() => {
        if (!s || s.modo !== "attesa") return;
        s.modo = "sollevato";
        bloccaScorrimento = true;
        navigator.vibrate?.(10);
        riga.classList.add("sollevato");
        try { riga.setPointerCapture(s.id); } catch { /* pazienza */ }
      }, ATTESA_LUNGA);
    }
  });

  contenitore.addEventListener("pointermove", (e) => {
    if (!s || e.pointerId !== s.id) return;
    const dx = e.clientX - s.x0, dy = e.clientY - s.y0;
    if (s.modo === "attesa") {
      if (Math.abs(dx) < SOGLIA && Math.abs(dy) < SOGLIA) return;
      clearTimeout(s.timer);
      // in orizzontale (e c'è un'azione da quella parte) → scorrimento; altrimenti lascia scorrere la pagina
      if (Math.abs(dx) > Math.abs(dy) && (dx > 0 ? destra : sinistra)) {
        s.modo = "scorro";
        try { s.riga.setPointerCapture(s.id); } catch { /* pazienza */ }
        preparaFondo();
      } else { s = null; return; }
    }
    if (s.modo === "scorro") {
      s.dx = (dx > 0 ? destra : sinistra) ? dx : 0;
      s.riga.style.transform = `translateX(${s.dx}px)`;
      s.fondo.dataset.lato = s.dx > 0 ? "destra" : "sinistra";
      s.fondo.classList.toggle("pronto", Math.abs(s.dx) > s.riga.offsetWidth * 0.4);
      return;
    }
    if (s.modo === "sollevato" && trascina && Math.hypot(dx, dy) > SOGLIA) iniziaTrascina(e);
    if (s.modo === "trascino") muoviFantasma(e);
  });

  const fine = (e) => {
    if (!s || (e && e.pointerId !== s.id)) return;
    clearTimeout(s.timer);
    const { riga, modo } = s;
    bloccaScorrimento = false;
    riga.classList.remove("sollevato");
    if (modo === "scorro") {
      ingoiaClick();
      const scelta = s.dx > 0 ? destra : sinistra;
      const fatta = Math.abs(s.dx) > riga.offsetWidth * 0.4;
      const fondo = s.fondo;
      riga.style.transition = "transform .18s ease-out";
      riga.style.transform = fatta ? `translateX(${Math.sign(s.dx) * riga.offsetWidth}px)` : "";
      setTimeout(() => {
        riga.style.transition = ""; riga.style.transform = ""; fondo?.remove(); riga.classList.remove("in-gesto");
        if (fatta && e?.type === "pointerup") scelta.fai(riga);
      }, 180);
    }
    if (modo === "sollevato") { ingoiaClick(); if (e?.type === "pointerup") lungo?.(riga); }
    if (modo === "trascino") {
      ingoiaClick();
      const bersaglio = s.bersaglio;
      s.fantasma.remove();
      riga.classList.remove("trascinato");
      document.querySelectorAll(".bersaglio-su").forEach((b) => b.classList.remove("bersaglio-su"));
      trascina.fine?.();
      if (bersaglio && e?.type === "pointerup") trascina.lascia(riga, bersaglio);
    }
    s = null;
  };
  contenitore.addEventListener("pointerup", fine);
  contenitore.addEventListener("pointercancel", fine);
  // su iPhone il menu del sistema (copia/seleziona) non deve comparire tenendo premuto
  contenitore.addEventListener("contextmenu", (e) => { if (e.target.closest(selettore)) e.preventDefault(); });

  /** Sotto la riga, i due colori con le azioni (si vede scorrendo) */
  function preparaFondo() {
    const r = s.riga, padre = r.parentElement;
    if (getComputedStyle(padre).position === "static") padre.style.position = "relative";
    const f = document.createElement("div");
    f.className = "gesto-fondo";
    f.style.cssText = `top:${r.offsetTop}px;left:${r.offsetLeft}px;width:${r.offsetWidth}px;height:${r.offsetHeight}px;border-radius:${getComputedStyle(r).borderRadius}`;
    const lato = (a, quale) => a ? `<span class="gf-${quale} ${a.classe ?? ""}">${a.icona ? icona(a.icona) : ""}${esc(a.testo)}</span>` : "<span></span>";
    f.innerHTML = lato(destra, "destra") + lato(sinistra, "sinistra");
    padre.insertBefore(f, r);
    r.classList.add("in-gesto");
    s.fondo = f;
  }

  function iniziaTrascina(e) {
    s.modo = "trascino";
    const box = s.riga.getBoundingClientRect();
    const f = s.riga.cloneNode(true);
    f.classList.remove("sollevato");
    f.classList.add("fantasma");
    f.style.cssText = `width:${box.width}px;height:${box.height}px;left:${box.left}px;top:${box.top}px`;
    document.body.append(f);
    s.fantasma = f;
    s.dxF = e.clientX - box.left; s.dyF = e.clientY - box.top;
    s.riga.classList.add("trascinato");
    trascina.inizio?.(s.riga);
    muoviFantasma(e);
  }

  function muoviFantasma(e) {
    s.fantasma.style.left = `${e.clientX - s.dxF}px`;
    s.fantasma.style.top = `${e.clientY - s.dyF}px`;
    s.fantasma.style.visibility = "hidden";
    const sotto = document.elementFromPoint(e.clientX, e.clientY)?.closest(trascina.bersagli);
    s.fantasma.style.visibility = "";
    if (sotto !== s.bersaglio) {
      s.bersaglio?.classList.remove("bersaglio-su");
      s.bersaglio = sotto && sotto !== s.riga ? sotto : null;
      s.bersaglio?.classList.add("bersaglio-su");
    }
  }
}

/**
 * Il MENU di una riga, come quello dell'iPhone: sfondo sfocato, la riga «sollevata» e sotto le voci.
 * @param riga   l'elemento premuto (viene mostrata una copia sopra lo sfondo)
 * @param voci   [{ testo, icona, rossa?, fai() }]  (null = una riga di separazione)
 */
export function menu(riga, voci) {
  const box = riga.getBoundingClientRect();
  const velo = document.createElement("div");
  velo.className = "menu-velo";
  const copia = riga.cloneNode(true);
  copia.classList.remove("sollevato", "in-gesto");
  copia.classList.add("menu-riga");
  const elenco = document.createElement("div");
  elenco.className = "menu-voci";
  elenco.setAttribute("role", "menu");
  elenco.innerHTML = voci.map((v, i) => v
    ? `<button role="menuitem" class="${v.rossa ? "rossa" : ""}" data-i="${i}"><span>${esc(v.testo)}</span>${v.icona ? icona(v.icona) : ""}</button>`
    : `<i class="menu-spazio"></i>`).join("");
  velo.append(copia, elenco);
  document.body.append(velo);

  // la riga resta dov'era; il menu sotto, o sopra se in fondo allo schermo non c'è posto
  const alto = window.innerHeight;
  const hMenu = elenco.offsetHeight;
  let top = box.top;
  if (top + box.height + 8 + hMenu > alto - 12) top = Math.max(12, alto - 12 - hMenu - 8 - box.height);
  copia.style.cssText = `left:${box.left}px;top:${top}px;width:${box.width}px`;
  elenco.style.top = `${top + box.height + 8}px`;
  elenco.style.left = `${Math.min(box.left, window.innerWidth - elenco.offsetWidth - 12)}px`;
  requestAnimationFrame(() => velo.classList.add("aperto"));

  const chiudi = () => { velo.classList.remove("aperto"); setTimeout(() => velo.remove(), 180); };
  velo.addEventListener("click", (e) => {
    const b = e.target.closest("[data-i]");
    chiudi();
    if (b) voci[Number(b.dataset.i)].fai();
  });
}
