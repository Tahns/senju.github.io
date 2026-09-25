/*
 * Tête de Hoko adulte, sculptée d'un seul bloc (crâne, visage en V, menton,
 * pommettes, petit nez, oreilles, cou) et chevelure en grosses pointes anime,
 * fondues dans une calotte. Code pur (sans three.js) : il tourne dans un
 * worker pour ne pas figer l'animation.
 */
import { ellipsoid, roundCone, capsule, smin, smax, smoothstep, mix, surfaceNets, relax } from './sdf.js';

export const SPAN = 0.22; // la toile du visage couvre 22 cm, centrée sur la tête

/* ---------------- Formes ---------------- */
// Construction « anime » : un crâne rond, puis un bas de visage taillé par des
// plans (joues plates, mâchoire droite jusqu'à un menton fin), un petit nez,
// des oreilles, et le cou attaché derrière la mâchoire.
const R = 0.092;
const plane = (x, y, z, px, py, pz, nx, ny, nz) => ((x - px) * nx + (y - py) * ny + (z - pz) * nz) / Math.hypot(nx, ny, nz);
const CRANIUM = [0, 0.06 * R, -0.06 * R, 0.9 * R, 1.0 * R, 1.04 * R];

export function headSDF(x, y, z) {
    const ax = Math.abs(x);
    let d = ellipsoid(x - CRANIUM[0], y - CRANIUM[1], z - CRANIUM[2], CRANIUM[3], CRANIUM[4], CRANIUM[5]);
    // Bas du visage : un volume arrondi, rogné en V par la mâchoire (arêtes adoucies).
    const k = 0.18 * R;
    let face = ellipsoid(x, y + 0.42 * R, z - 0.06 * R, 0.8 * R, 0.92 * R, 0.86 * R);
    face = smax(face, plane(ax, y, z, 0.78 * R, -0.5 * R, 0, 0.77, -0.64, 0.12), k); // mâchoire
    face = smax(face, -0.788 * (y + 0.62 * R) - 0.616 * (z + 0.22 * R), k); // dessous
    d = smin(d, face, 0.26 * R);
    // Petit nez pointu.
    d = smin(d, roundCone(x, y, z, [0, -0.22 * R, 0.84 * R], [0, -0.5 * R, 0.95 * R], 0.03 * R, 0.045 * R), 0.06 * R);
    // Oreilles.
    d = smin(d, ellipsoid(ax - 0.86 * R, y + 0.25 * R, z + 0.12 * R, 0.1 * R, 0.27 * R, 0.18 * R), 0.05 * R);
    // Cou, derrière la mâchoire.
    d = smin(d, capsule(x, y, z, [0, -0.55 * R, -0.3 * R], [0, -2.3 * R, -0.36 * R], 0.46 * R), 0.12 * R);
    return d;
}

// Calotte de cheveux : un peu plus grande que le crâne, coupée à la lisière du front.
function capSDF(x, y, z) {
    const m = 0.008;
    const shell = ellipsoid(x - CRANIUM[0], y - CRANIUM[1], z - CRANIUM[2], CRANIUM[3] + m, CRANIUM[4] + m, CRANIUM[5] + m);
    const line = mix(0.052, -0.075, smoothstep(0.03, -0.06, z));
    return smax(shell, line - y, 0.01);
}

/* ---------------- Mèches : rubans épais, effilés, couchés sur le crâne ---------------- */
const sub = (u, v) => [u[0] - v[0], u[1] - v[1], u[2] - v[2]];
const addv = (u, v, k = 1) => [u[0] + v[0] * k, u[1] + v[1] * k, u[2] + v[2] * k];
const dot3 = (u, v) => u[0] * v[0] + u[1] * v[1] + u[2] * v[2];
const cross = (u, v) => [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
const unit = (v) => {
    const l = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / l, v[1] / l, v[2] / l];
};
// Catmull-Rom sur quatre points (passe par les deux du milieu) : on ajoute des extrémités fantômes.
function curvePoint(pts, t) {
    const n = pts.length - 1;
    const f = Math.min(n - 1e-6, t * n);
    const i = Math.floor(f);
    const u = f - i;
    const p0 = pts[Math.max(0, i - 1)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(n, i + 2)];
    const out = [0, 0, 0];
    for (let c = 0; c < 3; c++) {
        out[c] = 0.5 * ((2 * p1[c]) + (-p0[c] + p2[c]) * u + (2 * p0[c] - 5 * p1[c] + 4 * p2[c] - p3[c]) * u * u + (-p0[c] + 3 * p1[c] - 3 * p2[c] + p3[c]) * u * u * u);
    }
    return out;
}

