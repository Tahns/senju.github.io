/*
 * Textures dessinées au canvas (aucun fichier image) : tatamis, bois, papier
 * de shoji, couvertures des carnets, couverture de futon, rouleau suspendu…
 */
import * as THREE from 'three';

// Emblème de Konoha (même tracé que dans index.html).
const KONOHA = 'M95 8 L84 20 C58 8 24 22 16 50 C12 62 8 70 3 78 C22 86 44 88 60 87 C80 86 94 72 94 55 C94 37 79 25 62 25 C45 25 34 37 34 51 C34 64 45 72 57 72 C69 72 77 64 77 54 C77 45 70 39 62 39 C55 39 50 44 50 51 C50 57 55 60 60 60 C65 60 67 56 66 53';

let anisotropy = 4;
export function setAnisotropy(value) {
    anisotropy = value;
}

// Générateur pseudo-aléatoire déterministe : la chambre est la même à chaque visite.
export function rng(seed) {
    let s = seed >>> 0;
    return () => {
        s = (s + 0x6d2b79f5) >>> 0;
        let t = s;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function canvasTexture(width, height, draw, { repeat = null, color = true } = {}) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    draw(ctx, width, height);
    const texture = new THREE.CanvasTexture(canvas);
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = anisotropy;
    if (repeat) {
        texture.wrapS = THREE.RepeatWrapping;
        texture.wrapT = THREE.RepeatWrapping;
        texture.repeat.set(repeat[0], repeat[1]);
    }
    return texture;
}

function noise(ctx, w, h, amount, random, size = 1) {
    for (let i = 0; i < w * h * amount; i++) {
        const v = random();
        ctx.fillStyle = v > 0.5 ? 'rgba(255,255,255,' + (v - 0.5) * 0.12 + ')' : 'rgba(0,0,0,' + (0.5 - v) * 0.14 + ')';
        ctx.fillRect(random() * w, random() * h, size, size);
    }
}

function konoha(ctx, x, y, size, color, width) {
    ctx.save();
    ctx.translate(x - size / 2, y - size / 2);
    ctx.scale(size / 104, size / 100);
    ctx.translate(4, 4);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke(new Path2D(KONOHA));
    ctx.restore();
}

/* ------------------------------------------------------------------ */
/* Sol, murs, plafond                                                  */
/* ------------------------------------------------------------------ */

// Tatamis de 0,9 × 1,8 m, disposés sur un sol de 5 × 6 m.
export function tatami() {
    const random = rng(7);
    const scale = 200; // pixels par mètre
    return canvasTexture(5 * scale, 6 * scale, (ctx, w, h) => {
        ctx.fillStyle = '#6b5a3a';
        ctx.fillRect(0, 0, w, h);
        const mats = [];
        // Rangées de tatamis en long, avec une rangée en travers au milieu.
        for (let x = 0; x < 5; x += 0.9) mats.push([x, 0, 0.9, 1.8], [x, 4.2, 0.9, 1.8]);
        for (let z = 1.8; z < 4.2; z += 0.9) {
            for (let x = 0; x < 5; x += 1.8) mats.push([x, z, 1.8, 0.9]);
        }
        mats.forEach(([mx, mz, mw, md]) => {
            const x0 = mx * scale;
            const z0 = mz * scale;
            const x1 = Math.min(w, (mx + mw) * scale);
            const z1 = Math.min(h, (mz + md) * scale);
            const tone = 0.92 + random() * 0.12;
            ctx.fillStyle = 'rgb(' + [190 * tone, 176 * tone, 118 * tone].map(Math.round).join(',') + ')';
            ctx.fillRect(x0 + 1, z0 + 1, x1 - x0 - 2, z1 - z0 - 2);
            // Tressage : fines lignes perpendiculaires au grand côté.
            const along = mw > md;
            ctx.strokeStyle = 'rgba(90,80,40,.22)';
            ctx.lineWidth = 1;
            for (let t = along ? x0 : z0; t < (along ? x1 : z1); t += 3) {
                ctx.beginPath();
                if (along) {
                    ctx.moveTo(t, z0);
                    ctx.lineTo(t, z1);
                } else {
                    ctx.moveTo(x0, t);
                    ctx.lineTo(x1, t);
                }
                ctx.stroke();
            }
            // Bordures en tissu (heri) sur les grands côtés.
            ctx.fillStyle = '#1d2233';
            const b = 0.035 * scale;
            if (along) {
                ctx.fillRect(x0, z0, x1 - x0, b);
                ctx.fillRect(x0, z1 - b, x1 - x0, b);
            } else {
                ctx.fillRect(x0, z0, b, z1 - z0);
                ctx.fillRect(x1 - b, z0, b, z1 - z0);
            }
        });
        noise(ctx, w, h, 0.25, random);
    });
}

export function wood({ base = '#6e4a2c', dark = '#3f2816', light = '#8b6240', planks = 6, vertical = true, seed = 3, width = 512, height = 512, repeat = null } = {}) {
    const random = rng(seed);
    return canvasTexture(width, height, (ctx, w, h) => {
        ctx.fillStyle = base;
        ctx.fillRect(0, 0, w, h);
        const size = (vertical ? w : h) / planks;
        for (let p = 0; p < planks; p++) {
            const shade = random();
            ctx.fillStyle = shade > 0.5 ? light : dark;
            ctx.globalAlpha = 0.12 + random() * 0.18;
            if (vertical) ctx.fillRect(p * size, 0, size, h);
            else ctx.fillRect(0, p * size, w, size);
            ctx.globalAlpha = 1;
            // Veinage.
            ctx.strokeStyle = dark;
            for (let g = 0; g < 14; g++) {
                ctx.globalAlpha = 0.08 + random() * 0.18;
                ctx.lineWidth = 0.6 + random() * 1.4;
                ctx.beginPath();
                const offset = p * size + random() * size;
                const amp = 2 + random() * 5;
                const freq = 0.004 + random() * 0.01;
                for (let t = 0; t <= (vertical ? h : w); t += 8) {
                    const d = offset + Math.sin(t * freq + g) * amp;
                    if (vertical) ctx.lineTo(d, t);
                    else ctx.lineTo(t, d);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 0.55;
            ctx.fillStyle = dark;
            if (vertical) ctx.fillRect(p * size, 0, 2, h);
            else ctx.fillRect(0, p * size, w, 2);
            ctx.globalAlpha = 1;
        }
        noise(ctx, w, h, 0.15, random);
    }, { repeat });
}

export function plaster(repeat) {
    const random = rng(11);
    return canvasTexture(512, 512, (ctx, w, h) => {
        ctx.fillStyle = '#cdb896';
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 1400; i++) {
            ctx.fillStyle = random() > 0.5 ? 'rgba(255,245,225,.05)' : 'rgba(90,70,40,.05)';
            const r = 2 + random() * 14;
            ctx.beginPath();
            ctx.arc(random() * w, random() * h, r, 0, Math.PI * 2);
            ctx.fill();
        }
        // Paille dans l'enduit (tsuchikabe).
        ctx.strokeStyle = 'rgba(120,90,40,.25)';
        for (let i = 0; i < 260; i++) {
            const x = random() * w;
            const y = random() * h;
            const a = random() * Math.PI;
            const l = 3 + random() * 8;
            ctx.lineWidth = 0.7;
            ctx.beginPath();
            ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
            ctx.stroke();
        }
        noise(ctx, w, h, 0.3, random);
    }, { repeat });
}

export function shojiPaper() {
    const random = rng(21);
    return canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#f1e8d4';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(160,140,100,.12)';
        for (let i = 0; i < 120; i++) {
            ctx.lineWidth = 0.5 + random();
            ctx.beginPath();
            const x = random() * w;
            const y = random() * h;
            ctx.moveTo(x, y);
            ctx.bezierCurveTo(x + random() * 30, y + random() * 10, x + random() * 20, y - random() * 10, x + random() * 40, y + random() * 6);
            ctx.stroke();
        }
        noise(ctx, w, h, 0.4, random);
    });
}

