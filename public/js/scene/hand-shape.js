/*
 * Main sculptée d'un seul bloc (champ de distance, comme la tête d'Akira) :
 * paume, dos, jointures, éminences du pouce et de l'auriculaire, poignet, et
 * cinq doigts effilés aux articulations légèrement marquées, fondus dans la
 * paume. On en tire un maillage lisse, puis, pour chaque sommet, les os qui le
 * portent (paume, phalanges, pouce) : la main se plie comme une vraie main,
 * sans coutures entre les morceaux.
 *
 * Code pur (sans three.js). Repère de la main droite : origine au poignet,
 * doigts vers -Z, paume vers -Y, pouce vers -X.
 *
 * Os : 0 = paume ; 1 + 3·doigt + phalange (index = doigt 0) ; 13 + phalange du pouce.
 */
import { roundCone, smin, smax, smoothstep, clamp, surfaceNets, relax } from './sdf.js';

// Versions rapides (sans Math.hypot, lent) : la main s'évalue des centaines de milliers de fois.
function ellipsoid(px, py, pz, rx, ry, rz) {
    const ax = px / rx, ay = py / ry, az = pz / rz;
    const bx = ax / rx, by = ay / ry, bz = az / rz;
    const k0 = Math.sqrt(ax * ax + ay * ay + az * az);
    const k1 = Math.sqrt(bx * bx + by * by + bz * bz);
    return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}
function capsule(px, py, pz, a, b, r) {
    const pax = px - a[0], pay = py - a[1], paz = pz - a[2];
    const bax = b[0] - a[0], bay = b[1] - a[1], baz = b[2] - a[2];
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
    const dx = pax - bax * h, dy = pay - bay * h, dz = paz - baz * h;
    return Math.sqrt(dx * dx + dy * dy + dz * dz) - r;
}

// Boîte arrondie (demi-côtés hx, hy, hz, arrondi rr).
function roundBox(px, py, pz, hx, hy, hz, rr) {
    const qx = Math.abs(px) - hx + rr;
    const qy = Math.abs(py) - hy + rr;
    const qz = Math.abs(pz) - hz + rr;
    const mx = Math.max(qx, 0), my = Math.max(qy, 0), mz = Math.max(qz, 0);
    return Math.sqrt(mx * mx + my * my + mz * mz) + Math.min(Math.max(qx, qy, qz), 0) - rr;
}

// Jointures (base des doigts, sur le dos de la main).
const KNUCKLES = [[-0.023, 0.0068], [-0.0075, 0.007], [0.008, 0.0066], [0.0225, 0.0058]];

// Paume, dos de la main, talon, éminences et poignet (sans les doigts).
function palmSDF(x, y, z) {
    // Loin de la main : la distance à sa boîte englobante suffit.
    const far = roundBox(x, y + 0.002, z + 0.025, 0.039, 0.023, 0.068, 0);
    if (far > 0.015) return far;
    // Dos légèrement bombé d'un bord à l'autre, main un peu plus étroite vers le poignet.
    const narrow = 1 + 0.1 * smoothstep(-0.045, -0.006, z);
    const bx = x * narrow;
    const by = y + (bx / 0.03) * (bx / 0.03) * 0.0028;
    let d = roundBox(bx, by + 0.0005, z + 0.043, 0.0285, 0.0082, 0.032, 0.0045);
    // Rangée des jointures : le bord avant de la paume, arrondi.
    d = smin(d, capsule(x, y, z, [-0.02, 0.0008, -0.0745], [0.0195, 0.0008, -0.0745], 0.0078), 0.006);
    // Jointures marquées sur le dos.
    if (z < -0.06 && y > -0.004) {
        for (const [kx, kr] of KNUCKLES) {
            d = smin(d, ellipsoid(x - kx, y - 0.0042, z + 0.0762, kr, kr * 0.85, kr * 1.05), 0.004);
        }
    }
    // Talon de la main et poignet (un peu aplati), qui s'enfonce dans l'avant-bras.
    d = smin(d, ellipsoid(x, y + 0.0025, z + 0.012, 0.027, 0.0118, 0.021), 0.008);
    const fy = 0.86 + 0.14 * smoothstep(-0.006, 0.016, z);
    d = smin(d, roundCone(x, y / fy, z, [0, 0, -0.008], [0, 0, 0.014], 0.021, 0.0172) * fy, 0.01);
    // Éminence du pouce (thénar) et du petit doigt (hypothénar), côté paume.
    d = smin(d, roundCone(x, y, z, [-0.012, -0.0045, -0.014], [-0.025, -0.003, -0.04], 0.0102, 0.0075), 0.009);
    d = smin(d, roundCone(x, y, z, [0.021, -0.0062, -0.017], [0.0235, -0.0042, -0.061], 0.0082, 0.0072), 0.008);
    // Creux de la paume.
    if (y < -0.002) d = smax(d, -ellipsoid(x - 0.001, y + 0.0186, z + 0.048, 0.013, 0.0075, 0.02), 0.006);
    return d;
}

