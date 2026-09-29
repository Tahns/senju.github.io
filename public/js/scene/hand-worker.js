// Sculpte la main hors du fil principal, puis renvoie les tableaux.
import { sculptHand } from './hand-shape.js';

self.onmessage = (e) => {
    const r = sculptHand(e.data.chains, e.data.cell);
    self.postMessage(r, [r.position, r.normal, r.index, r.uv, r.color, r.skinIndex, r.skinWeight].map((a) => a.buffer));
};