class Strands {
    constructor() {
        this.pos = [];
        this.col = [];
        this.idx = [];
    }
    // Une mèche : section en lentille (large et fine), qui s'effile jusqu'à une pointe.
    add(points, width, thick, up, shade = 1) {
        const rings = 18;
        const around = 10;
        const base = this.pos.length / 3;
        for (let i = 0; i <= rings; i++) {
            const t = i / rings;
            const p = curvePoint(points, t);
            const tangent = unit(sub(curvePoint(points, Math.min(1, t + 0.02)), curvePoint(points, Math.max(0, t - 0.02))));
            const b = unit(cross(tangent, up(p)));
            const n = cross(b, tangent);
            const w = width * Math.pow(1 - t, 0.6) * (0.8 + 0.2 * Math.sin(Math.PI * Math.min(1, t * 2)));
            const h = thick * Math.pow(1 - t, 0.6);
            for (let j = 0; j < around; j++) {
                const a = (j / around) * Math.PI * 2;
                const v = addv(addv(p, b, Math.cos(a) * w * 0.5), n, Math.sin(a) * h * 0.5);
                this.pos.push(v[0], v[1], v[2]);
                this.col.push(t, shade, 0);
            }
        }
        for (let i = 0; i < rings; i++) {
            for (let j = 0; j < around; j++) {
                const a = base + i * around + j;
                const b2 = base + i * around + ((j + 1) % around);
                const c = a + around;
                const d = b2 + around;
                this.idx.push(a, c, b2, b2, c, d);
            }
        }
    }
}

function computeNormals(position, index) {
    const normal = new Float32Array(position.length);
    for (let t = 0; t < index.length; t += 3) {
        const a = index[t] * 3;
        const b = index[t + 1] * 3;
        const c = index[t + 2] * 3;
        const u = [position[b] - position[a], position[b + 1] - position[a + 1], position[b + 2] - position[a + 2]];
        const v = [position[c] - position[a], position[c + 1] - position[a + 1], position[c + 2] - position[a + 2]];
        const n = cross(u, v);
        for (const k of [a, b, c]) {
            normal[k] += n[0];
            normal[k + 1] += n[1];
            normal[k + 2] += n[2];
        }
    }
    for (let k = 0; k < normal.length; k += 3) {
        const l = Math.hypot(normal[k], normal[k + 1], normal[k + 2]) || 1;
        normal[k] /= l;
        normal[k + 1] /= l;
        normal[k + 2] /= l;
    }
    return normal;
}

