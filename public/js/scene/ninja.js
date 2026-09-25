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

// Ombrage « dessin animé » : trois tons francs au lieu d'un dégradé.
function toonRamp() {
    const data = new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 255, 255, 255, 255]);
    const t = new THREE.DataTexture(data, 3, 1, THREE.RGBAFormat);
    t.minFilter = THREE.NearestFilter;
    t.magFilter = THREE.NearestFilter;
    t.needsUpdate = true;
    return t;
}

function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// Tablier violet avec une rangée de losanges blancs en bas.
const apronTexture = () => canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#3a3272';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#eef0f6';
    for (let x = 0; x < w; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x + 16, h - 34);
        ctx.lineTo(x + 30, h - 17);
        ctx.lineTo(x + 16, h);
        ctx.lineTo(x + 2, h - 17);
        ctx.fill();
    }
});

// Tourbillon rouge des vestes de jōnin.
const swirlTexture = () => canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c42a2a';
    ctx.beginPath();
    ctx.arc(64, 64, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#7cbfae';
    ctx.lineWidth = 8;
    ctx.beginPath();
    for (let a = 0; a < Math.PI * 5; a += 0.1) {
        const r = 6 + a * 3.2;
        ctx.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r);
    }
    ctx.stroke();
});

// Contour noir (technique de la « coque inversée ») pour le rendu anime.
function addOutlines(root) {
    const outline = new THREE.MeshBasicMaterial({ color: '#141026', side: THREE.BackSide });
    outline.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed += normal * 0.009;');
    };
    const meshes = [];
    root.traverse((o) => { if (o.isMesh && !o.userData.noOutline) meshes.push(o); });
    meshes.forEach((m) => {
        const hull = new THREE.Mesh(m.geometry, outline);
        hull.userData.noOutline = true;
        hull.castShadow = false;
        hull.frustumCulled = false;
        m.add(hull);
    });
}

// Visage anime : grands yeux (reflets, cils), sourcils, nez et bouche discrets.
const faceTexture = () => canvasTex(512, 512, (ctx, w, h) => {
    ctx.clearRect(0, 0, w, h);
    const eye = (cx, flip) => {
        const cy = 272;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.scale(flip * 1.5, 1.5);
        // Blanc de l'œil.
        ctx.fillStyle = '#fbf8f4';
        ctx.beginPath();
        ctx.moveTo(-44, 6);
        ctx.quadraticCurveTo(-30, -30, 18, -26);
        ctx.quadraticCurveTo(40, -20, 46, 0);
        ctx.quadraticCurveTo(20, 30, -20, 26);
        ctx.quadraticCurveTo(-40, 22, -44, 6);
        ctx.fill();
        // Iris brun foncé (Senju), pupille, reflets.
        const g = ctx.createLinearGradient(0, -26, 0, 26);
        g.addColorStop(0, '#1d120c');
        g.addColorStop(1, '#6b4128');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(2, 0, 20, 26, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#0c0706';
        ctx.beginPath();
        ctx.ellipse(2, 2, 9, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(-6, -10, 6, 7, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(9, 10, 3, 0, Math.PI * 2);
        ctx.fill();
        // Trait de cils épais au-dessus.
        ctx.strokeStyle = '#140c0a';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-48, 8);
        ctx.quadraticCurveTo(-30, -34, 20, -29);
        ctx.quadraticCurveTo(42, -24, 50, -4);
        ctx.stroke();
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-18, 27);
        ctx.quadraticCurveTo(14, 30, 36, 14);
        ctx.stroke();
        ctx.restore();
        // Sourcil déterminé.
        ctx.save();
        ctx.translate(cx, cy - 78);
        ctx.scale(flip * 1.35, 1.2);
        ctx.fillStyle = '#24160f';
        ctx.beginPath();
        ctx.moveTo(-46, 12);
        ctx.quadraticCurveTo(0, -12, 48, 2);
        ctx.lineTo(46, 12);
        ctx.quadraticCurveTo(0, -2, -44, 20);
        ctx.fill();
        ctx.restore();
    };
    eye(160, -1);
    eye(352, 1);
    ctx.strokeStyle = 'rgba(150,80,60,.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(262, 338);
    ctx.lineTo(252, 362);
    ctx.lineTo(264, 364);
    ctx.stroke();
    ctx.strokeStyle = '#6e3a2c';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(234, 404);
    ctx.quadraticCurveTo(256, 410, 280, 402);
    ctx.stroke();
});

// Bandes blanches (tibias, cuisse).
const bandageTexture = () => canvasTex(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#f1efe9';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(120,120,130,.45)';
    ctx.lineWidth = 2;
    for (let y = -64; y < 128; y += 12) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + 20);
        ctx.stroke();
    }
});

