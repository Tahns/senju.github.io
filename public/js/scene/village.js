/*
 * Konoha, vu depuis le rocher d'entraînement du rêve.
 * Rues en terre battue, maisons à étages (poutres de bois et enduit clair),
 * balcons, auvents, enseignes, réservoirs d'eau ronds sur les toits, poteaux
 * électriques et leurs fils, grands arbres touffus et le mont des Hokage.
 * Tout est fusionné par matériau : des milliers de pièces, peu d'appels de dessin.
 */
import * as THREE from 'three';
import { rng } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

/* ---------------- Fusion de géométries ---------------- */
function merge(list) {
    let vertices = 0;
    let indices = 0;
    list.forEach((g) => {
        vertices += g.attributes.position.count;
        indices += g.index ? g.index.count : g.attributes.position.count;
    });
    const position = new Float32Array(vertices * 3);
    const normal = new Float32Array(vertices * 3);
    const uv = new Float32Array(vertices * 2);
    const index = new Uint32Array(indices);
    let vo = 0;
    let io = 0;
    list.forEach((g) => {
        const n = g.attributes.position.count;
        position.set(g.attributes.position.array, vo * 3);
        normal.set(g.attributes.normal.array, vo * 3);
        if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
        if (g.index) {
            const src = g.index.array;
            for (let i = 0; i < src.length; i++) index[io++] = src[i] + vo;
        } else {
            for (let i = 0; i < n; i++) index[io++] = vo + i;
        }
        vo += n;
        g.dispose();
    });
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.BufferAttribute(position, 3));
    out.setAttribute('normal', new THREE.BufferAttribute(normal, 3));
    out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
    out.setIndex(new THREE.BufferAttribute(index, 1));
    out.computeBoundingSphere();
    return out;
}

class Batch {
    constructor() {
        this.parts = new Map();
        this.dummy = new THREE.Object3D();
        this.matrix = new THREE.Matrix4();
    }
    // Ajoute une géométrie (consommée) sous la transformation base × local.
    add(geo, material, base, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
        const d = this.dummy;
        d.position.set(x, y, z);
        d.rotation.set(rx, ry, rz);
        d.scale.set(sx, sy, sz);
        d.updateMatrix();
        this.matrix.multiplyMatrices(base, d.matrix);
        if (geo.index === null && !geo.attributes.normal) geo.computeVertexNormals();
        geo.applyMatrix4(this.matrix);
        if (!this.parts.has(material)) this.parts.set(material, []);
        this.parts.get(material).push(geo);
    }
    build(parent, { cast = true, receive = true } = {}) {
        for (const [material, list] of this.parts) {
            const mesh = new THREE.Mesh(merge(list), material);
            mesh.castShadow = cast;
            mesh.receiveShadow = receive;
            mesh.matrixAutoUpdate = false;
            parent.add(mesh);
        }
        this.parts.clear();
    }
}

// Boîte dont les UV suivent les dimensions réelles (une tuile = tw × th mètres).
function box(w, h, d, tw = 3, th = 3) {
    const g = new THREE.BoxGeometry(w, h, d);
    const uv = g.attributes.uv;
    const sizes = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
    for (let f = 0; f < 6; f++) {
        for (let k = 0; k < 4; k++) {
            const i = f * 4 + k;
            uv.setXY(i, uv.getX(i) * sizes[f][0] / tw, uv.getY(i) * sizes[f][1] / th);
        }
    }
    return g;
}

// Pignon triangulaire (deux faces), dans le plan z-y, épaisseur w selon x.
function gable(w, d, h) {
    const hw = w / 2;
    const hd = d / 2;
    const g = new THREE.BufferGeometry();
    const p = [hw, 0, -hd, hw, 0, hd, hw, h, 0, -hw, 0, hd, -hw, 0, -hd, -hw, h, 0];
    const n = [1, 0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, -1, 0, 0, -1, 0, 0];
    const t = [0, 0, d / 3, 0, d / 6, h / 3, 0, 0, d / 3, 0, d / 6, h / 3];
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(t, 2));
    g.setIndex([0, 1, 2, 3, 4, 5]);
    return g;
}

/* ---------------- Textures peintes ---------------- */
function tex(w, h, draw, repeat = true) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    draw(c.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
}

