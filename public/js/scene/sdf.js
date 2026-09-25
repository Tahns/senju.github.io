/*
 * Sculpture par champs de distance : on décrit une forme en mélangeant
 * doucement des volumes simples (ellipsoïdes, cônes arrondis), puis on en tire
 * un maillage lisse (« surface nets »). C'est ainsi que sont faits la tête et
 * les cheveux de Hoko adulte : une seule surface, sans jointures.
 */
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const mix = (a, b, t) => a + (b - a) * t;
export const smoothstep = (a, b, x) => {
    const t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
};

// Union douce : les deux volumes fondent l'un dans l'autre sur une largeur k.
export function smin(a, b, k) {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
}

// Soustraction douce.
export function smax(a, b, k) {
    return -smin(-a, -b, k);
}

export function ellipsoid(px, py, pz, rx, ry, rz) {
    const k0 = Math.hypot(px / rx, py / ry, pz / rz);
    const k1 = Math.hypot(px / (rx * rx), py / (ry * ry), pz / (rz * rz));
    return k1 === 0 ? -Math.min(rx, ry, rz) : (k0 * (k0 - 1)) / k1;
}

// Cône arrondi entre a (rayon r1) et b (rayon r2), d'après Inigo Quilez.
export function roundCone(px, py, pz, a, b, r1, r2) {
    const bax = b[0] - a[0];
    const bay = b[1] - a[1];
    const baz = b[2] - a[2];
    const l2 = bax * bax + bay * bay + baz * baz;
    const rr = r1 - r2;
    const a2 = l2 - rr * rr;
    const il2 = 1 / l2;
    const pax = px - a[0];
    const pay = py - a[1];
    const paz = pz - a[2];
    const y = pax * bax + pay * bay + paz * baz;
    const z = y - l2;
    const qx = pax * l2 - bax * y;
    const qy = pay * l2 - bay * y;
    const qz = paz * l2 - baz * y;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = y * y * l2;
    const z2 = z * z * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - r1;
}

export function capsule(px, py, pz, a, b, r) {
    const pax = px - a[0];
    const pay = py - a[1];
    const paz = pz - a[2];
    const bax = b[0] - a[0];
    const bay = b[1] - a[1];
    const baz = b[2] - a[2];
    const h = clamp((pax * bax + pay * bay + paz * baz) / (bax * bax + bay * bay + baz * baz), 0, 1);
    return Math.hypot(pax - bax * h, pay - bay * h, paz - baz * h) - r;
}

const EDGES = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];

/*
 * Surface nets : un sommet par cellule traversée par la surface (moyenne des
 * points de passage sur ses arêtes), un quadrilatère par arête traversée.
 * Normales : gradient du champ. Retourne des tableaux bruts (utilisable dans
 * un worker) : { position, normal, index }.
 */
