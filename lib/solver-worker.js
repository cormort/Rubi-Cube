// Kociemba two-phase solver worker
// cube.js / solve.js 為 CommonJS 風格的 IIFE 掛到 this.Cube，因此用 importScripts 載入即可。
// 來源：https://github.com/ldez/cubejs (MIT)，授權見 ./LICENSE-cubejs
importScripts('cube.js', 'solve.js');

let inited = false;

function ensureSolver() {
  if (inited) return;
  self.Cube.initSolver();
  inited = true;
}

self.onmessage = function (e) {
  const { type, facelet } = e.data || {};
  try {
    if (type === 'warmup') {
      ensureSolver();
      self.postMessage({ type: 'ready' });
      return;
    }
    if (type === 'solve') {
      ensureSolver();
      const solution = self.Cube.fromString(facelet).solve();
      self.postMessage({ type: 'solved', solution: solution || null });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: String((err && err.message) || err) });
  }
};