// Taches douces et grain : l'enduit n'est jamais parfaitement uni.
function grime(ctx, w, h, random, strength = 1) {
    for (let i = 0; i < 18; i++) {
        const x = random() * w;
        const y = random() * h;
        const r = 20 + random() * 60;
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        const dark = random() > 0.4;
        g.addColorStop(0, dark ? `rgba(90,70,50,${0.08 * strength})` : `rgba(255,250,235,${0.1 * strength})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    for (let i = 0; i < 900; i++) {
        ctx.fillStyle = random() > 0.5 ? `rgba(80,60,40,${0.06 * strength})` : `rgba(255,255,255,${0.07 * strength})`;
        ctx.fillRect(random() * w, random() * h, 1 + random() * 2, 1 + random() * 2);
    }
}

function woodGrain(ctx, x, y, w, h, base, random) {
    ctx.fillStyle = base;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(30,18,10,.25)';
    ctx.lineWidth = 1;
    const vertical = h > w;
    for (let i = 0; i < (vertical ? w : h) / 3; i++) {
        ctx.beginPath();
        if (vertical) {
            const px = x + random() * w;
            ctx.moveTo(px, y);
            ctx.lineTo(px + (random() - 0.5) * 3, y + h);
        } else {
            const py = y + random() * h;
            ctx.moveTo(x, py);
            ctx.lineTo(x + w, py + (random() - 0.5) * 3);
        }
        ctx.stroke();
    }
}

// Une travée d'étage (3 m × 3 m) : poutre, poteau, fenêtre et son rebord.
function bayTexture(plaster, style, random) {
    return tex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = plaster;
        ctx.fillRect(0, 0, w, h);
        grime(ctx, w, h, random);
        let g = ctx.createLinearGradient(0, 16, 0, 80);
        g.addColorStop(0, 'rgba(60,40,25,.32)');
        g.addColorStop(1, 'rgba(60,40,25,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 16, w, 64);
        g = ctx.createLinearGradient(0, h - 50, 0, h);
        g.addColorStop(0, 'rgba(90,70,50,0)');
        g.addColorStop(1, 'rgba(90,70,50,.2)');
        ctx.fillStyle = g;
        ctx.fillRect(0, h - 50, w, 50);
        woodGrain(ctx, 0, 0, w, 16, '#5d4230', random);
        woodGrain(ctx, 0, 0, 9, h, '#634632', random);
        const x0 = 70;
        const x1 = 186;
        const y0 = 74;
        const y1 = 176;
        // Ombre portée du cadre dans l'enduit.
        ctx.fillStyle = 'rgba(40,25,15,.25)';
        ctx.fillRect(x0 - 6, y0 - 4, x1 - x0 + 14, y1 - y0 + 14);
        woodGrain(ctx, x0 - 8, y0 - 8, x1 - x0 + 16, y1 - y0 + 16, '#6a4a33', random);
        if (style === 'shoji') {
            ctx.fillStyle = '#f3e8cf';
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            g = ctx.createLinearGradient(0, y0, 0, y1);
            g.addColorStop(0, 'rgba(120,90,60,.18)');
            g.addColorStop(1, 'rgba(255,240,210,.1)');
            ctx.fillStyle = g;
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            ctx.fillStyle = '#7a563a';
            for (let x = x0 + 19; x < x1; x += 19) ctx.fillRect(x - 1.5, y0, 3, y1 - y0);
            for (let y = y0 + 25; y < y1; y += 25) ctx.fillRect(x0, y - 1.5, x1 - x0, 3);
            ctx.fillRect((x0 + x1) / 2 - 3, y0, 6, y1 - y0);
        } else if (style === 'glass') {
            g = ctx.createLinearGradient(x0, y0, x1, y1);
            g.addColorStop(0, '#9ec3dc');
            g.addColorStop(0.45, '#40627e');
            g.addColorStop(1, '#223648');
            ctx.fillStyle = g;
            ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
            ctx.fillStyle = 'rgba(255,255,255,.28)';
            ctx.beginPath();
            ctx.moveTo(x0 + 10, y1);
            ctx.lineTo(x0 + 40, y0);
            ctx.lineTo(x0 + 58, y0);
            ctx.lineTo(x0 + 28, y1);
            ctx.fill();
            // Rideau à moitié tiré.
            ctx.fillStyle = 'rgba(230,220,200,.85)';
            ctx.fillRect(x0, y0, 30, y1 - y0);
            ctx.fillStyle = '#5e422e';
            ctx.fillRect((x0 + x1) / 2 - 3, y0, 6, y1 - y0);
            ctx.fillRect(x0, (y0 + y1) / 2 - 3, x1 - x0, 6);
        } else {
            // Volets de bois fermés, lattes horizontales.
            for (let y = y0; y < y1; y += 9) {
                ctx.fillStyle = (y / 9) % 2 ? '#7d5a3d' : '#6f4f35';
                ctx.fillRect(x0, y, x1 - x0, 9);
                ctx.fillStyle = 'rgba(20,10,5,.35)';
                ctx.fillRect(x0, y + 7, x1 - x0, 2);
            }
            ctx.fillStyle = '#4a3322';
            ctx.fillRect((x0 + x1) / 2 - 2, y0, 4, y1 - y0);
        }
        // Rebord de fenêtre et son ombre.
        woodGrain(ctx, x0 - 14, y1 + 6, x1 - x0 + 28, 10, '#5a3f2c', random);
        ctx.fillStyle = 'rgba(40,25,15,.25)';
        ctx.fillRect(x0 - 10, y1 + 16, x1 - x0 + 20, 8);
    });
}

// Façade du rez-de-chaussée : boutique à portes coulissantes et noren, ou porte d'entrée.
function groundTexture(kind, cloth, random) {
    return tex(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#3a2a1e';
        ctx.fillRect(0, 0, w, h);
        woodGrain(ctx, 0, 0, w, 22, '#5d4230', random);
        if (kind === 'shop') {
            // Portes coulissantes vitrées à croisillons.
            for (let k = 0; k < 4; k++) {
                const x = 12 + k * 122;
                woodGrain(ctx, x, 30, 118, h - 34, '#7b5738', random);
                const g = ctx.createLinearGradient(0, 40, 0, h);
                g.addColorStop(0, '#f2dfb4');
                g.addColorStop(1, '#c79a5c');
                ctx.fillStyle = g;
                ctx.fillRect(x + 8, 40, 102, h - 60);
                ctx.fillStyle = '#6a4a31';
                for (let gx = x + 8 + 25; gx < x + 110; gx += 25) ctx.fillRect(gx - 2, 40, 4, h - 60);
                for (let gy = 40 + 32; gy < h - 20; gy += 32) ctx.fillRect(x + 8, gy - 2, 102, 4);
            }
            // Noren : rideau de tissu fendu, avec un emblème.
            for (let k = 0; k < 5; k++) {
                const x = 30 + k * 92;
                ctx.fillStyle = cloth;
                ctx.fillRect(x, 26, 86, 92);
                ctx.fillStyle = 'rgba(0,0,0,.15)';
                ctx.fillRect(x, 26, 86, 6);
                ctx.fillStyle = 'rgba(255,255,255,.12)';
                ctx.fillRect(x + 4, 32, 6, 86);
            }
            ctx.strokeStyle = '#f7efe0';
            ctx.lineWidth = 6;
            ctx.beginPath();
            ctx.arc(256, 70, 24, 0, Math.PI * 2);
            ctx.stroke();
        } else {
            ctx.fillStyle = '#e8dcc2';
            ctx.fillRect(0, 22, w, h - 22);
            grime(ctx, w, h, random, 0.8);
            woodGrain(ctx, 196, 60, 120, h - 60, '#6d4c33', random);
            ctx.fillStyle = '#e9dcc0';
            for (let gy = 80; gy < h - 20; gy += 30) ctx.fillRect(208, gy, 96, 20);
            woodGrain(ctx, 40, 90, 110, 90, '#6a4a33', random);
            woodGrain(ctx, 362, 90, 110, 90, '#6a4a33', random);
            ctx.fillStyle = '#f3e8cf';
            ctx.fillRect(48, 98, 94, 74);
            ctx.fillRect(370, 98, 94, 74);
            ctx.fillStyle = '#7a563a';
            for (let x = 48 + 23; x < 142; x += 23) ctx.fillRect(x - 1, 98, 2, 74);
            for (let x = 370 + 23; x < 464; x += 23) ctx.fillRect(x - 1, 98, 2, 74);
        }
        const g = ctx.createLinearGradient(0, 22, 0, 60);
        g.addColorStop(0, 'rgba(0,0,0,.35)');
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 22, w, 38);
    }, false);
}

// Tuiles de toit (en niveaux de gris, teintées par le matériau).
function tileTexture(random) {
    return tex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#c8c8c8';
        ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w; x += 32) {
            const g = ctx.createLinearGradient(x, 0, x + 32, 0);
            g.addColorStop(0, '#8a8a8a');
            g.addColorStop(0.35, '#f2f2f2');
            g.addColorStop(0.7, '#cfcfcf');
            g.addColorStop(1, '#7a7a7a');
            ctx.fillStyle = g;
            ctx.fillRect(x, 0, 32, h);
        }
        for (let y = 0; y < h; y += 64) {
            const g = ctx.createLinearGradient(0, y, 0, y + 14);
            g.addColorStop(0, 'rgba(0,0,0,.4)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(0, y, w, 14);
        }
        grime(ctx, w, h, random, 0.6);
    });
}

function dirtTexture(random) {
    return tex(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#b89a72';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 60; i++) {
            const x = random() * w;
            const y = random() * h;
            const r = 20 + random() * 70;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, random() > 0.5 ? 'rgba(140,110,75,.35)' : 'rgba(215,190,150,.35)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        for (let i = 0; i < 2500; i++) {
            ctx.fillStyle = random() > 0.5 ? 'rgba(90,70,50,.25)' : 'rgba(240,225,200,.25)';
            const s = 1 + random() * 3;
            ctx.fillRect(random() * w, random() * h, s, s);
        }
        // Ornières le long de la rue.
        ctx.fillStyle = 'rgba(120,95,65,.18)';
        ctx.fillRect(w * 0.3, 0, 26, h);
        ctx.fillRect(w * 0.62, 0, 26, h);
    });
}

export function grassTexture(random) {
    return tex(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#5f8f3a';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 70; i++) {
            const x = random() * w;
            const y = random() * h;
            const r = 30 + random() * 90;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, random() > 0.5 ? 'rgba(130,170,70,.35)' : 'rgba(50,90,40,.35)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        for (let i = 0; i < 9000; i++) {
            const x = random() * w;
            const y = random() * h;
            ctx.strokeStyle = random() > 0.5 ? 'rgba(160,200,90,.35)' : 'rgba(40,75,30,.35)';
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + (random() - 0.5) * 3, y - 3 - random() * 5);
            ctx.stroke();
        }
    });
}

function stoneTexture(random) {
    return tex(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#bda587';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 90; i++) {
            const x = random() * w;
            const y = random() * h;
            const r = 20 + random() * 80;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, random() > 0.5 ? 'rgba(110,90,70,.3)' : 'rgba(235,220,195,.3)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        for (let i = 0; i < 260; i++) {
            ctx.strokeStyle = random() > 0.5 ? 'rgba(80,60,45,.28)' : 'rgba(245,235,215,.22)';
            ctx.lineWidth = 1 + random() * 2;
            ctx.beginPath();
            const x = random() * w;
            const y = random() * h;
            ctx.moveTo(x, y);
            ctx.lineTo(x + (random() - 0.5) * 12, y + 8 + random() * 40);
            ctx.stroke();
        }
    });
}

// Enseigne verticale peinte : quelques mots du village.
function signTexture(text, bg, fg) {
    return tex(96, 288, (ctx, w, h) => {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(0,0,0,.35)';
        ctx.lineWidth = 6;
        ctx.strokeRect(3, 3, w - 6, h - 6);
        ctx.fillStyle = fg;
        ctx.font = '600 58px "Yuji Syuku", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const chars = [...text];
        chars.forEach((c, i) => ctx.fillText(c, w / 2, h / 2 + (i - (chars.length - 1) / 2) * 66));
    }, false);
}

function awningTexture(color) {
    return tex(128, 64, (ctx, w, h) => {
        for (let x = 0; x < w; x += 16) {
            ctx.fillStyle = (x / 16) % 2 ? '#f4efe4' : color;
            ctx.fillRect(x, 0, 16, h);
        }
        const g = ctx.createLinearGradient(0, 0, 0, h);
        g.addColorStop(0, 'rgba(0,0,0,.12)');
        g.addColorStop(1, 'rgba(255,255,255,.06)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
}

// Grand mur rouge du bâtiment du Hokage, rangée de fenêtres.
function towerTexture(random) {
    return tex(512, 256, (ctx, w, h) => {
        ctx.fillStyle = '#c0412f';
        ctx.fillRect(0, 0, w, h);
        grime(ctx, w, h, random, 1.2);
        for (let x = 20; x < w; x += 128) {
            ctx.fillStyle = 'rgba(60,20,15,.3)';
            ctx.fillRect(x - 4, 96, 96, 84);
            woodGrain(ctx, x - 6, 92, 100, 84, '#5a3a28', random);
            const g = ctx.createLinearGradient(0, 98, 0, 170);
            g.addColorStop(0, '#f6e7c4');
            g.addColorStop(1, '#d8b27a');
            ctx.fillStyle = g;
            ctx.fillRect(x, 98, 88, 72);
            ctx.fillStyle = '#5a3a28';
            for (let gx = x + 22; gx < x + 88; gx += 22) ctx.fillRect(gx - 1.5, 98, 3, 72);
            ctx.fillRect(x, 132, 88, 3);
        }
    });
}

/* ---------------- Feuillages : cartes de feuilles instanciées ---------------- */
function leafTexture(random) {
    return tex(256, 256, (ctx, w, h) => {
        ctx.clearRect(0, 0, w, h);
        const greens = ['#3f7a2c', '#4f8f33', '#5fa33c', '#6fb246', '#386b27', '#80bf52'];
        for (let i = 0; i < 150; i++) {
            const a = random() * Math.PI * 2;
            const r = Math.sqrt(random()) * 100;
            const x = w / 2 + Math.cos(a) * r;
            const y = h / 2 + Math.sin(a) * r;
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(random() * Math.PI * 2);
            ctx.fillStyle = greens[Math.floor(random() * greens.length)];
            ctx.beginPath();
            ctx.ellipse(0, 0, 13 + random() * 7, 6 + random() * 3, 0, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = 'rgba(20,50,15,.45)';
            ctx.lineWidth = 1.2;
            ctx.beginPath();
            ctx.moveTo(-12, 0);
            ctx.lineTo(12, 0);
            ctx.stroke();
            ctx.restore();
        }
    }, false);
}

class Foliage {
    constructor(random) {
        this.random = random;
        this.cards = [];
    }
    // Une boule de feuillage : des cartes réparties en surface, orientées vers l'extérieur.
    blob(center, radius, count, size, light = 1) {
        const r = this.random;
        for (let i = 0; i < count; i++) {
            const dir = V(r() * 2 - 1, r() * 2 - 1, r() * 2 - 1);
            if (dir.lengthSq() > 1 || dir.lengthSq() < 0.01) { i--; continue; }
            dir.normalize();
            const depth = 0.55 + Math.sqrt(r()) * 0.5;
            const p = center.clone().addScaledVector(dir, radius * depth);
            const n = dir.clone().add(V(0, 0.35, 0)).normalize();
            const shade = (0.72 + depth * 0.3 + Math.max(0, dir.y) * 0.18) * light * (0.9 + r() * 0.2);
            this.cards.push({ p, n, s: size * (0.8 + r() * 0.5), shade, hue: r() });
        }
    }
    build(parent, time) {
        const count = this.cards.length;
        const material = new THREE.MeshStandardMaterial({ map: leafTexture(this.random), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.75, alphaToCoverage: true });
        material.onBeforeCompile = (shader) => {
            shader.uniforms.uTime = time;
            shader.vertexShader = shader.vertexShader
                .replace('#include <common>', '#include <common>\nattribute vec3 aNormal;\nuniform float uTime;')
                .replace('#include <defaultnormal_vertex>', 'vec3 transformedNormal = normalMatrix * aNormal;')
                .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec3 ip = instanceMatrix[3].xyz;\ntransformed.xy += vec2(sin(uTime * 1.6 + ip.x * 0.35 + ip.z * 0.2), cos(uTime * 1.3 + ip.y * 0.5)) * 0.06;');
            shader.fragmentShader = shader.fragmentShader
                .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize( vNormal );');
        };
        const mesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), material, count);
        const normals = new Float32Array(count * 3);
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        this.cards.forEach((c, i) => {
            dummy.position.copy(c.p);
            dummy.rotation.set(this.random() * 6.28, this.random() * 6.28, this.random() * 6.28);
            dummy.scale.setScalar(c.s);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            normals.set([c.n.x, c.n.y, c.n.z], i * 3);
            // Teinte : du vert profond au vert tendre ensoleillé.
            color.setRGB(0.92, 1, 0.9).lerp(new THREE.Color(1.05, 1.05, 0.62), c.hue * 0.5).multiplyScalar(c.shade);
            mesh.setColorAt(i, color);
        });
        mesh.geometry.setAttribute('aNormal', new THREE.InstancedBufferAttribute(normals, 3));
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.frustumCulled = false;
        parent.add(mesh);
        return mesh;
    }
}

/* ---------------- Le village ---------------- */
export function buildVillage({ low = false } = {}) {
    const random = rng(1407);
    const group = new THREE.Group();
    const time = { value: 0 };
    // Proche du rocher : projette des ombres ; au loin : sans ombres, plus simple.
    const batch = new Batch();
    const farBatch = new Batch();
    const foliage = new Foliage(random);
    const farFoliage = new Foliage(random);
    const I = new THREE.Matrix4();

    const plasters = ['#efe4cb', '#e6d2ad', '#ecd0a8', '#e2e0d6', '#f0d6c0'];
    const styles = ['shoji', 'glass', 'shutter'];
    const bays = [];
    plasters.forEach((p, i) => {
        const m = [styles[i % 3], styles[(i + 1) % 3]].map((s) => new THREE.MeshStandardMaterial({ map: bayTexture(p, s, random), roughness: 0.9 }));
        bays.push(m);
    });
    const plainWalls = plasters.map((p) => new THREE.MeshStandardMaterial({ color: p, roughness: 0.95 }));
    const tiles = tileTexture(random);
    const roofs = ['#d9642d', '#b8412f', '#3c8f86', '#4d74b0', '#8d5a3b', '#d88d34'].map((c) => new THREE.MeshStandardMaterial({ color: c, map: tiles, roughness: 0.55 }));
    const rims = ['#d9642d', '#b8412f', '#2f8a70', '#3f6db3', '#e0a13a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
    const cloths = ['#2f4f8a', '#8a2f2f', '#2f6f5a', '#6a3f7a'];
    const shops = cloths.map((c) => new THREE.MeshStandardMaterial({ map: groundTexture('shop', c, random), roughness: 0.85 }));
    const doors = [0, 1].map(() => new THREE.MeshStandardMaterial({ map: groundTexture('door', '#000', random), roughness: 0.9 }));
    const awnings = ['#c9432f', '#2f6fb0', '#2f8a5a', '#d88d34'].map((c) => new THREE.MeshStandardMaterial({ map: awningTexture(c), roughness: 0.9, side: THREE.DoubleSide }));
    const signs = [['ラーメン', '#f1e6cf', '#8a1f1a'], ['茶屋', '#2c2420', '#f3e3c0'], ['薬', '#f1e6cf', '#1f3a6a'], ['宿', '#6a1f1a', '#f7ecd6'], ['団子', '#f1e6cf', '#2a5a2a'], ['本', '#2c2420', '#f3e3c0'], ['忍具', '#1f3a6a', '#f7ecd6']].map(([t, bg, fg]) => new THREE.MeshStandardMaterial({ map: signTexture(t, bg, fg), roughness: 0.8 }));
    const wood = new THREE.MeshStandardMaterial({ color: '#6b4a33', roughness: 0.8 });
    const darkWood = new THREE.MeshStandardMaterial({ color: '#43302a', roughness: 0.85 });
    const stave = new THREE.MeshStandardMaterial({ map: tex(128, 64, (ctx, w, h) => {
        for (let x = 0; x < w; x += 8) {
            ctx.fillStyle = `hsl(28, 35%, ${46 + random() * 12}%)`;
            ctx.fillRect(x, 0, 8, h);
            ctx.fillStyle = 'rgba(0,0,0,.25)';
            ctx.fillRect(x, 0, 1, h);
        }
    }), roughness: 0.8 });
    const metal = new THREE.MeshStandardMaterial({ color: '#4c5157', roughness: 0.45, metalness: 0.7 });
    const wire = new THREE.MeshStandardMaterial({ color: '#1d1b1a', roughness: 0.6 });
    const lantern = new THREE.MeshStandardMaterial({ color: '#d8402c', roughness: 0.6, emissive: '#b8301c', emissiveIntensity: 0.35 });
    const bark = new THREE.MeshStandardMaterial({ color: '#6a4c36', roughness: 0.95 });
    const inner = new THREE.MeshStandardMaterial({ color: '#3f6e2e', roughness: 1 });
    const pick = (list) => list[Math.floor(random() * list.length)];

    /* ----- Sol, rues ----- */
    const grassTex = grassTexture(random);
    grassTex.repeat.set(70, 70);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(200, 64), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    group.add(ground);
    const dirtTex = dirtTexture(random);
    const dirt = new THREE.MeshStandardMaterial({ map: dirtTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const streetsX = [];
    const streetsZ = [];
    for (let x = -110; x <= 110; x += 22) streetsX.push(x);
    for (let z = 30; z >= -110; z -= 22) streetsZ.push(z);
    const road = new Batch();
    const plane = (w, d, tw) => {
        const g = new THREE.PlaneGeometry(w, d);
        g.rotateX(-Math.PI / 2);
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * w / tw, uv.getY(i) * d / tw);
        return g;
    };
    streetsZ.forEach((z) => road.add(plane(232, 5.5, 6), dirt, I, 0, 0.02, z));
    streetsX.forEach((x) => road.add(plane(5.5, 150, 6), dirt, I, x, 0.03, -40, 0, 0, 0));
    road.build(group, { cast: false });

    /* ----- Lieux à éviter : le rocher, la tour du Hokage, la pagode ----- */
    const landmarks = [[0, 0, 15], [4, -52, 17], [-24, -62, 11]];
    const free = (x, z, r) => landmarks.every(([lx, lz, lr]) => Math.hypot(x - lx, z - lz) > lr + r) && !(z > -6 && Math.abs(x) < 30);

    /* ----- Maisons ----- */
    const base = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const up = V(0, 1, 0);
    function house(x, z, facing, far) {
        const nw = random() < 0.55 ? 2 : 3;
        const W = nw * 3;
        const D = random() < 0.6 ? 6 : 9;
        const floors = [1, 2, 2, 2, 3, 3, 3, 4][Math.floor(random() * 8)];
        const H = floors * 3;
        q.setFromAxisAngle(up, facing);
        base.compose(V(x, 0, z), q, V(1, 1, 1));
        const pi = Math.floor(random() * plasters.length);
        const B = far ? farBatch : batch;
        const add = (geo, m, ...t) => B.add(geo, m, base, ...t);
        // Murs (texture de travées) et rez-de-chaussée en façade.
        add(box(W, H, D), bays[pi][Math.floor(random() * 2)], 0, H / 2, 0);
        const shop = random() < 0.55;
        const front = new THREE.PlaneGeometry(W - 0.4, 2.9);
        const fuv = front.attributes.uv;
        if (!shop) for (let i = 0; i < fuv.count; i++) fuv.setX(i, fuv.getX(i) * (W - 0.4) / 6);
        add(front, shop ? pick(shops) : pick(doors), 0, 1.45, D / 2 + 0.02);
        // Poutres d'étage et poteaux d'angle, en relief.
        for (let k = 1; k <= floors; k++) {
            const y = k * 3 - 0.12;
            add(box(W + 0.3, 0.24, 0.22), darkWood, 0, y, D / 2 + 0.04);
            add(box(W + 0.3, 0.24, 0.22), darkWood, 0, y, -D / 2 - 0.04);
            add(box(0.22, 0.24, D + 0.3), darkWood, W / 2 + 0.04, y, 0);
            add(box(0.22, 0.24, D + 0.3), darkWood, -W / 2 - 0.04, y, 0);
        }
        if (!far) [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(box(0.26, H, 0.26), wood, sx * (W / 2 + 0.02), H / 2, sz * (D / 2 + 0.02)));
        // Auvent de toile rayée au-dessus de la boutique.
        if (shop || random() < 0.3) {
            add(box(W * 0.9, 0.05, 1.5), pick(awnings), 0, 2.72, D / 2 + 0.7, 0.34);
            if (!far && random() < 0.6) {
                [-1, 1].forEach((s) => {
                    add(new THREE.SphereGeometry(0.2, 14, 10), lantern, s * W * 0.34, 2.05, D / 2 + 1.25, 0, 0, 0, 1, 1.3, 1);
                    add(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 12), darkWood, s * W * 0.34, 2.33, D / 2 + 1.25);
                });
            }
        }
        // Enseigne verticale.
        if (!far && floors >= 2 && random() < 0.45) {
            const sx = (random() < 0.5 ? -1 : 1) * (W / 2 - 0.5);
            add(box(0.12, 1.9, 0.62, 0.62, 1.9), pick(signs), sx, 4.1, D / 2 + 0.45, 0, Math.PI / 2);
            add(box(0.06, 0.06, 0.7), darkWood, sx, 5.1, D / 2 + 0.35);
        }
        // Balcon de bois à l'étage.
        if (floors >= 2 && random() < 0.55) {
            const bw = W * (random() < 0.5 ? 0.7 : 1);
            const y = 3;
            const bz = D / 2 + 0.6;
            add(box(bw, 0.14, 1.2, 1, 1), wood, 0, y, bz);
            add(box(bw, 0.08, 0.08), wood, 0, y + 0.95, bz + 0.56);
            [-1, 1].forEach((s) => {
                add(box(0.08, 0.08, 1.1), wood, s * (bw / 2 - 0.04), y + 0.95, bz);
                add(box(0.14, 0.14, 0.9), darkWood, s * (bw / 2 - 0.3), y - 0.3, bz - 0.2, -0.6);
            });
            if (far) {
                add(box(bw, 0.8, 0.04), wood, 0, y + 0.5, bz + 0.56);
            } else {
                for (let bx = -bw / 2 + 0.1; bx <= bw / 2 - 0.05; bx += 0.28) add(box(0.05, 0.85, 0.05), wood, bx, y + 0.5, bz + 0.56);
                // Du linge qui sèche parfois.
                if (random() < 0.35) add(box(0.9, 0.7, 0.02, 1, 1), pick(awnings), -bw * 0.2, y + 0.6, bz + 0.6);
            }
        }
        // Toit : à deux pans en tuiles, ou plat bordé de couleur avec réservoir.
        if (random() < 0.5) {
            const ov = 0.6;
            const h = D * 0.24;
            const a = Math.atan2(h, D / 2);
            const L = (D / 2 + ov) / Math.cos(a);
            const roof = pick(roofs);
            [1, -1].forEach((s) => {
                const cy = H + h - Math.sin(a) * L / 2;
                const cz = s * Math.cos(a) * L / 2;
                add(box(W + ov * 2, 0.16, L, 2, 2), roof, 0, cy + 0.08, cz, s * a);
            });
            add(new THREE.CylinderGeometry(0.16, 0.16, W + ov * 2 + 0.1, 12), roof, 0, H + h + 0.14, 0, 0, 0, Math.PI / 2);
            add(gable(W, D, h), plainWalls[pi], 0, H, 0);
        } else {
            const rim = pick(rims);
            add(box(W + 0.5, 0.36, D + 0.5, 3, 1), rim, 0, H + 0.18, 0);
            add(box(W + 0.1, 0.06, D + 0.1), plainWalls[pi], 0, H + 0.37, 0);
            if (random() < 0.75) tank(add, (random() - 0.5) * (W - 2.4), H + 0.4, (random() - 0.5) * (D - 2.4), far);
            if (random() < 0.3) {
                // Petite cabane d'accès au toit.
                add(box(2, 2, 2), plainWalls[pi], W / 2 - 1.3, H + 1.4, -D / 2 + 1.3);
                add(box(2.4, 0.2, 2.4), rim, W / 2 - 1.3, H + 2.5, -D / 2 + 1.3);
            }
        }
    }
    // Réservoir d'eau rond, en douelles de bois cerclées, sur quatre pieds.
    function tank(add, x, y, z, far) {
        const r = 0.9 + random() * 0.45;
        const h = 1.6 + random() * 0.6;
        const legs = 1.1;
        [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(box(0.12, legs, 0.12), darkWood, x + sx * r * 0.62, y + legs / 2, z + sz * r * 0.62));
        add(new THREE.CylinderGeometry(r + 0.1, r + 0.1, 0.12, 24), darkWood, x, y + legs, z);
        const body = new THREE.CylinderGeometry(r, r, h, 28, 1, true);
        const uv = body.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 4);
        add(body, stave, x, y + legs + h / 2 + 0.06, z);
        if (!far) [0.25, 0.75].forEach((k) => add(new THREE.CylinderGeometry(r + 0.025, r + 0.025, 0.07, 28, 1, true), metal, x, y + legs + 0.06 + h * k, z));
        add(new THREE.ConeGeometry(r * 1.1, 0.7, 28), pick(roofs), x, y + legs + h + 0.41, z);
        add(new THREE.SphereGeometry(0.1, 10, 8), metal, x, y + legs + h + 0.8, z);
    }

    const lots = [];
    for (let i = 0; i < streetsX.length - 1; i++) {
        for (let j = 0; j < streetsZ.length - 1; j++) {
            const x0 = streetsX[i] + 2.75;
            const x1 = streetsX[i + 1] - 2.75;
            const z0 = streetsZ[j] - 2.75;
            const z1 = streetsZ[j + 1] + 2.75;
            // Quatre parcelles par îlot, chacune tournée vers la rue la plus proche.
            [[0.25, 0.25], [0.75, 0.25], [0.25, 0.75], [0.75, 0.75]].forEach(([u, v]) => {
                const x = x0 + (x1 - x0) * u;
                const z = z0 + (z1 - z0) * v;
                lots.push({ x, z, facing: v < 0.5 ? 0 : Math.PI });
            });
        }
    }
    lots.forEach((lot) => {
        const d = Math.hypot(lot.x, lot.z);
        if (d > 125 || !free(lot.x, lot.z, 5)) return;
        if (random() < 0.14) {
            // Jardin : un grand arbre à la place d'une maison.
            tree(lot.x + (random() - 0.5) * 3, lot.z + (random() - 0.5) * 3, 1 + random() * 0.4, d > 45);
            return;
        }
        house(lot.x + (random() - 0.5) * 1.2, lot.z + (random() - 0.5) * 0.8, lot.facing + (random() - 0.5) * 0.06, d > 45 || low);
        if (random() < 0.3) tree(lot.x + (random() < 0.5 ? -1 : 1) * 6.2, lot.z + (random() - 0.5) * 4, 0.7 + random() * 0.3, d > 45);
    });

    /* ----- Arbres ----- */
    function tree(x, z, scale, far) {
        const H = (3.2 + random() * 2.5) * scale;
        const R = (2.2 + random() * 1) * scale;
        const lean = (random() - 0.5) * 0.12;
        const B = far ? farBatch : batch;
        B.add(new THREE.CylinderGeometry(0.22 * scale, 0.42 * scale, H + R * 0.5, 10), bark, I, x, (H + R * 0.5) / 2, z, lean, 0, lean);
        const top = V(x, H + R * 0.55, z);
        const blobs = [[0, 0.25, 0, 1], [0.75, -0.1, 0.2, 0.72], [-0.7, -0.05, -0.2, 0.7], [0.1, -0.15, 0.8, 0.66], [-0.1, 0.1, -0.75, 0.68], [0.05, 0.75, 0.05, 0.62]];
        (far ? blobs.slice(0, 4) : blobs).forEach(([bx, by, bz, br], k) => {
            const c = top.clone().add(V(bx * R, by * R, bz * R));
            const r = R * br * (far ? 1.1 : 1);
            B.add(new THREE.SphereGeometry(r * 0.68, 12, 9), inner, I, c.x, c.y, c.z);
            if (!far && k > 0 && k < 5) B.add(new THREE.CylinderGeometry(0.06 * scale, 0.14 * scale, r * 1.2, 7), bark, I, (x + c.x) / 2, H * 0.85, (z + c.z) / 2, bz * 0.9, 0, -bx * 0.9);
            (far ? farFoliage : foliage).blob(c, r, far ? 14 : 34, (far ? 2.6 : 1.75) * Math.max(0.8, scale), 1);
        });
    }
    // Arbres autour du rocher (en dessous de lui), et forêt en bordure du village.
    [[-13, -8], [14, -9], [-17, 3], [18, 2]].forEach(([x, z]) => tree(x, z, 1 + random() * 0.25, false));
    for (let i = 0; i < 70; i++) {
        const a = -Math.PI / 2 + (random() - 0.5) * Math.PI * 1.25;
        const r = 128 + random() * 30;
        tree(Math.cos(a) * r, Math.sin(a) * r, 1.6 + random() * 0.8, true);
    }

    /* ----- Poteaux électriques et fils ----- */
    const poleTops = [];
    streetsZ.slice(1, 6).forEach((z) => {
        const row = [];
        for (let x = -104; x <= 104; x += 13) {
            const px = x + (random() - 0.5);
            const pz = z + 3.1;
            if (!free(px, pz, 1.5)) {
                if (row.length > 1) poleTops.push(row.splice(0));
                row.length = 0;
                continue;
            }
            batch.add(new THREE.CylinderGeometry(0.1, 0.14, 8, 8), darkWood, I, px, 4, pz);
            // Traverse perpendiculaire à la rue, trois isolateurs.
            batch.add(box(0.12, 0.12, 1.8), darkWood, I, px, 7.4, pz);
            [-0.75, 0, 0.75].forEach((dz) => batch.add(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 6), metal, I, px, 7.54, pz + dz));
            row.push(V(px, 7.6, pz));
        }
        if (row.length > 1) poleTops.push(row);
    });
    // Fils qui pendent d'un poteau à l'autre (chaînette).
    poleTops.forEach((row) => {
        for (let k = 0; k < row.length - 1; k++) {
            const a = row[k];
            const b = row[k + 1];
            if (a.distanceTo(b) > 16) continue;
            [-0.75, 0, 0.75].forEach((dz) => {
                const pts = [];
                for (let s = 0; s <= 8; s++) {
                    const t = s / 8;
                    pts.push(V(a.x + (b.x - a.x) * t, a.y - Math.sin(Math.PI * t) * 0.55, a.z + (b.z - a.z) * t + dz));
                }
                batch.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.022, 4, false), wire, I);
            });
        }
    });

    /* ----- La tour du Hokage (bâtiment rond rouge et vert) ----- */
    const towerMat = new THREE.MeshStandardMaterial({ map: towerTexture(random), roughness: 0.8 });
    const green = new THREE.MeshStandardMaterial({ color: '#2f7d55', roughness: 0.55 });
    const cream = new THREE.MeshStandardMaterial({ color: '#efe3c8', roughness: 0.9 });
    const tower = new THREE.Matrix4().makeTranslation(4, 0, -52);
    [[9, 9, 0], [7, 6, 9.8], [5, 3.6, 16.6]].forEach(([r, h, y]) => {
        const g = new THREE.CylinderGeometry(r, r, h, 64, 1, true);
        const uv = g.attributes.uv;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.round(2 * Math.PI * r / 4), uv.getY(i) * h / 4.5);
        farBatch.add(g, towerMat, tower, 0, y + h / 2, 0);
        farBatch.add(new THREE.CylinderGeometry(r + 1, r + 1, 0.7, 64), green, tower, 0, y + h + 0.3, 0);
        const lip = new THREE.TorusGeometry(r + 1, 0.36, 12, 64);
        farBatch.add(lip, green, tower, 0, y + h + 0.3, 0, Math.PI / 2);
        farBatch.add(new THREE.CylinderGeometry(r + 0.3, r + 0.3, 0.5, 64), cream, tower, 0, y + 0.25, 0);
    });
    farBatch.add(new THREE.CylinderGeometry(0.12, 0.12, 5, 8), metal, tower, 2, 22.5, 0);
    farBatch.add(new THREE.CylinderGeometry(0.1, 0.1, 3.5, 8), metal, tower, -1.5, 21.8, 1);
    const fire = new THREE.Mesh(new THREE.CircleGeometry(2.1, 40), new THREE.MeshStandardMaterial({ map: tex(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f4ecd8';
        ctx.beginPath();
        ctx.arc(128, 128, 126, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#b8261c';
        ctx.font = '700 170px "Yuji Syuku", serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('火', 128, 138);
    }, false), roughness: 0.7 }));
    fire.position.set(4, 13, -52 + 7.05);
    group.add(fire);

    /* ----- Pagode à cinq toits ----- */
    const pagoda = new THREE.Matrix4().makeTranslation(-24, 0, -62);
    for (let k = 0; k < 5; k++) {
        const w = 6 - k * 0.85;
        farBatch.add(box(w, 2.6, w), bays[0][0], pagoda, 0, 1.3 + k * 3.1, 0);
        const roof = new THREE.CylinderGeometry(w * 0.3, w * 1.02, 0.9, 4, 1).toNonIndexed();
        roof.computeVertexNormals();
        farBatch.add(roof, roofs[1], pagoda, 0, 3.05 + k * 3.1, 0, 0, Math.PI / 4);
    }
    farBatch.add(new THREE.CylinderGeometry(0.08, 0.2, 3.4, 10), metal, pagoda, 0, 17.3, 0);

    /* ----- La falaise et le mont des Hokage ----- */
    const stoneTex = stoneTexture(random);
    stoneTex.repeat.set(14, 3);
    const cliffGeo = new THREE.CylinderGeometry(118, 124, 50, 220, 24, true, Math.PI * 0.42, Math.PI * 1.16);
    const cp = cliffGeo.attributes.position;
    const tmp = V();
    for (let i = 0; i < cp.count; i++) {
        tmp.fromBufferAttribute(cp, i);
        const a = Math.atan2(tmp.x, tmp.z);
        const y = tmp.y;
        // Strates verticales et bosses : la roche est sculptée, pas plate.
        const bump = Math.sin(a * 90) * 0.7 + Math.sin(a * 37 + y * 0.2) * 1.2 + Math.sin(a * 13 + 1.3) * 2 + Math.sin(y * 0.35 + a * 5) * 0.8;
        const k = 1 - bump / 118;
        tmp.x *= k;
        tmp.z *= k;
        cp.setXYZ(i, tmp.x, tmp.y, tmp.z);
    }
    cliffGeo.computeVertexNormals();
    const cliff = new THREE.Mesh(cliffGeo, new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.95, side: THREE.DoubleSide }));
    cliff.position.set(0, 25, 10);
    cliff.receiveShadow = true;
    group.add(cliff);
    const stone = new THREE.MeshStandardMaterial({ map: stoneTexture(random), color: '#e8dcc8', roughness: 0.9 });
    const stoneDark = new THREE.MeshStandardMaterial({ map: stoneTex, color: '#8a7863', roughness: 1 });
    [-0.2, -0.067, 0.067, 0.2].forEach((da, k) => {
        const a = Math.PI + da;
        const head = new THREE.Object3D();
        head.position.set(Math.sin(a) * 110, 30, Math.cos(a) * 110 + 10);
        head.lookAt(0, 30, 10);
        head.updateMatrix();
        const m = head.matrix;
        const add = (geo, mat, ...t) => farBatch.add(geo, mat, m, ...t);
        add(new THREE.SphereGeometry(8, 48, 36), stone, 0, 0, 0, 0, 0, 0, 0.82, 1.02, 0.6);
        add(new THREE.CapsuleGeometry(1.05, 6.8, 10, 20), stone, 0, 1.9, 3.9, 0, 0, Math.PI / 2, 1, 1, 0.6);
        [-1, 1].forEach((s) => {
            add(new THREE.SphereGeometry(1.4, 24, 16), stoneDark, s * 2.7, 0.6, 3.75, 0, 0, s * 0.12, 1.35, 0.55, 0.45);
            add(new THREE.SphereGeometry(2.3, 24, 16), stone, s * 3.3, -2, 2.8, 0, 0, 0, 1, 1, 0.55);
            add(new THREE.SphereGeometry(1.6, 20, 14), stone, s * 6.3, 0.2, 0.4, 0, 0, 0, 0.45, 1, 0.7);
        });
        add(new THREE.CapsuleGeometry(0.95, 1.9, 10, 16), stone, 0, -0.9, 4.25, -0.2, 0, 0, 0.85, 1, 0.75);
        add(new THREE.CapsuleGeometry(0.28, 2.6, 8, 12), stoneDark, 0, -4.1, 4.05, 0, 0, Math.PI / 2, 1, 1, 0.6);
        add(new THREE.SphereGeometry(2.6, 24, 18), stone, 0, -5.8, 2.7, 0, 0, 0, 1, 0.8, 0.7);
        // Chevelures : pointes, mèches longues, casque ou coiffe arrondie.
        if (k === 0 || k === 3) {
            for (let i = 0; i < 9; i++) {
                const t = (i / 8 - 0.5) * 2.6;
                add(new THREE.ConeGeometry(1.9, 5.5, 20), stone, Math.sin(t) * 6.2, 5.6 + Math.cos(t) * 2.2, 1.2 + (i % 2) * 0.8, 0, 0, -t * 0.9);
            }
        } else if (k === 1) {
            add(new THREE.CapsuleGeometry(3.2, 9, 10, 24), stone, 0, 4.4, 0.8, 0, 0, Math.PI / 2, 1, 0.75, 0.9);
            [-1, 1].forEach((s) => add(new THREE.CapsuleGeometry(1.6, 8, 10, 16), stone, s * 6.8, -1.5, 0.8, 0, 0, s * 0.1));
        } else {
            add(new THREE.SphereGeometry(8.4, 40, 20, 0, Math.PI * 2, 0, Math.PI * 0.42), stone, 0, 0.8, 0.2, -0.15, 0, 0, 0.86, 1, 0.72);
            add(new THREE.TorusGeometry(6.4, 0.9, 12, 40, Math.PI), stone, 0, 3.4, 3.2, 0.3, 0, 0, 1, 0.8, 1);
        }
    });
    // Forêt sur le haut de la falaise.
    for (let i = 0; i < 60; i++) {
        const a = Math.PI * 0.44 + (i / 59) * Math.PI * 1.12 + (random() - 0.5) * 0.03;
        const r = 122 + random() * 6;
        const x = Math.sin(a) * r;
        const z = Math.cos(a) * r + 10;
        const R = 5 + random() * 3;
        const c = V(x, 50 + random() * 2, z);
        farBatch.add(new THREE.SphereGeometry(R * 0.8, 12, 9), inner, I, c.x, c.y, c.z);
        farFoliage.blob(c, R, 20, 3.8, 1.05);
        farFoliage.blob(c.clone().add(V((random() - 0.5) * 6, R * 0.5, (random() - 0.5) * 4)), R * 0.7, 12, 3.4, 1.1);
    }

    batch.build(group);
    farBatch.build(group, { cast: false });
    const leaves = foliage.build(group, time);
    farFoliage.build(group, time).castShadow = false;

    /* ----- Villageois qui marchent dans les rues ----- */
    const walkers = [];
    const people = 46;
    const bodyGeo = new THREE.CapsuleGeometry(0.22, 0.85, 6, 12);
    bodyGeo.translate(0, 0.65, 0);
    const headGeo = new THREE.SphereGeometry(0.15, 14, 10);
    headGeo.translate(0, 1.42, 0);
    const bodies = new THREE.InstancedMesh(bodyGeo, new THREE.MeshStandardMaterial({ roughness: 0.85 }), people);
    const heads = new THREE.InstancedMesh(headGeo, new THREE.MeshStandardMaterial({ roughness: 0.7 }), people);
    const robes = ['#2b3a67', '#6a2f3a', '#3f5f3a', '#7a5a2e', '#e8e2d4', '#4a4a52', '#1f2a44', '#8a3c2a'];
    const hairs = ['#1c1410', '#3a2618', '#d9c27a', '#6a3a22', '#2a2a30', '#b8452f'];
    const color = new THREE.Color();
    for (let i = 0; i < people; i++) {
        const alongX = random() < 0.6;
        const lines = alongX ? streetsZ.slice(1, 6) : streetsX.filter((x) => Math.abs(x) < 70);
        const line = lines[Math.floor(random() * lines.length)] + (random() < 0.5 ? -1 : 1) * (0.8 + random() * 1.2);
        walkers.push({ alongX, line, pos: (random() - 0.5) * 180, speed: (0.9 + random() * 0.8) * (random() < 0.5 ? -1 : 1), phase: random() * 6 });
        bodies.setColorAt(i, color.set(robes[Math.floor(random() * robes.length)]));
        heads.setColorAt(i, color.set(hairs[Math.floor(random() * hairs.length)]));
    }
    [bodies, heads].forEach((m) => {
        m.castShadow = true;
        m.frustumCulled = false;
        group.add(m);
    });
    const dummy = new THREE.Object3D();
    function walk(dt, t) {
        walkers.forEach((w, i) => {
            w.pos += w.speed * dt;
            const limit = w.alongX ? 105 : 60;
            if (w.pos > limit) w.pos = -limit;
            if (w.pos < -limit) w.pos = limit;
            const x = w.alongX ? w.pos : w.line;
            const z = w.alongX ? w.line : -40 + w.pos;
            // On évite le rocher et les grands bâtiments : on se cache sous le sol.
            const hidden = !free(x, z, 0.5);
            dummy.position.set(x, hidden ? -3 : Math.abs(Math.sin(t * 5.5 + w.phase)) * 0.06, z);
            dummy.rotation.set(0, w.alongX ? (w.speed > 0 ? Math.PI / 2 : -Math.PI / 2) : (w.speed > 0 ? 0 : Math.PI), Math.sin(t * 5.5 + w.phase) * 0.04);
            dummy.updateMatrix();
            bodies.setMatrixAt(i, dummy.matrix);
            heads.setMatrixAt(i, dummy.matrix);
        });
        bodies.instanceMatrix.needsUpdate = true;
        heads.instanceMatrix.needsUpdate = true;
    }

    /* ----- Oiseaux qui tournent au-dessus du village ----- */
    const birdGeo = new THREE.BufferGeometry();
    birdGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.25, -0.9, 0.15, -0.1, 0, 0, -0.2, 0, 0, 0.25, 0.9, 0.15, -0.1, 0, 0, -0.2], 3));
    birdGeo.computeVertexNormals();
    const birdMat = new THREE.MeshBasicMaterial({ color: '#2a2622', side: THREE.DoubleSide });
    const birds = Array.from({ length: 9 }, (_, i) => {
        const b = new THREE.Mesh(birdGeo.clone(), birdMat);
        b.userData = { r: 25 + random() * 30, h: 26 + random() * 14, w: 0.18 + random() * 0.12, a: random() * 6.28, cx: (random() - 0.5) * 40, cz: -45 + (random() - 0.5) * 30, flap: 7 + random() * 3 };
        b.scale.setScalar(0.9 + (i % 3) * 0.2);
        group.add(b);
        return b;
    });
    function fly(dt, t) {
        birds.forEach((b) => {
            const u = b.userData;
            const a = u.a + t * u.w;
            b.position.set(u.cx + Math.cos(a) * u.r, u.h + Math.sin(t * 0.7 + u.a) * 1.5, u.cz + Math.sin(a) * u.r);
            b.rotation.set(0, -a, 0.35);
            const f = Math.sin(t * u.flap + u.a);
            const p = b.geometry.attributes.position;
            p.setY(1, 0.15 + f * 0.45);
            p.setY(4, 0.15 + f * 0.45);
            p.needsUpdate = true;
        });
    }

    return {
        group,
        update(dt, t) {
            time.value = t;
            walk(dt, t);
            fly(dt, t);
        },
        leaves
    };
}

/* ---------------- Herbe du rocher : brins instanciés ---------------- */
export function buildGrass(radius, count, random) {
    // Un brin : ruban effilé, légèrement courbé, en trois segments.
    const g = new THREE.BufferGeometry();
    const pos = [];
    const col = [];
    const uv = [];
    const idx = [];
    const seg = 3;
    for (let i = 0; i <= seg; i++) {
        const t = i / seg;
        const w = 0.5 * (1 - t) + 0.04;
        const bend = t * t * 0.35;
        pos.push(-w * 0.1, t, bend, w * 0.1, t, bend);
        const c = new THREE.Color('#2f5220').lerp(new THREE.Color('#a6cf62'), Math.pow(t, 0.8));
        col.push(c.r, c.g, c.b, c.r, c.g, c.b);
        uv.push(0, t, 1, t);
        if (i < seg) {
            const a = i * 2;
            idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
        }
    }
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(pos.length).fill(0).map((_, i) => (i % 3 === 1 ? 1 : 0)), 3));
    g.setIndex(idx);
    const time = { value: 0 };
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide });
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uTime = time;
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nuniform float uTime;')
            .replace('#include <begin_vertex>', '#include <begin_vertex>\nvec3 ip = instanceMatrix[3].xyz;\nfloat sway = sin(uTime * 2.1 + ip.x * 1.7 + ip.z * 1.3) * 0.5 + sin(uTime * 3.3 + ip.z * 2.9) * 0.2;\ntransformed.z += sway * position.y * position.y * 0.35;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize( vNormal );');
    };
    const mesh = new THREE.InstancedMesh(g, material, count);
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    for (let i = 0; i < count; i++) {
        const a = random() * Math.PI * 2;
        const r = Math.sqrt(random()) * radius;
        dummy.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        dummy.rotation.set(0, random() * Math.PI * 2, 0);
        const h = 0.07 + random() * 0.12;
        dummy.scale.set(0.12 + random() * 0.08, h, h);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        const k = random();
        color.setRGB(0.85 + k * 0.3, 0.9 + k * 0.2, 0.7 + random() * 0.3);
        mesh.setColorAt(i, color);
    }
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    return { mesh, update(t) { time.value = t; } };
}