export function surfaceNets(sdf, min, max, cell) {
    const nx = Math.ceil((max[0] - min[0]) / cell);
    const ny = Math.ceil((max[1] - min[1]) / cell);
    const nz = Math.ceil((max[2] - min[2]) / cell);
    const X = nx + 1;
    const Y = ny + 1;
    const Z = nz + 1;
    const vals = new Float32Array(X * Y * Z);
    const at = (i, j, k) => i + X * (j + Y * k);
    for (let k = 0; k < Z; k++) {
        const z = min[2] + k * cell;
        for (let j = 0; j < Y; j++) {
            const y = min[1] + j * cell;
            for (let i = 0; i < X; i++) vals[at(i, j, k)] = sdf(min[0] + i * cell, y, z);
        }
    }
    const cellIndex = new Int32Array(nx * ny * nz).fill(-1);
    const cid = (i, j, k) => i + nx * (j + ny * k);
    const positions = [];
    const corner = new Float32Array(8);
    for (let k = 0; k < nz; k++) {
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                let neg = 0;
                for (let c = 0; c < 8; c++) {
                    const v = vals[at(i + (c & 1), j + ((c >> 1) & 1), k + ((c >> 2) & 1))];
                    corner[c] = v;
                    if (v < 0) neg++;
                }
                if (neg === 0 || neg === 8) continue;
                let sx = 0;
                let sy = 0;
                let sz = 0;
                let n = 0;
                for (const [a, b] of EDGES) {
                    const va = corner[a];
                    const vb = corner[b];
                    if ((va < 0) === (vb < 0)) continue;
                    const t = va / (va - vb);
                    sx += (a & 1) + (((b & 1) - (a & 1)) * t);
                    sy += ((a >> 1) & 1) + ((((b >> 1) & 1) - ((a >> 1) & 1)) * t);
                    sz += ((a >> 2) & 1) + ((((b >> 2) & 1) - ((a >> 2) & 1)) * t);
                    n++;
                }
                cellIndex[cid(i, j, k)] = positions.length / 3;
                positions.push(min[0] + (i + sx / n) * cell, min[1] + (j + sy / n) * cell, min[2] + (k + sz / n) * cell);
            }
        }
    }
    const index = [];
    const quad = (a, b, c, d, flip) => {
        if (a < 0 || b < 0 || c < 0 || d < 0) return;
        if (flip) index.push(a, c, b, a, d, c);
        else index.push(a, b, c, a, c, d);
    };
    for (let k = 0; k < nz; k++) {
        for (let j = 0; j < ny; j++) {
            for (let i = 0; i < nx; i++) {
                const v0 = vals[at(i, j, k)] < 0;
                if (j > 0 && k > 0 && (vals[at(i + 1, j, k)] < 0) !== v0) {
                    quad(cellIndex[cid(i, j - 1, k - 1)], cellIndex[cid(i, j, k - 1)], cellIndex[cid(i, j, k)], cellIndex[cid(i, j - 1, k)], !v0);
                }
                if (i > 0 && k > 0 && (vals[at(i, j + 1, k)] < 0) !== v0) {
                    quad(cellIndex[cid(i - 1, j, k - 1)], cellIndex[cid(i - 1, j, k)], cellIndex[cid(i, j, k)], cellIndex[cid(i, j, k - 1)], !v0);
                }
                if (i > 0 && j > 0 && (vals[at(i, j, k + 1)] < 0) !== v0) {
                    quad(cellIndex[cid(i - 1, j - 1, k)], cellIndex[cid(i, j - 1, k)], cellIndex[cid(i, j, k)], cellIndex[cid(i - 1, j, k)], !v0);
                }
            }
        }
    }
    // Normales lissées par le gradient du champ.
    const normals = new Float32Array(positions.length);
    const e = cell * 0.5;
    for (let v = 0; v < positions.length; v += 3) {
        const x = positions[v];
        const y = positions[v + 1];
        const z = positions[v + 2];
        const gx = sdf(x + e, y, z) - sdf(x - e, y, z);
        const gy = sdf(x, y + e, z) - sdf(x, y - e, z);
        const gz = sdf(x, y, z + e) - sdf(x, y, z - e);
        const l = Math.hypot(gx, gy, gz) || 1;
        normals[v] = gx / l;
        normals[v + 1] = gy / l;
        normals[v + 2] = gz / l;
    }
    // Orientation des triangles : on la vérifie contre la normale du champ.
    const p = positions;
    for (let t = 0; t < index.length; t += 3) {
        const a = index[t] * 3;
        const b = index[t + 1] * 3;
        const c = index[t + 2] * 3;
        const ux = p[b] - p[a];
        const uy = p[b + 1] - p[a + 1];
        const uz = p[b + 2] - p[a + 2];
        const wx = p[c] - p[a];
        const wy = p[c + 1] - p[a + 1];
        const wz = p[c + 2] - p[a + 2];
        const cx = uy * wz - uz * wy;
        const cy = uz * wx - ux * wz;
        const cz = ux * wy - uy * wx;
        if (cx * normals[a] + cy * normals[a + 1] + cz * normals[a + 2] < 0) {
            const tmp = index[t + 1];
            index[t + 1] = index[t + 2];
            index[t + 2] = tmp;
        }
    }
    return { position: new Float32Array(positions), normal: normals, index: new Uint32Array(index) };
}

// Lissage de Laplace (quelques passes) : efface les petites facettes de la
// grille, puis recolle chaque sommet sur la surface (un pas de Newton).
export function relax(mesh, sdf, passes = 2) {
    const pos = mesh.position;
    const idx = mesh.index;
    const n = pos.length / 3;
    const neighbors = Array.from({ length: n }, () => new Set());
    for (let t = 0; t < idx.length; t += 3) {
        const a = idx[t];
        const b = idx[t + 1];
        const c = idx[t + 2];
        neighbors[a].add(b).add(c);
        neighbors[b].add(a).add(c);
        neighbors[c].add(a).add(b);
    }
    const next = new Float32Array(n * 3);
    for (let pass = 0; pass < passes; pass++) {
        for (let v = 0; v < n; v++) {
            let sx = 0;
            let sy = 0;
            let sz = 0;
            for (const w of neighbors[v]) {
                sx += pos[w * 3];
                sy += pos[w * 3 + 1];
                sz += pos[w * 3 + 2];
            }
            const m = neighbors[v].size || 1;
            next[v * 3] = mix(pos[v * 3], sx / m, 0.5);
            next[v * 3 + 1] = mix(pos[v * 3 + 1], sy / m, 0.5);
            next[v * 3 + 2] = mix(pos[v * 3 + 2], sz / m, 0.5);
        }
        pos.set(next);
    }
    const nor = mesh.normal;
    for (let v = 0; v < n * 3; v += 3) {
        const d = sdf(pos[v], pos[v + 1], pos[v + 2]);
        pos[v] -= nor[v] * d;
        pos[v + 1] -= nor[v + 1] * d;
        pos[v + 2] -= nor[v + 2] * d;
    }
    return mesh;
}