/*
 * Un doigt (ou le pouce) dans son propre repère : il part de l'origine vers -Z,
 * dos vers +Y. Profil : rayon le long de l'axe (nœuds successifs reliés par
 * des cônes arrondis), section un peu aplatie (plus large qu'épaisse).
 * Tout reste dans les capsules de collision (userData.r de chaque phalange).
 */
function digitProfile(lengths, radius, thumb) {
    const [l0, l1, l2] = lengths;
    const r0 = radius;
    const end = l0 + l1 + l2 + (radius * (1 - 0.16)) / 2; // bout de la capsule de collision
    const tip = thumb ? 0.76 * r0 : 0.72 * r0;
    const nodes = thumb
        ? [[0.2 * r0, 0.98 * r0], [-l0, 0.87 * r0], [-l0 - 0.5 * l1, 0.8 * r0], [-l0 - l1, 0.8 * r0], [-l0 - l1 - 0.45 * l2, 0.8 * r0], [-end + tip, tip]]
        : [[0.3 * r0, 0.96 * r0], [-0.4 * l0, 0.85 * r0], [-l0, 0.87 * r0], [-l0 - 0.45 * l1, 0.78 * r0], [-l0 - l1, 0.8 * r0], [-l0 - l1 - 0.5 * l2, 0.78 * r0], [-end + tip, tip]];
    // margin : au-delà, le champ exact est inutile (fondu avec la paume et poids compris).
    return { nodes, flat: thumb ? 0.84 : 0.87, zmin: -end, zmax: nodes[0][0] + nodes[0][1], rmax: r0, margin: thumb ? 0.022 : 0.012 };
}

function digitSDF(prof, qx, qy, qz) {
    const fy = qy / prof.flat;
    const rho = Math.sqrt(qx * qx + fy * fy);
    // Hors du cylindre englobant : une borne inférieure suffit.
    const out = Math.max(rho - prof.rmax, qz - prof.zmax, prof.zmin - qz);
    if (out > prof.margin) return out * prof.flat;
    let d = Infinity;
    const n = prof.nodes;
    for (let i = 0; i + 1 < n.length; i++) {
        d = Math.min(d, roundCone(rho, 0, qz, [0, 0, n[i][0]], [0, 0, n[i + 1][0]], n[i][1], n[i + 1][1]));
    }
    return d * prof.flat;
}

/*
 * chains : pour chaque doigt puis le pouce, { o: origine, R: [X, Y, Z] axes du
 * repère de la première phalange dans la pose de référence, lengths, radius }.
 * cell : taille de la grille (m). Renvoie des tableaux bruts.
 */
