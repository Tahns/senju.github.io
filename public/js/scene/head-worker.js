// Sculpte la tête de Hoko hors du fil principal, puis renvoie les tableaux.
import { sculptHead } from './sculpt.js';

const r = sculptHead();
const buffers = [r.head.position, r.head.normal, r.head.index, r.head.uv, r.hair.position, r.hair.normal, r.hair.index, r.hair.color, r.band.position, r.band.normal, r.band.index].map((a) => a.buffer);
self.postMessage(r, buffers);
