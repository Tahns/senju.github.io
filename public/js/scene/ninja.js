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

// Peau de toute la tête, projetée comme une carte du monde : le visage est
// peint au centre de la face avant (u = 0,25), sans aucune couture visible.
// Visage adulte (style anime « Storm ») : yeux en amande effilés, paupière
// supérieure épaisse, sourcils anguleux, nez et bouche en quelques traits.
const headTexture = () => canvasTex(2048, 1024, (ctx, w, h) => {
    ctx.fillStyle = '#f3caa9';
    ctx.fillRect(0, 0, w, h);
    const soft = (x, y, r, color) => {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, color);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const cx = w * 0.25;
    // Modelé doux : joues rosées, creux des orbites, ombre sous la lèvre.
    [-1, 1].forEach((s) => {
        soft(cx + s * 150, 640, 95, 'rgba(236,128,108,.17)');
        soft(cx + s * 112, 518, 85, 'rgba(160,95,75,.12)');
    });
    soft(cx, 760, 60, 'rgba(170,100,80,.12)');
    soft(cx, 440, 120, 'rgba(255,235,215,.18)');
    const eye = (ex, ey, flip) => {
        ctx.save();
        ctx.translate(ex, ey);
        ctx.scale(flip * 1.5, 1.5);
        // Blanc de l'œil, en amande.
        ctx.fillStyle = '#fbf8f4';
        ctx.beginPath();
        ctx.moveTo(-46, 4);
        ctx.quadraticCurveTo(-18, -20, 22, -16);
        ctx.quadraticCurveTo(40, -12, 50, -4);
        ctx.quadraticCurveTo(24, 16, -12, 14);
        ctx.quadraticCurveTo(-34, 12, -46, 4);
        ctx.fill();
        ctx.save();
        ctx.clip();
        // Iris brun sombre, en partie caché par la paupière.
        const g = ctx.createLinearGradient(0, -22, 0, 18);
        g.addColorStop(0, '#120b08');
        g.addColorStop(1, '#6b4128');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(4, -1, 16, 19, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#080504';
        ctx.beginPath();
        ctx.ellipse(4, 0, 7, 9, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = 'rgba(255,255,255,.95)';
        ctx.beginPath();
        ctx.ellipse(-3, -7, 4, 4.5, 0, 0, Math.PI * 2);
        ctx.fill();
        // Ombre de la paupière sur le haut de l'œil.
        ctx.fillStyle = 'rgba(60,30,20,.25)';
        ctx.fillRect(-50, -24, 110, 12);
        ctx.restore();
        // Paupière supérieure épaisse, avec une petite pointe vers l'extérieur.
        ctx.fillStyle = '#140c0a';
        ctx.beginPath();
        ctx.moveTo(-50, 6);
        ctx.quadraticCurveTo(-20, -26, 24, -20);
        ctx.quadraticCurveTo(44, -16, 58, -8);
        ctx.lineTo(52, -2);
        ctx.quadraticCurveTo(22, -12, -16, -12);
        ctx.quadraticCurveTo(-36, -8, -50, 6);
        ctx.fill();
        // Paupière inférieure, trait fin.
        ctx.strokeStyle = 'rgba(40,20,15,.7)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-10, 15);
        ctx.quadraticCurveTo(20, 16, 44, 4);
        ctx.stroke();
        // Pli de la paupière.
        ctx.strokeStyle = 'rgba(80,40,30,.45)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(-30, -18);
        ctx.quadraticCurveTo(10, -32, 44, -22);
        ctx.stroke();
        ctx.restore();
        // Sourcil anguleux, froncé vers le centre.
        ctx.save();
        ctx.translate(ex + flip * 6, ey - 70);
        ctx.scale(flip * 1.12, 1.08);
        ctx.fillStyle = '#1c110c';
        ctx.beginPath();
        ctx.moveTo(-50, 14);
        ctx.lineTo(-40, 2);
        ctx.quadraticCurveTo(0, -8, 54, -2);
        ctx.lineTo(52, 6);
        ctx.quadraticCurveTo(0, 4, -38, 18);
        ctx.fill();
        ctx.restore();
    };
    eye(cx - 114, 530, -1);
    eye(cx + 114, 530, 1);
    // Nez : une arête d'ombre et la pointe.
    ctx.strokeStyle = 'rgba(150,80,60,.4)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + 8, 575);
    ctx.quadraticCurveTo(cx + 12, 605, cx + 2, 622);
    ctx.stroke();
    soft(cx - 4, 626, 16, 'rgba(150,80,60,.35)');
    // Bouche : trait sérieux, lèvre inférieure à peine marquée.
    ctx.strokeStyle = '#6e3024';
    ctx.lineWidth = 7;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - 36, 716);
    ctx.quadraticCurveTo(cx, 722, cx + 36, 713);
    ctx.stroke();
    soft(cx, 738, 30, 'rgba(190,100,85,.3)');
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

// Mèche de cheveux : un tube courbe qui s'affine jusqu'à la pointe.
function hairLock(points, radius, flat = 0.6) {
    const curve = new THREE.CatmullRomCurve3(points);
    const segments = 12;
    const radial = 7;
    const geo = new THREE.TubeGeometry(curve, segments, radius, radial, false);
    const pos = geo.attributes.position;
    const frames = curve.computeFrenetFrames(segments, false);
    for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const center = curve.getPointAt(t);
        const k = Math.pow(1 - t, 0.85) + 0.02;
        for (let j = 0; j <= radial; j++) {
            const idx = i * (radial + 1) + j;
            const v = new THREE.Vector3().fromBufferAttribute(pos, idx).sub(center);
            // Mèche aplatie (plus large que épaisse), comme dans les animes.
            const along = frames.binormals[i];
            const d = v.dot(along);
            v.addScaledVector(along, -d * (1 - flat));
            v.multiplyScalar(k);
            pos.setXYZ(idx, center.x + v.x, center.y + v.y, center.z + v.z);
        }
    }
    geo.computeVertexNormals();
    return geo;
}

// Mèche : racine sombre, reflet brillant « anime », pointe plus claire.
const hairTexture = () => canvasTex(256, 64, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#1a100b');
    g.addColorStop(0.3, '#3a2418');
    g.addColorStop(0.42, '#8a5c40');
    g.addColorStop(0.52, '#3f2819');
    g.addColorStop(1, '#5a3a26');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 80; i++) {
        ctx.strokeStyle = Math.random() > 0.5 ? 'rgba(0,0,0,.18)' : 'rgba(255,220,190,.08)';
        ctx.beginPath();
        const y = Math.random() * h;
        ctx.moveTo(0, y);
        ctx.lineTo(w, y + (Math.random() - 0.5) * 6);
        ctx.stroke();
    }
});