export function buildNinja() {
    const ramp = toonRamp();
    const mat = (color, roughness = 0.8, extra = {}) => new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...extra });
    const bandTex = bandageTexture();
    bandTex.wrapS = bandTex.wrapT = THREE.RepeatWrapping;
    bandTex.repeat.set(3, 3);
    const M = {
        skin: mat('#f2c9a8'),
        cloth: mat('#252d57'),
        clothDark: mat('#1a2044'),
        vest: mat('#7cbfae'),
        vestDark: mat('#5d9f8e'),
        apron: mat('#ffffff', 0.8, { map: apronTexture(), side: THREE.DoubleSide }),
        swirl: mat('#ffffff', 0.8, { map: swirlTexture() }),
        face: mat('#ffffff', 0.8, { map: faceTexture(), transparent: true, alphaTest: 0.5 }),
        hair: mat('#2b1a12'),
        band: mat('#1c2350'),
        plate: new THREE.MeshStandardMaterial({ map: plateTexture(), metalness: 0.85, roughness: 0.28 }),
        guard: mat('#3b3f4a'),
        glove: mat('#16161c'),
        bandage: mat('#ffffff', 0.8, { map: bandTex }),
        sandal: mat('#1f2a5c'),
        leather: mat('#7a4d2a'),
        gold: new THREE.MeshStandardMaterial({ color: '#e0b34a', metalness: 1, roughness: 0.3 }),
        black: new THREE.MeshStandardMaterial({ color: '#0d0c0c', roughness: 0.25, metalness: 0.2 }),
        steel: new THREE.MeshStandardMaterial({ color: '#dfe6ec', metalness: 1, roughness: 0.15 }),
        eye: mat('#141020')
    };
    const shadow = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };
    const mesh = (geo, m, parent, x = 0, y = 0, z = 0) => {
        const o = shadow(new THREE.Mesh(geo, m));
        o.position.set(x, y, z);
        parent.add(o);
        return o;
    };
    const capsule = (r, len, m, parent, y = 0) => {
        const g = new THREE.CapsuleGeometry(r, len, 6, 14);
        g.translate(0, -len / 2 - r * 0.3, 0);
        return mesh(g, m, parent, 0, y, 0);
    };
    const joint = (parent, x, y, z) => {
        const g = new THREE.Group();
        g.position.set(x, y, z);
        parent.add(g);
        return g;
    };
    const Y = new THREE.Vector3(0, 1, 0);

    const root = new THREE.Group();
    const J = {};

    /* ---------------- Bassin, tablier, bourse ---------------- */
    J.hips = joint(root, 0, 0.98, 0);
    mesh(new THREE.CapsuleGeometry(0.15, 0.08, 6, 16), M.cloth, J.hips, 0, 0.03, 0).scale.set(1.15, 1, 0.8);
    mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 24), M.clothDark, J.hips, 0, 0.11, 0).scale.z = 0.78;
    // Tablier violet à losanges, ouvert devant (comme les jōnin du serveur).
    const apron = mesh(new THREE.CylinderGeometry(0.2, 0.33, 0.62, 28, 1, true, Math.PI * 0.2, Math.PI * 1.6), M.apron, J.hips, 0, -0.22, 0);
    apron.scale.z = 0.8;
    apron.rotation.y = Math.PI;
    apron.userData.noOutline = true;
    const pouch = joint(J.hips, 0.2, 0.03, -0.06);
    mesh(new THREE.SphereGeometry(0.07, 18, 14), M.leather, pouch).scale.set(1, 1.15, 0.85);
    mesh(new THREE.TorusGeometry(0.033, 0.008, 6, 14), M.gold, pouch, 0, 0.07, 0).rotation.x = Math.PI / 2;

    /* ---------------- Jambes ---------------- */
    ['L', 'R'].forEach((side, i) => {
        const s = i === 0 ? -1 : 1;
        const hip = J['hip' + side] = joint(J.hips, s * 0.1, -0.03, 0);
        capsule(0.078, 0.34, M.cloth, hip);
        if (s > 0) {
            // Étui à kunai sur la cuisse droite, tenu par une bande blanche.
            mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.07, 16), M.bandage, hip, 0, -0.24, 0);
            mesh(new THREE.BoxGeometry(0.07, 0.1, 0.05), M.clothDark, hip, 0.07, -0.25, 0.02).rotation.y = 0.5;
        }
        const knee = J['knee' + side] = joint(hip, 0, -0.44, 0);
        capsule(0.064, 0.33, M.cloth, knee);
        mesh(new THREE.CylinderGeometry(0.069, 0.058, 0.2, 16), M.bandage, knee, 0, -0.3, 0);
        const foot = J['foot' + side] = joint(knee, 0, -0.44, 0);
        mesh(new RoundedBoxGeometry(0.11, 0.03, 0.26, 2, 0.012), M.sandal, foot, 0, -0.035, 0.05);
        mesh(new RoundedBoxGeometry(0.105, 0.07, 0.13, 2, 0.03), M.sandal, foot, 0, 0.0, -0.01);
        mesh(new RoundedBoxGeometry(0.09, 0.035, 0.08, 2, 0.015), M.skin, foot, 0, -0.005, 0.13);
    });

    /* ---------------- Buste : veste de jōnin ---------------- */
    J.spine = joint(J.hips, 0, 0.12, 0);
    const shirt = mesh(new THREE.CapsuleGeometry(0.15, 0.3, 8, 18), M.cloth, J.spine, 0, 0.28, 0);
    shirt.scale.set(1.2, 1, 0.78);
    const vest = mesh(new THREE.CylinderGeometry(0.205, 0.175, 0.46, 10), M.vest, J.spine, 0, 0.28, 0);
    vest.scale.z = 0.72;
    mesh(new THREE.CylinderGeometry(0.19, 0.205, 0.08, 10), M.vestDark, J.spine, 0, 0.53, 0).scale.z = 0.74;
    // Poches à rouleaux sur la poitrine.
    [-1, 1].forEach((sx) => {
        [0.2, 0.32].forEach((y) => {
            const p = mesh(new RoundedBoxGeometry(0.085, 0.1, 0.045, 2, 0.015), M.vestDark, J.spine, sx * 0.09, y, 0.125);
            p.rotation.x = -0.05;
        });
    });
    mesh(new THREE.BoxGeometry(0.012, 0.42, 0.02), M.clothDark, J.spine, 0, 0.28, 0.14);
    // Col montant.
    mesh(new THREE.CylinderGeometry(0.1, 0.13, 0.1, 20, 1, true), M.vest, J.spine, 0, 0.6, 0).material.side = THREE.DoubleSide;
    // Grand tourbillon rouge dans le dos.
    const backSwirl = mesh(new THREE.CircleGeometry(0.09, 28), M.swirl, J.spine, 0, 0.34, -0.155);
    backSwirl.rotation.y = Math.PI;
    backSwirl.userData.noOutline = true;
    // Fourreau du sabre, en travers du dos.
    const back = joint(J.spine, 0, 0.3, -0.17);
    back.rotation.z = 0.75;
    mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.8, 10), M.black, back);

    /* ---------------- Tête ---------------- */
    J.neck = joint(J.spine, 0, 0.58, 0);
    mesh(new THREE.CylinderGeometry(0.052, 0.058, 0.1, 14), M.skin, J.neck, 0, 0.03, 0);
    J.head = joint(J.neck, 0, 0.1, 0);
    const skull = mesh(new THREE.SphereGeometry(0.125, 32, 24), M.skin, J.head, 0, 0.11, 0);
    skull.scale.set(0.9, 1.02, 0.95);
    const jaw = mesh(new THREE.SphereGeometry(0.1, 24, 16), M.skin, J.head, 0, 0.055, 0.018);
    jaw.scale.set(0.7, 0.92, 0.85);
    const chin = mesh(new THREE.ConeGeometry(0.038, 0.05, 16), M.skin, J.head, 0, 0.005, 0.055);
    chin.rotation.x = Math.PI + 0.6;
    [-1, 1].forEach((s) => mesh(new THREE.SphereGeometry(0.026, 12, 10), M.skin, J.head, s * 0.112, 0.1, -0.005).scale.set(0.5, 1, 0.8));
    // Visage peint sur une calotte devant la tête.
    const face = mesh(new THREE.SphereGeometry(0.1215, 32, 24, Math.PI / 2 - 0.85, 1.7, 1.05, 1.1), M.face, J.head, 0, 0.11, 0.004);
    face.scale.set(0.9, 1.02, 0.95);
    face.userData.noOutline = true;
    face.castShadow = false;
    // Bandeau frontal.
    mesh(new THREE.CylinderGeometry(0.119, 0.117, 0.042, 32, 1, true), M.band, J.head, 0, 0.175, 0.002).scale.set(0.93, 1, 0.98);
    const plate = mesh(new RoundedBoxGeometry(0.13, 0.052, 0.012, 2, 0.006), [M.steel, M.steel, M.steel, M.steel, M.plate, M.steel], J.head, 0, 0.176, 0.118);
    plate.rotation.x = -0.1;
    [-1, 1].forEach((s) => {
        const tail = mesh(new THREE.BoxGeometry(0.032, 0.22, 0.006), M.band, J.head, s * 0.03, 0.08, -0.13);
        tail.rotation.set(0.4, 0, s * 0.3);
    });
    // Cheveux : calotte et grandes mèches pointues, style anime.
    const hairRandom = (() => { let x = 11; return () => { x = (x * 16807) % 2147483647; return x / 2147483647; }; })();
    mesh(new THREE.SphereGeometry(0.131, 24, 16, 0, Math.PI * 2, 0, Math.PI * 0.52), M.hair, J.head, 0, 0.125, -0.012).scale.set(0.95, 0.95, 1.02);
    // Arrière de la tête : les cheveux descendent jusqu'à la nuque.
    mesh(new THREE.SphereGeometry(0.133, 24, 18, Math.PI * 1.05, Math.PI * 0.9, 0.3, 2.2), M.hair, J.head, 0, 0.1, -0.008).scale.set(0.95, 1.02, 1.02);
    const spike = (base, dir, length, radius) => {
        const cone = mesh(new THREE.ConeGeometry(radius, length, 5), M.hair, J.head);
        cone.scale.z = 0.55;
        cone.quaternion.setFromUnitVectors(Y, dir.clone().normalize());
        cone.position.copy(base).addScaledVector(dir.clone().normalize(), length * 0.42);
    };
    for (let k = 0; k < 20; k++) {
        const a = Math.PI * 0.18 + (k / 19) * Math.PI * 1.64; // de l'arrière gauche à l'arrière droit
        const base = new THREE.Vector3(Math.sin(a + Math.PI) * 0.1, 0.19 + hairRandom() * 0.04, Math.cos(a + Math.PI) * 0.1 - 0.02);
        const dir = new THREE.Vector3(base.x * 2.2, 0.55 + hairRandom() * 0.5, base.z * 2 - 0.55);
        spike(base, dir, 0.16 + hairRandom() * 0.1, 0.05 + hairRandom() * 0.015);
    }
    // Mèches du dessus et du devant (au-dessus du bandeau, sur les tempes).
    [[0, 0.24, 0.02, 0.1, 1, -0.45], [0.06, 0.23, 0.05, 0.6, 0.8, 0.1], [-0.06, 0.23, 0.05, -0.6, 0.8, 0.1], [0.1, 0.16, 0.07, 0.35, -0.9, 0.3], [-0.1, 0.16, 0.07, -0.35, -0.9, 0.3]].forEach(([x, y, z, dx, dy, dz], i) => {
        spike(new THREE.Vector3(x, y, z), new THREE.Vector3(dx, dy, dz), i < 3 ? 0.17 : 0.12, 0.045);
    });

    /* ---------------- Bras ---------------- */
    ['L', 'R'].forEach((side, i) => {
        const s = i === 0 ? -1 : 1;
        const shoulder = J['shoulder' + side] = joint(J.spine, s * 0.25, 0.47, 0);
        const pad = mesh(new THREE.SphereGeometry(0.078, 16, 12), M.vestDark, shoulder);
        pad.scale.set(1, 0.8, 0.95);
        const sw = mesh(new THREE.CircleGeometry(0.042, 24), M.swirl, shoulder, s * 0.075, -0.005, 0);
        sw.rotation.y = s * Math.PI / 2;
        sw.userData.noOutline = true;
        capsule(0.056, 0.26, M.cloth, shoulder);
        const elbow = J['elbow' + side] = joint(shoulder, 0, -0.33, 0);
        capsule(0.05, 0.24, M.cloth, elbow);
        // Protège-avant-bras.
        const guard = mesh(new THREE.CylinderGeometry(0.056, 0.05, 0.16, 14), M.guard, elbow, 0, -0.2, 0);
        guard.scale.z = 0.9;
        mesh(new THREE.BoxGeometry(0.05, 0.12, 0.012), M.steel, elbow, 0, -0.2, 0.052);
        const hand = J['hand' + side] = joint(elbow, 0, -0.32, 0);
        mesh(new RoundedBoxGeometry(0.075, 0.075, 0.04, 2, 0.016), M.glove, hand, 0, -0.02, 0);
        mesh(new RoundedBoxGeometry(0.07, 0.055, 0.036, 2, 0.015), M.skin, hand, 0, -0.075, 0.002);
        mesh(new THREE.CapsuleGeometry(0.015, 0.03, 4, 8), M.skin, hand, -s * 0.043, -0.035, 0.02).rotation.z = s * 0.6;
    });

    /* ---------------- Sabre (dans le fourreau, sur le dos) ---------------- */
    const katana = new THREE.Group();
    mesh(new THREE.BoxGeometry(0.028, 0.78, 0.005), M.steel, katana, 0, 0.5, 0);
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
    addOutlines(root);
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
