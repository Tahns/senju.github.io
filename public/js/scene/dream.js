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
    scene.fog = new THREE.Fog('#e9a37a', 30, 150);
    const random = rng(303);
    const updaters = [];

    /* ---------------- Ciel de coucher de soleil ---------------- */
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
            top: { value: new THREE.Color('#2a2a66') },
            mid: { value: new THREE.Color('#c9637a') },
            low: { value: new THREE.Color('#ffc27a') },
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
    const sun = new THREE.DirectionalLight('#ffc48a', 3);
    sun.position.set(-6, 9, -14);
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
    const cliff = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.5, 6, 20), rock);
    cliff.position.y = -3.02;
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

    /* ---------------- Le village, en contrebas ---------------- */
    const roofColors = ['#6d2a22', '#3d4a66', '#5a3a2a', '#7a3326', '#2f3a4f'];
    const wallMat = new THREE.MeshStandardMaterial({ color: '#e9dcc0', roughness: 0.9 });
    const roofMats = roofColors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8 }));
    const village = new THREE.Group();
    village.position.y = -16;
    scene.add(village);
    const ground = new THREE.Mesh(new THREE.CircleGeometry(160, 48), new THREE.MeshStandardMaterial({ color: '#4d6a34', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    village.add(ground);
    for (let i = 0; i < 180; i++) {
        const a = -Math.PI / 2 + (random() - 0.5) * 2.4;
        const r = 14 + random() * 55;
        const w = 2 + random() * 3;
        const h = 2 + random() * 4;
        const house = new THREE.Group();
        house.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
        house.rotation.y = random() * Math.PI;
        const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), wallMat);
        body.position.y = h / 2;
        house.add(body);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(w * 0.85, 1.4, 4), roofMats[i % roofMats.length]);
        roof.position.y = h + 0.7;
        roof.rotation.y = Math.PI / 4;
        house.add(roof);
        village.add(house);
    }
    // Grande tour ronde au centre du village.
    const tower = new THREE.Group();
    tower.position.set(0, 0, -48);
    village.add(tower);
    const towerWall = new THREE.MeshStandardMaterial({ color: '#d9c7a4', roughness: 0.8 });
    const red = new THREE.MeshStandardMaterial({ color: '#a1261c', roughness: 0.6 });
    [[7, 8, 0], [5.5, 5, 8], [4, 4, 13]].forEach(([r, h, y]) => {
        const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 24), towerWall);
        b.position.y = y + h / 2;
        tower.add(b);
        const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.25, 1.6, 24), red);
        roof.position.y = y + h + 0.6;
        tower.add(roof);
    });
    // Arbres et montagnes.
    const leafMat = new THREE.MeshStandardMaterial({ color: '#3f5f2c', roughness: 1 });
    for (let i = 0; i < 120; i++) {
        const a = random() * Math.PI * 2;
        const r = 10 + random() * 80;
        const tree = new THREE.Mesh(new THREE.ConeGeometry(1.2 + random(), 3 + random() * 3, 7), leafMat);
        tree.position.set(Math.cos(a) * r, 2, Math.sin(a) * r);
        village.add(tree);
    }
    const mountainMat = new THREE.MeshStandardMaterial({ color: '#6c6590', roughness: 1 });
    for (let i = 0; i < 14; i++) {
        const a = -Math.PI / 2 + (i / 13 - 0.5) * 3;
        const m = new THREE.Mesh(new THREE.ConeGeometry(18 + random() * 20, 25 + random() * 30, 6), mountainMat);
        m.position.set(Math.cos(a) * 130, 8, Math.sin(a) * 130);
        village.add(m);
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
