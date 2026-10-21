/* =========================================================
   icone.js — tutte le ICONE dell'app, disegnate al tratto (SVG).

   Vengono inserite una volta sola nella pagina (come "simboli")
   e poi richiamate ovunque con icona("nome").
   ========================================================= */

const SIMBOLI = `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <pattern id="p-greca" width="20" height="10" patternUnits="userSpaceOnUse">
      <path d="M0 9.2H14V1H4V6.5H9.5V3.8M14 9.2H20" fill="none" stroke="currentColor" stroke-width="1.4"/>
    </pattern>
  </defs>
  <symbol id="i-spiga" viewBox="0 0 24 24">
    <path d="M12 22.5V8" class="t"/>
    <path d="M12 9c-2.6-.6-4-2.4-4-4.8 2.6.5 4 2.3 4 4.8zm0 0c2.6-.6 4-2.4 4-4.8-2.6.5-4 2.3-4 4.8zM12 14c-2.6-.6-4-2.4-4-4.8 2.6.5 4 2.3 4 4.8zm0 0c2.6-.6 4-2.4 4-4.8-2.6.5-4 2.3-4 4.8zM12 19c-2.6-.6-4-2.4-4-4.8 2.6.5 4 2.3 4 4.8zm0 0c2.6-.6 4-2.4 4-4.8-2.6.5-4 2.3-4 4.8zM12 5.2c-.9-1-.9-2.6 0-3.8.9 1.2.9 2.8 0 3.8z" fill="currentColor"/>
  </symbol>
  <symbol id="i-alloro" viewBox="0 0 32 32">
    <path d="M8 28C6 20 8 12 16 5M24 28c2-8 0-16-8-23" class="t" stroke-width="1.6"/>
    <g fill="currentColor"><ellipse cx="6.2" cy="21" rx="1.6" ry="3.2" transform="rotate(-25 6.2 21)"/><ellipse cx="7.2" cy="15" rx="1.6" ry="3.2" transform="rotate(-40 7.2 15)"/><ellipse cx="10.4" cy="9.8" rx="1.6" ry="3.2" transform="rotate(-55 10.4 9.8)"/>
    <ellipse cx="25.8" cy="21" rx="1.6" ry="3.2" transform="rotate(25 25.8 21)"/><ellipse cx="24.8" cy="15" rx="1.6" ry="3.2" transform="rotate(40 24.8 15)"/><ellipse cx="21.6" cy="9.8" rx="1.6" ry="3.2" transform="rotate(55 21.6 9.8)"/></g>
  </symbol>
  <symbol id="i-mic" viewBox="0 0 24 24"><rect x="9" y="3" width="6" height="11" rx="3" class="t"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" class="t"/></symbol>
  <symbol id="i-stop" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></symbol>
  <symbol id="i-cam" viewBox="0 0 24 24"><path d="M4 8h3l2-3h6l2 3h3v11H4z" class="t"/><circle cx="12" cy="13" r="3.5" class="t"/></symbol>
  <symbol id="i-bar" viewBox="0 0 24 24"><path d="M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M8 8v8M11 8v8M14 8v8M17 8v8" class="t"/></symbol>
  <symbol id="i-cerca" viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" class="t"/><path d="M16 16l4.5 4.5" class="t"/></symbol>
  <symbol id="i-indietro" viewBox="0 0 24 24"><path d="M19 12H5M11 6l-6 6 6 6" class="t"/></symbol>
  <symbol id="i-sx" viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7" class="t"/></symbol>
  <symbol id="i-dx" viewBox="0 0 24 24"><path d="M9 5l7 7-7 7" class="t"/></symbol>
  <symbol id="i-chiudi" viewBox="0 0 24 24"><path d="M6 6l12 12M18 6L6 18" class="t"/></symbol>
  <symbol id="i-cestino" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" class="t"/></symbol>
  <symbol id="i-casa" viewBox="0 0 24 24"><path d="M3 10l9-6 9 6M5 10v10h14V10M9 20v-6h6v6" class="t"/></symbol>
  <symbol id="i-rotolo" viewBox="0 0 24 24"><path d="M6 4h11a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H7M6 4a2 2 0 0 0-2 2v1h4V6a2 2 0 0 0-2-2zM8 7v13M11 9h5M11 13h5M11 17h3" class="t"/></symbol>
  <symbol id="i-piu" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" class="t"/></symbol>
  <symbol id="i-bilancia" viewBox="0 0 24 24"><path d="M12 4v16M7 20h10M5 7h14M5 7l-3 6a3 3 0 0 0 6 0zM19 7l-3 6a3 3 0 0 0 6 0z" class="t"/></symbol>
  <symbol id="i-elmo" viewBox="0 0 24 24"><path d="M5 13a7 7 0 0 1 14 0M3.5 13h17M6.5 13v4.5L9.5 20M17.5 13v4.5L14.5 20M12 6V2.5M8.5 7.2C8.3 4.5 9.8 2.5 12 2.5s3.7 2 3.5 4.7M12 13v3" class="t"/></symbol>
  <symbol id="i-scudo" viewBox="0 0 24 24"><path d="M12 3l7 3v5c0 5-3 8.5-7 10-4-1.5-7-5-7-10V6zM12 8v8M9 11h6" class="t"/></symbol>
  <symbol id="i-persona" viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" class="t"/><path d="M4.5 20a7.5 7.5 0 0 1 15 0" class="t"/></symbol>
  <symbol id="i-anfora" viewBox="0 0 24 24"><path d="M9 3h6M10 3v3c-3 1-4 4-4 7 0 4 3 7 6 8 3-1 6-4 6-8 0-3-1-6-4-7V3M7 8c-2 0-3 1-3 3M17 8c2 0 3 1 3 3" class="t"/></symbol>
  <symbol id="i-sole" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4" class="t"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" class="t"/></symbol>
  <symbol id="i-piatto" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8" class="t"/><circle cx="12" cy="12" r="4" class="t"/></symbol>
  <symbol id="i-luna" viewBox="0 0 24 24"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5 7.5 7.5 0 1 0 19 14.5z" class="t"/></symbol>
  <symbol id="i-mela" viewBox="0 0 24 24"><path d="M12 7c-2-2-7-1.5-7 4 0 4 3 9 5 9 1 0 1.3-.5 2-.5s1 .5 2 .5c2 0 5-5 5-9 0-5.5-5-6-7-4zM12 7c0-2 1-3.5 3-4" class="t"/></symbol>
  <symbol id="i-fuoco" viewBox="0 0 24 24"><path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-4 3.5-5.5 3.5-10 3 1.5 5 4 5 6.5 1-1 1.5-2 1.5-3.5 2 1.5 3 4 3 7 0 3.4-2.6 6-6.5 6z" class="t"/></symbol>
  <symbol id="i-giu" viewBox="0 0 24 24"><path d="M3 7l6 6 4-4 8 8M15 17h6v-6" class="t"/></symbol>
  <symbol id="i-su" viewBox="0 0 24 24"><path d="M3 17l6-6 4 4 8-8M15 7h6v6" class="t"/></symbol>
  <symbol id="i-piatto-dritto" viewBox="0 0 24 24"><path d="M3 12h18M15 8l4 4-4 4" class="t"/></symbol>
  <symbol id="i-stelle" viewBox="0 0 24 24"><path d="M10 3l1.8 4.7L16.5 9.5l-4.7 1.8L10 16l-1.8-4.7L3.5 9.5l4.7-1.8zM18 14l.9 2.1L21 17l-2.1.9L18 20l-.9-2.1L15 17l2.1-.9z" class="t"/></symbol>
  <symbol id="i-matita" viewBox="0 0 24 24"><path d="M4 20l1-4L16 5l3 3L8 19zM14 7l3 3" class="t"/></symbol>
  <symbol id="i-esci" viewBox="0 0 24 24"><path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" class="t"/></symbol>
  <symbol id="i-fiocco" viewBox="0 0 24 24"><path d="M12 2v20M3.3 7l17.4 10M3.3 17L20.7 7M9 4l3 2 3-2M9 20l3-2 3 2M4 10.5l3.4-.4-1-3.3M20 13.5l-3.4.4 1 3.3M4 13.5l3.4.4-1 3.3M20 10.5l-3.4-.4 1-3.3" class="t"/></symbol>
  <symbol id="i-pentola" viewBox="0 0 24 24"><path d="M4 10h16v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4zM2 10h2M20 10h2M9 10V8a3 3 0 0 1 6 0v2M9 4c0-1 1-1 1-2M14 4c0-1 1-1 1-2" class="t"/></symbol>
  <symbol id="i-copia" viewBox="0 0 24 24"><rect x="8" y="8" width="12" height="12" rx="2" class="t"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" class="t"/></symbol>
  <symbol id="i-spunta" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7" class="t" stroke-width="2.6"/></symbol>
  <symbol id="i-annulla" viewBox="0 0 24 24"><path d="M9 14L4 9l5-5M4 9h10a6 6 0 0 1 0 12h-3" class="t"/></symbol>
  <symbol id="i-documento" viewBox="0 0 24 24"><path d="M6 3h8l4 4v14H6zM14 3v4h4M9 12h6M9 16h6" class="t"/></symbol>
  <symbol id="i-scarica" viewBox="0 0 24 24"><path d="M12 4v11M7 10l5 5 5-5M5 20h14" class="t"/></symbol>
  <symbol id="i-griglia" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2" class="t"/><path d="M4 9.3h16M4 14.7h16M9.3 4v16M14.7 4v16" class="t" stroke-width="1.6"/></symbol>
  <symbol id="i-elenco" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="6" rx="2" class="t"/><rect x="4" y="14" width="16" height="6" rx="2" class="t"/></symbol>
  <symbol id="i-nuvola" viewBox="0 0 24 24"><path d="M7 18a4 4 0 0 1-.5-8A6 6 0 0 1 18 9a4.5 4.5 0 0 1-1 9z" class="t"/></symbol>
</svg>`;

/** Inserisce i simboli nella pagina (una volta, all'avvio) */
export function installaIcone() {
  document.body.insertAdjacentHTML("afterbegin", SIMBOLI);
}

/** <svg> pronto da mettere nell'HTML */
export const icona = (nome, classe = "") => `<svg class="ic ${classe}" aria-hidden="true"><use href="#i-${nome}"/></svg>`;

/** Il marchio: spiga + ANNONA */
export const marchio = () => `<span class="marchio">${icona("spiga")}<b>ANNONA</b></span>`;
