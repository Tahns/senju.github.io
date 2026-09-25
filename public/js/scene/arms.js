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
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/RoundedBoxGeometry.js';
import { skin as skinTexture } from './textures.js';

const UPPER = 0.27;
const FORE = 0.26;
const Y_AXIS = new THREE.Vector3(0, 1, 0);

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
    const thumb = finger([0.03, 0.024, 0.02], 0.0095);
    thumbBase.add(thumb.root);

    return { hand, fingers, thumbBase, thumb };
}

export class Arm {
    constructor(rig, side) {
        this.rig = rig;
        this.side = side;
        this.shoulder = new THREE.Vector3(0.17 * side, -0.27, 0.1);
        // Position de repos : mains basses, hors du champ.
        this.rest = { position: new THREE.Vector3(0.2 * side, -0.62, -0.12), quaternion: new THREE.Quaternion().setFromEuler(new THREE.Euler(1.2, 0, 0)) };

        this.target = new THREE.Object3D();
        this.target.position.copy(this.rest.position);
        this.target.quaternion.copy(this.rest.quaternion);
        rig.add(this.target);

        // curl : doigts pliés (0 à 1) ; index : l'index seul (null = comme les autres).
        this.grip = { curl: 0.25, thumb: 0.2, spread: 0.4, index: null };

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
        thumbBase.rotation.set(-0.25 - 0.55 * thumb, 0.8 - 0.55 * thumb, -0.45);
        t.joints[1].rotation.x = -thumb * 0.55;
        t.joints[2].rotation.x = -thumb * 0.6;
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
        this.hand.quaternion.copy(this._q);
        this.applyGrip();
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
