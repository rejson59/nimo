/**
 * LCG (Numerical Recipes). Ten sam wzór da się wkleić do C++ jako uint32_t.
 * Nie używamy Math.random — sekwencja ma być przenośna i testowalna.
 */

let state = 1;

export function rand_seed(v) {
  state = (v >>> 0) || 1;
}

export function rand_u16() {
  state = (Math.imul(1664525, state) + 1013904223) >>> 0;
  return state & 0xffff;
}

export function rand_int(n) {
  if (n <= 1) return 0;
  return rand_u16() % n;
}
