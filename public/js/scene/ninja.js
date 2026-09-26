/*
 * Hoko adulte, jōnin de Konoha, pour le rêve (vu à la troisième personne).
 * Personnage stylisé, fait de formes simples, avec des articulations nommées
 * que l'on anime en passant d'une pose à l'autre.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/RoundedBoxGeometry.js';
import { faceTexture } from './head.js';
import { bindAvatar, measureAvatar } from './avatar.js';

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

// Chevelure au vent : les pointes (loin du crâne) ondulent, les racines restent en place.
const hairWind = { value: 0 };
function windyHair() {
    const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 });
    m.onBeforeCompile = (shader) => {
        shader.uniforms.uWind = hairWind;
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nuniform float uWind;')
            .replace('#include <begin_vertex>', `#include <begin_vertex>
                float reach = smoothstep(0.11, 0.2, length(position - vec3(0.0, 0.036, -0.016)));
                transformed.x += sin(uWind * 2.3 + position.y * 40.0) * 0.006 * reach;
                transformed.z += (sin(uWind * 1.7 + position.x * 35.0) * 0.5 + 0.5) * -0.008 * reach;
                transformed.y += sin(uWind * 2.9 + position.z * 30.0) * 0.003 * reach;`);
    };
    return m;
}

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

// Bandeau frontal ajusté à la tête du modèle anime : on mesure le visage dans
// le repère de l'os de la tête, puis on pose le bandeau, la plaque et les pans.
function fitHeadband(avatar, M, tails) {
    const head = avatar.head;
    const box = new THREE.Box3();
    const eyes = new THREE.Vector3();
    const v = new THREE.Vector3();
    let n = 0;
    avatar.model.updateMatrixWorld(true);
    avatar.model.traverse((o) => {
        if (!o.isSkinnedMesh) return;
        const name = o.material.name || '';
        const skin = /Face_00_SKIN/.test(name);
        const iris = /EyeIris/.test(name);
        if (!skin && !iris) return;
        const pos = o.geometry.attributes.position;
        for (let i = 0; i < pos.count; i += 2) {
            o.getVertexPosition(i, v);
            o.localToWorld(v);
            head.worldToLocal(v);
            if (skin) box.expandByPoint(v);
            else {
                eyes.add(v);
                n++;
            }
        }
    });
    if (!n) return;
    eyes.divideScalar(n);
    const c = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const forward = Math.sign(eyes.z - c.z) || 1;
    const y = eyes.y + (box.max.y - eyes.y) * 0.4;
    const rx = size.x * 0.43;
    const rz = size.z * 0.47;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, size.y * 0.16, 64, 1, true), M.band);
    band.scale.set(rx, 1, rz);
    band.position.set(c.x, y, c.z);
    head.add(band);
    const k = 1 / head.getWorldScale(v).x;
    const plate = new THREE.Mesh(new RoundedBoxGeometry(0.13 * k, 0.05 * k, 0.012 * k, 3, 0.006 * k), [M.steel, M.steel, M.steel, M.steel, M.plate, M.steel]);
    // La plaque passe devant la frange.
    plate.position.set(c.x, y + size.y * 0.03, c.z + forward * (rz + 0.022 * k));
    if (forward < 0) plate.rotation.y = Math.PI;
    plate.castShadow = true;
    head.add(plate);
    const knot = new THREE.Mesh(new THREE.SphereGeometry(0.016 * k, 16, 12), M.band);
    knot.position.set(c.x, y, c.z - forward * rz);
    head.add(knot);
    tails.forEach(({ pivot, s }) => {
        const tail = pivot.children[0];
        const mine = new THREE.Group();
        mine.position.set(c.x + s * 0.02 * k, y, c.z - forward * (rz + 0.01 * k));
        const m = tail.clone();
        m.visible = true;
        m.scale.setScalar(k);
        m.position.multiplyScalar(k);
        mine.add(m);
        head.add(mine);
        pivot.userData.follow = mine;
    });
}

// Col montant du gilet et grand tourbillon rouge dans le dos, attachés au buste
// du modèle (repère de l'os : +z local = dos, le modèle étant retourné).
function dressAvatar(avatar, M) {
    const chest = avatar.bone('J_Bip_C_UpperChest');
    const neck = avatar.bone('J_Bip_C_Neck');
    if (!chest || !neck) return;
    const n = neck.position;
    const gap = 0.55;
    const collar = new THREE.Group();
    collar.position.set(0, n.y * 0.72, n.z);
    chest.add(collar);
    const outer = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.085, 0.075, 48, 1, true, Math.PI + gap, Math.PI * 2 - gap * 2), M.vest);
    const inner = new THREE.Mesh(new THREE.CylinderGeometry(0.088, 0.078, 0.075, 48, 1, true, Math.PI + gap, Math.PI * 2 - gap * 2), M.vestInner);
    outer.scale.set(1.05, 1, 0.95);
    inner.scale.set(1.05, 1, 0.95);
    collar.add(outer, inner);
    const rim = [];
    for (let k = 0; k <= 32; k++) {
        const t = Math.PI + gap + (k / 32) * (Math.PI * 2 - gap * 2);
        rim.push(new THREE.Vector3(Math.sin(t) * 0.0915 * 1.05, 0.0375, Math.cos(t) * 0.0915 * 0.95));
    }
    collar.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(rim), 64, 0.006, 8, false), M.vestDark));
    collar.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    const swirl = new THREE.Mesh(new THREE.CircleGeometry(0.07, 48), M.swirl);
    swirl.position.set(0, -0.06, 0.138);
    chest.add(swirl);
}

// `sculpt` : la tête sculptée (repli) ; `avatarGltf` : le modèle anime chargé (voir avatar.js).
export function buildNinja(sculpt, avatarGltf = null) {
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
        hair: windyHair(),
        band: cloth('#1c2350', { side: THREE.DoubleSide }),
        plate: new THREE.MeshStandardMaterial({ map: plateTexture(), metalness: 0.85, roughness: 0.28 }),
        bandage: cloth('#ffffff', { map: bandTex }),
        sandal: mat('#20264a', 0.6),
        leather: mat('#7a4d2a', 0.55),
        gold: new THREE.MeshStandardMaterial({ color: '#e0b34a', metalness: 1, roughness: 0.3 }),
        black: new THREE.MeshStandardMaterial({ color: '#0d0c0c', roughness: 0.25, metalness: 0.2 }),
        steel: new THREE.MeshStandardMaterial({ color: '#e8eef3', metalness: 0.75, roughness: 0.22, emissive: '#6d7680', emissiveIntensity: 0.35 })
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
    back.rotation.z = -0.75;
    mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.8, 16), M.black, back);

    /* ---------------- Tête (sculptée d'un bloc) et chevelure ---------------- */
    J.neck = joint(J.spine, 0, 0.6, 0);
    J.head = joint(J.neck, 0, 0.032, 0.008);
    J.head.scale.setScalar(1.12);
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
        // Doigts en deux phalanges, légèrement repliés vers la paume : main détendue.
        [-0.024, -0.008, 0.008, 0.024].forEach((fx, k) => {
            const len = 0.052 - Math.abs(k - 1.5) * 0.007;
            const knuckle = joint(hand, fx, -0.06, 0.003);
            knuckle.rotation.set(-0.3 - k * 0.05, 0, (k - 1.5) * 0.04);
            capsule(0.0086, len * 0.5, M.skin, knuckle);
            const tip = joint(knuckle, 0, -len * 0.5 - 0.009, 0);
            tip.rotation.x = -0.55 - k * 0.08;
            capsule(0.0078, len * 0.42, M.skin, tip);
        });
        const thumb = joint(hand, -s * 0.034, -0.02, 0.014);
        thumb.rotation.set(-0.5, 0, s * 0.55);
        capsule(0.0105, 0.022, M.skin, thumb);
        const thumbTip = joint(thumb, 0, -0.03, 0);
        thumbTip.rotation.x = -0.35;
        capsule(0.0095, 0.018, M.skin, thumbTip);
    });

    /* ---------------- Sabre (dans le fourreau, sur le dos) ---------------- */
    const katana = new THREE.Group();
    mesh(new THREE.BoxGeometry(0.03, 0.78, 0.005), M.steel, katana, 0, 0.5, 0);
    // Fil de la lame : un liseré lumineux, lisible sous toutes les lumières.
    const edge = new THREE.Mesh(new THREE.BoxGeometry(0.005, 0.76, 0.007), new THREE.MeshBasicMaterial({ color: '#eef8ff' }));
    edge.position.set(0.015, 0.5, 0);
    katana.add(edge);
    mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.01, 18), M.gold, katana, 0, 0.105, 0);
    mesh(new THREE.CylinderGeometry(0.017, 0.018, 0.22, 10), M.black, katana, 0, 0, 0);
    back.add(katana);
    // Rengainé : lame dans le fourreau (pointe en bas), poignée qui dépasse
    // au-dessus de l'épaule de la main qui dégaine.
    katana.position.set(0, 0.515, 0);
    katana.rotation.z = Math.PI;
    katana.userData.sheathed = { parent: back, position: katana.position.clone(), quaternion: katana.quaternion.clone() };

    // Poses : angles (en radians) des articulations.
    const POSES = {
        stand: { spine: [0, 0, 0], head: [0, 0, 0], shoulderL: [0.05, 0, -0.18], shoulderR: [0.05, 0, 0.18], elbowL: [-0.2, 0, 0], elbowR: [-0.2, 0, 0], hipL: [0, 0, 0.04], hipR: [0, 0, -0.04], kneeL: [0.05, 0, 0], kneeR: [0.05, 0, 0] },
        crossed: { spine: [0, 0, 0], head: [0.05, 0, 0], shoulderL: [-0.42, 0.95, -0.12], shoulderR: [-0.3, -0.95, 0.12], elbowL: [-1.3, 0, 0], elbowR: [-1.42, 0, 0], hipL: [0, 0, 0.1], hipR: [0, 0, -0.1] },
        draw: { spine: [0.05, 0.4, 0], head: [0, -0.3, 0], shoulderR: [-2.6, 0, 0.35], elbowR: [-0.9, 0, 0], shoulderL: [-0.3, 0, -0.3], elbowL: [-0.6, 0, 0], hipL: [-0.3, 0, 0.12], kneeL: [0.5, 0, 0], hipR: [0.25, 0, -0.1], kneeR: [0.2, 0, 0] },
        // Grands coups : armé (wind) puis frappe ample (strike), jambes en fente.
        windA: { spine: [0, 0.6, 0], head: [0, -0.4, 0], shoulderR: [-2.9, 0, 0.45], elbowR: [-1.0, 0, 0], shoulderL: [-0.5, 0, -0.9], elbowL: [-0.5, 0, 0], hipL: [-0.35, 0, 0.15], kneeL: [0.45, 0, 0], hipR: [0.3, 0, -0.12], kneeR: [0.2, 0, 0] },
        strikeA: { spine: [0.35, -0.75, 0], head: [0, 0.5, 0], shoulderR: [-0.75, 0, -0.65], elbowR: [-0.1, 0, 0], shoulderL: [-0.3, 0, -1.2], elbowL: [-0.4, 0, 0], hipL: [-0.7, 0, 0.18], kneeL: [0.9, 0, 0], hipR: [0.5, 0, -0.18], kneeR: [0.35, 0, 0] },
        windB: { spine: [0.05, 0.95, 0], head: [0, -0.6, 0], shoulderR: [-1.35, 0, 1.35], elbowR: [-0.5, 1.5, 0], shoulderL: [-1.2, 0, -0.4], elbowL: [-0.9, 0, 0], hipL: [-0.4, 0, 0.18], kneeL: [0.55, 0, 0], hipR: [0.35, 0, -0.18], kneeR: [0.3, 0, 0] },
        strikeB: { spine: [0.15, -0.95, 0], head: [0, 0.6, 0], shoulderR: [-1.45, 0, -0.85], elbowR: [-0.05, 1.5, 0], shoulderL: [-0.2, 0, -1.3], elbowL: [-0.3, 0, 0], hipL: [-0.6, 0, 0.2], kneeL: [0.8, 0, 0], hipR: [0.45, 0, -0.2], kneeR: [0.3, 0, 0] },
        windC: { spine: [0.3, 0.75, 0], head: [0.1, -0.5, 0], shoulderR: [0.35, 0, 0.7], elbowR: [-0.2, 1.5, 0], shoulderL: [-1.1, 0, -0.5], elbowL: [-0.8, 0, 0], hipL: [-0.75, 0, 0.15], kneeL: [1.05, 0, 0], hipR: [0.5, 0, -0.15], kneeR: [0.4, 0, 0] },
        strikeC: { spine: [-0.12, -0.7, 0], head: [-0.25, 0.45, 0], shoulderR: [-2.6, 0, -0.45], elbowR: [-0.1, 1.5, 0], shoulderL: [-0.3, 0, -1.25], elbowL: [-0.4, 0, 0], hipL: [-0.3, 0, 0.15], kneeL: [0.35, 0, 0], hipR: [0.25, 0, -0.15], kneeR: [0.15, 0, 0] },
        slashA: { spine: [0.15, -0.55, 0], head: [0, 0.35, 0], shoulderR: [-1.3, 0, 1.2], elbowR: [-0.15, 0, 0], shoulderL: [-0.2, 0, -0.5], elbowL: [-0.4, 0, 0], hipL: [-0.45, 0, 0.15], kneeL: [0.6, 0, 0], hipR: [0.35, 0, -0.15], kneeR: [0.25, 0, 0] },
        slashB: { spine: [0.1, 0.5, 0], head: [0, -0.3, 0], shoulderR: [-1.5, 0, -0.5], elbowR: [-0.2, 0, 0], shoulderL: [-0.3, 0, -0.9], elbowL: [-0.3, 0, 0], hipL: [-0.45, 0, 0.15], kneeL: [0.6, 0, 0], hipR: [0.35, 0, -0.15], kneeR: [0.25, 0, 0] },
        slashC: { spine: [0.35, 0, 0], head: [-0.2, 0, 0], shoulderR: [-0.4, 0, 0.1], elbowR: [-0.1, 0, 0], shoulderL: [-0.2, 0, -0.35], elbowL: [-0.5, 0, 0], hipL: [-0.6, 0, 0.1], kneeL: [0.9, 0, 0], hipR: [0.5, 0, -0.1], kneeR: [0.4, 0, 0] },
        seal: { spine: [0.05, 0, 0], head: [0.1, 0, 0], shoulderL: [-0.9, 0.5, -0.2], shoulderR: [-0.9, -0.5, 0.2], elbowL: [-1.35, 0.3, 0], elbowR: [-1.35, -0.3, 0], hipL: [-0.1, 0, 0.18], kneeL: [0.2, 0, 0], hipR: [0.1, 0, -0.18], kneeR: [0.2, 0, 0] },
        release: { spine: [0.1, -0.3, 0], head: [0, 0.2, 0], shoulderR: [-1.55, 0, 0.05], elbowR: [-0.05, 0, 0], shoulderL: [-1.4, 0, -0.25], elbowL: [-0.15, 0, 0], hipL: [-0.4, 0, 0.15], kneeL: [0.5, 0, 0], hipR: [0.3, 0, -0.15], kneeR: [0.2, 0, 0] },
        catch: { spine: [-0.1, 0, 0], head: [-0.35, 0, 0], shoulderL: [-2.6, 0, -0.35], shoulderR: [-2.6, 0, 0.35], elbowL: [-0.35, 0, 0], elbowR: [-0.35, 0, 0], hipL: [0, 0, 0.12], hipR: [0, 0, -0.12], kneeL: [0.1, 0, 0], kneeR: [0.1, 0, 0] },
        pocket: { spine: [0.05, -0.15, 0], head: [0.3, -0.25, 0], shoulderR: [0.2, 0, 0.35], elbowR: [-0.9, 0.3, 0], shoulderL: [-0.4, 0, -0.2], elbowL: [-1.2, 0, 0], hipL: [0, 0, 0.08], hipR: [0, 0, -0.08] },
        fall: { spine: [0.25, 0, 0], head: [-0.2, 0, 0], shoulderL: [-0.6, 0, -1.1], shoulderR: [-0.6, 0, 1.1], elbowL: [-0.5, 0, 0], elbowR: [-0.5, 0, 0], hipL: [-1.1, 0, 0.1], kneeL: [1.7, 0, 0], hipR: [-0.5, 0, -0.1], kneeR: [1.3, 0, 0] },
        land: { spine: [0.45, 0, 0], head: [-0.4, 0, 0], hipL: [-1.4, 0, 0.15], kneeL: [1.95, 0, 0], hipR: [-0.15, 0, -0.12], kneeR: [1.4, 0, 0], shoulderR: [-0.55, 0, 0.3], elbowR: [-0.25, 0, 0], shoulderL: [0.55, 0, -0.55], elbowL: [-0.4, 0, 0] },
        // Poing levé vers le mont des Hokage (au loin, derrière lui).
        vow: { spine: [-0.05, 0, 0], head: [-0.15, 0, 0], shoulderR: [-2.9, 0, 0.15], elbowR: [-0.2, 0, 0], shoulderL: [0.05, 0, -0.2], elbowL: [-0.3, 0, 0], hipL: [0, 0, 0.1], hipR: [0, 0, -0.1] },
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

    /* ---------------- Le modèle anime, habillé en jōnin ---------------- */
    // Le squelette d'animation prend les proportions du modèle ; l'équipement suit.
    function fitToAvatar(m) {
        if (!m.hips || !m.neck) return;
        const oldFoot = J.footL.getWorldPosition(new THREE.Vector3()).y;
        J.hips.position.set(0, m.hips.y, m.hips.z);
        J.spine.position.set(0, m.spine.y - m.hips.y, m.spine.z - m.hips.z);
        J.neck.position.set(0, m.neck.y - m.spine.y, m.neck.z - m.spine.z);
        J.head.position.set(0, m.head.y - m.neck.y, m.head.z - m.neck.z);
        [['L', -1], ['R', 1]].forEach(([side, s]) => {
            J['shoulder' + side].position.set(s * m.arm.x, m.arm.y - m.spine.y, m.arm.z - m.spine.z);
            J['elbow' + side].position.set(0, -m.arm.distanceTo(m.elbow), 0);
            J['hand' + side].position.set(0, -m.elbow.distanceTo(m.hand), 0);
            J['hip' + side].position.set(s * m.leg.x, m.leg.y - m.hips.y, m.leg.z - m.hips.z);
            J['knee' + side].position.set(0, -m.leg.distanceTo(m.knee), 0);
            J['foot' + side].position.set(0, -m.knee.distanceTo(m.foot), 0);
        });
        root.updateMatrixWorld(true);
        // Sandales au sol, bandes au bas du mollet.
        const drop = J.footL.getWorldPosition(new THREE.Vector3()).y - oldFoot;
        ['L', 'R'].forEach((side) => {
            J['foot' + side].children.forEach((o) => { if (o.isMesh) o.position.y -= drop; });
            J['knee' + side].children.forEach((o) => { if (o.isMesh && o.material === M.bandage) o.position.y = J['foot' + side].position.y + 0.1; });
        });
        // Gilet (et sabre dans le dos) : recalé sur le buste du modèle.
        const vest = new THREE.Group();
        J.spine.add(vest);
        [...J.spine.children].forEach((o) => { if (o !== vest && !Object.values(J).includes(o)) vest.attach(o); });
        // Du bas du sweat (hanches) jusqu'au cou.
        const bottom = m.hips.y - 0.1 - m.spine.y;
        const top = m.neck.y + 0.012 - m.spine.y;
        vest.scale.set(1.08, (top - bottom) / 0.625, 1.02);
        vest.position.set(0, bottom, 0.012);
        // Le gilet est peint sur le vêtement du modèle : on ne garde que le fourreau, plaqué au dos.
        vest.children.forEach((o) => { if (o.isMesh) o.visible = false; });
        back.position.z = -0.135;
        // Bandes et étui de cuisse ajustés à la jambe du modèle.
        J.hipR.children.forEach((o) => {
            if (!o.isMesh) return;
            if (o.material === M.bandage) o.scale.set(0.85, 1, 0.85);
            else o.position.x = 0.064;
        });
    }

    let avatar = null;
    if (avatarGltf) {
        fitToAvatar(measureAvatar(avatarGltf));
        avatar = bindAvatar(avatarGltf, J, root);
        const inModel = (o) => {
            for (let p = o; p; p = p.parent) if (p === avatar.model) return true;
            return false;
        };
        // Le corps procédural s'efface : on garde l'équipement (gilet, sabre, bourse, étui, bandes, sandales).
        const hide = new Set([M.skin, M.head, M.cloth, M.hair, M.band, M.wrist, M.plate]);
        root.traverse((o) => {
            if (!o.isMesh || inModel(o)) return;
            const mats = Array.isArray(o.material) ? o.material : [o.material];
            const toes = (o.parent === J.footL || o.parent === J.footR) && o.material === M.skin;
            if ((mats.some((m) => hide.has(m)) && !toes) || (o.material === M.swirl && o !== backSwirl)) o.visible = false;
        });
        fitHeadband(avatar, M, tails);
        dressAvatar(avatar, M);
    }

    // Vie : clignements, respiration, regard qui flâne, pans du bandeau au vent.
    const faceOpen = M.head.map;
    const faceClosed = faceTexture(true);
    let nextBlink = 1.5;
    function live(time) {
        hairWind.value = time;
        const blinking = time > nextBlink && time < nextBlink + 0.13;
        if (avatar) {
            avatar.expressions.blink(blinking ? 1 : 0);
            avatar.wind(time);
        } else {
            const map = blinking ? faceClosed : faceOpen;
            if (M.head.map !== map) M.head.map = map;
        }
        if (time > nextBlink + 0.13) nextBlink = time + 2.2 + ((Math.sin(time * 12.9898) * 43758.5453) % 1 + 1) % 1 * 3;
        J.neck.rotation.set(Math.sin(time * 0.6) * 0.025, Math.sin(time * 0.37) * 0.09, Math.sin(time * 0.29) * 0.02);
        const chest = 1 + Math.sin(time * 1.8) * 0.012;
        J.spine.scale.set(1, 1, chest);
        tails.forEach(({ pivot, s }, i) => {
            pivot.rotation.x = 0.45 + Math.sin(time * 3.1 + i) * 0.12 + Math.sin(time * 7.3 + i * 2) * 0.04;
            pivot.rotation.z = s * (0.28 + Math.sin(time * 2.3 + i) * 0.08);
            const f = pivot.userData.follow;
            if (f) f.rotation.set(-pivot.rotation.x, 0, pivot.rotation.z);
        });
    }

    return {
        root, J, M, katana, pouch, plate, live, avatar,
        // Le modèle anime recopie la pose du squelette d'animation.
        sync() { if (avatar) avatar.sync(); },
        // Expression du visage (angry, joy, fun) entre 0 et 1.
        express(name, value) { if (avatar && avatar.expressions[name]) avatar.expressions[name](value); },
        poseValues, currentValues, setValues, plantFeet,
        // Sabre en main / rengainé.
        drawKatana() {
            if (avatar) avatar.grip('right', true);
            J.handR.attach(katana);
            katana.position.set(0, -0.06, 0.02);
            katana.rotation.set(Math.PI / 2 + 0.1, 0, 0);
        },
        sheathe() {
            if (avatar) avatar.grip('right', false);
            const { parent, position, quaternion } = katana.userData.sheathed;
            parent.add(katana);
            katana.position.copy(position);
            katana.quaternion.copy(quaternion);
        }
    };
}