// Ciel de nuit vu par la fenêtre : lune, nuages, bambous en ombre chinoise.
export function nightSky() {
    const random = rng(33);
    return canvasTexture(512, 512, (ctx, w, h) => {
        const sky = ctx.createLinearGradient(0, 0, 0, h);
        sky.addColorStop(0, '#0b1330');
        sky.addColorStop(0.7, '#1c2a55');
        sky.addColorStop(1, '#2b3a66');
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, w, h);
        for (let i = 0; i < 140; i++) {
            ctx.fillStyle = 'rgba(255,255,255,' + (0.2 + random() * 0.7) + ')';
            ctx.fillRect(random() * w, random() * h * 0.7, 1.2, 1.2);
        }
        const moon = ctx.createRadialGradient(w * 0.62, h * 0.3, 10, w * 0.62, h * 0.3, 120);
        moon.addColorStop(0, 'rgba(255,250,230,1)');
        moon.addColorStop(0.28, 'rgba(250,240,210,1)');
        moon.addColorStop(0.31, 'rgba(200,210,255,.35)');
        moon.addColorStop(1, 'rgba(120,140,220,0)');
        ctx.fillStyle = moon;
        ctx.fillRect(0, 0, w, h);
        // Bambous.
        ctx.fillStyle = '#05070f';
        for (let b = 0; b < 5; b++) {
            const x = random() * w;
            const lean = (random() - 0.5) * 40;
            const bw = 6 + random() * 6;
            ctx.beginPath();
            ctx.moveTo(x, h);
            ctx.lineTo(x + lean, 0);
            ctx.lineTo(x + lean + bw, 0);
            ctx.lineTo(x + bw, h);
            ctx.fill();
            for (let l = 0; l < 7; l++) {
                const ly = random() * h * 0.8;
                const lx = x + lean * (1 - ly / h) + bw / 2;
                const dir = random() > 0.5 ? 1 : -1;
                ctx.beginPath();
                ctx.moveTo(lx, ly);
                ctx.quadraticCurveTo(lx + dir * 30, ly - 8, lx + dir * 60, ly + 10);
                ctx.quadraticCurveTo(lx + dir * 30, ly + 4, lx, ly);
                ctx.fill();
            }
        }
    });
}

