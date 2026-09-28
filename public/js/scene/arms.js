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
import { RoundedBoxGeometry } from '../../vendor/RoundedBoxGeometry.js';
import { skin as skinTexture } from './textures.js';

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
const nail = new THREE.MeshPhysicalMaterial({ color: '#f3d6cb', roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.4 });
function skinMaterial() {
    if (!skin) {
        skin = new THREE.MeshPhysicalMaterial({
            color: '#e9c2a6',
            map: skinTexture(),
            roughness: 0.58,
            sheen: 0.8,
            sheenColor: new THREE.Color('#ff9f86'),
            sheenRoughness: 0.45,
            emissive: new THREE.Color('#5a1c10'),
            emissiveIntensity: 0.08
        });
    }
    return skin;
}
const sleeve = new THREE.MeshStandardMaterial({ color: '#232b4a', roughness: 0.88 });
const lining = new THREE.MeshStandardMaterial({ color: '#d9d0bc', roughness: 0.9 });

function capsule(radius, length) {
    const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius), 4, 10);
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, 0, -length / 2);
    return new THREE.Mesh(geometry, skinMaterial());
}

// Un doigt : trois phalanges articulées.
function finger(lengths, radius) {
    const joints = [];
    const root = new THREE.Group();
    let parent = root;
    lengths.forEach((length, i) => {
        const joint = new THREE.Group();
        if (i > 0) joint.position.z = -lengths[i - 1];
        parent.add(joint);
        const r = radius * (1 - i * 0.08);
        joint.add(capsule(r, length));
        joint.userData = { length, r };
        if (i === lengths.length - 1) {
            // Ongle, sur le dos de la dernière phalange.
            const n = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), nail);
            n.scale.set(r * 0.78, r * 0.32, length * 0.42);
            n.position.set(0, r * 0.72, -length * 0.62);
            joint.add(n);
        }
        joints.push(joint);
        parent = joint;
    });
    return { root, joints };
}

function buildHand(side) {
    const hand = new THREE.Group();
    const mirror = new THREE.Group();
    mirror.scale.x = side; // main gauche = miroir de la droite
    hand.add(mirror);

    const palm = new THREE.Mesh(new RoundedBoxGeometry(0.066, 0.024, 0.08, 4, 0.0115), skinMaterial());
    palm.position.set(0, 0, -0.042);
    mirror.add(palm);
    // Jointures : légers renflements à la base des doigts.
    [-0.023, -0.0075, 0.008, 0.0225].forEach((x) => {
        const k = new THREE.Mesh(new THREE.SphereGeometry(0.0092, 12, 8), skinMaterial());
        k.scale.set(1, 0.9, 1.1);
        k.position.set(x, 0.002, -0.076);
        mirror.add(k);
    });
    const heel = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 10), skinMaterial());
    heel.scale.set(1.25, 0.7, 1);
    heel.position.set(0, -0.002, -0.006);
    mirror.add(heel);

    const defs = [
        { x: -0.023, lengths: [0.034, 0.021, 0.018], radius: 0.0078, spread: -0.07 },
        { x: -0.0075, lengths: [0.038, 0.024, 0.019], radius: 0.008, spread: -0.02 },
        { x: 0.008, lengths: [0.036, 0.022, 0.018], radius: 0.0076, spread: 0.03 },
        { x: 0.0225, lengths: [0.028, 0.018, 0.016], radius: 0.0068, spread: 0.09 }
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
    const thumb = finger([0.034, 0.027, 0.022], 0.0095);
    thumbBase.add(thumb.root);

    return { hand, fingers, thumbBase, thumb };
}

export class Arm {
    constructor(rig, side) {
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
        // wrap : pouce qui enveloppe un bord (0 à 1).
        this.grip = { curl: 0.25, thumb: 0.2, spread: 0.4, index: null, wrap: 0 };
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
        this.forearm = cylinder(0.022, 0.026, skinMaterial());
        this.parts = buildHand(side);
        this.hand = this.parts.hand;
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

    // Base du pouce : `thumb` le ramène sous la paume (opposition), `wrap` le
    // fait passer par-dessus un bord.
    thumbPose(thumb) {
        const q = this.parts.thumbBase.quaternion;
        q.setFromEuler(thumbEuler.set(-0.25 - 0.55 * thumb, 0.8 - 0.55 * thumb, -0.45));
        if (this.grip.wrap) q.slerp(WRAP, this.grip.wrap);
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
        this.placeSegment(this.forearm, elbow, wrist);
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
