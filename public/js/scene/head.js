/*
 * Tête de Hoko adulte côté rendu : on lance la sculpture dans un worker dès
 * le début (elle prend une à quatre secondes), puis on en fait des maillages.
 * Le visage est peint sur une toile et projeté de face.
 */
import * as THREE from 'three';
import { SPAN } from './sculpt.js';

/* ---------------- Visage peint (projection de face) ---------------- */
const toCanvas = (x, y) => [512 + (x / SPAN) * 1024, 512 - (y / SPAN) * 1024];

export function faceTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 1024;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#f4cdae';
    ctx.fillRect(0, 0, 1024, 1024);
    const soft = (x, y, r, color) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const [, eyeY] = toCanvas(0, -0.012);
    // Joues rosées, léger creux sous la lèvre, ombre douce du front sous le bandeau.
    [-1, 1].forEach((s) => soft(512 + s * 205, 700, 110, 'rgba(238,125,105,.16)'));
    soft(512, 860, 50, 'rgba(170,95,75,.12)');
    const g = ctx.createLinearGradient(0, 330, 0, 430);
    g.addColorStop(0, 'rgba(150,90,70,.22)');
    g.addColorStop(1, 'rgba(150,90,70,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 330, 1024, 100);

    const eye = (cx, flip) => {
        ctx.save();
        ctx.translate(cx, eyeY);
        ctx.scale(flip * 1.6, 1.6);
        // Blanc de l'œil, en amande effilée vers l'extérieur.
        ctx.fillStyle = '#fbf8f4';
        ctx.beginPath();
        ctx.moveTo(-44, 5);
        ctx.quadraticCurveTo(-16, -19, 22, -16);
        ctx.quadraticCurveTo(40, -13, 50, -4);
        ctx.quadraticCurveTo(24, 15, -10, 14);
        ctx.quadraticCurveTo(-32, 12, -44, 5);
        ctx.fill();
        ctx.save();
        ctx.clip();
        // Iris brun chaud, pupille, deux reflets.
        const ig = ctx.createLinearGradient(0, -20, 0, 18);
        ig.addColorStop(0, '#1a0f0a');
        ig.addColorStop(0.55, '#5a3420');
        ig.addColorStop(1, '#a8703f');
        ctx.fillStyle = ig;
        ctx.beginPath();
        ctx.ellipse(3, -1, 16, 18, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0b0605';
        ctx.beginPath();
        ctx.ellipse(3, 0, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.beginPath();
        ctx.ellipse(-4, -7, 4.5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.beginPath();
        ctx.arc(9, 7, 2.2, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(60,30,20,.28)';
        ctx.fillRect(-50, -24, 110, 11);
        ctx.restore();
        // Paupière supérieure épaisse, pointe vers l'extérieur.
        ctx.fillStyle = '#120a08';
        ctx.beginPath();
        ctx.moveTo(-48, 7);
        ctx.quadraticCurveTo(-18, -25, 24, -19);
        ctx.quadraticCurveTo(44, -15, 60, -7);
        ctx.lineTo(53, -1);
        ctx.quadraticCurveTo(22, -11, -14, -11);
        ctx.quadraticCurveTo(-34, -7, -48, 7);
        ctx.fill();
        ctx.strokeStyle = 'rgba(50,25,18,.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-8, 15);
        ctx.quadraticCurveTo(20, 16, 44, 4);
        ctx.stroke();
        ctx.strokeStyle = 'rgba(90,45,35,.45)';
        ctx.beginPath();
        ctx.moveTo(-28, -18);
        ctx.quadraticCurveTo(10, -31, 44, -21);
        ctx.stroke();
        ctx.restore();
        // Sourcil anguleux, déterminé.
        ctx.save();
        ctx.translate(cx + flip * 8, eyeY - 88);
        ctx.scale(flip * 1.45, 1.35);
        ctx.fillStyle = '#23140d';
        ctx.beginPath();
        ctx.moveTo(-48, 16);
        ctx.lineTo(-40, 4);
        ctx.quadraticCurveTo(0, -8, 54, -2);
        ctx.lineTo(52, 6);
        ctx.quadraticCurveTo(0, 4, -36, 19);
        ctx.fill();
        ctx.restore();
    };
    const [left] = toCanvas(-0.034, 0);
    const [right] = toCanvas(0.034, 0);
    eye(left, -1);
    eye(right, 1);
    // Nez : un reflet et une petite ombre sous la pointe.
    const [, noseY] = toCanvas(0, -0.042);
    soft(512 + 6, noseY + 10, 16, 'rgba(160,85,65,.4)');
    soft(512 - 4, noseY - 30, 20, 'rgba(255,240,225,.35)');
    // Bouche : un trait ferme, la lèvre inférieure à peine rosée.
    const [, mouthY] = toCanvas(0, -0.068);
    ctx.strokeStyle = '#6a2e22';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(512 - 52, mouthY - 2);
    ctx.quadraticCurveTo(512, mouthY + 6, 512 + 52, mouthY - 4);
    ctx.stroke();
    soft(512, mouthY + 18, 32, 'rgba(200,105,90,.28)');
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
}

/* ---------------- Sculpture en arrière-plan ---------------- */
function toGeometry(raw, extra = {}) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(raw.position, 3));
    g.setAttribute('normal', new THREE.BufferAttribute(raw.normal, 3));
    Object.entries(extra).forEach(([name, [array, size]]) => g.setAttribute(name, new THREE.BufferAttribute(array, size)));
    g.setIndex(new THREE.BufferAttribute(raw.index, 1));
    g.computeBoundingSphere();
    return g;
}

function assemble(raw) {
    return {
        head: toGeometry(raw.head, { uv: [raw.head.uv, 2] }),
        hair: toGeometry(raw.hair, { color: [raw.hair.color, 3] }),
        band: toGeometry(raw.band),
        plate: new THREE.Vector3(...raw.plate),
        back: raw.back
    };
}

let pending = null;
export function loadHead() {
    if (pending) return pending;
    pending = new Promise((resolve) => {
        const fallback = () => import('./sculpt.js').then((m) => resolve(assemble(m.sculptHead())));
        try {
            const worker = new Worker(new URL('./head-worker.js', import.meta.url), { type: 'module' });
            worker.onmessage = (e) => {
                worker.terminate();
                resolve(assemble(e.data));
            };
            worker.onerror = () => {
                worker.terminate();
                fallback();
            };
        } catch (error) {
            fallback();
        }
    });
    return pending;
}
