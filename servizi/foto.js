/* =========================================================
   foto.js — preparare una foto (o un file) da mandare all'IA.

   Le foto dell'iPhone sono grandi (anche 4–5 MB): prima di spedirle
   le rimpiccioliamo e le convertiamo in JPEG. Così viaggiano in fretta
   e l'IA le legge benissimo lo stesso.
   Usato da: importa (la scheda) e aggiungi (la foto del piatto).
   ========================================================= */

/**
 * Foto → JPEG ridimensionato, in base64 (il testo che l'IA riceve).
 * @param lato  il lato lungo massimo in pixel (2000 basta per leggere anche la scrittura a mano)
 */
export async function fotoInBase64(file, lato = 2000) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = ko; i.src = url; });
    const scala = Math.min(1, lato / Math.max(img.naturalWidth, img.naturalHeight));
    const tela = document.createElement("canvas");
    tela.width = Math.round(img.naturalWidth * scala);
    tela.height = Math.round(img.naturalHeight * scala);
    tela.getContext("2d").drawImage(img, 0, 0, tela.width, tela.height);
    return tela.toDataURL("image/jpeg", 0.85).split(",")[1];
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Qualsiasi file → base64 (per il PDF) */
export const fileInBase64 = (file) => new Promise((ok, ko) => {
  const r = new FileReader();
  r.onload = () => ok(String(r.result).split(",")[1]);
  r.onerror = ko;
  r.readAsDataURL(file);
});