export function sculptHand(chains, cell = 0.0012) {
    const profiles = chains.map((c, i) => digitProfile(c.lengths, c.radius, i === 4));
    const n = chains.length;
    const local = new Float64Array(n * 3);
    const toLocal = (x, y, z) => {
        for (let i = 0; i < n; i++) {
            const { o, R } = chains[i];
            const dx = x - o[0], dy = y - o[1], dz = z - o[2];
            local[i * 3] = dx * R[0][0] + dy * R[0][1] + dz * R[0][2];
            local[i * 3 + 1] = dx * R[1][0] + dy * R[1][1] + dz * R[1][2];
            local[i * 3 + 2] = dx * R[2][0] + dy * R[2][1] + dz * R[2][2];
        }
    };
    const K = [0.005, 0.005, 0.005, 0.005, 0.008]; // fondu doigt / paume (pouce : chair de la base)
    const parts = new Float64Array(n + 1);
    const evalParts = (x, y, z) => {
        toLocal(x, y, z);
        parts[0] = palmSDF(x, y, z);
        for (let i = 0; i < n; i++) parts[i + 1] = digitSDF(profiles[i], local[i * 3], local[i * 3 + 1], local[i * 3 + 2]);
    };
    // Les doigts se fondent dans la paume, pas entre eux (ils peuvent se toucher).
    const sdf = (x, y, z) => {
        evalParts(x, y, z);
        let d = parts[0];
        for (let i = 0; i < n; i++) d = Math.min(d, smin(parts[0], parts[i + 1], K[i]));
        return d;
    };

    // Boîte englobante.
    const min = [-0.036, -0.024, -0.09];
    const max = [0.036, 0.02, 0.045];
    chains.forEach(({ o, R }, i) => {
        const p = profiles[i];
        [p.zmin, p.zmax].forEach((z) => {
            for (let c = 0; c < 3; c++) {
                const v = o[c] + R[2][c] * z;
                min[c] = Math.min(min[c], v - p.rmax - 0.003);
                max[c] = Math.max(max[c], v + p.rmax + 0.003);
            }
        });
    });

    // Grille grossière d'abord : on n'évalue finement que près de la surface.
    const coarse = cell * 4;
    const cn = [0, 1, 2].map((c) => Math.ceil((max[c] - min[c]) / coarse) + 1);
    const cv = new Float32Array(cn[0] * cn[1] * cn[2]);
    for (let k = 0; k < cn[2]; k++) {
        for (let j = 0; j < cn[1]; j++) {
            for (let i = 0; i < cn[0]; i++) cv[i + cn[0] * (j + cn[1] * k)] = sdf(min[0] + i * coarse, min[1] + j * coarse, min[2] + k * coarse);
        }
    }
    const band = coarse * 1.6;
    const banded = (x, y, z) => {
        const i = clamp(Math.round((x - min[0]) / coarse), 0, cn[0] - 1);
        const j = clamp(Math.round((y - min[1]) / coarse), 0, cn[1] - 1);
        const k = clamp(Math.round((z - min[2]) / coarse), 0, cn[2] - 1);
        const v = cv[i + cn[0] * (j + cn[1] * k)];
        return Math.abs(v) > band ? v : sdf(x, y, z);
    };
    const mesh = relax(surfaceNets(banded, min, max, cell), sdf, 2);
    const pos = mesh.position;
    const count = pos.length / 3;

    // Normales : celles du champ, calculées par surfaceNets juste avant le relâchement.
    const normal = mesh.normal;

    // Poids : quelle part de chaque sommet suit la paume, quel doigt, quelle phalange.
    const skinIndex = new Uint16Array(count * 4);
    const skinWeight = new Float32Array(count * 4);
    const uv = new Float32Array(count * 2);
    const color = new Float32Array(count * 3);
    const W = [4, 4, 4, 4, 7].map((w) => w * 0.001); // largeur du fondu paume ↔ doigt
    const w = new Float64Array(16);
    const share = new Float64Array(n);
    const order = [0, 0, 0, 0];
    for (let v = 0; v < count; v++) {
        const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
        evalParts(x, y, z);
        w.fill(0);
        // Appartenance à chaque doigt (0 : paume, 1 : doigt), partagée entre doigts voisins.
        let mMax = 0, sum = 0;
        for (let i = 0; i < n; i++) {
            const m = smoothstep(-W[i], W[i], parts[0] - parts[i + 1]);
            const s = m > 0 ? m * Math.exp(-Math.max(0, parts[i + 1]) / 0.001) : 0;
            share[i] = s;
            sum += s;
            mMax = Math.max(mMax, m);
        }
        w[0] = 1 - mMax;
        for (let i = 0; i < n; i++) {
            if (!share[i]) continue;
            const part = (mMax * share[i]) / sum;
            const { lengths, radius } = chains[i];
            const s = -local[i * 3 + 2];
            const b1 = smoothstep(lengths[0] - 0.45 * radius, lengths[0] + 0.45 * radius, s);
            const b2 = smoothstep(lengths[0] + lengths[1] - 0.4 * radius, lengths[0] + lengths[1] + 0.4 * radius, s);
            const base = i < 4 ? 1 + i * 3 : 13;
            w[base] += part * (1 - b1);
            w[base + 1] += part * (b1 - b2);
            w[base + 2] += part * b2;
        }
        // Les quatre os les plus lourds.
        let total = 0;
        for (let c = 0; c < 4; c++) {
            let b = 0;
            for (let k = 1; k < 16; k++) if (w[k] > w[b]) b = k;
            order[c] = b;
            total += w[b];
            skinIndex[v * 4 + c] = b;
            skinWeight[v * 4 + c] = w[b];
            w[b] = -1;
        }
        for (let c = 0; c < 4; c++) skinWeight[v * 4 + c] = Math.max(0, skinWeight[v * 4 + c]) / total;

        // Texture : projection oblique (pas d'étirement franc sur les côtés des doigts).
        uv[v * 2] = (x + 0.7 * y) / 0.05;
        uv[v * 2 + 1] = (z - 0.7 * y) / 0.05;

        // Teinte : jointures et bouts des doigts plus rosés, plis de flexion et
        // lignes de la main un peu plus sombres.
        let red = 0, crease = 0;
        if (y > 0) {
            for (const [kx] of KNUCKLES) red = Math.max(red, Math.exp(-((x - kx) ** 2 + (y - 0.01) ** 2 + (z + 0.077) ** 2) / 0.000036));
        }
        for (let i = 0; i < n; i++) {
            if (!share[i]) continue;
            const { lengths, radius } = chains[i];
            const s = -local[i * 3 + 2];
            const qy = local[i * 3 + 1];
            const f = share[i] / sum;
            const j1 = lengths[0], j2 = lengths[0] + lengths[1];
            if (qy > 0) {
                const g = (0.6 * radius) ** 2;
                red = Math.max(red, f * Math.max(Math.exp(-((s - j1) ** 2) / g), Math.exp(-((s - j2) ** 2) / g)) * clamp(qy / radius, 0, 1));
            } else {
                crease = Math.max(crease, f * Math.max(Math.exp(-((s - j1) ** 2) / 0.0009 ** 2), Math.exp(-((s - j2) ** 2) / 0.0009 ** 2)) * clamp(-qy / radius, 0, 1));
                if (i < 4) crease = Math.max(crease, f * 0.8 * Math.exp(-((s - 0.006) ** 2) / 0.001 ** 2) * clamp(-qy / radius, 0, 1));
            }
            red = Math.max(red, f * 0.8 * smoothstep(lengths[0] + lengths[1] + 0.3 * lengths[2], lengths[0] + lengths[1] + lengths[2], s));
        }
        if (y < -0.004 && mMax < 0.5) crease = Math.max(crease, palmLines(x, z) * smoothstep(-0.004, -0.009, y));
        const palmSide = smoothstep(0.002, -0.008, y) * (1 - mMax);
        color[v * 3] = 1 - 0.07 * crease;
        color[v * 3 + 1] = 1 - 0.12 * red - 0.13 * crease - 0.02 * palmSide;
        color[v * 3 + 2] = 1 - 0.12 * red - 0.14 * crease - 0.035 * palmSide;
    }

    // Ongles : posés sur le dos de la dernière phalange, à fleur de peau.
    const nails = chains.map((c, i) => {
        const prof = profiles[i];
        const [l0, l1, l2] = c.lengths;
        const height = (z) => {
            let lo = 0, hi = prof.rmax * 1.5;
            for (let it = 0; it < 24; it++) {
                const m = (lo + hi) / 2;
                if (digitSDF(prof, 0, m, z) < 0) lo = m;
                else hi = m;
            }
            return lo;
        };
        const len = (i === 4 ? 0.5 : 0.46) * l2;
        const zc = -l0 - l1 - (i === 4 ? 0.58 : 0.6) * l2;
        const h = height(zc);
        const slope = (height(zc - len / 2) - height(zc + len / 2)) / len;
        const width = 0.66 * prof.rmax;
        const thick = 0.22 * prof.rmax;
        // Repère de la dernière phalange : origine à la seconde articulation.
        return { position: [0, h - thick * 0.45, zc + l0 + l1], scale: [width, thick, len / 2 + 0.0004], tilt: Math.atan(slope) };
    });

    return { position: pos, normal, index: mesh.index, uv, color, skinIndex, skinWeight, nails };
}

// Lignes de la main (cœur, tête, vie), côté paume : 1 sur la ligne, 0 loin.
const LINES = [
    [[0.031, -0.063], [0.018, -0.066], [0.004, -0.067], [-0.01, -0.071], [-0.017, -0.075]],
    [[-0.03, -0.059], [-0.018, -0.056], [-0.004, -0.051], [0.01, -0.045], [0.02, -0.04]],
    [[-0.029, -0.058], [-0.022, -0.047], [-0.017, -0.034], [-0.012, -0.02], [-0.008, -0.008]]
];
function palmLines(x, z) {
    let best = Infinity;
    for (const line of LINES) {
        for (let i = 0; i + 1 < line.length; i++) {
            const [ax, az] = line[i];
            const [bx, bz] = line[i + 1];
            const t = clamp(((x - ax) * (bx - ax) + (z - az) * (bz - az)) / ((bx - ax) ** 2 + (bz - az) ** 2), 0, 1);
            best = Math.min(best, Math.hypot(x - ax - (bx - ax) * t, z - az - (bz - az) * t));
        }
    }
    return Math.exp(-(best * best) / 0.0008 ** 2);
}