/* ------------------------------------------------------------------ */
/* Livres                                                              */
/* ------------------------------------------------------------------ */

// Dos de livre générique en niveaux de gris (multiplié par la couleur du livre).
export function spineBands() {
    return canvasTexture(64, 256, (ctx, w, h) => {
        ctx.fillStyle = '#d8d8d8';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#ffffff';
        [0.1, 0.13, 0.84, 0.87].forEach((y) => ctx.fillRect(0, y * h, w, 3));
        ctx.fillStyle = 'rgba(255,255,255,.6)';
        ctx.fillRect(w * 0.3, h * 0.3, w * 0.4, h * 0.3);
        const shade = ctx.createLinearGradient(0, 0, w, 0);
        shade.addColorStop(0, 'rgba(0,0,0,.35)');
        shade.addColorStop(0.5, 'rgba(0,0,0,0)');
        shade.addColorStop(1, 'rgba(0,0,0,.35)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w, h);
    });
}

export function pageEdges() {
    return canvasTexture(128, 128, (ctx, w, h) => {
        ctx.fillStyle = '#cdbd98';
        ctx.fillRect(0, 0, w, h);
        for (let y = 0; y < h; y += 2) {
            ctx.fillStyle = 'rgba(120,95,60,' + (0.08 + (y % 6 === 0 ? 0.1 : 0)) + ')';
            ctx.fillRect(0, y, w, 1);
        }
    });
}

const THEMES = {
    hoko: { leather: ['#8a261c', '#641710', '#3a0c08'], gold: '#d6b35e', light: '#f0d78f', title: ['HOKO', 'SENJU'], seal: '千手', sealBg: '#b3261b', kicker: 'CLAN SENJU · KONOHA' },
    second: { leather: ['#34427a', '#1f2856', '#0e1230'], gold: '#c8d2e6', light: '#eef2fb', title: ['SECOND', 'CARNET'], seal: '忍道', sealBg: '#3a4a8c', kicker: 'KONOHA' }
};

function leather(ctx, w, h, colors, random) {
    const g = ctx.createRadialGradient(w * 0.4, h * 0.3, 10, w * 0.4, h * 0.3, h * 0.9);
    g.addColorStop(0, colors[0]);
    g.addColorStop(0.45, colors[1]);
    g.addColorStop(1, colors[2]);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < w * h * 0.35; i++) {
        ctx.fillStyle = 'rgba(0,0,0,' + random() * 0.12 + ')';
        ctx.fillRect(random() * w, random() * h, 1.5, 1.5);
    }
}

