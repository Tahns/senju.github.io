/*
 * Bras et mains vus à la première personne.
 *
 * Chaque bras suit une « cible » (Object3D) : on place la cible où doit être le
 * poignet (et dans l'orientation voulue de la main), et le bras se plie tout
 * seul pour l'atteindre (cinématique inverse à deux segments : bras et
 * avant-bras). La cible peut être rattachée à n'importe quel objet (la porte,
 * un livre…) : la main le suit alors.
 *
 * Repère de la main (main droite) : origine au poignet, doigts vers -Z,
 * paume vers -Y, pouce vers -X. La main gauche est le miroir de la droite.
 *
 * Les doigts se referment sur les objets de `touch` (livres, porte) sans
 * jamais les traverser : voir fitDigits.
 */
import * as THREE from 'three';
import { skin as skinTexture, skinBump, fabricBump } from './textures.js';

const UPPER = 0.27;
const FORE = 0.26;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
// Pouce qui passe par-dessus un bord (livre tenu) : il part tout droit vers
// l'avant de la paume, puis se plie vers les doigts, de l'autre côté du livre.
const WRAP = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(
    new THREE.Vector3(-0.296, 0, -0.955), new THREE.Vector3(-0.955, 0, 0.296), new THREE.Vector3(0, 1, 0)));
const thumbEuler = new THREE.Euler(0, 0, 0, 'YXZ');