function buildStrands() {
    let seed = 91;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    const C = [CRANIUM[0], CRANIUM[1], CRANIUM[2]];
    const RR = [CRANIUM[3] + 0.004, CRANIUM[4] + 0.004, CRANIUM[5] + 0.004];
    const outward = (p) => unit([(p[0] - C[0]) / (RR[0] * RR[0]), (p[1] - C[1]) / (RR[1] * RR[1]), (p[2] - C[2]) / (RR[2] * RR[2])]);
    const onCap = (pol, az) => {
        const o = [Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az)];
        return [C[0] + o[0] * RR[0], C[1] + o[1] * RR[1], C[2] + o[2] * RR[2]];
    };
    const S = new Strands();
    // Une mèche qui part de la racine, longe le crâne puis s'en décolle vers sa pointe.
    const lock = (root, dir, len, width, lift = 0.035, flick = [0, 0.012, -0.01]) => {
        const o = outward(root);
        const pts = [0, 0.33, 0.66, 1].map((k) => addv(addv(addv(root, o, -0.012 + lift * k * k), dir, len * k), flick, k * k));
        S.add(pts, width, width * 0.28, outward, 0.85 + rand() * 0.3);
    };
    const swept = (p, up) => {
        const o = outward(p);
        let d = unit([o[0] * 0.3, up, -1]);
        const a = dot3(d, o);
        return unit(sub(d, [o[0] * a * 0.85, o[1] * a * 0.85, o[2] * a * 0.85]));
    };
    // Rangées du sommet à la nuque, en quinconce.
    const rows = [
        { pol: 0.2, n: 8, len: 0.1, up: 1.3, w: 0.072, lift: 0.03, all: true },
        { pol: 0.55, n: 13, len: 0.125, up: 0.75, w: 0.07, lift: 0.022 },
        { pol: 0.9, n: 14, len: 0.12, up: 0.3, w: 0.066, lift: 0.018 },
        { pol: 1.25, n: 14, len: 0.1, up: -0.05, w: 0.06, lift: 0.014 },
        { pol: 1.6, n: 12, len: 0.07, up: -0.4, w: 0.05, lift: 0.01 }
    ];
    rows.forEach(({ pol, n, len, up, w, lift, all }, ri) => {
        for (let k = 0; k < n; k++) {
            const az = (all ? (k / n) * Math.PI * 2 : Math.PI * (0.28 + 1.44 * (k + 0.5) / n)) + ri * 0.13 + (rand() - 0.5) * 0.12;
            const p = onCap(pol, az);
            lock(p, swept(p, up), len * (0.85 + rand() * 0.3), w * (0.9 + rand() * 0.2), lift);
        }
    });
    // Pointes du devant, au-dessus du bandeau : dressées vers le haut et un peu vers l'avant.
    [-0.55, -0.2, 0.2, 0.55].forEach((az, i) => {
        const p = onCap(0.55, az);
        const o = outward(p);
        lock(p, unit([o[0] * 0.5, 1, 0.35]), 0.075 + (i % 2) * 0.02, 0.062, 0.02, [0, 0, -0.015]);
    });
    // Mèches du front, de part et d'autre de la plaque, et devant les oreilles.
    [-1, 1].forEach((s) => {
        S.add([[s * 0.03, 0.08, 0.052], [s * 0.05, 0.06, 0.075], [s * 0.062, 0.025, 0.083], [s * 0.068, -0.012, 0.074]], 0.034, 0.011, () => [0, 0.15, 1]);
        S.add([[s * 0.07, 0.055, 0.02], [s * 0.084, 0.03, 0.03], [s * 0.088, -0.01, 0.032], [s * 0.084, -0.055, 0.03]], 0.03, 0.01, () => [s, 0, 0.25]);
    });
    const position = new Float32Array(S.pos);
    const index = new Uint32Array(S.idx);
    return { position, normal: computeNormals(position, index), index, shade: new Float32Array(S.col) };
}

