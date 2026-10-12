/**
 * Rysuje bufor 1-bit na canvas, piksel w piksel (bez wygładzania).
 * Kolor i kontrast czyta z ustawień — na ESP32 kontrast to komenda SSD1306,
 * a barwa jest cechą samego modułu (tryb Y/B imituje żółto-niebieski 0.96").
 */

const WHITE = [244, 241, 234];
const BLUE = [126, 198, 255];
const YELLOW = [255, 214, 112];

let image = null;
let imageScale = 0;

function lit_color(mode, y, contrast) {
  let rgb = WHITE;
  if (mode === 1) rgb = BLUE;
  else if (mode === 2) rgb = YELLOW;
  else if (mode === 3) rgb = y < 16 ? YELLOW : BLUE;
  const k = Math.max(0.04, Math.min(1, contrast / 255));
  return [
    Math.round(rgb[0] * k),
    Math.round(rgb[1] * k),
    Math.round(rgb[2] * k),
  ];
}

export function present(canvas, display, settings, scale, box) {
  const sc = Math.max(1, scale | 0);
  const w = 128 * sc;
  const h = 64 * sc;
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w;
    canvas.height = h;
  }
  const cssW = box && box.w ? box.w : w;
  const cssH = box && box.h ? box.h : h;
  canvas.style.width = cssW + "px";
  canvas.style.height = cssH + "px";
  if (!image || imageScale !== scale) {
    image = new ImageData(w, h);
    imageScale = scale;
  }
  const data = image.data;
  const buf = display.buf;
  const mode = settings.color | 0;
  const contrast = settings.contrast | 0;
  const invert = settings.invert ? 1 : 0;
  let o = 0;
  for (let y = 0; y < 64; y++) {
    const lit = lit_color(mode, y, contrast);
    const ink = invert ? [22, 18, 14] : lit;
    const paper = invert ? lit : [0, 0, 0];
    for (let x = 0; x < 128; x++) {
      const px = buf[y * 128 + x] ? ink : paper;
      for (let sy = 0; sy < scale; sy++) {
        let row = ((y * scale + sy) * w + x * scale) * 4;
        for (let sx = 0; sx < scale; sx++) {
          data[row] = px[0];
          data[row + 1] = px[1];
          data[row + 2] = px[2];
          data[row + 3] = 255;
          row += 4;
        }
      }
      o++;
    }
  }
  void o;
  const ctx = canvas.getContext("2d", { alpha: false });
  ctx.putImageData(image, 0, 0);
}

export function snapshot_blob(display, settings) {
  const c = document.createElement("canvas");
  present(c, display, settings, 4);
  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}