// Peau : reflet doux (sheen) qui imite la lumière diffusée sous la peau.
let skin = null;
// Ongle : rosé, translucide en apparence (lueur propre), brillant.
const nail = new THREE.MeshPhysicalMaterial({ color: '#f1cbc0', roughness: 0.34, clearcoat: 0.7, clearcoatRoughness: 0.35, emissive: new THREE.Color('#a85a4e'), emissiveIntensity: 0.22 });
// Lumière qui traverse la peau : sur les bords (là où elle est mince), un halo
// rosé qui s'ajoute à l'éclairage, comme les doigts à contre-jour d'une lampe.
function skinShader(shader) {
    shader.fragmentShader = shader.fragmentShader.replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float skinRim = pow(1.0 - clamp(dot(normalize(normal), normalize(vViewPosition)), 0.0, 1.0), 2.4);
        totalEmissiveRadiance += vec3(0.62, 0.17, 0.09) * skinRim * 0.34;`);
}
function skinMaterial() {
    if (!skin) {
        skin = new THREE.MeshPhysicalMaterial({
            color: '#e9c2a6',
            map: skinTexture(),
            bumpMap: skinBump(),
            bumpScale: 0.9,
            roughness: 0.52,
            specularIntensity: 0.55,
            sheen: 0.8,
            sheenColor: new THREE.Color('#ff9f86'),
            sheenRoughness: 0.45,
            emissive: new THREE.Color('#5a1c10'),
            emissiveIntensity: 0.08
        });
        skin.onBeforeCompile = skinShader;
    }
    return skin;
}
const sleeve = new THREE.MeshPhysicalMaterial({
    color: '#232b4a',
    bumpMap: fabricBump(),
    bumpScale: 0.6,
    roughness: 0.86,
    sheen: 0.25,
    sheenColor: new THREE.Color('#33406e'),
    sheenRoughness: 0.6
});
const lining = new THREE.MeshStandardMaterial({ color: '#d9d0bc', roughness: 0.9 });

// Un doigt : trois phalanges articulées (les os de la main sculptée).
function finger(lengths, radius) {
    const joints = [];
    const root = new THREE.Group();
    let parent = root;
    lengths.forEach((length, i) => {
        const joint = new THREE.Group();
        if (i > 0) joint.position.z = -lengths[i - 1];
        parent.add(joint);
        // r : rayon de collision de la phalange (la peau visible reste dedans).
        joint.userData = { length, r: radius * (1 - i * 0.08) };
        joints.push(joint);
        parent = joint;
    });
    return { root, joints };
}

// Base du pouce : `thumb` le ramène sous la paume (opposition), `pinch` le
// tourne face à l'index, `wrap` le fait passer par-dessus un bord.
function thumbQuaternion(q, thumb, pinch, wrap) {
    q.setFromEuler(thumbEuler.set(-0.25 - 0.55 * thumb, (0.8 - 0.55 * thumb) * (1 - (pinch || 0)), -0.45));
    if (wrap) q.slerp(WRAP, wrap);
    return q;
}

/*
 * La main visible est un seul maillage lisse (voir hand-shape.js), porté par
 * les nœuds ci-dessous comme par des os : paume, phalanges, pouce. On la
 * sculpte une fois (hors du fil principal si possible) dans une pose de
 * référence, doigts tendus et écartés ; les deux mains partagent la forme.
 */
const DETAIL = { high: 0.0012, mobile: 0.0015, low: 0.0018 };
const BIND_SPREAD = -1; // doigts écartés : ils ne se collent pas pendant la sculpture
const BIND_THUMB = 0.6;
const shapes = {};
function handShape(chains, cell) {
    if (!shapes[cell]) {
        shapes[cell] = new Promise((resolve) => {
            const fallback = () => import('./hand-shape.js').then((m) => resolve(m.sculptHand(chains, cell)));
            try {
                const worker = new Worker(new URL('./hand-worker.js', import.meta.url), { type: 'module' });
                worker.onmessage = (e) => {
                    worker.terminate();
                    resolve(e.data);
                };
                worker.onerror = () => {
                    worker.terminate();
                    fallback();
                };
                worker.postMessage({ chains, cell });
            } catch (error) {
                fallback();
            }
        }).then((raw) => {
            const g = new THREE.BufferGeometry();
            g.setAttribute('position', new THREE.BufferAttribute(raw.position, 3));
            g.setAttribute('normal', new THREE.BufferAttribute(raw.normal, 3));
            g.setAttribute('uv', new THREE.BufferAttribute(raw.uv, 2));
            g.setAttribute('color', new THREE.BufferAttribute(raw.color, 3));
            g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(raw.skinIndex, 4));
            g.setAttribute('skinWeight', new THREE.BufferAttribute(raw.skinWeight, 4));
            g.setIndex(new THREE.BufferAttribute(raw.index, 1));
            g.computeBoundingSphere();
            return { geometry: g, nails: raw.nails };
        });
    }
    return shapes[cell];
}
let handSkin = null;
const nailGeometry = new THREE.SphereGeometry(1, 16, 10);

function buildHand(side, detail) {
    const hand = new THREE.Group();
    const mirror = new THREE.Group();
    mirror.scale.x = side; // main gauche = miroir de la droite
    hand.add(mirror);

    const defs = [
        { x: -0.023, lengths: [0.034, 0.021, 0.018], radius: 0.0083, spread: -0.07 },
        { x: -0.0075, lengths: [0.038, 0.024, 0.019], radius: 0.0085, spread: -0.02 },
        { x: 0.008, lengths: [0.036, 0.022, 0.018], radius: 0.0081, spread: 0.03 },
        { x: 0.0225, lengths: [0.028, 0.018, 0.016], radius: 0.0073, spread: 0.09 }
    ];
    const fingers = defs.map((def) => {
        const f = finger(def.lengths, def.radius);
        f.root.position.set(def.x, 0, -0.078);
        f.spread = def.spread;
        mirror.add(f.root);
        return f;
    });

    const thumbBase = new THREE.Group();
    thumbBase.position.set(-0.028, -0.008, -0.022);
    thumbBase.rotation.order = 'YXZ';
    mirror.add(thumbBase);
    const thumb = finger([0.034, 0.027, 0.022], 0.0102);
    thumbBase.add(thumb.root);

    // Pose de référence, et repère de chaque os dans celui de la main.
    fingers.forEach((f) => f.root.rotation.set(0, f.spread * BIND_SPREAD * 2.2, 0));
    thumbQuaternion(thumbBase.quaternion, BIND_THUMB, 0, 0);
    hand.updateMatrixWorld(true);
    const toHand = mirror.matrixWorld.clone().invert();
    const bones = [mirror, ...fingers.flatMap((f) => f.joints), ...thumb.joints];
    const rest = bones.map((b) => new THREE.Matrix4().multiplyMatrices(toHand, b.matrixWorld));
    const chains = [...fingers, thumb].map((f, i) => {
        const e = rest[1 + i * 3].elements;
        return { o: [e[12], e[13], e[14]], R: [[e[0], e[1], e[2]], [e[4], e[5], e[6]], [e[8], e[9], e[10]]], lengths: f.joints.map((j) => j.userData.length), radius: i < 4 ? defs[i].radius : 0.0102 };
    });

    if (!handSkin) {
        // Même peau que l'avant-bras, nuancée par sommet (jointures, plis, lignes de la main).
        handSkin = skinMaterial().clone();
        handSkin.vertexColors = true;
        handSkin.onBeforeCompile = skinShader;
    }
    const skin = new THREE.SkinnedMesh(new THREE.BufferGeometry(), handSkin);
    skin.bind(new THREE.Skeleton(bones, rest.map((m) => m.clone().invert())), new THREE.Matrix4());
    skin.frustumCulled = false;
    mirror.add(skin);
    const ready = handShape(chains, DETAIL[detail] || DETAIL.high).then(({ geometry, nails }) => {
        skin.geometry = geometry;
        // Ongles, sur le dos de la dernière phalange.
        [...fingers, thumb].forEach((f, i) => {
            const n = new THREE.Mesh(nailGeometry, nail);
            n.position.fromArray(nails[i].position);
            n.scale.fromArray(nails[i].scale);
            n.rotation.x = nails[i].tilt;
            n.frustumCulled = false;
            f.joints[2].add(n);
        });
    });

    return { hand, fingers, thumbBase, thumb, skin, ready };
}

export class Arm {
    // detail : 'high', 'mobile' ou 'low' (finesse du maillage de la main).
    constructor(rig, side, detail = 'high') {
        this.rig = rig;
        this.side = side;
        this.shoulder = new THREE.Vector3(0.17 * side, -0.27, 0.1);
        // Position de repos : mains basses, hors du champ, doigts dans l'axe de
        // l'avant-bras et paume vers l'intérieur (torsion du poignet proche du
        // neutre) : les gestes qui en partent tournent la main du bon côté.
        this.rest = { position: new THREE.Vector3(0.2 * side, -0.62, -0.12), quaternion: handQuaternion(new THREE.Vector3(-side, -0.3, 0), new THREE.Vector3(-0.27 * side, -0.38, -0.88)) };

        this.target = new THREE.Object3D();
        this.target.position.copy(this.rest.position);
        this.target.quaternion.copy(this.rest.quaternion);
        rig.add(this.target);

        // curl : doigts pliés (0 à 1) ; index : l'index seul (null = comme les autres) ;
        // wrap : pouce qui enveloppe un bord (0 à 1) ; pinch : pouce ramené face
        // à l'index, pour pincer du bout des doigts (0 à 1).
        this.grip = { curl: 0.25, thumb: 0.2, spread: 0.4, index: null, wrap: 0, pinch: 0 };
        // Objets que les doigts touchent sans les traverser (voir fitDigits).
        this.touch = [];

        const cylinder = (rTop, rBottom, material) => {
            const geometry = new THREE.CylinderGeometry(rTop, rBottom, 1, 16, 1, false);
            geometry.translate(0, 0.5, 0);
            return new THREE.Mesh(geometry, material);
        };
        this.upper = cylinder(0.05, 0.054, sleeve);
        this.fore = cylinder(0.054, 0.046, sleeve);
        this.cuff = new THREE.Mesh(new THREE.TorusGeometry(0.047, 0.005, 6, 20), lining);
        // Avant-bras : il s'affine vers le poignet et se termine dans celui de la main.
        this.forearm = cylinder(0.0195, 0.032, skinMaterial()); // poignet, coude
        this.parts = buildHand(side, detail);
        this.hand = this.parts.hand;
        this.ready = this.parts.ready; // la main sculptée est prête
        rig.add(this.upper, this.fore, this.cuff, this.forearm, this.hand);
        [this.upper, this.fore, this.cuff, this.forearm].forEach((m) => { m.frustumCulled = false; });
        this.hand.traverse((m) => { m.frustumCulled = false; });

        this._m = new THREE.Matrix4();
        this._inv = new THREE.Matrix4();
        this._p = new THREE.Vector3();
        this._q = new THREE.Quaternion();
        this._s = new THREE.Vector3();
        this._twist = 0; // dernière torsion du poignet (continuité)
    }

    // Déplace la cible sous un nouveau parent sans la faire bouger à l'écran.
    attachTo(object) {
        object.attach(this.target);
    }

    applyGrip() {
        const { curl, thumb, spread, index } = this.grip;
        const { fingers, thumbBase, thumb: t } = this.parts;
        fingers.forEach((f, i) => {
            const c = (i === 0 && index !== null && index !== undefined ? index : curl) * (1 + (i - 1) * 0.06);
            f.root.rotation.set(-c * 0.95, f.spread * spread * 2.2, 0);
            f.joints[1].rotation.x = -c * 1.3;
            f.joints[2].rotation.x = -c * 0.85;
        });
        this.thumbPose(thumb);
        t.joints[1].rotation.x = -thumb * 0.55;
        t.joints[2].rotation.x = -thumb * 0.6;
        this.fitDigits();
    }

    // Base du pouce (voir thumbQuaternion).
    thumbPose(thumb) {
        thumbQuaternion(this.parts.thumbBase.quaternion, thumb, this.grip.pinch, this.grip.wrap);
    }

    /*
     * Prise réelle : les doigts se referment comme de vrais doigts. Toutes les
     * articulations d'un doigt se plient ensemble vers l'angle voulu ; dès
     * qu'une phalange touche l'objet (livre, porte…), elle et celles d'avant
     * s'arrêtent, et les suivantes continuent de s'enrouler autour de lui.
     * Rien ne traverse : un doigt qui ne peut pas se plier reste ouvert au contact.
     */
    fitDigits() {
        const near = this.nearObjects();
        if (!near.length) return;
        const { fingers, thumbBase, thumb: t } = this.parts;
        this.hand.updateMatrixWorld(true);
        const place = (node) => {
            node.updateMatrix();
            node.matrixWorld.multiplyMatrices(node.parent.matrixWorld, node.matrix);
        };
        // Distance entre une phalange et l'objet le plus proche (négative : dedans).
        const clearance = (joint) => {
            const { length, r } = joint.userData;
            let min = Infinity;
            for (let k = 0; k <= 3; k++) {
                const p = this._s.set(0, 0, -r / 2 - (length - r) * k / 3).applyMatrix4(joint.matrixWorld);
                near.forEach((o) => {
                    const d = o.sd(this._p.copy(p).applyMatrix4(o.inv)) - r - 0.0006;
                    if (d < min) min = d;
                });
            }
            return min;
        };
        // Pose un doigt (trois angles) ; renvoie la dernière phalange qui touche (-1 : aucune).
        const pose = (digit, angles) => {
            digit.set(angles);
            digit.chain.forEach(place);
            let hit = -1;
            digit.phalanges.forEach((joint, i) => { if (clearance(joint) < 0) hit = i; });
            return hit;
        };
        const close = (digit, want) => {
            const open = [0, 0, 0];
            if (pose(digit, open) >= 0) {
                // Déjà contre l'objet doigt tendu : on essaie une grille de poses
                // (base, puis les deux phalanges ensemble) et on garde la libre la plus
                // proche de celle voulue, ou à défaut la moins enfoncée.
                let best = open, score = -Infinity;
                const [r0, r1] = digit.range;
                for (let i = 0; i <= 8; i++) {
                    for (let j = 0; j <= 8; j++) {
                        const b = r1[0] + (r1[1] - r1[0]) * j / 8;
                        const angles = [r0[0] + (r0[1] - r0[0]) * i / 8, b, b * 0.7];
                        pose(digit, angles);
                        const c = Math.min(...digit.phalanges.map(clearance));
                        const s = c >= 0 ? 10 - Math.abs(angles[0] - want[0]) - Math.abs(angles[1] - want[1]) : c;
                        if (s > score) { score = s; best = angles; }
                    }
                }
                // Puis chaque articulation se rapproche de l'angle voulu tant qu'elle reste libre.
                if (score > 0) {
                    for (let j = 0; j < 3; j++) {
                        let ok = best[j], to = want[j];
                        for (let n = 0; n < 5; n++) {
                            const angles = best.slice();
                            angles[j] = (ok + to) / 2;
                            pose(digit, angles);
                            if (Math.min(...digit.phalanges.map(clearance)) >= 0) ok = angles[j];
                            else to = angles[j];
                        }
                        best[j] = ok;
                    }
                }
                pose(digit, best);
                return;
            }
            let frozen = -1, k0 = 0;
            const at = (k) => want.map((w, j) => open[j] + (w - open[j]) * k);
            for (let step = 1; step <= 8 && frozen < 2; step++) {
                let k = step / 8;
                let hit = pose(digit, at(k));
                if (hit < 0) { k0 = k; continue; }
                let lo = k0;
                for (let n = 0; n < 6; n++) {
                    const m = (lo + k) / 2;
                    const h = pose(digit, at(m));
                    if (h < 0) lo = m;
                    else { k = m; hit = h; }
                }
                const angles = at(lo);
                frozen = hit;
                // Les articulations figées gardent leur angle de contact.
                want = want.map((w, j) => (j <= frozen ? angles[j] : w));
                open.forEach((o, j) => { if (j <= frozen) open[j] = angles[j]; });
                k0 = lo;
                step = Math.floor(lo * 8);
            }
            pose(digit, at(k0));
        };
        fingers.forEach((f) => {
            if (!f.digit) {
                f.digit = {
                    chain: [f.root, ...f.joints],
                    phalanges: f.joints,
                    range: [[-1.6, 0.2], [-1.9, 0.1], [-1.4, 0.1]],
                    set: ([a, b, c]) => { f.root.rotation.x = a; f.joints[1].rotation.x = b; f.joints[2].rotation.x = c; }
                };
            }
            close(f.digit, [f.root.rotation.x, f.joints[1].rotation.x, f.joints[2].rotation.x]);
        });
        // Pouce : l'opposition (rotation de sa base) puis ses deux phalanges.
        if (!t.digit) {
            t.digit = {
                chain: [thumbBase, t.root, ...t.joints],
                phalanges: t.joints,
                range: [[-0.3, 1.3], [-1.3, 0.2], [-1.3, 0.2]],
                set: ([s, b, c]) => {
                    this.thumbPose(s);
                    t.joints[1].rotation.x = b;
                    t.joints[2].rotation.x = c;
                }
            };
        }
        close(t.digit, [this.grip.thumb, t.joints[1].rotation.x, t.joints[2].rotation.x]);
    }

    // Objets touchables assez proches de la main, avec leur repère inverse.
    nearObjects() {
        const wrist = this.hand.getWorldPosition(this._p);
        const near = [];
        this.touch.forEach((o) => {
            const object = o.object;
            object.updateWorldMatrix(true, false);
            if (this._s.setFromMatrixPosition(object.matrixWorld).distanceTo(wrist) > (o.radius || 0.3) + 0.2) return;
            if (!o.inv) o.inv = new THREE.Matrix4();
            o.inv.copy(object.matrixWorld).invert();
            near.push(o);
        });
        return near;
    }

    placeSegment(mesh, from, to) {
        const dir = this._s.subVectors(to, from);
        const length = dir.length();
        mesh.position.copy(from);
        mesh.quaternion.setFromUnitVectors(Y_AXIS, dir.divideScalar(length || 1));
        mesh.scale.set(1, length, 1);
    }

    update() {
        // Pose de la cible dans le repère du rig (la caméra).
        this.rig.updateWorldMatrix(true, false);
        this.target.updateWorldMatrix(true, false);
        this._inv.copy(this.rig.matrixWorld).invert();
        this._m.multiplyMatrices(this._inv, this.target.matrixWorld);
        this._m.decompose(this._p, this._q, new THREE.Vector3());
        const wrist = this._p.clone();

        // Cinématique inverse : où placer le coude ?
        const shoulder = this.shoulder.clone();
        const dir = new THREE.Vector3().subVectors(wrist, shoulder);
        let d = dir.length();
        dir.divideScalar(d || 1);
        const reach = UPPER + FORE - 0.004;
        if (d > reach) {
            // Trop loin : l'épaule avance (on se penche), hors du champ de vision.
            shoulder.addScaledVector(dir, d - reach);
            d = reach;
        }
        d = Math.max(d, Math.abs(UPPER - FORE) + 0.02);
        const a = (UPPER * UPPER - FORE * FORE + d * d) / (2 * d);
        const h = Math.sqrt(Math.max(0, UPPER * UPPER - a * a));
        const pole = new THREE.Vector3(0.55 * this.side, -1, 0.35).normalize();
        const bend = pole.sub(dir.clone().multiplyScalar(pole.dot(dir))).normalize();
        const elbow = shoulder.clone().addScaledVector(dir, a).addScaledVector(bend, h);

        this.placeSegment(this.upper, shoulder, elbow);
        const foreDir = new THREE.Vector3().subVectors(wrist, elbow).normalize();
        const cuffEnd = wrist.clone().addScaledVector(foreDir, -0.075);
        this.placeSegment(this.fore, elbow, cuffEnd);
        this.placeSegment(this.forearm, elbow, wrist.clone().addScaledVector(foreDir, -0.008));
        this.cuff.position.copy(cuffEnd);
        this.cuff.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), foreDir);

        this.hand.position.copy(wrist);
        this.hand.quaternion.copy(this.limitWrist(this._q, foreDir));
        this.applyGrip();
    }

    /*
     * Un poignet humain ne tourne pas à 360° : on borne l'orientation de la
     * main par rapport à l'avant-bras. Position neutre = « poignée de main »
     * (doigts dans l'axe de l'avant-bras, paume tournée vers l'intérieur).
     *   - rotation autour de l'avant-bras (paume vers le bas / le haut) : ±95°
     *   - flexion du poignet (dans toutes les directions) : 70° au plus
     */
    limitWrist(q, foreDir) {
        const Z = foreDir.clone().negate();
        const Y = new THREE.Vector3(this.side, 0, 0);
        Y.sub(Z.clone().multiplyScalar(Y.dot(Z)));
        if (Y.lengthSq() < 1e-4) Y.set(0, 1, 0).sub(Z.clone().multiplyScalar(Z.y));
        Y.normalize();
        const X = new THREE.Vector3().crossVectors(Y, Z);
        const frame = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
        const rel = frame.clone().invert().multiply(q);
        if (rel.w < 0) rel.set(-rel.x, -rel.y, -rel.z, -rel.w);
        // Décomposition « balancement × torsion » autour de l'axe de l'avant-bras.
        let twist = new THREE.Quaternion(0, 0, rel.z, rel.w);
        if (twist.lengthSq() < 1e-8) twist.identity();
        else twist.normalize();
        const swing = rel.clone().multiply(twist.clone().invert());
        // Angle pris sur le tour le plus proche de l'image précédente : sinon, quand
        // la cible passe par 180°, la butée saute de +95° à -95° et la main se retourne.
        let twistAngle = 2 * Math.atan2(twist.z, twist.w);
        twistAngle += 2 * Math.PI * Math.round((this._twist - twistAngle) / (2 * Math.PI));
        twistAngle = Math.max(-1.66, Math.min(1.66, twistAngle));
        this._twist = twistAngle;
        twist = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), twistAngle);
        if (swing.w < 0) swing.set(-swing.x, -swing.y, -swing.z, -swing.w);
        const swingAngle = 2 * Math.acos(Math.min(1, swing.w));
        const maxSwing = 1.22;
        if (swingAngle > maxSwing) swing.copy(new THREE.Quaternion().slerp(swing, maxSwing / swingAngle));
        return frame.multiply(swing.multiply(twist));
    }
}

/*
 * Orientation d'une main à partir de deux directions, exprimées dans le repère
 * du parent de la cible : vers où regarde la paume, et vers où pointent les doigts.
 */
export function handQuaternion(palm, fingers) {
    const z = fingers.clone().normalize().negate();
    let y = palm.clone().normalize().negate();
    y.sub(z.clone().multiplyScalar(y.dot(z))).normalize();
    const x = new THREE.Vector3().crossVectors(y, z).normalize();
    return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

// Un objet en forme de boîte (un livre) que les doigts touchent sans le traverser.
export function boxTouch(mesh) {
    const { w, h, t } = mesh.userData.size;
    return {
        object: mesh,
        radius: 0.2,
        sd(p) {
            const qx = Math.abs(p.x) - w / 2, qy = Math.abs(p.y) - h / 2, qz = Math.abs(p.z) - t / 2;
            return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0);
        }
    };
}