// Couverture (reprend le dessin de la couverture HTML du carnet).
export function bookCover(kind) {
    const theme = THEMES[kind];
    const random = rng(kind === 'hoko' ? 5 : 6);
    return canvasTexture(512, 712, (ctx, w, h) => {
        leather(ctx, w, h, theme.leather, random);
        // Cadre doré.
        ctx.strokeStyle = theme.gold;
        ctx.globalAlpha = 0.85;
        ctx.lineWidth = 4;
        ctx.strokeRect(34, 34, w - 68, h - 68);
        ctx.lineWidth = 1.6;
        ctx.globalAlpha = 0.5;
        ctx.strokeRect(46, 46, w - 92, h - 92);
        ctx.globalAlpha = 1;
        ctx.fillStyle = theme.light;
        ctx.textAlign = 'center';
        ctx.font = '600 17px Cinzel, Georgia, serif';
        ctx.globalAlpha = 0.85;
        ctx.fillText(theme.kicker.split('').join(String.fromCharCode(8202)), w / 2, 190);
        ctx.globalAlpha = 1;
        konoha(ctx, w / 2, 300, 190, theme.gold, 7);
        ctx.fillStyle = theme.light;
        ctx.shadowColor = 'rgba(0,0,0,.6)';
        ctx.shadowBlur = 6;
        ctx.font = '700 64px Cinzel, Georgia, serif';
        ctx.fillText(theme.title[0], w / 2, 470);
        ctx.font = '700 38px Cinzel, Georgia, serif';
        ctx.fillText(theme.title[1].split('').join(' '), w / 2, 518);
        ctx.shadowBlur = 0;
        ctx.fillStyle = theme.gold;
        ctx.font = '46px "Great Vibes", cursive';
        ctx.fillText('Fiche Personnage', w / 2, 590);
        // Sceau.
        ctx.save();
        ctx.translate(w - 92, h - 118);
        ctx.rotate(-0.07);
        ctx.fillStyle = theme.sealBg;
        ctx.fillRect(-18, -38, 36, 76);
        ctx.fillStyle = '#f7e3c8';
        ctx.font = '26px "Yuji Syuku", serif';
        ctx.fillText(theme.seal[0], 0, -8);
        ctx.fillText(theme.seal[1], 0, 24);
        ctx.restore();
    });
}

export function bookBack(kind) {
    const theme = THEMES[kind];
    const random = rng(kind === 'hoko' ? 8 : 9);
    return canvasTexture(256, 356, (ctx, w, h) => {
        leather(ctx, w, h, theme.leather, random);
        ctx.strokeStyle = theme.gold;
        ctx.globalAlpha = 0.6;
        ctx.lineWidth = 2;
        ctx.strokeRect(17, 17, w - 34, h - 34);
        ctx.globalAlpha = 1;
        konoha(ctx, w / 2, h / 2 - 20, 60, theme.gold, 6);
    });
}

