/*
 * Hoko adulte, jōnin de Konoha, pour le rêve (vu à la troisième personne).
 * Personnage stylisé, fait de formes simples, avec des articulations nommées
 * que l'on anime en passant d'une pose à l'autre.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/RoundedBoxGeometry.js';
import { faceTexture } from './head.js';

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

function canvasTex(w, h, draw) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

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

// Gilet tactique : toile gris-vert, coutures et cannelures des poches.
const vestTexture = () => canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = 'rgba(60,80,70,.28)';
    ctx.lineWidth = 2;
    for (let x = 16; x < w; x += 32) {
        ctx.setLineDash([5, 4]);
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, h);
        ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(40,60,50,.12)';
    for (let i = 0; i < 400; i++) {
        const x = Math.random() * w;
        const y = Math.random() * h;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + 3, y + 1);
        ctx.stroke();
    }
});

// Poche à rouleaux cannelée (bandes horizontales).
const pocketTexture = () => canvasTex(64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(40,60,50,.35)';
    for (let y = 10; y < h; y += 16) ctx.fillRect(4, y, w - 8, 4);
    ctx.strokeStyle = 'rgba(40,60,50,.5)';
    ctx.lineWidth = 3;
    ctx.strokeRect(2, 2, w - 4, h - 4);
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

// `sculpt` : la tête et la chevelure sculptées (voir head.js / loadHead).
export function buildNinja(sculpt) {
    // Ombrage lisse : tissus avec un léger lustre (sheen), peau satinée.
    const mat = (color, roughness = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
    const cloth = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.88, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4), ...extra });
    const skin = (map = null) => new THREE.MeshPhysicalMaterial({ color: map ? '#ffffff' : '#f3caa9', map, roughness: 0.55, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffb89a') });
    const bandTex = bandageTexture();
    bandTex.wrapS = bandTex.wrapT = THREE.RepeatWrapping;
    bandTex.repeat.set(3, 3);
    const M = {
        skin: skin(),
        head: skin(faceTexture()),
        cloth: cloth('#262e58'),
        clothDark: cloth('#1a2044'),
        vest: cloth('#879471', { map: vestTexture() }),
        vestDark: cloth('#6f7b5c'),
        vestInner: cloth('#6f7b5c', { side: THREE.DoubleSide }),
        pocket: cloth('#8a9774', { map: pocketTexture() }),
        wrist: cloth('#161a30'),
        swirl: mat('#ffffff', 0.8, { map: swirlTexture() }),
        hair: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }),
        band: cloth('#1c2350', { side: THREE.DoubleSide }),
        plate: new THREE.MeshStandardMaterial({ map: plateTexture(), metalness: 0.85, roughness: 0.28 }),
        bandage: cloth('#ffffff', { map: bandTex }),
        sandal: mat('#20264a', 0.6),
        leather: mat('#7a4d2a', 0.55),
        gold: new THREE.MeshStandardMaterial({ color: '#e0b34a', metalness: 1, roughness: 0.3 }),
        black: new THREE.MeshStandardMaterial({ color: '#0d0c0c', roughness: 0.25, metalness: 0.2 }),
        steel: new THREE.MeshStandardMaterial({ color: '#dfe6ec', metalness: 1, roughness: 0.15 })
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

    /* ---------------- Bassin et bourse ---------------- */
    J.hips = joint(root, 0, 0.98, 0);
    mesh(new THREE.CapsuleGeometry(0.15, 0.08, 8, 24), M.cloth, J.hips, 0, 0.03, 0).scale.set(1.15, 1, 0.8);
    const pouch = joint(J.hips, 0.2, 0.03, -0.06);
    mesh(new THREE.SphereGeometry(0.07, 24, 18), M.leather, pouch).scale.set(1, 1.15, 0.85);
    mesh(new THREE.TorusGeometry(0.033, 0.008, 8, 18), M.gold, pouch, 0, 0.07, 0).rotation.x = Math.PI / 2;

    /* ---------------- Jambes : pantalon droit, bandes, sandales ---------------- */
    ['L', 'R'].forEach((side, i) => {
        const s = i === 0 ? -1 : 1;
        const hip = J['hip' + side] = joint(J.hips, s * 0.1, -0.03, 0);
        capsule(0.088, 0.33, M.cloth, hip);
        if (s > 0) {
            // Étui à kunai sur la cuisse droite, tenu par deux bandes blanches.
            [-0.2, -0.27].forEach((y) => mesh(new THREE.CylinderGeometry(0.091, 0.091, 0.028, 28), M.bandage, hip, 0, y, 0));
            const holster = mesh(new RoundedBoxGeometry(0.075, 0.14, 0.05, 3, 0.012), M.clothDark, hip, 0.075, -0.25, 0.02);
            holster.rotation.y = 0.6;
            mesh(new RoundedBoxGeometry(0.03, 0.05, 0.02, 2, 0.008), M.black, hip, 0.09, -0.16, 0.035).rotation.y = 0.6;
        }
        const knee = J['knee' + side] = joint(hip, 0, -0.44, 0);
        // Jambe de pantalon ample jusqu'à mi-mollet, puis bandes jusqu'à la cheville.
        mesh(new THREE.CylinderGeometry(0.08, 0.076, 0.25, 28), M.cloth, knee, 0, -0.09, 0);
        mesh(new THREE.SphereGeometry(0.08, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.cloth, knee, 0, 0.035, 0);
        const cuff = mesh(new THREE.TorusGeometry(0.074, 0.012, 10, 28), M.cloth, knee, 0, -0.215, 0);
        cuff.rotation.x = Math.PI / 2;
        mesh(new THREE.CylinderGeometry(0.06, 0.05, 0.19, 24), M.bandage, knee, 0, -0.31, 0);
        const foot = J['foot' + side] = joint(knee, 0, -0.44, 0);
        // Sandale de ninja : semelle, talon montant, sangles, orteils nus.
        mesh(new RoundedBoxGeometry(0.105, 0.028, 0.27, 3, 0.012), M.sandal, foot, 0, -0.04, 0.05);
        mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.1, 24, 1, true, Math.PI * 0.55, Math.PI * 0.9), M.sandal, foot, 0, 0.02, -0.005).material.side = THREE.DoubleSide;
        mesh(new RoundedBoxGeometry(0.1, 0.05, 0.14, 3, 0.022), M.skin, foot, 0, -0.005, 0.03);
        mesh(new RoundedBoxGeometry(0.108, 0.022, 0.06, 2, 0.01), M.sandal, foot, 0, 0.012, 0.06);
        mesh(new RoundedBoxGeometry(0.09, 0.03, 0.07, 3, 0.013), M.skin, foot, 0, -0.012, 0.145);
    });

    /* ---------------- Buste : gilet tactique de jōnin ---------------- */
    J.spine = joint(J.hips, 0, 0.12, 0);
    // Torse (maillot bleu nuit), taille fine, épaules larges.
    const torsoProfile = [[0, 0], [0.13, 0.0], [0.135, 0.12], [0.15, 0.3], [0.165, 0.42], [0.15, 0.5], [0.09, 0.56], [0, 0.57]].map(([r, y]) => new THREE.Vector2(r, y));
    const shirt = mesh(new THREE.LatheGeometry(torsoProfile, 40), M.cloth, J.spine, 0, 0.02, 0);
    shirt.scale.set(1.2, 1, 0.78);
    // Gilet vert olive rembourré, qui descend sur les hanches.
    const vestProfile = [[0.15, -0.02], [0.162, 0.0], [0.162, 0.2], [0.178, 0.34], [0.188, 0.44], [0.172, 0.52], [0.115, 0.56]].map(([r, y]) => new THREE.Vector2(r, y));
    const vest = mesh(new THREE.LatheGeometry(vestProfile, 48), M.vest, J.spine, 0, 0.02, 0);
    vest.scale.set(1.26, 1, 0.9);
    const hem = mesh(new THREE.TorusGeometry(0.158, 0.016, 12, 48), M.vestDark, J.spine, 0, 0.0, 0);
    hem.rotation.x = Math.PI / 2;
    hem.scale.set(1.26, 0.9, 1);
    // Col montant, épais, ouvert devant.
    const gap = 0.46;
    mesh(new THREE.CylinderGeometry(0.114, 0.098, 0.07, 48, 1, true, gap, Math.PI * 2 - gap * 2), M.vestInner, J.spine, 0, 0.59, -0.012).scale.set(1.12, 1, 1.05);
    mesh(new THREE.CylinderGeometry(0.128, 0.112, 0.07, 48, 1, true, gap, Math.PI * 2 - gap * 2), M.vest, J.spine, 0, 0.59, -0.012).scale.set(1.12, 1, 1.05);
    const rimPts = [];
    for (let k = 0; k <= 32; k++) {
        const t = gap + (k / 32) * (Math.PI * 2 - gap * 2);
        rimPts.push(new THREE.Vector3(Math.sin(t) * 0.121 * 1.12, 0.625, Math.cos(t) * 0.121 * 1.05 - 0.012));
    }
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rimPts), 64, 0.009, 8, false), M.vestDark, J.spine);
    // Fermeture éclair.
    mesh(new THREE.BoxGeometry(0.01, 0.5, 0.012), M.vestDark, J.spine, 0, 0.3, 0.162);
    // Quatre poches à rouleaux sur la poitrine, avec leur rabat.
    [-1, 1].forEach((sx) => {
        [0.052, 0.118].forEach((dx) => {
            const a = sx * dx * 1.7;
            const p = mesh(new RoundedBoxGeometry(0.056, 0.11, 0.036, 3, 0.012), M.pocket, J.spine, sx * dx, 0.29, 0.158 - dx * 0.2);
            p.rotation.y = a;
            const f = mesh(new RoundedBoxGeometry(0.062, 0.028, 0.042, 3, 0.01), M.vestDark, J.spine, sx * dx, 0.355, 0.16 - dx * 0.2);
            f.rotation.y = a;
        });
        // Épaulettes du gilet, boutonnées.
        const strap = mesh(new RoundedBoxGeometry(0.075, 0.03, 0.14, 3, 0.012), M.vest, J.spine, sx * 0.16, 0.545, 0);
        strap.rotation.z = -sx * 0.35;
        mesh(new THREE.SphereGeometry(0.009, 12, 8), M.vestDark, J.spine, sx * 0.19, 0.545, 0.05);
    });
    // Sacoche au bas du dos.
    mesh(new RoundedBoxGeometry(0.17, 0.08, 0.07, 3, 0.025), M.vestDark, J.hips, 0, 0.07, -0.16);
    // Grand tourbillon rouge dans le dos.
    const backSwirl = mesh(new THREE.CircleGeometry(0.085, 40), M.swirl, J.spine, 0, 0.36, -0.172);
    backSwirl.rotation.y = Math.PI;
    // Fourreau du sabre, en travers du dos.
    const back = joint(J.spine, 0, 0.3, -0.18);
    back.rotation.z = 0.75;
    mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.8, 16), M.black, back);

    /* ---------------- Tête (sculptée d'un bloc) et chevelure ---------------- */
    J.neck = joint(J.spine, 0, 0.6, 0);
    J.head = joint(J.neck, 0, 0.05, 0.006);
    J.head.scale.setScalar(1.06);
    mesh(sculpt.head, M.head, J.head, 0, 0.11, 0);
    mesh(sculpt.hair, M.hair, J.head, 0, 0.11, 0);
    mesh(sculpt.band, M.band, J.head, 0, 0.11, 0);
    const plate = mesh(new RoundedBoxGeometry(0.13, 0.05, 0.012, 3, 0.006), [M.steel, M.steel, M.steel, M.steel, M.plate, M.steel], J.head, 0, 0.11 + sculpt.plate.y, sculpt.plate.z);
    plate.rotation.x = -0.12;
    // Nœud et pans du bandeau, derrière la tête.
    mesh(new THREE.SphereGeometry(0.016, 16, 12), M.band, J.head, 0, 0.11 + sculpt.plate.y, -sculpt.back - 0.008);
    const tails = [-1, 1].map((s) => {
        // Pivot au nœud : le pan flotte au vent.
        const pivot = joint(J.head, s * 0.02, 0.11 + sculpt.plate.y, -sculpt.back - 0.015);
        const tail = mesh(new RoundedBoxGeometry(0.03, 0.2, 0.006, 2, 0.003), M.band, pivot, 0, -0.095, 0);
        tail.rotation.set(0, 0, 0);
        pivot.rotation.set(0.35, 0, s * 0.28);
        return { pivot, s };
    });

    /* ---------------- Bras : manches longues, bracelets, mains nues ---------------- */
    ['L', 'R'].forEach((side, i) => {
        const s = i === 0 ? -1 : 1;
        const shoulder = J['shoulder' + side] = joint(J.spine, s * 0.25, 0.47, 0);
        mesh(new THREE.SphereGeometry(0.072, 28, 20), M.cloth, shoulder).scale.set(1, 0.95, 0.95);
        const sw = mesh(new THREE.CircleGeometry(0.034, 32), M.swirl, shoulder, s * 0.066, -0.09, 0);
        sw.rotation.y = s * Math.PI / 2;
        capsule(0.064, 0.25, M.cloth, shoulder);
        const elbow = J['elbow' + side] = joint(shoulder, 0, -0.33, 0);
        capsule(0.056, 0.23, M.cloth, elbow);
        mesh(new THREE.CylinderGeometry(0.047, 0.045, 0.05, 24), M.wrist, elbow, 0, -0.275, 0);
        const hand = J['hand' + side] = joint(elbow, 0, -0.32, 0);
        mesh(new THREE.CylinderGeometry(0.034, 0.036, 0.04, 20), M.skin, hand, 0, 0.03, 0);
        const palm = mesh(new RoundedBoxGeometry(0.072, 0.078, 0.032, 4, 0.014), M.skin, hand, 0, -0.025, 0);
        palm.scale.x = 0.95;
        [-0.024, -0.008, 0.008, 0.024].forEach((fx, k) => {
            const len = 0.05 - Math.abs(k - 1.5) * 0.007;
            const f = mesh(new THREE.CapsuleGeometry(0.0082, len, 6, 12), M.skin, hand, fx, -0.075 - len / 2, 0.004);
            f.rotation.x = 0.3;
        });
        mesh(new THREE.CapsuleGeometry(0.011, 0.034, 6, 12), M.skin, hand, -s * 0.04, -0.035, 0.018).rotation.z = s * 0.6;
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
    root.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });

    // Vie : clignements, respiration, regard qui flâne, pans du bandeau au vent.
    const faceOpen = M.head.map;
    const faceClosed = faceTexture(true);
    let nextBlink = 1.5;
    function live(time) {
        const blinking = time > nextBlink && time < nextBlink + 0.13;
        const map = blinking ? faceClosed : faceOpen;
        if (M.head.map !== map) M.head.map = map;
        if (time > nextBlink + 0.13) nextBlink = time + 2.2 + ((Math.sin(time * 12.9898) * 43758.5453) % 1 + 1) % 1 * 3;
        J.neck.rotation.set(Math.sin(time * 0.6) * 0.025, Math.sin(time * 0.37) * 0.09, Math.sin(time * 0.29) * 0.02);
        const chest = 1 + Math.sin(time * 1.8) * 0.012;
        J.spine.scale.set(1, 1, chest);
        tails.forEach(({ pivot, s }, i) => {
            pivot.rotation.x = 0.45 + Math.sin(time * 3.1 + i) * 0.12 + Math.sin(time * 7.3 + i * 2) * 0.04;
            pivot.rotation.z = s * (0.28 + Math.sin(time * 2.3 + i) * 0.08);
        });
    }

    return {
        root, J, M, katana, pouch, plate, live,
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