// Petit générateur déterministe : la coiffure est la même à chaque rêve.
function rngHair(seed) {
    let v = seed;
    return () => {
        v = (v * 16807) % 2147483647;
        return v / 2147483647;
    };
}

// Tête d'une seule pièce : une sphère sculptée (mâchoire fine, menton,
// pommettes, arête du nez, arcades), lisse, sur laquelle la peau est peinte.
function headGeometry(radius) {
    const geo = new THREE.SphereGeometry(1, 72, 54);
    const p = geo.attributes.position;
    const g2 = (d, s) => Math.exp(-(d * d) / (s * s));
    for (let i = 0; i < p.count; i++) {
        const ox = p.getX(i);
        const oy = p.getY(i);
        const oz = p.getZ(i);
        const low = Math.max(0, -oy);
        const front = Math.max(0, oz);
        let x = ox * 0.86 * (1 - 0.3 * Math.pow(low, 1.3));
        let y = oy * (1 + 0.12 * Math.pow(low, 1.5));
        let z = oz * 0.94 * (oz < 0 ? 1 - 0.3 * Math.pow(low, 1.2) : 1 - 0.06 * low);
        // Menton un peu en avant, pointe douce.
        z += 0.09 * g2(ox, 0.26) * g2(oy + 0.8, 0.17) * front;
        y -= 0.04 * g2(ox, 0.3) * g2(oy + 0.85, 0.2) * front;
        // Arête du nez et arcades sourcilières.
        z += 0.02 * g2(ox, 0.14) * g2(oy + 0.3, 0.16) * Math.pow(front, 6);
        z += 0.015 * g2(ox, 0.5) * g2(oy - 0.14, 0.12) * Math.pow(front, 4);
        // Pommettes à peine marquées.
        [-1, 1].forEach((s) => {
            x += s * 0.015 * g2(ox - s * 0.6, 0.22) * g2(oy + 0.22, 0.22) * front;
        });
        p.setXYZ(i, x * radius, y * radius, z * radius);
    }
    geo.computeVertexNormals();
    return geo;
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

export function buildNinja() {
    // Ombrage lisse : tissus avec un léger lustre (sheen), peau satinée.
    const mat = (color, roughness = 0.8, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness, ...extra });
    const cloth = (color, extra = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.88, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(color).lerp(new THREE.Color('#ffffff'), 0.4), ...extra });
    const skin = (map = null) => new THREE.MeshPhysicalMaterial({ color: map ? '#ffffff' : '#f3caa9', map, roughness: 0.55, sheen: 0.35, sheenRoughness: 0.5, sheenColor: new THREE.Color('#ffb89a') });
    const bandTex = bandageTexture();
    bandTex.wrapS = bandTex.wrapT = THREE.RepeatWrapping;
    bandTex.repeat.set(3, 3);
    const M = {
        skin: skin(),
        head: skin(headTexture()),
        cloth: cloth('#262e58'),
        clothDark: cloth('#1a2044'),
        vest: cloth('#c3d0c2', { map: vestTexture() }),
        vestDark: cloth('#a3b3a4'),
        pocket: cloth('#b4c3b5', { map: pocketTexture() }),
        apron: cloth('#ffffff', { map: apronTexture(), side: THREE.DoubleSide }),
        swirl: mat('#ffffff', 0.8, { map: swirlTexture() }),
        hair: mat('#ffffff', 0.42, { map: hairTexture() }),
        hairBase: mat('#2a1a12', 0.5),
        band: cloth('#1c2350'),
        plate: new THREE.MeshStandardMaterial({ map: plateTexture(), metalness: 0.85, roughness: 0.28 }),
        guard: mat('#3b3f4a', 0.45, { metalness: 0.4 }),
        glove: mat('#16161c', 0.6),
        bandage: cloth('#ffffff', { map: bandTex }),
        sandal: mat('#1f2a5c', 0.65),
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

    /* ---------------- Bassin, tablier, bourse ---------------- */
    J.hips = joint(root, 0, 0.98, 0);
    mesh(new THREE.CapsuleGeometry(0.15, 0.08, 6, 16), M.cloth, J.hips, 0, 0.03, 0).scale.set(1.15, 1, 0.8);
    mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.06, 24), M.clothDark, J.hips, 0, 0.11, 0).scale.z = 0.78;
    // Tablier violet à losanges, ouvert devant (comme les jōnin du serveur).
    const apron = mesh(new THREE.CylinderGeometry(0.2, 0.33, 0.62, 28, 1, true, Math.PI * 0.2, Math.PI * 1.6), M.apron, J.hips, 0, -0.22, 0);
    apron.scale.z = 0.8;
    const pouch = joint(J.hips, 0.2, 0.03, -0.06);
    mesh(new THREE.SphereGeometry(0.07, 18, 14), M.leather, pouch).scale.set(1, 1.15, 0.85);
    mesh(new THREE.TorusGeometry(0.033, 0.008, 6, 14), M.gold, pouch, 0, 0.07, 0).rotation.x = Math.PI / 2;

    /* ---------------- Jambes ---------------- */
    ['L', 'R'].forEach((side, i) => {
        const s = i === 0 ? -1 : 1;
        const hip = J['hip' + side] = joint(J.hips, s * 0.1, -0.03, 0);
        capsule(0.088, 0.33, M.cloth, hip);
        if (s > 0) {
            // Étui à kunai sur la cuisse droite, tenu par une bande blanche.
            mesh(new THREE.CylinderGeometry(0.083, 0.083, 0.07, 16), M.bandage, hip, 0, -0.24, 0);
            mesh(new THREE.BoxGeometry(0.07, 0.1, 0.05), M.clothDark, hip, 0.07, -0.25, 0.02).rotation.y = 0.5;
        }
        const knee = J['knee' + side] = joint(hip, 0, -0.44, 0);
        capsule(0.07, 0.33, M.cloth, knee);
        mesh(new THREE.CylinderGeometry(0.069, 0.058, 0.2, 16), M.bandage, knee, 0, -0.3, 0);
        const foot = J['foot' + side] = joint(knee, 0, -0.44, 0);
        mesh(new RoundedBoxGeometry(0.11, 0.03, 0.26, 2, 0.012), M.sandal, foot, 0, -0.035, 0.05);
        mesh(new RoundedBoxGeometry(0.105, 0.07, 0.13, 2, 0.03), M.sandal, foot, 0, 0.0, -0.01);
        mesh(new RoundedBoxGeometry(0.09, 0.035, 0.08, 2, 0.015), M.skin, foot, 0, -0.005, 0.13);
    });

    /* ---------------- Buste : gilet tactique de jōnin ---------------- */
    J.spine = joint(J.hips, 0, 0.12, 0);
    // Torse (maillot bleu nuit), taille fine, épaules larges.
    const torsoProfile = [[0, 0], [0.13, 0.0], [0.135, 0.12], [0.15, 0.3], [0.165, 0.42], [0.15, 0.5], [0.09, 0.56], [0, 0.57]].map(([r, y]) => new THREE.Vector2(r, y));
    const shirt = mesh(new THREE.LatheGeometry(torsoProfile, 24), M.cloth, J.spine, 0, 0.02, 0);
    shirt.scale.set(1.2, 1, 0.78);
    // Gilet rembourré par-dessus.
    const vestProfile = [[0.14, 0.04], [0.158, 0.06], [0.16, 0.2], [0.178, 0.34], [0.188, 0.44], [0.17, 0.52], [0.12, 0.555]].map(([r, y]) => new THREE.Vector2(r, y));
    const vest = mesh(new THREE.LatheGeometry(vestProfile, 28), M.vest, J.spine, 0, 0.02, 0);
    vest.scale.set(1.26, 1, 0.9);
    // Bord inférieur épais.
    const hem = mesh(new THREE.TorusGeometry(0.155, 0.018, 8, 28), M.vestDark, J.spine, 0, 0.065, 0);
    hem.rotation.x = Math.PI / 2;
    hem.scale.set(1.22, 0.84, 1);
    // Col roulé, gros et rembourré.
    const collar = mesh(new THREE.TorusGeometry(0.1, 0.05, 20, 40), M.vest, J.spine, 0, 0.59, 0);
    collar.rotation.x = Math.PI / 2;
    collar.scale.set(1.12, 0.95, 1);
    // Fermeture éclair.
    mesh(new THREE.BoxGeometry(0.012, 0.44, 0.012), M.vestDark, J.spine, 0, 0.3, 0.158);
    // Poches à rouleaux cannelées, deux de chaque côté.
    [-1, 1].forEach((sx) => {
        [-0.055, -0.13].forEach((dx) => {
            const p = mesh(new RoundedBoxGeometry(0.06, 0.13, 0.04, 2, 0.012), M.pocket, J.spine, sx * -dx, 0.27, 0.15);
            p.rotation.y = sx * dx * 1.6;
        });
    });
    // Sacoche au bas du dos.
    mesh(new RoundedBoxGeometry(0.17, 0.08, 0.07, 2, 0.025), M.vestDark, J.hips, 0, 0.07, -0.16);
    // Grand tourbillon rouge dans le dos.
    const backSwirl = mesh(new THREE.CircleGeometry(0.085, 28), M.swirl, J.spine, 0, 0.36, -0.168);
    backSwirl.rotation.y = Math.PI;
    // Fourreau du sabre, en travers du dos.
    const back = joint(J.spine, 0, 0.3, -0.18);
    back.rotation.z = 0.75;
    mesh(new THREE.CylinderGeometry(0.022, 0.018, 0.8, 10), M.black, back);

    /* ---------------- Tête ---------------- */
    J.neck = joint(J.spine, 0, 0.6, 0);
    mesh(new THREE.CylinderGeometry(0.054, 0.066, 0.12, 24), M.skin, J.neck, 0, 0.03, -0.005);
    J.head = joint(J.neck, 0, 0.085, 0.004);
    J.head.scale.setScalar(0.93);
    mesh(headGeometry(0.125), M.head, J.head, 0, 0.11, 0);
    [-1, 1].forEach((s) => mesh(new THREE.SphereGeometry(0.026, 20, 16), M.skin, J.head, s * 0.106, 0.1, -0.005).scale.set(0.45, 1, 0.8));
    // Bandeau frontal.
    mesh(new THREE.CylinderGeometry(0.119, 0.117, 0.042, 32, 1, true), M.band, J.head, 0, 0.175, 0.002).scale.set(0.93, 1, 0.98);
    const plate = mesh(new RoundedBoxGeometry(0.13, 0.052, 0.012, 2, 0.006), [M.steel, M.steel, M.steel, M.steel, M.plate, M.steel], J.head, 0, 0.176, 0.118);
    plate.rotation.x = -0.1;
    [-1, 1].forEach((s) => {
        const tail = mesh(new THREE.BoxGeometry(0.032, 0.22, 0.006), M.band, J.head, s * 0.03, 0.08, -0.13);
        tail.rotation.set(0.4, 0, s * 0.3);
    });
    // Cheveux : volume de base, puis grandes mèches courbes (style anime).
    const cap = mesh(new THREE.SphereGeometry(0.133, 48, 24, 0, Math.PI * 2, 0, Math.PI * 0.4), M.hairBase, J.head, 0, 0.14, -0.02);
    cap.scale.set(0.97, 0.98, 1.04);
    mesh(new THREE.SphereGeometry(0.135, 48, 32, Math.PI * 1.1, Math.PI * 0.8, 0.3, 2.2), M.hairBase, J.head, 0, 0.1, -0.015).scale.set(0.97, 1.02, 1.04);
    const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
    const lock = (pts, r) => mesh(hairLock(pts.map(([x, y, z]) => V3(x, y, z)), r, 0.55), M.hair, J.head);
    // Chevelure en pointes, façon anime : des rangées de mèches plantées tout
    // autour du crâne, qui se dressent sur le dessus et retombent derrière.
    const seed = rngHair(77);
    const C = V3(0, 0.13, -0.01);
    const rows = [
        { pol: 0.2, n: 4, len: 0.15, up: 0.9, r: 0.05 },
        { pol: 0.55, n: 8, len: 0.19, up: 0.45, r: 0.05 },
        { pol: 0.95, n: 10, len: 0.2, up: 0.0, r: 0.048 },
        { pol: 1.35, n: 9, len: 0.17, up: -0.55, r: 0.044 }
    ];
    rows.forEach(({ pol, n, len, up, r }, ri) => {
        for (let k = 0; k < n; k++) {
            const az = (k / n) * Math.PI * 2 + ri * 0.4 + (seed() - 0.5) * 0.25;
            const facing = Math.cos(az);
            // Pas de mèche plantée sur le visage (sauf la frange, plus bas).
            if (ri > 0 && facing > 0.35) continue;
            const out = V3(Math.sin(pol) * Math.sin(az), Math.cos(pol), Math.sin(pol) * Math.cos(az));
            const root = C.clone().addScaledVector(out, 0.118);
            const dir = out.clone().multiplyScalar(0.8).add(V3(0, up, -0.55 - Math.max(0, facing) * 0.3)).normalize();
            const l = len * (0.85 + seed() * 0.3);
            const mid = root.clone().addScaledVector(dir, l * 0.5).addScaledVector(out, 0.02);
            const tip = root.clone().addScaledVector(dir, l).add(V3(0, -0.03 - (ri > 1 ? 0.03 : 0), 0));
            lock([root.clone().addScaledVector(out, -0.03).toArray(), root.toArray(), mid.toArray(), tip.toArray()], r * (0.9 + seed() * 0.2));
        }
    });
    // Frange : des mèches qui passent par-dessus le bandeau et encadrent le visage.
    [
        [[0.0, 0.25, 0.05], [0.01, 0.25, 0.12], [0.03, 0.2, 0.158], [0.05, 0.12, 0.16]],
        [[-0.05, 0.245, 0.05], [-0.06, 0.24, 0.12], [-0.08, 0.19, 0.15], [-0.1, 0.12, 0.15]],
        [[0.06, 0.24, 0.04], [0.08, 0.23, 0.11], [0.1, 0.18, 0.14], [0.115, 0.1, 0.13]],
        [[0.1, 0.21, 0.02], [0.125, 0.17, 0.07], [0.132, 0.08, 0.09], [0.125, 0.0, 0.085]],
        [[-0.1, 0.21, 0.02], [-0.125, 0.17, 0.07], [-0.132, 0.08, 0.09], [-0.125, 0.0, 0.085]]
    ].forEach((pts, i) => lock(pts, i < 3 ? 0.04 : 0.034));

    /* ---------------- Bras ---------------- */
    ['L', 'R'].forEach((side, i) => {
        const s = i === 0 ? -1 : 1;
        const shoulder = J['shoulder' + side] = joint(J.spine, s * 0.25, 0.47, 0);
        const pad = mesh(new THREE.SphereGeometry(0.078, 16, 12), M.vestDark, shoulder);
        pad.scale.set(1, 0.8, 0.95);
        const sw = mesh(new THREE.CircleGeometry(0.036, 24), M.swirl, shoulder, s * 0.06, -0.1, 0);
        sw.rotation.y = s * Math.PI / 2;
        capsule(0.064, 0.25, M.cloth, shoulder);
        const elbow = J['elbow' + side] = joint(shoulder, 0, -0.33, 0);
        capsule(0.056, 0.23, M.cloth, elbow);
        // Protège-avant-bras.
        const guard = mesh(new THREE.CylinderGeometry(0.056, 0.05, 0.16, 14), M.guard, elbow, 0, -0.2, 0);
        guard.scale.z = 0.9;
        mesh(new THREE.BoxGeometry(0.05, 0.12, 0.012), M.steel, elbow, 0, -0.2, 0.052);
        const hand = J['hand' + side] = joint(elbow, 0, -0.32, 0);
        // Gant noir sans doigts : paume gantée, doigts nus.
        mesh(new RoundedBoxGeometry(0.075, 0.07, 0.038, 2, 0.016), M.glove, hand, 0, -0.02, 0);
        [-0.025, -0.008, 0.009, 0.025].forEach((fx, k) => {
            const f = mesh(new THREE.CapsuleGeometry(0.0085, 0.045 - Math.abs(k - 1.5) * 0.006, 4, 8), M.skin, hand, fx, -0.085, 0.004);
            f.rotation.x = 0.25;
        });
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
