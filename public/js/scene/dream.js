/*
 * Le rêve de Hoko (vu à la troisième personne) : adulte, jōnin de Konoha,
 * maître du sabre et du Suiton… et chef de la section économique, qui fait
 * prospérer le village tout en remplissant ses poches.
 */
import * as THREE from 'three';
import { buildNinja } from './ninja.js';
import { ease } from './timeline.js';
import { rng, dot } from './textures.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function coinTexture() {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(64, 64, 63, 0, Math.PI * 2);
    ctx.fill();
    ctx.clearRect(50, 50, 28, 28); // trou carré des pièces anciennes
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.strokeRect(46, 46, 36, 36);
    const t = new THREE.CanvasTexture(c);
    return t;
}

export function buildDream(renderer) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 400);
    scene.fog = new THREE.Fog('#f2c49a', 60, 220);
    const random = rng(303);
    const updaters = [];

    /* ---------------- Ciel de coucher de soleil ---------------- */
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
            top: { value: new THREE.Color('#3b6fc2') },
            mid: { value: new THREE.Color('#e9a27e') },
            low: { value: new THREE.Color('#ffdca4') },
            sunDir: { value: V(0.2, 0.08, -1).normalize() }
        },
        vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 sunDir; varying vec3 vDir; void main(){ float h = vDir.y; vec3 c = h > 0.12 ? mix(mid, top, smoothstep(0.12, 0.6, h)) : mix(low, mid, smoothstep(-0.05, 0.12, h)); float s = max(dot(normalize(vDir), sunDir), 0.0); c += vec3(1.0,0.75,0.45) * pow(s, 60.0) * 1.6 + vec3(1.0,0.6,0.35) * pow(s, 6.0) * 0.35; gl_FragColor = vec4(c, 1.0); }'
    }));
    scene.add(sky);
    // Reflets : l'or et l'acier renvoient les couleurs du couchant.
    const envScene = new THREE.Scene();
    envScene.add(sky.clone());
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = 0.9;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight('#ffd2b0', '#3a3050', 1.1));
    const sun = new THREE.DirectionalLight('#ffd6a0', 2.6);
    sun.position.set(-9, 11, 8);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, { left: -6, right: 6, top: 6, bottom: -6, near: 1, far: 40 });
    sun.shadow.bias = -0.0005;
    scene.add(sun);
    const front = new THREE.DirectionalLight('#9fb0ff', 0.9);
    front.position.set(4, 5, 10);
    scene.add(front);

    /* ---------------- La falaise au-dessus du village ---------------- */
    const rock = new THREE.MeshStandardMaterial({ color: '#6f6258', roughness: 0.95 });
    const grass = new THREE.MeshStandardMaterial({ color: '#5f7a3a', roughness: 1 });
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 6.5, 12, 20), rock);
    cliff.position.y = -6.02;
    cliff.receiveShadow = true;
    scene.add(cliff);
    const top = new THREE.Mesh(new THREE.CircleGeometry(4.2, 40), grass);
    top.rotation.x = -Math.PI / 2;
    top.receiveShadow = true;
    scene.add(top);
    for (let i = 0; i < 9; i++) {
        const a = random() * Math.PI * 2;
        const r = 2.6 + random() * 1.4;
        const stone = new THREE.Mesh(new THREE.DodecahedronGeometry(0.15 + random() * 0.25), rock);
        stone.position.set(Math.cos(a) * r, 0.05, Math.sin(a) * r);
        stone.castShadow = true;
        scene.add(stone);
    }

    // Poteaux d'entraînement (makiwara) : le haut tombe quand il est tranché.
    const wood = new THREE.MeshStandardMaterial({ color: '#8a6440', roughness: 0.8 });
    const straw = new THREE.MeshStandardMaterial({ color: '#d4b877', roughness: 1 });
    const posts = [[0.95, 1.25], [1.55, 0.45], [1.85, -0.45]].map(([x, z]) => {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.05, 14), wood);
        base.position.set(x, 0.525, z);
        base.castShadow = true;
        scene.add(base);
        const topPart = new THREE.Group();
        topPart.position.set(x, 1.05, z);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 14), wood);
        t.position.y = 0.225;
        t.castShadow = true;
        topPart.add(t);
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 14), straw);
        wrap.position.y = 0.22;
        topPart.add(wrap);
        scene.add(topPart);
        return { topPart, fall: 0, dir: 1 };
    });

    /* ---------------- Le village, juste derrière lui ---------------- */
    // Inspiré du village de Konoha : bâtiments ronds et carrés aux toits colorés,
    // réservoirs d'eau sur les toits, arbres, et une grande falaise au fond.
    const village = new THREE.Group();
    village.position.y = -6;
    scene.add(village);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(170, 48), new THREE.MeshStandardMaterial({ color: '#6f9a45', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    village.add(ground);
    const walls = ['#efe2c4', '#e6d3ae', '#d8e0cf', '#f2dcc0', '#e9e4d6'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85 }));
    const roofs = ['#e8742c', '#c9432f', '#3f9a8c', '#e39a2e', '#4a78b5', '#b8563a'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
    const darkMat = new THREE.MeshStandardMaterial({ color: '#5a4636', roughness: 0.8 });
    const tankMat = new THREE.MeshStandardMaterial({ color: '#9aa8ae', roughness: 0.5, metalness: 0.3 });
    const add = (geo, m, parent, x, y, z) => {
        const o = new THREE.Mesh(geo, m);
        o.position.set(x, y, z);
        o.castShadow = true;
        o.receiveShadow = true;
        parent.add(o);
        return o;
    };
    const placed = [];
    for (let i = 0; i < 230; i++) {
        const a = -Math.PI / 2 + (random() - 0.5) * 2.7;
        const r = 17 + Math.pow(random(), 0.8) * 75;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 4.2)) continue;
        placed.push([x, z]);
        const b = new THREE.Group();
        b.position.set(x, 0, z);
        b.rotation.y = random() * Math.PI * 2;
        village.add(b);
        const wall = walls[Math.floor(random() * walls.length)];
        const roof = roofs[Math.floor(random() * roofs.length)];
        const h = 3 + random() * 6;
        const kind = random();
        if (kind < 0.35) {
            // Bâtiment rond au toit plat bordé de couleur.
            const rad = 1.6 + random() * 1.6;
            add(new THREE.CylinderGeometry(rad, rad, h, 24), wall, b, 0, h / 2, 0);
            add(new THREE.CylinderGeometry(rad + 0.25, rad + 0.25, 0.5, 24), roof, b, 0, h + 0.1, 0);
            if (random() < 0.5) add(new THREE.CylinderGeometry(rad * 0.7, rad * 0.7, 1.4, 20), wall, b, 0, h + 1, 0);
        } else {
            // Maison carrée, toit à deux pans ou toit plat avec auvent rayé.
            const w = 2.6 + random() * 3;
            const d = 2.4 + random() * 2.5;
            add(new THREE.BoxGeometry(w, h, d), wall, b, 0, h / 2, 0);
            if (kind < 0.7) {
                const r2 = add(new THREE.CylinderGeometry(0.01, (Math.max(w, d) / 2) * 1.25, 1.6, 4, 1), roof, b, 0, h + 0.8, 0);
                r2.rotation.y = Math.PI / 4;
                r2.scale.set(w / Math.max(w, d), 1, d / Math.max(w, d));
            } else {
                add(new THREE.BoxGeometry(w + 0.3, 0.35, d + 0.3), roof, b, 0, h + 0.17, 0);
                add(new THREE.BoxGeometry(w * 0.8, 0.12, 0.9), roof, b, 0, h * 0.45, d / 2 + 0.4).rotation.x = 0.35;
            }
            // Fenêtres sombres.
            for (let k = 0; k < 3; k++) add(new THREE.BoxGeometry(0.5, 0.6, 0.05), darkMat, b, (k - 1) * w * 0.28, h * 0.62, d / 2 + 0.02);
        }
        if (random() < 0.45) {
            // Réservoir d'eau sur le toit.
            const tank = new THREE.Group();
            tank.position.set((random() - 0.5) * 1.2, h + 0.3, (random() - 0.5) * 1.2);
            b.add(tank);
            add(new THREE.CylinderGeometry(0.55, 0.55, 1.1, 14), tankMat, tank, 0, 1.2, 0);
            add(new THREE.ConeGeometry(0.6, 0.35, 14), roof, tank, 0, 1.9, 0);
            [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => add(new THREE.BoxGeometry(0.08, 0.7, 0.08), darkMat, tank, sx * 0.35, 0.35, sz * 0.35));
        }
    }
    // Grande tour ronde au centre du village.
    const tower = new THREE.Group();
    tower.position.set(4, 0, -52);
    village.add(tower);
    const towerWall = new THREE.MeshStandardMaterial({ color: '#e3cfa4', roughness: 0.8 });
    const red = new THREE.MeshStandardMaterial({ color: '#c8452d', roughness: 0.6 });
    [[8, 8, 0], [6.5, 6, 8], [5, 4, 14]].forEach(([r, h, y]) => {
        add(new THREE.CylinderGeometry(r, r, h, 32), towerWall, tower, 0, y + h / 2, 0);
        add(new THREE.CylinderGeometry(r * 1.12, r * 1.12, 0.8, 32), red, tower, 0, y + h + 0.2, 0);
    });
    // Arbres aux feuillages ronds.
    const leafMats = ['#4f8a34', '#5d9a3c', '#3f7a30'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 1 }));
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1 });
    for (let i = 0; i < 160; i++) {
        const a = random() * Math.PI * 2;
        const r = 13 + random() * 90;
        const x = Math.cos(a) * r;
        const z = Math.sin(a) * r;
        if (placed.some(([px, pz]) => Math.hypot(px - x, pz - z) < 3)) continue;
        const t = new THREE.Group();
        t.position.set(x, 0, z);
        village.add(t);
        const size = 1.4 + random() * 1.6;
        add(new THREE.CylinderGeometry(0.2, 0.3, size * 1.4, 7), trunkMat, t, 0, size * 0.7, 0);
        add(new THREE.IcosahedronGeometry(size, 1), leafMats[i % 3], t, 0, size * 1.9, 0);
        add(new THREE.IcosahedronGeometry(size * 0.7, 1), leafMats[(i + 1) % 3], t, size * 0.6, size * 1.5, 0.2);
    }
    // Grande falaise de roche au fond, couronnée de forêt.
    const rockTex = (() => {
        const c = document.createElement('canvas');
        c.width = 512;
        c.height = 256;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#b99a74';
        ctx.fillRect(0, 0, 512, 256);
        for (let i = 0; i < 400; i++) {
            ctx.fillStyle = random() > 0.5 ? 'rgba(90,70,50,.25)' : 'rgba(240,220,190,.2)';
            ctx.fillRect(random() * 512, random() * 256, 2 + random() * 40, 1 + random() * 3);
        }
        for (let x = 0; x < 512; x += 18 + random() * 30) {
            ctx.fillStyle = 'rgba(70,50,35,.3)';
            ctx.fillRect(x, 0, 2 + random() * 3, 256);
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(6, 1);
        return t;
    })();
    const cliffWall = new THREE.Mesh(new THREE.CylinderGeometry(118, 118, 46, 64, 1, true, Math.PI * 0.62, Math.PI * 0.76), new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.95, side: THREE.DoubleSide }));
    cliffWall.position.set(0, 23, 10);
    village.add(cliffWall);
    for (let i = 0; i < 70; i++) {
        const a = Math.PI * 0.62 + random() * Math.PI * 0.76;
        const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(5 + random() * 4, 1), leafMats[i % 3]);
        bush.position.set(Math.sin(a) * 116, 43 + random() * 3, Math.cos(a) * 116 + 10);
        village.add(bush);
    }

    // Nuages.
    const cloudMat = new THREE.MeshStandardMaterial({ color: '#ffe0d0', roughness: 1, transparent: true, opacity: 0.85 });
    const clouds = [];
    for (let i = 0; i < 16; i++) {
        const c = new THREE.Group();
        for (let k = 0; k < 4; k++) {
            const puff = new THREE.Mesh(new THREE.SphereGeometry(3 + random() * 3, 14, 10), cloudMat);
            puff.position.set(k * 3.5 - 5, random() * 1.5, random() * 2);
            puff.scale.y = 0.45;
            c.add(puff);
        }
        const a = -Math.PI / 2 + (random() - 0.5) * 3;
        c.position.set(Math.cos(a) * (60 + random() * 60), 8 + random() * 20, Math.sin(a) * (60 + random() * 60));
        scene.add(c);
        clouds.push(c);
    }
    updaters.push((dt) => clouds.forEach((c, i) => { c.position.x += dt * (0.4 + (i % 3) * 0.2); }));

    // Feuilles qui volent dans le vent.
    const leafCount = 140;
    const leafPos = new Float32Array(leafCount * 3);
    const leafSeeds = Array.from({ length: leafCount }, () => ({ x: (random() - 0.5) * 16, y: random() * 7, z: (random() - 0.5) * 16, s: random() * 10 }));
    const leafGeo = new THREE.BufferGeometry();
    leafGeo.setAttribute('position', new THREE.BufferAttribute(leafPos, 3));
    scene.add(new THREE.Points(leafGeo, new THREE.PointsMaterial({ color: '#8fb34a', size: 0.09, map: dot(), transparent: true, depthWrite: false })));
    updaters.push((dt, time) => {
        leafSeeds.forEach((l, i) => {
            leafPos[i * 3] = ((l.x + time * 1.6 + 8) % 16) - 8;
            leafPos[i * 3 + 1] = l.y + Math.sin(time * 0.8 + l.s) * 0.6;
            leafPos[i * 3 + 2] = l.z + Math.cos(time * 0.6 + l.s) * 0.6;
        });
        leafGeo.attributes.position.needsUpdate = true;
    });

    /* ---------------- Hoko adulte ---------------- */
    const ninja = buildNinja();
    scene.add(ninja.root);
    updaters.push((dt, time) => {
        ninja.J.spine.position.y = 0.12 + Math.sin(time * 1.8) * 0.006;
        ninja.plantFeet();
    });

    /* ---------------- Effets : sabre, eau, pièces ---------------- */
    const arcMat = new THREE.MeshBasicMaterial({ color: '#cfefff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const arcs = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.03, 6, 48, 2.4), arcMat.clone());
        m.scale.z = 0.3;
        scene.add(m);
        return m;
    });

    const waterCount = 900;
    const waterPos = new Float32Array(waterCount * 3);
    const waterGeo = new THREE.BufferGeometry();
    waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPos, 3));
    const waterMat = new THREE.PointsMaterial({ color: '#3fa6ff', size: 0.13, map: dot(), transparent: true, opacity: 0, depthWrite: false });
    const water = new THREE.Points(waterGeo, waterMat);
    water.frustumCulled = false;
    scene.add(water);
    const waterSeeds = Array.from({ length: waterCount }, () => ({ a: random() * Math.PI * 2, r: random(), h: random(), s: random() }));
    const waterState = { rise: 0, blast: 0 };
    updaters.push((dt, time) => {
        waterSeeds.forEach((w, i) => {
            const k = w.h;
            // Spirale qui monte autour de lui (un dragon d'eau), puis jaillit en avant.
            const angle = w.a + time * 4 + k * 9;
            const radius = 0.6 + w.r * 0.25 + (1 - waterState.rise) * 1.5;
            let x = Math.cos(angle) * radius;
            let y = k * 3 * waterState.rise + 0.2;
            let z = Math.sin(angle) * radius;
            const b = waterState.blast;
            if (b > 0) {
                const d = (b * 14 + w.s * 3) * (0.5 + k);
                x = x * (1 - b) + (w.r - 0.5) * b * 1.5;
                y = y * (1 - b) + (1.4 + (w.s - 0.5) * 0.6) * b;
                z = z * (1 - b) + d;
            }
            waterPos[i * 3] = x;
            waterPos[i * 3 + 1] = y;
            waterPos[i * 3 + 2] = z;
        });
        waterGeo.attributes.position.needsUpdate = true;
    });

    const coinTex = coinTexture();
    const goldSide = new THREE.MeshStandardMaterial({ color: '#e7b845', metalness: 0.9, roughness: 0.3, emissive: new THREE.Color('#5a3a08'), emissiveIntensity: 0.35 });
    const goldFace = new THREE.MeshStandardMaterial({ color: '#f5cc5c', metalness: 0.9, roughness: 0.25, emissive: new THREE.Color('#6a4508'), emissiveIntensity: 0.4, alphaMap: coinTex, alphaTest: 0.5, side: THREE.DoubleSide });
    const coinCount = 260;
    const coinMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.06, 0.06, 0.009, 22), [goldSide, goldFace, goldFace], coinCount);
    coinMesh.castShadow = true;
    coinMesh.frustumCulled = false;
    scene.add(coinMesh);
    const coins = Array.from({ length: coinCount }, () => ({ active: false, p: V(0, -10, 0), v: V(), rot: new THREE.Euler(), spin: V(), resting: false, collect: false }));
    const dummy = new THREE.Object3D();
    const pouchWorld = V();
    let spawnRate = 0;
    let spawnCarry = 0;
    let collecting = false;
    updaters.push((dt) => {
        spawnCarry += spawnRate * dt;
        while (spawnCarry >= 1) {
            spawnCarry--;
            const c = coins.find((x) => !x.active);
            if (!c) break;
            const a = random() * Math.PI * 2;
            const r = random() * 2.2;
            c.active = true;
            c.resting = false;
            c.collect = false;
            c.p.set(Math.cos(a) * r, 5 + random() * 3, Math.sin(a) * r + 0.3);
            c.v.set(0, -1 - random() * 2, 0);
            c.rot.set(random() * 6, random() * 6, random() * 6);
            c.spin.set((random() - 0.5) * 18, (random() - 0.5) * 18, (random() - 0.5) * 18);
        }
        ninja.pouch.getWorldPosition(pouchWorld);
        coins.forEach((c, i) => {
            if (c.active) {
                if (collecting && !c.collect && random() < dt * 3) c.collect = true;
                if (c.collect) {
                    c.p.lerp(pouchWorld, Math.min(1, dt * 6));
                    c.rot.x += dt * 20;
                    if (c.p.distanceTo(pouchWorld) < 0.08) {
                        c.active = false;
                        c.p.set(0, -10, 0);
                    }
                } else if (!c.resting) {
                    c.v.y -= 9.8 * dt;
                    c.p.addScaledVector(c.v, dt);
                    c.rot.x += c.spin.x * dt;
                    c.rot.y += c.spin.y * dt;
                    c.rot.z += c.spin.z * dt;
                    if (c.p.y < 0.004) {
                        c.p.y = 0.004;
                        if (Math.abs(c.v.y) < 1.2) {
                            c.resting = true;
                            c.rot.set(0, c.rot.y, (random() - 0.5) * 0.1);
                        } else {
                            c.v.y *= -0.35;
                            c.v.x = (random() - 0.5) * 0.8;
                            c.v.z = (random() - 0.5) * 0.8;
                            c.spin.multiplyScalar(0.5);
                        }
                    }
                }
            }
            dummy.position.copy(c.p);
            dummy.rotation.copy(c.rot);
            dummy.scale.setScalar(c.active ? 1 : 0.0001);
            dummy.updateMatrix();
            coinMesh.setMatrixAt(i, dummy.matrix);
        });
        coinMesh.instanceMatrix.needsUpdate = true;
    });

    // Pièce lancée d'une pichenette, qui retombe dans la main.
    const flipCoin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.008, 22), [goldSide, goldFace, goldFace]);
    flipCoin.visible = false;
    scene.add(flipCoin);

    /* ---------------- Mise en scène ---------------- */
    const look = V();
    function shot(timeline, position, target, seconds, easing = ease.inOut) {
        const p0 = camera.position.clone();
        const l0 = look.clone();
        return timeline.tween(seconds, (k) => {
            camera.position.lerpVectors(p0, position, k);
            look.lerpVectors(l0, target, k);
            camera.lookAt(look);
        }, easing);
    }
    function pose(timeline, name, seconds, easing = ease.inOut) {
        const from = ninja.currentValues();
        const to = ninja.poseValues(name);
        return timeline.tween(seconds, (k) => {
            ninja.setValues(from.map((f, i) => f.map((v, j) => v + (to[i][j] - v) * k)));
        }, easing);
    }
    function slash(timeline, index, rotation, position) {
        const arc = arcs[index];
        arc.rotation.set(...rotation);
        arc.position.copy(position);
        arc.material.opacity = 0.9;
        return timeline.tween(0.45, (k) => {
            arc.material.opacity = 0.9 * (1 - k);
            arc.rotation.z = rotation[2] + k * 0.6;
        }, ease.out);
    }
    function cutPost(timeline, index) {
        const post = posts[index];
        const p0 = post.topPart.position.clone();
        return timeline.tween(0.9, (k) => {
            post.topPart.position.set(p0.x + post.dir * 0.35 * k, p0.y - 0.95 * k * k + 0.12 * Math.sin(Math.PI * k), p0.z + 0.25 * k);
            post.topPart.rotation.z = -post.dir * 1.4 * k;
        }, ease.in);
    }

    async function play({ timeline, sound, say, hud, counters }) {
        const tl = timeline;
        camera.position.set(0.5, 1.9, 7.5);
        look.set(0, 1.5, 0);
        camera.lookAt(look);
        sound.startDream();

        // 1. Hoko, adulte, domine le village au coucher du soleil.
        say('Hoko Senju — jōnin de Konoha', 4.5);
        await shot(tl, V(3.6, 1.7, 3.6), V(0, 1.55, 0), 5.5, ease.sine);

        // 2. Maître du kenjutsu : trois coups de sabre, trois poteaux tranchés.
        const side = shot(tl, V(-2.6, 1.55, 3.6), V(0.8, 1.1, 0.4), 1.2);
        tl.tween(0.5, (k) => { ninja.root.rotation.y = 0.9 * k; });
        await pose(tl, 'draw', 0.5);
        await side;
        ninja.drawKatana();
        say('Maître du kenjutsu', 3.5);
        const cuts = [['slashA', [0.2, 0.9, 0.6], V(0.7, 1.15, 0.95)], ['slashB', [-0.3, 1.1, -0.4], V(1.1, 1.1, 0.35)], ['slashC', [1.2, 1.2, 0], V(1.25, 1.15, -0.2)]];
        for (let i = 0; i < 3; i++) {
            sound.whoosh();
            await pose(tl, cuts[i][0], 0.13, ease.out);
            slash(tl, i, cuts[i][1], cuts[i][2]);
            sound.cut();
            cutPost(tl, i);
            await tl.wait(0.35);
        }
        await tl.wait(0.5);
        await pose(tl, 'draw', 0.35);
        ninja.sheathe();
        tl.tween(0.5, (k) => { ninja.root.rotation.y = 0.9 * (1 - k); });
        await pose(tl, 'stand', 0.4);

        // 3. Maître du Suiton : mudras, puis un dragon d'eau.
        const low = shot(tl, V(0.2, 0.9, 4.6), V(0, 1.45, 0), 1.2);
        await pose(tl, 'seal', 0.5);
        await low;
        say('Suiton : maître de l\'eau', 3.5);
        sound.water(2.6);
        waterMat.opacity = 0.85;
        await tl.tween(2.2, (k) => { waterState.rise = k; }, ease.out);
        await pose(tl, 'release', 0.25, ease.out);
        sound.splash();
        await tl.tween(1.1, (k) => { waterState.blast = k; waterMat.opacity = 0.85 * (1 - k * k); }, ease.in);
        waterState.rise = 0;
        waterState.blast = 0;
        await pose(tl, 'stand', 0.4);

        // 4. Chef de la section économique : une pluie de ryō.
        await shot(tl, V(2.6, 2.3, 4.6), V(0, 1.1, 0.3), 1.2);
        say('Chef de la section économique de Konoha', 4);
        hud.hidden = false;
        spawnRate = 45;
        sound.coins(60, 3);
        const counting = tl.tween(8.5, (k) => counters(k), ease.inOut);
        await pose(tl, 'catch', 0.6);
        await tl.wait(1.6);
        say('Le village prospère… et ses poches aussi.', 4.5);
        await pose(tl, 'pocket', 0.5);
        collecting = true;
        sound.coins(80, 3);
        await tl.tween(2.6, (k) => { ninja.pouch.scale.setScalar(1 + k * 0.9); }, ease.out);
        spawnRate = 8;
        // Pichenette : une pièce monte en tournoyant et retombe dans sa main.
        await pose(tl, 'flip', 0.4);
        const hand = V();
        ninja.J.handR.getWorldPosition(hand);
        flipCoin.visible = true;
        sound.coin(0, 0.08);
        await tl.tween(1.1, (k) => {
            flipCoin.position.set(hand.x, hand.y + 0.05 + Math.sin(Math.PI * k) * 0.9, hand.z + 0.05);
            flipCoin.rotation.x = k * 26;
        }, ease.linear);
        sound.coin(0, 0.08);
        flipCoin.visible = false;
        await counting;

        // 5. Final : il croise les bras, le soleil se couche sur Konoha.
        spawnRate = 0;
        collecting = false;
        pose(tl, 'crossed', 0.8);
        say('Un jour…', 3.5);
        await shot(tl, V(-2.5, 4.8, 9.5), V(0, 1.2, -2), 5.5, ease.sine);
        sound.stopDream(3);
    }

    // Pose initiale, pour les premières images.
    camera.position.set(0.5, 1.9, 7.5);
    camera.lookAt(0, 1.5, 0);

    return {
        scene,
        camera,
        play,
        update(dt, time) { updaters.forEach((fn) => fn(dt, time)); },
        resize(aspect) {
            camera.aspect = aspect;
            camera.fov = aspect < 1 ? 70 : 48;
            camera.updateProjectionMatrix();
        }
    };
}
