/*
 * Hoko adulte, jōnin de Konoha, pour le rêve (vu à la troisième personne).
 * Personnage stylisé, fait de formes simples, avec des articulations nommées
 * que l'on anime en passant d'une pose à l'autre.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/RoundedBoxGeometry.js';

const KONOHA = 'M95 8 L84 20 C58 8 24 22 16 50 C12 62 8 70 3 78 C22 86 44 88 60 87 C80 86 94 72 94 55 C94 37 79 25 62 25 C45 25 34 37 34 51 C34 64 45 72 57 72 C69 72 77 64 77 54 C77 45 70 39 62 39 C55 39 50 44 50 51 C50 57 55 60 60 60 C65 60 67 56 66 53';

function plateTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    const g = ctx.createLinearGradient(0, 0, 0, 128);
    g.addColorStop(0, '#e9eef2');
    g.addColorStop(0.5, '#a9b3bc');
    g.addColorStop(1, '#d6dde3');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 256, 128);
    ctx.save();
    ctx.translate(128 - 42, 64 - 40);
    ctx.scale(84 / 104, 80 / 100);
    ctx.translate(4, 4);
    ctx.strokeStyle = '#2b3036';
    ctx.lineWidth = 9;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(KONOHA));
    ctx.restore();
    [[12, 12], [244, 12], [12, 116], [244, 116]].forEach(([x, y]) => {
        ctx.fillStyle = '#6d7680';
        ctx.beginPath();
        ctx.arc(x, y, 5, 0, Math.PI * 2);
        ctx.fill();
    });
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

export function buildNinja() {
    const mat = (color, roughness = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
    const M = {
        skin: new THREE.MeshPhysicalMaterial({ color: '#e2b596', roughness: 0.55, sheen: 0.6, sheenColor: new THREE.Color('#ff9f86') }),
        cloth: mat('#1f2640'),
        vest: mat('#5b6a3a', 0.85),
        vestDark: mat('#46522c', 0.9),
        hair: mat('#23160f', 0.7),
        band: mat('#1b2033', 0.8),
        plate: new THREE.MeshStandardMaterial({ map: plateTexture(), metalness: 0.85, roughness: 0.28 }),
        sandal: mat('#2a2522', 0.7),
        belt: mat('#7a1e18', 0.7),
        leather: mat('#6b4526', 0.6),
        gold: new THREE.MeshStandardMaterial({ color: '#e0b34a', metalness: 1, roughness: 0.3 }),
        black: new THREE.MeshStandardMaterial({ color: '#0d0c0c', roughness: 0.25, metalness: 0.2 }),
        steel: new THREE.MeshStandardMaterial({ color: '#dfe6ec', metalness: 1, roughness: 0.15 }),
        eye: mat('#1a1410', 0.3),
        white: mat('#f2eee6', 0.6)
    };
    const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
    const mesh = (geo, m, parent, x = 0, y = 0, z = 0) => {
        const o = shadow(new THREE.Mesh(geo, m));
        o.position.set(x, y, z);
        parent.add(o);
        return o;
    };
    const capsule = (r, len, m, parent, y) => {
        // Segment de membre qui descend depuis l'articulation.
        const g = new THREE.CapsuleGeometry(r, len, 6, 12);
        g.translate(0, -len / 2 - r * 0.3, 0);
        return mesh(g, m, parent, 0, y || 0, 0);
    };
    const joint = (parent, x, y, z) => {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        parent.add(g);
        return g;
    };

    const root = new THREE.Group();
    const J = {};
    J.hips = joint(root, 0, 0.98, 0);
    mesh(new RoundedBoxGeometry(0.34, 0.2, 0.22, 3, 0.07), M.cloth, J.hips, 0, 0.02, 0);
    mesh(new THREE.CylinderGeometry(0.175, 0.175, 0.07, 20), M.belt, J.hips, 0, 0.1, 0);

    // Bourse de pièces à la ceinture (elle gonfle pendant le rêve).
    const pouch = joint(J.hips, 0.19, 0.02, 0.07);
    mesh(new THREE.SphereGeometry(0.075, 18, 14), M.leather, pouch).scale.set(1, 1.15, 0.85);
    mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14), M.gold, pouch, 0, 0.075, 0).rotation.x = Math.PI / 2;

    // Jambes.
    ['L', 'R'].forEach((side, i) => {
        const s = i === 0 ? -1 : 1;
        const hip = J['hip' + side] = joint(J.hips, s * 0.1, -0.05, 0);
        capsule(0.075, 0.36, M.cloth, hip);
        const knee = J['knee' + side] = joint(hip, 0, -0.45, 0);
        capsule(0.062, 0.34, M.cloth, knee);
        // Bandes blanches des tibias (shinobi).
        mesh(new THREE.CylinderGeometry(0.066, 0.058, 0.16, 14), M.white, knee, 0, -0.32, 0);
        const foot = J['foot' + side] = joint(knee, 0, -0.44, 0);
        mesh(new RoundedBoxGeometry(0.11, 0.05, 0.25, 2, 0.02), M.sandal, foot, 0, -0.02, 0.05);
    });

    // Buste avec la veste de jōnin.
    J.spine = joint(J.hips, 0, 0.12, 0);
    mesh(new RoundedBoxGeometry(0.4, 0.5, 0.25, 4, 0.1), M.vest, J.spine, 0, 0.26, 0);
    mesh(new RoundedBoxGeometry(0.42, 0.14, 0.27, 3, 0.06), M.vestDark, J.spine, 0, 0.47, 0);
    [-0.09, 0.09].forEach((x) => mesh(new RoundedBoxGeometry(0.09, 0.12, 0.04, 2, 0.015), M.vestDark, J.spine, x, 0.24, 0.135));
    mesh(new THREE.TorusGeometry(0.11, 0.035, 8, 20), M.vestDark, J.spine, 0, 0.53, 0).rotation.x = Math.PI / 2;
    // Fourreau du sabre, en travers du dos.
    const back = joint(J.spine, 0, 0.3, -0.16);
    back.rotation.z = 0.75;
    const sheath = mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.8, 10), M.black, back);
    sheath.rotation.z = 0;

    // Tête.
    J.neck = joint(J.spine, 0, 0.56, 0);
    mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.1, 12), M.skin, J.neck, 0, 0.04, 0);
    J.head = joint(J.neck, 0, 0.11, 0);
    const skull = mesh(new THREE.SphereGeometry(0.12, 24, 18), M.skin, J.head, 0, 0.1, 0.005);
    skull.scale.set(0.92, 1.05, 1);
    [-0.042, 0.042].forEach((x) => {
        mesh(new THREE.SphereGeometry(0.014, 10, 8), M.eye, J.head, x, 0.105, 0.108).scale.set(1, 1.2, 0.5);
        mesh(new THREE.BoxGeometry(0.045, 0.009, 0.01), M.hair, J.head, x, 0.14, 0.11).rotation.z = x > 0 ? -0.18 : 0.18;
    });
    mesh(new THREE.ConeGeometry(0.013, 0.03, 8), M.skin, J.head, 0, 0.08, 0.12).rotation.x = Math.PI / 2;
    // Bandeau frontal de Konoha.
    mesh(new THREE.CylinderGeometry(0.117, 0.117, 0.045, 28, 1, true), M.band, J.head, 0, 0.16, 0.005);
    const plate = mesh(new RoundedBoxGeometry(0.13, 0.055, 0.012, 2, 0.006), [M.steel, M.steel, M.steel, M.steel, M.plate, M.steel], J.head, 0, 0.162, 0.118);
    plate.rotation.x = -0.08;
    [-1, 1].forEach((s) => {
        const tail = mesh(new THREE.BoxGeometry(0.03, 0.2, 0.006), M.band, J.head, s * 0.03, 0.08, -0.13);
        tail.rotation.set(0.35, 0, s * 0.25);
    });
    // Cheveux en mèches, dirigées vers le haut et l'arrière.
    const hairRandom = (() => { let x = 7; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
    const Y = new THREE.Vector3(0, 1, 0);
    mesh(new THREE.SphereGeometry(0.124, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), M.hair, J.head, 0, 0.13, -0.008).scale.set(0.95, 0.85, 1.02);
    for (let k = 0; k < 16; k++) {
        const a = (k / 16) * Math.PI * 2;
        const base = new THREE.Vector3(Math.sin(a) * 0.075, 0.2 + hairRandom() * 0.02, Math.cos(a) * 0.075 - 0.02);
        if (base.z > 0.03) base.y += 0.02; // mèches du devant, au-dessus du bandeau
        const dir = new THREE.Vector3(base.x * 1.6, 0.9, base.z * 1.3 - 0.35).normalize();
        const len = 0.1 + hairRandom() * 0.05;
        const spike = mesh(new THREE.ConeGeometry(0.035, len, 5), M.hair, J.head);
        spike.quaternion.setFromUnitVectors(Y, dir);
        spike.position.copy(base).addScaledVector(dir, len * 0.4);
    }

    // Bras.
    ['L', 'R'].forEach((side, i) => {
        const s = i === 0 ? -1 : 1;
        const shoulder = J['shoulder' + side] = joint(J.spine, s * 0.25, 0.46, 0);
        mesh(new THREE.SphereGeometry(0.075, 14, 12), M.vestDark, shoulder);
        capsule(0.058, 0.26, M.cloth, shoulder);
        const elbow = J['elbow' + side] = joint(shoulder, 0, -0.33, 0);
        capsule(0.05, 0.24, M.cloth, elbow);
        const hand = J['hand' + side] = joint(elbow, 0, -0.32, 0);
        mesh(new RoundedBoxGeometry(0.075, 0.1, 0.04, 2, 0.018), M.skin, hand, 0, -0.03, 0);
        mesh(new THREE.CapsuleGeometry(0.016, 0.03, 4, 8), M.skin, hand, -s * 0.045, -0.02, 0.02).rotation.z = s * 0.6;
    });

    // Sabre (d'abord dans le fourreau, sur le dos).
    const katana = new THREE.Group();
    const blade = mesh(new THREE.BoxGeometry(0.028, 0.78, 0.005), M.steel, katana, 0, 0.5, 0);
    blade.geometry.translate(0, 0, 0);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 18), M.gold, katana, 0, 0.105, 0);
    mesh(new THREE.CylinderGeometry(0.017, 0.018, 0.22, 10), M.black, katana, 0, 0, 0);
    back.add(katana);
    katana.position.set(0, 0.28, 0);
    katana.userData.sheathed = { parent: back, position: katana.position.clone(), quaternion: katana.quaternion.clone() };

    // Poses : angles (en radians) des articulations.
    const POSES = {
        stand: { spine: [0, 0, 0], head: [0, 0, 0], shoulderL: [0.05, 0, -0.18], shoulderR: [0.05, 0, 0.18], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0], hipL: [0, 0, 0.04], hipR: [0, 0, -0.04], kneeL: [0.05, 0, 0], kneeR: [0.05, 0, 0] },
        crossed: { spine: [0, 0, 0], head: [0.05, 0, 0], shoulderL: [-0.55, 0.35, -0.25], shoulderR: [-0.6, -0.35, 0.25], elbowL: [-1.9, 0.2, 0.3], elbowR: [-1.85, -0.2, -0.3], hipL: [0, 0, 0.1], hipR: [0, 0, -0.1] },
        draw: { spine: [0.05, 0.4, 0], head: [0, -0.3, 0], shoulderR: [-2.6, 0, 0.35], elbowR: [-0.9, 0, 0], shoulderL: [-0.3, 0, -0.3], elbowL: [-0.6, 0, 0], hipL: [-0.3, 0, 0.12], kneeL: [0.5, 0, 0], hipR: [0.25, 0, -0.1], kneeR: [0.2, 0, 0] },
        slashA: { spine: [0.15, -0.55, 0], head: [0, 0.35, 0], shoulderR: [-1.3, 0, 1.2], elbowR: [-0.15, 0, 0], shoulderL: [-0.2, 0, -0.5], elbowL: [-0.4, 0, 0], hipL: [-0.45, 0, 0.15], kneeL: [0.6, 0, 0], hipR: [0.35, 0, -0.15], kneeR: [0.25, 0, 0] },
        slashB: { spine: [0.1, 0.5, 0], head: [0, -0.3, 0], shoulderR: [-1.5, 0, -0.5], elbowR: [-0.2, 0, 0], shoulderL: [-0.3, 0, -0.9], elbowL: [-0.3, 0, 0], hipL: [-0.45, 0, 0.15], kneeL: [0.6, 0, 0], hipR: [0.35, 0, -0.15], kneeR: [0.25, 0, 0] },
        slashC: { spine: [0.35, 0, 0], head: [-0.2, 0, 0], shoulderR: [-0.4, 0, 0.1], elbowR: [-0.1, 0, 0], shoulderL: [-0.2, 0, -0.35], elbowL: [-0.5, 0, 0], hipL: [-0.6, 0, 0.1], kneeL: [0.9, 0, 0], hipR: [0.5, 0, -0.1], kneeR: [0.4, 0, 0] },
        seal: { spine: [0.05, 0, 0], head: [0.1, 0, 0], shoulderL: [-0.9, 0.5, -0.2], shoulderR: [-0.9, -0.5, 0.2], elbowL: [-1.35, 0.3, 0], elbowR: [-1.35, -0.3, 0], hipL: [-0.1, 0, 0.18], kneeL: [0.2, 0, 0], hipR: [0.1, 0, -0.18], kneeR: [0.2, 0, 0] },
        release: { spine: [0.1, -0.3, 0], head: [0, 0.2, 0], shoulderR: [-1.55, 0, 0.05], elbowR: [-0.05, 0, 0], shoulderL: [-1.4, 0, -0.25], elbowL: [-0.15, 0, 0], hipL: [-0.4, 0, 0.15], kneeL: [0.5, 0, 0], hipR: [0.3, 0, -0.15], kneeR: [0.2, 0, 0] },
        catch: { spine: [-0.1, 0, 0], head: [-0.35, 0, 0], shoulderL: [-2.6, 0, -0.35], shoulderR: [-2.6, 0, 0.35], elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0], hipL: [0, 0, 0.12], hipR: [0, 0, -0.12], kneeL: [0.1, 0, 0], kneeR: [0.1, 0, 0] },
        pocket: { spine: [0.05, -0.15, 0], head: [0.3, -0.25, 0], shoulderR: [0.2, 0, 0.35], elbowR: [-0.9, 0.3, 0], shoulderL: [-0.4, 0, -0.2], elbowL: [-1.2, 0, 0], hipL: [0, 0, 0.08], hipR: [0, 0, -0.08] },
        flip: { spine: [0, 0.1, 0], head: [-0.25, 0.15, 0], shoulderR: [-1.0, 0, 0.3], elbowR: [-1.6, 0, 0], shoulderL: [0.05, 0, -0.18], elbowL: [-0.2, 0, 0], hipL: [0, 0, 0.08], hipR: [0, 0, -0.08] }
    };
    const NAMES = ['spine', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'hipL', 'hipR', 'kneeL', 'kneeR'];
    function applyPose(name) {
        const p = { ...POSES.stand, ...POSES[name] };
        NAMES.forEach((n) => J[n].rotation.set(...(p[n] || [0, 0, 0])));
    }
    function poseValues(name) {
        const p = { ...POSES.stand, ...POSES[name] };
        return NAMES.map((n) => p[n] || [0, 0, 0]);
    }
    function currentValues() {
        return NAMES.map((n) => [J[n].rotation.x, J[n].rotation.y, J[n].rotation.z]);
    }
    function setValues(values) {
        NAMES.forEach((n, i) => J[n].rotation.set(...values[i]));
    }
    // Les pieds restent à plat : on compense l'angle des hanches et genoux.
    function plantFeet() {
        ['L', 'R'].forEach((s) => { J['foot' + s].rotation.x = -(J['hip' + s].rotation.x + J['knee' + s].rotation.x); });
    }

    applyPose('crossed');
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });

    return {
        root, J, M, katana, pouch, plate,
        poseValues, currentValues, setValues, plantFeet,
        // Sabre en main / rengainé.
        drawKatana() {
            J.handR.attach(katana);
            katana.position.set(0, -0.06, 0.02);
            katana.rotation.set(Math.PI / 2 + 0.1, 0, 0);
        },
        sheathe() {
            const { parent, position, quaternion } = katana.userData.sheathed;
            parent.add(katana);
            katana.position.copy(position);
            katana.quaternion.copy(quaternion);
        }
    };
}