export function bookSpine(kind) {
    const theme = THEMES[kind];
    const random = rng(kind === 'hoko' ? 12 : 13);
    return canvasTexture(96, 512, (ctx, w, h) => {
        leather(ctx, w, h, theme.leather, random);
        ctx.fillStyle = theme.gold;
        [0.07, 0.1, 0.9, 0.93].forEach((y) => ctx.fillRect(6, y * h, w - 12, 4));
        ctx.textAlign = 'center';
        ctx.font = '40px "Yuji Syuku", serif';
        ctx.fillText(theme.seal[0], w / 2, h * 0.3);
        ctx.fillText(theme.seal[1], w / 2, h * 0.3 + 46);
        konoha(ctx, w / 2, h * 0.72, 46, theme.gold, 8);
        const shade = ctx.createLinearGradient(0, 0, w, 0);
        shade.addColorStop(0, 'rgba(0,0,0,.4)');
        shade.addColorStop(0.5, 'rgba(255,255,255,.06)');
        shade.addColorStop(1, 'rgba(0,0,0,.4)');
        ctx.fillStyle = shade;
        ctx.fillRect(0, 0, w, h);
    });
}

/* ------------------------------------------------------------------ */
/* Tissus et décor                                                     */
/* ------------------------------------------------------------------ */

// Motif asanoha (feuille de chanvre) blanc sur indigo.
export function asanoha(repeat) {
    return canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = '#1e2a52';
        ctx.fillRect(0, 0, w, h);
        ctx.strokeStyle = 'rgba(220,228,245,.55)';
        ctx.lineWidth = 1.4;
        const s = 64;
        const hh = s * Math.sqrt(3) / 2;
        for (let row = -1; row < h / hh + 1; row++) {
            for (let col = -1; col < w / s + 1; col++) {
                const cx = col * s + (row % 2 ? s / 2 : 0);
                const cy = row * hh;
                for (let k = 0; k < 6; k++) {
                    const a = (k * Math.PI) / 3 + Math.PI / 6;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(a) * (s / Math.sqrt(3)), cy + Math.sin(a) * (s / Math.sqrt(3)));
                    ctx.stroke();
                    const b = (k * Math.PI) / 3;
                    ctx.beginPath();
                    ctx.moveTo(cx, cy);
                    ctx.lineTo(cx + Math.cos(b) * (s / 2), cy + Math.sin(b) * (s / 2));
                    ctx.stroke();
                }
            }
        }
    }, { repeat });
}

export function cotton(color = '#ece4d2', stripes = null) {
    const random = rng(44);
    return canvasTexture(256, 256, (ctx, w, h) => {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, w, h);
        if (stripes) {
            ctx.fillStyle = stripes;
            for (let x = 0; x < w; x += 32) ctx.fillRect(x, 0, 10, h);
        }
        noise(ctx, w, h, 0.5, random);
    });
}

// Rouleau suspendu (kakejiku) : « 火の意志 », la Volonté du Feu.
export function scroll() {
    const random = rng(55);
    return canvasTexture(256, 768, (ctx, w, h) => {
        ctx.fillStyle = '#5b4a2a';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#efe4c8';
        ctx.fillRect(28, 120, w - 56, h - 240);
        noise(ctx, w, h, 0.3, random);
        ctx.fillStyle = '#1a1410';
        ctx.textAlign = 'center';
        ctx.font = '92px "Yuji Syuku", serif';
        ['火', 'の', '意', '志'].forEach((c, i) => ctx.fillText(c, w / 2, 250 + i * 120));
        ctx.fillStyle = '#a3261b';
        ctx.fillRect(w / 2 + 30, h - 190, 26, 26);
    });
}

export function tsuka() {
    return canvasTexture(64, 256, (ctx, w, h) => {
        ctx.fillStyle = '#e8e0cc';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#16120e';
        for (let y = -32; y < h + 32; y += 28) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w / 2, y + 14);
            ctx.lineTo(w, y);
            ctx.lineTo(w, y + 10);
            ctx.lineTo(w / 2, y + 24);
            ctx.lineTo(0, y + 10);
            ctx.fill();
        }
    }, { repeat: [1, 4] });
}

// Petite lueur ronde pour les grains de poussière.
export function dot() {
    return canvasTexture(64, 64, (ctx, w, h) => {
        const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
        g.addColorStop(0, 'rgba(255,240,210,1)');
        g.addColorStop(0.4, 'rgba(255,220,170,.35)');
        g.addColorStop(1, 'rgba(255,220,170,0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, w, h);
    });
}
