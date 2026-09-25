/*
 * Tête de Hoko adulte, sculptée d'un seul bloc (crâne, visage en V, menton,
 * pommettes, petit nez, oreilles, cou) et chevelure en grosses pointes anime,
 * fondues dans une calotte. Code pur (sans three.js) : il tourne dans un
 * worker pour ne pas figer l'animation.
 */
import { ellipsoid, roundCone, capsule, smin, smax, smoothstep, mix, surfaceNets, relax } from './sdf.js';

export const SPAN = 0.22; // la toile du visage couvre 22 cm, centrée sur la tête

/* ---------------- Formes ---------------- */
export function headSDF(x, y, z) {
    const ax = Math.abs(x);
    // Crâne.
    let d = ellipsoid(x, y - 0.03, z + 0.012, 0.097, 0.106, 0.11);
    // Visage : il s'affine vers le menton (mâchoire en V).
    const t = smoothstep(0.015, -0.115, y);
    const face = ellipsoid(x / (1 - 0.36 * t), y + 0.026, z - 0.012, 0.083, 0.084, 0.09);
    d = smin(d, face, 0.03);
    // Menton, pommettes, nez, oreilles.
    d = smin(d, ellipsoid(x, y + 0.1, z - 0.046, 0.021, 0.017, 0.023), 0.024);
    d = smin(d, ellipsoid(ax - 0.047, y + 0.024, z - 0.056, 0.027, 0.02, 0.028), 0.014);
    d = smin(d, roundCone(x, y, z, [0, -0.024, 0.098], [0, -0.04, 0.106], 0.005, 0.007), 0.01);
    d = smin(d, ellipsoid(ax - 0.093, y + 0.012, z + 0.004, 0.011, 0.024, 0.016), 0.008);
    // Arcade sourcilière très douce.
    d = smin(d, ellipsoid(ax - 0.03, y - 0.012, z - 0.088, 0.03, 0.009, 0.012), 0.01);
    // Cou.
    d = smin(d, capsule(x, y, z, [0, -0.06, -0.03], [0, -0.21, -0.034], 0.047), 0.016);
    return d;
}

// Calotte de cheveux : un peu plus grande que le crâne, coupée à la lisière du front.
function capSDF(x, y, z) {
    const shell = ellipsoid(x, y - 0.036, z + 0.016, 0.109, 0.118, 0.123);
    const line = mix(0.062, -0.08, smoothstep(0.04, -0.07, z));
    return smax(shell, line - y, 0.012);
}