/* ---------------- Assemblage ---------------- */
export function sculptHead() {
    const head = relax(surfaceNets(headSDF, [-0.125, -0.23, -0.145], [0.125, 0.16, 0.14], 0.0034), headSDF, 2);
    // Projection de face : le visage au centre, l'arrière du crâne en couleur de peau.
    const pos = head.position;
    const count = pos.length / 3;
    const uv = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
        const x = pos[i * 3];
        const y = pos[i * 3 + 1];
        const z = pos[i * 3 + 2];
        // L'arrière du crâne reprend la colonne de bord (couleur de peau unie) :
        // pas de couture visible entre l'avant et l'arrière.
        const u = Math.min(0.99, Math.max(0.01, 0.5 + x / SPAN));
        uv[i * 2] = z < -0.01 ? (x >= 0 ? 0.99 : 0.01) : u;
        uv[i * 2 + 1] = Math.min(0.99, Math.max(0.01, 0.5 + y / SPAN));
    }
    head.uv = uv;

    // Chevelure : la calotte lisse, puis les mèches par-dessus, fusionnées en un maillage.
    const cap = relax(surfaceNets(capSDF, [-0.12, -0.1, -0.13], [0.12, 0.12, 0.12], 0.004), capSDF, 1);
    const strands = buildStrands();
    const capCount = cap.position.length / 3;
    const hair = {
        position: new Float32Array(cap.position.length + strands.position.length),
        normal: new Float32Array(cap.position.length + strands.position.length),
        index: new Uint32Array(cap.index.length + strands.index.length)
    };
    hair.position.set(cap.position);
    hair.position.set(strands.position, cap.position.length);
    hair.normal.set(cap.normal);
    hair.normal.set(strands.normal, cap.position.length);
    hair.index.set(cap.index);
    for (let i = 0; i < strands.index.length; i++) hair.index[cap.index.length + i] = strands.index[i] + capCount;
    // Couleur : racines sombres, pointes plus claires, reflet « anneau » brillant.
    // (couleurs en espace linéaire, comme les attend le rendu)
    const hp = hair.position;
    const hn = hair.normal;
    const hcount = hp.length / 3;
    const colors = new Float32Array(hcount * 3);
    const lin = (hex) => [0, 2, 4].map((k) => Math.pow(parseInt(hex.slice(1 + k, 3 + k), 16) / 255, 2.2));
    const dark = lin('#1f130c');
    const mid = lin('#4a2d1c');
    const tip = lin('#7a5236');
    const shine = lin('#b88a62');
    for (let i = 0; i < hcount; i++) {
        const y = hp[i * 3 + 1];
        // Le long de chaque mèche : racine sombre, pointe plus claire ; la calotte reste sombre.
        const strand = i >= capCount;
        const t = strand ? strands.shade[(i - capCount) * 3] : 0.1;
        const sh = strand ? strands.shade[(i - capCount) * 3 + 1] : 0.9;
        const k1 = smoothstep(0.05, 0.45, t);
        const k2 = smoothstep(0.55, 1, t);
        const band = strand ? Math.exp(-Math.pow((y - 0.085) / 0.025, 2)) * smoothstep(0.3, 0.8, hn[i * 3 + 1] + hn[i * 3 + 2] * 0.3) * 0.5 : 0;
        for (let ch = 0; ch < 3; ch++) {
            let c = mix(mix(dark[ch], mid[ch], k1), tip[ch], k2) * sh;
            c = mix(c, shine[ch], band);
            colors[i * 3 + ch] = c;
        }
    }
    hair.color = colors;

    // Bandeau ajusté : on suit la tête ou la calotte, à la hauteur du front.
    const outer = (x, y, z) => Math.min(headSDF(x, y, z), capSDF(x, y, z));
    const radiusAt = (a, y) => {
        let lo = 0.02;
        let hi = 0.2;
        const dx = Math.sin(a);
        const dz = Math.cos(a);
        for (let k = 0; k < 24; k++) {
            const m = (lo + hi) / 2;
            if (outer(dx * m, y, dz * m) < 0) lo = m;
            else hi = m;
        }
        return lo;
    };
    const bandY = 0.05;
    const half = 0.02;
    const seg = 72;
    const bp = [];
    const bn = [];
    const bi = [];
    for (let k = 0; k <= seg; k++) {
        const a = (k / seg) * Math.PI * 2;
        const r = radiusAt(a, bandY) + 0.003;
        const dx = Math.sin(a);
        const dz = Math.cos(a);
        bp.push(dx * r, bandY + half, dz * r, dx * r, bandY - half, dz * r);
        bn.push(dx, 0, dz, dx, 0, dz);
        if (k < seg) {
            const v = k * 2;
            bi.push(v, v + 1, v + 2, v + 1, v + 3, v + 2);
        }
    }
    const band = { position: new Float32Array(bp), normal: new Float32Array(bn), index: new Uint32Array(bi) };
    const front = radiusAt(0, bandY) + 0.009;
    return { head, hair, band, plate: [0, bandY, front], back: radiusAt(Math.PI, bandY) };
}
