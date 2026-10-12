/**
 * Efekty SSD1306 / SSD1315, które nie przepisują GDDRAM.
 * Na ESP32 to komendy, nie pętle po pikselach:
 *   0x26 / 0x27  przewijanie w poziomie
 *   0x29         poziom + pion (tu: „skos”)
 *   0x2E / 0x2F  stop / start
 *   0x23         zanikanie albo mruganie
 *   0xA4 / 0xA5  RAM albo cały panel zapalony
 *   0xA0/A1 + 0xC0/C8  obrót 180°
 * Czystego przewijania tylko w pionie ten układ nie ma.
 * Biały albo niebieski to szkło, nie rejestr.
 */

const PX_PER_S = 14;
const STEP_MS = 90;
const STEPS = 16;

const st = {
  scroll: 0,
  acc: 0,
  off: 0,
  fx: 0,
  fxAcc: 0,
  fxStep: 0,
  allOn: 0,
};

export function panel_reset() {
  st.scroll = 0;
  st.acc = 0;
  st.off = 0;
  st.fx = 0;
  st.fxAcc = 0;
  st.fxStep = 0;
  st.allOn = 0;
}

export function panel_state() {
  return st;
}

export function panel_scroll(dir) {
  st.scroll = dir | 0;
  if (!st.scroll) {
    st.acc = 0;
    st.off = 0;
  }
}

export function panel_fx(mode) {
  st.fx = mode | 0;
  st.fxAcc = 0;
  st.fxStep = 0;
}

export function panel_all_on(on) {
  st.allOn = on ? 1 : 0;
}

export function panel_tick(dt) {
  if (st.scroll) {
    st.acc += dt;
    const step = 1000 / PX_PER_S;
    while (st.acc >= step) {
      st.acc -= step;
      st.off = (st.off + 1) & 127;
    }
  }
  if (!st.fx) return;
  st.fxAcc += dt;
  while (st.fxAcc >= STEP_MS) {
    st.fxAcc -= STEP_MS;
    st.fxStep++;
    if (st.fx === 1 && st.fxStep > STEPS) st.fxStep = STEPS;
    if (st.fx === 2 && st.fxStep >= STEPS * 2) st.fxStep = 0;
  }
}

export function panel_gain() {
  if (st.fx === 1) return Math.max(0, STEPS - st.fxStep) / STEPS;
  if (st.fx === 2) {
    const phase = st.fxStep % (STEPS * 2);
    const down = phase < STEPS ? phase : STEPS * 2 - phase;
    return (STEPS - down) / STEPS;
  }
  return 1;
}

/** Próbka tak, jak szkło ją pokaże. Bufor zostaje. */
export function panel_sample(buf, x, y, flip) {
  let sx = x | 0;
  let sy = y | 0;
  if (flip) {
    sx = 127 - sx;
    sy = 63 - sy;
  }
  const o = st.off | 0;
  if (st.scroll === 1) sx = (sx + o) & 127;
  else if (st.scroll === 2) sx = (sx - o + 128) & 127;
  else if (st.scroll === 3) {
    sx = (sx - o + 128) & 127;
    sy = (sy + o) & 63;
  }
  if (sx < 0 || sy < 0 || sx > 127 || sy > 63) return 0;
  return buf[sy * 128 + sx] ? 1 : 0;
}