// Mèches : cônes arrondis (éventuellement en deux segments pour les courber).
function spikes() {
    const list = [];
    let seed = 91;
    const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return seed / 2147483647;
    };
    const C = [0, 0.036, -0.016];
    const R = [0.106, 0.114, 0.12];
    const onCap = (pol, az) => {
        const o = [Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az)];
        return { o, p: [C[0] + o[0] * R[0], C[1] + o[1] * R[1], C[2] + o[2] * R[2]] };
    };
    const norm = (v) => {
        const l = Math.hypot(v[0], v[1], v[2]);
        return [v[0] / l, v[1] / l, v[2] / l];
    };
    const add = (a, dir, len, r1, bend) => {
        const mid = [a[0] + dir[0] * len * 0.55, a[1] + dir[1] * len * 0.55, a[2] + dir[2] * len * 0.55];
        const tip = [a[0] + dir[0] * len + bend[0], a[1] + dir[1] * len + bend[1], a[2] + dir[2] * len + bend[2]];
        list.push({ a, b: mid, r1, r2: r1 * 0.55 });
        list.push({ a: mid, b: tip, r1: r1 * 0.55, r2: 0.0025 });
    };
    // Rangées autour du crâne : dressées sur le dessus, rejetées vers l'arrière.
    const rows = [
        { pol: 0.3, n: 5, len: 0.12, up: 1.0, back: 0.5, r: 0.034 },
        { pol: 0.75, n: 8, len: 0.14, up: 0.55, back: 0.85, r: 0.034 },
        { pol: 1.15, n: 8, len: 0.12, up: 0.15, back: 0.95, r: 0.03 },
        { pol: 1.55, n: 6, len: 0.07, up: -0.15, back: 0.6, r: 0.026 }
    ];
    rows.forEach(({ pol, n, len, up, back, r }, ri) => {
        for (let k = 0; k < n; k++) {
            const az = Math.PI * (0.35 + 1.3 * (k + 0.5) / n) + ri * 0.2 + (rand() - 0.5) * 0.2;
            const { o, p } = onCap(pol, az);
            const dir = norm([o[0] * 0.9, o[1] * 0.6 + up, o[2] * 0.6 - back]);
            add(p, dir, len * (0.85 + rand() * 0.35), r * (0.9 + rand() * 0.2), [0, 0.012, -0.012]);
        }
    });
    // Pointes sur le devant du crâne, dressées vers le haut.
    [-0.45, 0, 0.45].forEach((az, i) => {
        const { o, p } = onCap(0.55, az);
        add(p, norm([o[0] * 0.8, 1, 0.25]), i === 1 ? 0.1 : 0.085, 0.028, [0, 0, -0.01]);
    });
    // Mèches du front, de part et d'autre du bandeau, et mèches devant les oreilles.
    [-1, 1].forEach((s) => {
        list.push({ a: [s * 0.045, 0.1, 0.075], b: [s * 0.072, 0.058, 0.106], r1: 0.019, r2: 0.013 });
        list.push({ a: [s * 0.072, 0.058, 0.106], b: [s * 0.083, -0.012, 0.094], r1: 0.013, r2: 0.0025 });
        list.push({ a: [s * 0.093, 0.06, 0.02], b: [s * 0.1, 0.0, 0.038], r1: 0.017, r2: 0.011 });
        list.push({ a: [s * 0.1, 0.0, 0.038], b: [s * 0.098, -0.062, 0.042], r1: 0.011, r2: 0.0025 });
    });
    // Boîte englobante de chaque mèche, pour aller vite.
    list.forEach((s) => {
        s.cx = (s.a[0] + s.b[0]) / 2;
        s.cy = (s.a[1] + s.b[1]) / 2;
        s.cz = (s.a[2] + s.b[2]) / 2;
        s.rad = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1], s.b[2] - s.a[2]) / 2 + s.r1 + 0.03;
    });
    return list;
}

function hairSDF(list) {
    return (x, y, z) => {
        let d = capSDF(x, y, z);
        for (let i = 0; i < list.length; i++) {
            const s = list[i];
            const far = Math.hypot(x - s.cx, y - s.cy, z - s.cz) - s.rad;
            if (far > d + 0.02) continue;
            d = smin(d, roundCone(x, y, z, s.a, s.b, s.r1, s.r2), 0.016);
        }
        return d;
    };
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
        if (z < -0.01) {
            uv[i * 2] = 0.01;
            uv[i * 2 + 1] = 0.01;
        } else {
            uv[i * 2] = 0.5 + x / SPAN;
            uv[i * 2 + 1] = 0.5 + y / SPAN;
        }
    }
    head.uv = uv;

    const list = spikes();
    const sdf = hairSDF(list);
    const hair = relax(surfaceNets(sdf, [-0.2, -0.12, -0.3], [0.2, 0.3, 0.16], 0.0045), sdf, 1);
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
        const x = hp[i * 3];
        const y = hp[i * 3 + 1];
        const z = hp[i * 3 + 2];
        const dist = Math.hypot(x, (y - 0.036) * 0.95, z + 0.016);
        const k1 = smoothstep(0.1, 0.14, dist);
        const k2 = smoothstep(0.15, 0.22, dist);
        const band = Math.exp(-Math.pow((y - 0.11) / 0.025, 2)) * smoothstep(0.2, 0.7, hn[i * 3 + 1] + hn[i * 3 + 2] * 0.4) * 0.55;
        for (let ch = 0; ch < 3; ch++) {
            let c = mix(mix(dark[ch], mid[ch], k1), tip[ch], k2);
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
    const bandY = 0.066;
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
