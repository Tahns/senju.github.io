/*
 * La chambre de Hoko au domaine Senju, construite entièrement en code.
 *
 * Repère (en mètres) : x de -2,5 (ouest) à 2,5 (est), z de -3 (nord) à 3 (sud),
 * y vers le haut. On entre par la porte coulissante du mur sud.
 *   - bibliothèque contre le mur ouest,
 *   - futon contre le mur est, oreiller au sud (on voit la fenêtre allongé),
 *   - fenêtre (lune) et petite table au nord, lanterne près du lit.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../../vendor/RoundedBoxGeometry.js';
import * as T from './textures.js';

export const EYE = 1.5; // hauteur des yeux d'un garçon de 12 ans

const W = 5;
const D = 6;
const H = 2.7;

function shadowy(mesh, cast = true, receive = true) {
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    return mesh;
}

function box(parent, w, h, d, material, x, y, z) {
    const mesh = shadowy(new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
}

function rounded(parent, w, h, d, radius, material, x, y, z) {
    const mesh = shadowy(new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 4, radius), material));
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
}

function repeated(texture, rx, ry) {
    const t = texture.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.needsUpdate = true;
    return t;
}

export function buildRoom(scene) {
    const room = new THREE.Group();
    scene.add(room);
    const updaters = [];

    /* ---------------- Matériaux ---------------- */
    const plasterTex = T.plaster();
    const plasterMat = (w, h) => new THREE.MeshStandardMaterial({ map: repeated(plasterTex, w / 1.6, h / 1.6), roughness: 0.95 });
    const darkWood = new THREE.MeshStandardMaterial({ map: T.wood({ base: '#4a3020', dark: '#24160c', light: '#6a4630', seed: 2 }), roughness: 0.7 });
    const midWood = new THREE.MeshStandardMaterial({ map: T.wood({ base: '#7a5634', dark: '#43301c', light: '#9a7048', seed: 4 }), roughness: 0.65 });
    const paperTex = T.shojiPaper();

    /* ---------------- Sol, plafond ---------------- */
    const floor = shadowy(new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: T.tatami(), roughness: 0.92 })), false, true);
    floor.rotation.x = -Math.PI / 2;
    room.add(floor);

    const ceilingTex = T.wood({ base: '#5c3f27', dark: '#2f1f12', light: '#7a5536', planks: 10, vertical: false, seed: 9, repeat: [2, 2] });
    const ceiling = shadowy(new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ map: ceilingTex, roughness: 0.85 })), false, true);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = H;
    room.add(ceiling);
    [-1.2, 0.9].forEach((z) => box(room, W, 0.12, 0.14, darkWood, 0, H - 0.06, z));

    /* ---------------- Murs ---------------- */
    const t = 0.1;
    box(room, t, H, D, plasterMat(D, H), -W / 2 - t / 2, H / 2, 0); // ouest
    box(room, t, H, D, plasterMat(D, H), W / 2 + t / 2, H / 2, 0); // est
    // Nord, avec la fenêtre (x de -1,3 à 0,1 ; y de 0,95 à 2).
    box(room, 1.2, H, t, plasterMat(1.2, H), -1.9, H / 2, -D / 2 - t / 2);
    box(room, 2.4, H, t, plasterMat(2.4, H), 1.3, H / 2, -D / 2 - t / 2);
    box(room, 1.4, 0.95, t, plasterMat(1.4, 0.95), -0.6, 0.475, -D / 2 - t / 2);
    box(room, 1.4, 0.7, t, plasterMat(1.4, 0.7), -0.6, 2.35, -D / 2 - t / 2);
    // Sud, avec la porte (x de -0,475 à 0,475 ; y jusqu'à 2).
    box(room, 2.025, H, t, plasterMat(2, H), -1.4875, H / 2, D / 2 + t / 2);
    box(room, 2.025, H, t, plasterMat(2, H), 1.4875, H / 2, D / 2 + t / 2);
    box(room, 0.95, 0.7, t, plasterMat(0.95, 0.7), 0, 2.35, D / 2 + t / 2);

    // Poutres (nageshi), plinthes et poteaux d'angle.
    box(room, W, 0.07, 0.05, darkWood, 0, 2.03, -D / 2 + 0.025);
    box(room, W, 0.07, 0.05, darkWood, 0, 2.03, D / 2 - 0.025);
    box(room, 0.05, 0.07, D, darkWood, -W / 2 + 0.025, 2.03, 0);
    box(room, 0.05, 0.07, D, darkWood, W / 2 - 0.025, 2.03, 0);
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => box(room, 0.12, H, 0.12, darkWood, sx * (W / 2 - 0.06), H / 2, sz * (D / 2 - 0.06)));
    [-0.535, 0.535].forEach((x) => box(room, 0.1, H, 0.14, darkWood, x, H / 2, D / 2 - 0.02));
    [-1.36, 0.16].forEach((x) => box(room, 0.1, H, 0.12, darkWood, x, H / 2, -D / 2 + 0.03));
    box(room, 1.42, 0.06, 0.16, darkWood, -0.6, 0.92, -D / 2 + 0.05);
    box(room, W, 0.06, 0.02, darkWood, 0, 0.03, -D / 2 + 0.01);
    box(room, 0.02, 0.06, D, darkWood, -W / 2 + 0.01, 0.03, 0);
    box(room, 0.02, 0.06, D, darkWood, W / 2 - 0.01, 0.03, 0);

    /* ---------------- Couloir (d'où l'on arrive) ---------------- */
    const hall = new THREE.Group();
    room.add(hall);
    const hallFloor = shadowy(new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.4), new THREE.MeshStandardMaterial({ map: T.wood({ base: '#5a3c24', dark: '#2e1d10', light: '#6f4d30', planks: 5, vertical: false, seed: 14 }), roughness: 0.6 })), false, true);
    hallFloor.rotation.x = -Math.PI / 2;
    hallFloor.position.set(0, 0, D / 2 + t + 1.2);
    hall.add(hallFloor);
    box(hall, 0.1, H, 2.5, plasterMat(2.5, H), -1.15, H / 2, D / 2 + 1.3);
    box(hall, 0.1, H, 2.5, plasterMat(2.5, H), 1.15, H / 2, D / 2 + 1.3);
    box(hall, 2.3, H, 0.1, plasterMat(2.3, H), 0, H / 2, D / 2 + 2.55);
    box(hall, 2.3, 0.05, 2.5, darkWood, 0, H + 0.025, D / 2 + 1.3);
    const hallLight = new THREE.PointLight('#8aa0d8', 1.2, 0, 2);
    hallLight.position.set(0.6, 2.3, D / 2 + 1.9);
    hall.add(hallLight);

    /* ---------------- Porte coulissante (shoji) ---------------- */
    const door = new THREE.Group();
    door.position.set(0, 0, D / 2 - 0.035);
    room.add(door);
    // Côté couloir, le papier est éclairé par la chambre derrière : il luit.
    const paperMat = new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.95, side: THREE.DoubleSide, emissive: new THREE.Color('#c98a45'), emissiveMap: paperTex, emissiveIntensity: 0.75 });
    const doorPaper = new THREE.Mesh(new THREE.PlaneGeometry(0.87, 1.84), paperMat);
    doorPaper.position.set(0, 1.04, 0);
    door.add(doorPaper);
    box(door, 0.04, 2.0, 0.035, midWood, -0.455, 1.0, 0);
    box(door, 0.04, 2.0, 0.035, midWood, 0.455, 1.0, 0);
    box(door, 0.95, 0.05, 0.035, midWood, 0, 1.975, 0);
    box(door, 0.95, 0.12, 0.035, midWood, 0, 0.06, 0);
    [-0.2175, 0, 0.2175].forEach((x) => box(door, 0.014, 1.84, 0.02, midWood, x, 1.04, 0));
    for (let y = 0.36; y < 1.95; y += 0.26) box(door, 0.87, 0.014, 0.02, midWood, 0, y, 0);
    const hikiteMat = new THREE.MeshStandardMaterial({ color: '#1a1410', roughness: 0.4, metalness: 0.3 });
    [0.019, -0.019].forEach((z) => {
        const hikite = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.004, 20), hikiteMat);
        hikite.rotation.x = Math.PI / 2;
        hikite.scale.set(0.8, 1, 1.25);
        hikite.position.set(-0.36, 1.02, z);
        door.add(hikite);
    });
    // Point où la main se pose, côté couloir.
    const doorHandle = new THREE.Object3D();
    doorHandle.position.set(-0.36, 1.02, 0.03);
    door.add(doorHandle);
    // Rail et linteau.
    box(room, 2.0, 0.03, 0.08, darkWood, 0.45, 0.015, D / 2 - 0.035);
    box(room, 2.0, 0.06, 0.08, darkWood, 0.45, 2.03, D / 2 - 0.035);

    /* ---------------- Fenêtre, lune ---------------- */
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 2.4), new THREE.MeshBasicMaterial({ map: T.nightSky() }));
    sky.position.set(-0.6, 1.5, -D / 2 - 0.9);
    room.add(sky);
    // Étoiles qui scintillent derrière la fenêtre ouverte.
    const starCount = 110;
    const starPos = new Float32Array(starCount * 3);
    const starCol = new Float32Array(starCount * 3);
    const starSeeds = [];
    const starRandom = T.rng(202);
    for (let i = 0; i < starCount; i++) {
        starPos.set([-1.4 + starRandom() * 2.0, 1.1 + starRandom() * 1.7, -D / 2 - 0.7 - starRandom() * 0.1], i * 3);
        starSeeds.push({ speed: 1 + starRandom() * 3, phase: starRandom() * 6.28, base: 0.35 + starRandom() * 0.65 });
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
    starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
    const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({ map: T.dot(), size: 0.06, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    room.add(stars);
    updaters.push((dt, time) => {
        starSeeds.forEach((st, i) => {
            const v = Math.min(1.6, st.base * 1.5 * (0.55 + 0.45 * Math.sin(time * st.speed + st.phase)));
            starCol[i * 3] = v * 0.85;
            starCol[i * 3 + 1] = v * 0.9;
            starCol[i * 3 + 2] = v;
        });
        starGeo.attributes.color.needsUpdate = true;
    });

    const moonPaper = new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.95, side: THREE.DoubleSide, emissive: new THREE.Color('#34467a'), emissiveIntensity: 0.9 });
    const windowPanel = (x, z) => {
        const g = new THREE.Group();
        g.position.set(x, 0.95, z);
        const p = new THREE.Mesh(new THREE.PlaneGeometry(0.66, 1.0), moonPaper);
        p.position.y = 0.525;
        g.add(p);
        box(g, 0.03, 1.05, 0.03, midWood, -0.345, 0.525, 0);
        box(g, 0.03, 1.05, 0.03, midWood, 0.345, 0.525, 0);
        box(g, 0.72, 0.03, 0.03, midWood, 0, 0.015, 0);
        box(g, 0.72, 0.03, 0.03, midWood, 0, 1.035, 0);
        [-0.11, 0.11].forEach((kx) => box(g, 0.012, 1.0, 0.016, midWood, kx, 0.525, 0));
        [0.26, 0.52, 0.78].forEach((ky) => box(g, 0.66, 0.012, 0.016, midWood, 0, ky, 0));
        room.add(g);
        return g;
    };
    windowPanel(-0.95, -D / 2 - 0.02);
    windowPanel(-0.93, -D / 2 - 0.06); // panneau glissé : la moitié droite est ouverte

    const moon = new THREE.DirectionalLight('#a9bcff', 1.6);
    moon.position.set(0.4, 3.4, -7.5);
    moon.target.position.set(-0.2, 0, 0.5);
    moon.castShadow = true;
    moon.shadow.mapSize.set(1024, 1024);
    moon.shadow.camera.left = -4;
    moon.shadow.camera.right = 4;
    moon.shadow.camera.top = 4;
    moon.shadow.camera.bottom = -4;
    moon.shadow.camera.near = 1;
    moon.shadow.camera.far = 16;
    moon.shadow.bias = -0.0008;
    moon.shadow.normalBias = 0.02;
    room.add(moon, moon.target);

    const ambient = new THREE.HemisphereLight('#3a4a78', '#2a1a10', 0.55);
    room.add(ambient);

    /* ---------------- Lanterne (andon) ---------------- */
    const lantern = new THREE.Group();
    lantern.position.set(0.95, 0, -2.62);
    room.add(lantern);
    const glowMat = new THREE.MeshStandardMaterial({ map: paperTex, emissive: new THREE.Color('#ffb25e'), emissiveIntensity: 2.2, roughness: 1, side: THREE.DoubleSide });
    [[0, 0.14, 0], [Math.PI / 2, 0, 0.14], [Math.PI, -0.14, 0], [-Math.PI / 2, 0, -0.14]].forEach(([ry, x, z], i) => {
        const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.46), glowMat);
        panel.rotation.y = ry + Math.PI / 2;
        panel.position.set(i % 2 ? 0 : x, 0.4, i % 2 ? z : 0);
        lantern.add(panel);
    });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
        const leg = box(lantern, 0.022, 0.66, 0.022, darkWood, sx * 0.14, 0.33, sz * 0.14);
        leg.castShadow = false;
    });
    [0.16, 0.64].forEach((y) => {
        box(lantern, 0.3, 0.02, 0.02, darkWood, 0, y, 0.14).castShadow = false;
        box(lantern, 0.3, 0.02, 0.02, darkWood, 0, y, -0.14).castShadow = false;
        box(lantern, 0.02, 0.02, 0.3, darkWood, 0.14, y, 0).castShadow = false;
        box(lantern, 0.02, 0.02, 0.3, darkWood, -0.14, y, 0).castShadow = false;
    });
    const lanternLight = new THREE.PointLight('#ffa552', 5.5, 0, 1.6);
    lanternLight.position.set(0, 0.42, 0);
    lanternLight.castShadow = true;
    lanternLight.shadow.mapSize.set(512, 512);
    lanternLight.shadow.bias = -0.004;
    lanternLight.shadow.camera.near = 0.2;
    lantern.add(lanternLight);
    // Lumière d'appoint chaude qui adoucit les ombres de la pièce.
    const fill = new THREE.PointLight('#ff9d55', 1.4, 0, 1.4);
    fill.position.set(-0.4, 2.1, 0.8);
    room.add(fill);
    // Lueur douce sur la bibliothèque (sinon trop sombre quand on s'en approche).
    const shelfLight = new THREE.SpotLight('#ffb070', 3.2, 0, 0.75, 0.9, 1.3);
    shelfLight.position.set(-0.6, 2.4, 0.2);
    shelfLight.target.position.set(-2.4, 1.1, 0);
    room.add(shelfLight, shelfLight.target);

    const lanternBase = { light: lanternLight.intensity, glow: glowMat.emissiveIntensity, fill: fill.intensity, shelf: shelfLight.intensity };
    let lanternLevel = 1;
    updaters.push((dt, time) => {
        const flicker = 0.93 + 0.04 * Math.sin(time * 7.3) + 0.03 * Math.sin(time * 13.1 + 1.7);
        lanternLight.intensity = lanternBase.light * lanternLevel * flicker;
        glowMat.emissiveIntensity = lanternBase.glow * (0.35 + 0.65 * lanternLevel) * flicker;
        fill.intensity = lanternBase.fill * lanternLevel;
        shelfLight.intensity = lanternBase.shelf * lanternLevel;
    });

    /* ---------------- Bibliothèque ---------------- */
    const shelfX = -W / 2; // mur ouest
    const depth = 0.36;
    const front = shelfX + depth;
    const shelfZ = 0.85;
    const boards = [0.06, 0.46, 0.86, 1.26, 1.66, 2.085];
    box(room, 0.02, 2.1, shelfZ * 2, darkWood, shelfX + 0.01, 1.05, 0);
    box(room, depth, 2.12, 0.03, darkWood, shelfX + depth / 2, 1.06, -shelfZ + 0.015);
    box(room, depth, 2.12, 0.03, darkWood, shelfX + depth / 2, 1.06, shelfZ - 0.015);
    boards.forEach((y) => box(room, depth, 0.025, shelfZ * 2, darkWood, shelfX + depth / 2, y, 0));
    box(room, 0.02, 0.06, shelfZ * 2, darkWood, front - 0.01, 0.03, 0);

    const edgeTex = T.pageEdges();
    const edgeMat = new THREE.MeshStandardMaterial({ map: edgeTex, roughness: 0.9 });
    const bandTex = T.spineBands();
    const palette = ['#6e1f1a', '#1f2a4a', '#3c4a2a', '#5a3a1e', '#1a1a1a', '#7a6a4a', '#4a1f3a', '#2d4a4a', '#8a5a2a', '#3a2a1a'];
    const materials = new Map();
    const bookMaterials = (color) => {
        if (!materials.has(color)) {
            const spine = new THREE.MeshStandardMaterial({ color, map: bandTex, roughness: 0.75 });
            const cover = new THREE.MeshStandardMaterial({ color, roughness: 0.8 });
            materials.set(color, [edgeMat, spine, edgeMat, edgeMat, cover, cover]);
        }
        return materials.get(color);
    };

    // Carnets spéciaux, fidèles à leurs couvertures HTML.
    function specialBook(kind) {
        const w = 0.19;
        const h = 0.265;
        const th = 0.045;
        const cover = new THREE.MeshStandardMaterial({ map: T.bookCover(kind), roughness: 0.6 });
        const back = new THREE.MeshStandardMaterial({ map: T.bookBack(kind), roughness: 0.6 });
        const spine = new THREE.MeshStandardMaterial({ map: T.bookSpine(kind), roughness: 0.6 });
        const mesh = shadowy(new THREE.Mesh(new RoundedBoxGeometry(w, h, th, 2, 0.004), [edgeMat, spine, edgeMat, edgeMat, cover, back]));
        mesh.userData.size = { w, h, t: th };
        return mesh;
    }

    const random = T.rng(101);
    const specials = {
        hoko: { row: 2, z: -0.3, mesh: specialBook('hoko') },
        second: { row: 2, z: 0.3, mesh: specialBook('second') }
    };
    const books = {};
    const ROT = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI);

    for (let row = 0; row < 5; row++) {
        const bottom = boards[row] + 0.0125;
        const maxH = boards[row + 1] - boards[row] - 0.05;
        const pending = () => Object.entries(specials).find(([, s]) => s.row === row && !s.placed);
        let z = -shelfZ + 0.04;
        while (z < shelfZ - 0.05) {
            const special = pending();
            if (special && !special[1].placed && Math.abs(z - special[1].z) < 0.05) {
                special[1].placed = true;
                const { mesh } = special[1];
                const { w, h, t: th } = mesh.userData.size;
                mesh.quaternion.copy(ROT);
                mesh.position.set(front - 0.005 - w / 2, bottom + h / 2, special[1].z);
                room.add(mesh);
                books[special[0]] = { mesh, slot: { position: mesh.position.clone(), quaternion: mesh.quaternion.clone() } };
                z = special[1].z + th / 2 + 0.004;
                continue;
            }
            if (random() < 0.05 && z < shelfZ - 0.25 && !(special && special[1].z > z - 0.06 && special[1].z < z + 0.32)) {
                // Petite pile de livres couchés.
                let y = bottom;
                const pw = 0.16 + random() * 0.05;
                for (let k = 0; k < 2 + Math.floor(random() * 3); k++) {
                    const ph = 0.02 + random() * 0.025;
                    const m = shadowy(new THREE.Mesh(new THREE.BoxGeometry(pw, ph, 0.22), bookMaterials(palette[Math.floor(random() * palette.length)])));
                    m.rotation.y = Math.PI / 2 + (random() - 0.5) * 0.15;
                    m.position.set(front - 0.13, y + ph / 2, z + 0.11);
                    room.add(m);
                    y += ph;
                }
                z += 0.25;
                continue;
            }
            if (random() < 0.04) {
                z += 0.04 + random() * 0.05;
                continue;
            }
            const th = 0.018 + random() * 0.035;
            const h = Math.min(maxH, 0.19 + random() * 0.12);
            const w = 0.15 + random() * 0.08;
            if (special && !special[1].placed && z + th > special[1].z - 0.05 && z < special[1].z) {
                z = special[1].z - 0.049;
                continue;
            }
            const m = shadowy(new THREE.Mesh(new THREE.BoxGeometry(w, h, th), bookMaterials(palette[Math.floor(random() * palette.length)])));
            m.quaternion.copy(ROT);
            m.position.set(front - 0.012 - w / 2 - random() * 0.02, bottom + h / 2, z + th / 2);
            room.add(m);
            z += th + 0.002;
        }
    }

    // Objets sur la bibliothèque : vase et rouleaux.
    const ceramic = new THREE.MeshStandardMaterial({ color: '#c8c2b0', roughness: 0.35 });
    const vasePoints = [[0, 0], [0.05, 0], [0.07, 0.05], [0.065, 0.12], [0.03, 0.2], [0.025, 0.24], [0.035, 0.26]].map(([r, y]) => new THREE.Vector2(r, y));
    const vase = shadowy(new THREE.Mesh(new THREE.LatheGeometry(vasePoints, 24), ceramic));
    vase.position.set(shelfX + 0.18, boards[5] + 0.0125, -0.5);
    room.add(vase);
    const twig = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.45, 5), darkWood));
    twig.position.set(shelfX + 0.2, boards[5] + 0.42, -0.46);
    twig.rotation.z = -0.25;
    room.add(twig);
    const scrollMat = new THREE.MeshStandardMaterial({ color: '#e6dcc0', roughness: 0.9 });
    for (let k = 0; k < 3; k++) {
        const s = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 12), scrollMat));
        s.rotation.x = Math.PI / 2;
        s.position.set(shelfX + 0.12 + (k % 2) * 0.05, boards[5] + 0.04 + Math.floor(k / 2) * 0.045, 0.35 + k * 0.03);
        room.add(s);
    }

    /* ---------------- Coffre (tansu) et bonsaï ---------------- */
    const tansu = new THREE.Group();
    tansu.position.set(-W / 2 + 0.22, 0, 2.0);
    room.add(tansu);
    box(tansu, 0.42, 0.82, 0.8, midWood, 0, 0.41, 0);
    const iron = new THREE.MeshStandardMaterial({ color: '#1c1a18', roughness: 0.45, metalness: 0.6 });
    [0.18, 0.41, 0.64].forEach((y) => {
        box(tansu, 0.005, 0.005, 0.76, darkWood, 0.212, y + 0.11, 0);
        box(tansu, 0.012, 0.03, 0.09, iron, 0.215, y, 0);
    });
    const pot = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 0.07, 20), new THREE.MeshStandardMaterial({ color: '#3b2a24', roughness: 0.5 })));
    pot.position.set(0, 0.855, 0.22);
    tansu.add(pot);
    const trunk = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.16, 6), darkWood));
    trunk.position.set(0.01, 0.95, 0.22);
    trunk.rotation.z = 0.3;
    tansu.add(trunk);
    const leafMat = new THREE.MeshStandardMaterial({ color: '#34502a', roughness: 0.9 });
    [[-0.05, 1.04, 0.22, 0.07], [0.04, 1.06, 0.19, 0.06], [0.0, 1.1, 0.26, 0.05]].forEach(([x, y, z, r]) => {
        const f = shadowy(new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), leafMat));
        f.scale.y = 0.6;
        f.position.set(x, y, z);
        tansu.add(f);
    });

    /* ---------------- Boîte à musique (sur le coffre) ---------------- */
    // Face tournée vers la chambre (+x), clé du côté -z, charnière au fond.
    const musicBox = new THREE.Group();
    musicBox.position.set(0.02, 0.82, -0.18);
    tansu.add(musicBox);
    const makieTex = T.makie();
    const lacquer = new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: makieTex, roughness: 0.22, clearcoat: 1, clearcoatRoughness: 0.12 });
    const lacquerPlain = new THREE.MeshPhysicalMaterial({ color: '#0d0605', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.15 });
    const brass = new THREE.MeshStandardMaterial({ color: '#c79a45', roughness: 0.35, metalness: 0.9 });
    const velvet = new THREE.MeshStandardMaterial({ color: '#6e1414', roughness: 1 });
    const boxBody = rounded(musicBox, 0.15, 0.08, 0.22, 0.006, [lacquerPlain, lacquerPlain, lacquerPlain, lacquerPlain, lacquerPlain, lacquerPlain], 0, 0.04, 0);
    boxBody.material = [lacquer, lacquerPlain, lacquerPlain, lacquerPlain, lacquerPlain, lacquerPlain];
    const inside = new THREE.Mesh(new THREE.PlaneGeometry(0.13, 0.2), velvet);
    inside.rotation.x = -Math.PI / 2;
    inside.position.y = 0.0805;
    musicBox.add(inside);
    const drum = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.013, 0.013, 0.1, 18), brass));
    drum.rotation.x = Math.PI / 2;
    drum.position.set(-0.02, 0.092, 0);
    musicBox.add(drum);
    box(musicBox, 0.03, 0.004, 0.1, brass, 0.012, 0.088, 0);
    const lid = new THREE.Group();
    lid.position.set(-0.075, 0.08, 0);
    musicBox.add(lid);
    const lidMesh = rounded(lid, 0.152, 0.02, 0.222, 0.006, lacquerPlain, 0.076, 0.01, 0);
    lidMesh.material = [lacquerPlain, lacquerPlain, lacquer, lacquerPlain, lacquerPlain, lacquerPlain];
    const mirrorMat = new THREE.MeshStandardMaterial({ color: '#b8c0c8', roughness: 0.1, metalness: 1 });
    const lidMirror = new THREE.Mesh(new THREE.PlaneGeometry(0.12, 0.18), mirrorMat);
    lidMirror.rotation.x = Math.PI / 2;
    lidMirror.position.set(0.076, -0.0005, 0);
    lid.add(lidMirror);
    const key = new THREE.Group();
    key.position.set(-0.02, 0.035, -0.114);
    musicBox.add(key);
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.02, 8), brass);
    shaft.rotation.x = Math.PI / 2;
    shaft.position.z = -0.01;
    key.add(shaft);
    box(key, 0.004, 0.034, 0.006, brass, 0, 0, -0.022).castShadow = false;
    // Points où se posent les doigts.
    const lidEdge = new THREE.Object3D();
    lidEdge.position.set(0.152, 0.004, 0);
    lid.add(lidEdge);
    const keyGrip = new THREE.Object3D();
    keyGrip.position.set(0, 0, -0.024);
    key.add(keyGrip);

    /* ---------------- Futon ---------------- */
    const bedX = 1.88;
    const bedZ = -1.88;
    box(room, 1.12, 0.2, 2.16, darkWood, bedX, 0.1, bedZ);
    const cottonMat = new THREE.MeshStandardMaterial({ map: T.cotton('#e9e0cb'), roughness: 0.95 });
    rounded(room, 1.0, 0.12, 2.04, 0.04, cottonMat, bedX, 0.26, bedZ);
    const pillowMat = new THREE.MeshStandardMaterial({ map: T.cotton('#ddd2b6', 'rgba(60,70,110,.35)'), roughness: 0.95 });
    rounded(room, 0.5, 0.11, 0.28, 0.05, pillowMat, bedX, 0.37, bedZ + 0.82);
    const blanketMat = new THREE.MeshStandardMaterial({ map: T.asanoha([3, 4]), roughness: 0.9 });
    const blanket = rounded(room, 1.08, 0.09, 1.5, 0.04, blanketMat, bedX, 0.365, bedZ - 0.26);
    const collar = rounded(room, 1.09, 0.1, 0.16, 0.05, cottonMat, bedX, 0.38, bedZ + 0.47);
    // Un coin de la couverture relevé, comme si on venait de la défaire.
    blanket.rotation.z = -0.02;

    /* ---------------- Table basse, coussin ---------------- */
    const desk = new THREE.Group();
    desk.position.set(-0.95, 0, -2.35);
    room.add(desk);
    box(desk, 1.0, 0.035, 0.5, midWood, 0, 0.34, 0);
    box(desk, 0.04, 0.32, 0.46, midWood, -0.46, 0.16, 0);
    box(desk, 0.04, 0.32, 0.46, midWood, 0.46, 0.16, 0);
    const ink = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.3 });
    box(desk, 0.11, 0.02, 0.18, ink, 0.3, 0.367, 0.02);
    const brush = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.2, 8), new THREE.MeshStandardMaterial({ color: '#6b4a24', roughness: 0.6 })));
    brush.rotation.z = Math.PI / 2;
    brush.rotation.y = 0.3;
    brush.position.set(0.05, 0.362, 0.12);
    desk.add(brush);
    const sheet = shadowy(new THREE.Mesh(new THREE.PlaneGeometry(0.26, 0.36), new THREE.MeshStandardMaterial({ map: paperTex, roughness: 0.95 })), false, true);
    sheet.rotation.x = -Math.PI / 2;
    sheet.rotation.z = 0.12;
    sheet.position.set(-0.18, 0.3585, 0);
    desk.add(sheet);
    rounded(room, 0.55, 0.06, 0.6, 0.025, new THREE.MeshStandardMaterial({ color: '#6b2a22', roughness: 0.9 }), -0.95, 0.03, -1.8);

    /* ---------------- Rouleau suspendu et sabre ---------------- */
    const scrollArt = new THREE.Mesh(new THREE.PlaneGeometry(0.42, 1.26), new THREE.MeshStandardMaterial({ map: T.scroll(), roughness: 0.9 }));
    scrollArt.rotation.y = -Math.PI / 2;
    scrollArt.position.set(W / 2 - 0.012, 1.3, -2.1);
    scrollArt.receiveShadow = true;
    room.add(scrollArt);
    [1.94, 0.66].forEach((y) => {
        const rod = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 10), darkWood));
        rod.rotation.x = Math.PI / 2;
        rod.position.set(W / 2 - 0.02, y, -2.1);
        room.add(rod);
    });

    const katana = new THREE.Group();
    katana.position.set(W / 2 - 0.05, 1.42, 0.35);
    room.add(katana);
    [-0.25, 0.25].forEach((z) => box(katana, 0.06, 0.03, 0.03, darkWood, 0.01, -0.02, z));
    const sayaCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, -0.52), new THREE.Vector3(0, 0.012, -0.1), new THREE.Vector3(0, 0.02, 0.28)]);
    const saya = shadowy(new THREE.Mesh(new THREE.TubeGeometry(sayaCurve, 24, 0.014, 10), new THREE.MeshStandardMaterial({ color: '#0e0c0c', roughness: 0.25, metalness: 0.2 })));
    katana.add(saya);
    const tsubaMat = new THREE.MeshStandardMaterial({ color: '#6a5424', roughness: 0.4, metalness: 0.7 });
    const tsuba = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.008, 20), tsubaMat));
    tsuba.rotation.x = Math.PI / 2;
    tsuba.position.set(0, 0.02, 0.29);
    katana.add(tsuba);
    const grip = shadowy(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.016, 0.26, 12), new THREE.MeshStandardMaterial({ map: T.tsuka(), roughness: 0.8 })));
    grip.rotation.x = Math.PI / 2;
    grip.position.set(0, 0.025, 0.425);
    katana.add(grip);

    /* ---------------- Poussière dans la lumière ---------------- */
    const count = 160;
    const positions = new Float32Array(count * 3);
    const seeds = [];
    for (let i = 0; i < count; i++) {
        seeds.push({ x: -2 + random() * 4.2, y: 0.2 + random() * 2.2, z: -2.8 + random() * 4.5, s: random() * 10 });
    }
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(dustGeo, new THREE.PointsMaterial({ map: T.dot(), size: 0.018, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, color: '#ffe2b8' }));
    room.add(dust);
    updaters.push((dt, time) => {
        seeds.forEach((p, i) => {
            positions[i * 3] = p.x + Math.sin(time * 0.11 + p.s) * 0.25;
            positions[i * 3 + 1] = p.y + Math.sin(time * 0.07 + p.s * 2) * 0.2;
            positions[i * 3 + 2] = p.z + Math.cos(time * 0.09 + p.s) * 0.25;
        });
        dustGeo.attributes.position.needsUpdate = true;
    });

    let drumSpeed = 0;
    updaters.push((dt) => { drum.rotation.y += dt * drumSpeed; });

    return {
        door,
        musicBox: { group: musicBox, lid, key, lidEdge, keyGrip, setPlaying(speed) { drumSpeed = speed; } },
        doorHandle,
        books,
        bed: { x: bedX, z: bedZ },
        shelf: { front, boards },
        setLantern(level) { lanternLevel = level; },
        update(dt, time) { updaters.forEach((fn) => fn(dt, time)); }
    };
}
