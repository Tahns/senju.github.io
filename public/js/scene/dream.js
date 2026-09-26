/*
 * Le rêve de Hoko (vu à la troisième personne) : adulte, jōnin de Konoha,
 * maître du sabre et du Suiton… et chef de la section économique, qui fait
 * prospérer le village tout en remplissant ses poches.
 */
import * as THREE from 'three';
import { buildNinja } from './ninja.js';
import { ease } from './timeline.js';
import { rng, dot } from './textures.js';
import { buildVillage, buildGrass, grassTexture } from './village.js';
import { Post } from './post.js';

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

// Nuage cumulus peint : des bouffées douces sur une base plus plate.
function cloudTexture(random) {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 256;
    const ctx = c.getContext('2d');
    for (let i = 0; i < 70; i++) {
        const x = 90 + random() * 332;
        const top = 1 - Math.abs(x - 256) / 200;
        const y = 190 - random() * 110 * top;
        const r = 30 + random() * 50 * (0.5 + top);
        const g = ctx.createRadialGradient(x, y - r * 0.2, 0, x, y, r);
        const shade = 235 + Math.round(random() * 20);
        g.addColorStop(0, `rgba(${shade},${shade},${shade + 5},.55)`);
        g.addColorStop(0.6, `rgba(${shade - 15},${shade - 10},${shade},.3)`);
        g.addColorStop(1, 'rgba(220,225,235,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x - r, y - r, r * 2, r * 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
}

// Roche du rocher d'entraînement : cylindre sculpté, lisse, bosselé.
function rockColumn(random) {
    const geo = new THREE.CylinderGeometry(4.2, 6.2, 12, 96, 18, true);
    const p = geo.attributes.position;
    const v = new THREE.Vector3();
    const seeds = Array.from({ length: 5 }, () => [random() * 6, 3 + random() * 9, random() * 0.5]);
    for (let i = 0; i < p.count; i++) {
        v.fromBufferAttribute(p, i);
        const a = Math.atan2(v.x, v.z);
        const top = THREE.MathUtils.smoothstep(v.y, 4.6, 6);
        let bump = 0;
        seeds.forEach(([ph, f, amp]) => { bump += Math.sin(a * f + ph + v.y * 0.4) * (0.12 + amp); });
        const k = 1 + (bump * 0.08) * (1 - top * 0.999);
        p.setXYZ(i, v.x * k, v.y, v.z * k);
    }
    geo.computeVertexNormals();
    return geo;
}

export function buildDream(renderer, { low = false, mobile = false, head, avatar = null } = {}) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 420);
    scene.fog = new THREE.Fog('#dfe0d6', 70, 270);
    const random = rng(303);
    const updaters = [];

    /* ---------------- Ciel clair de fin d'après-midi ---------------- */
    const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 48, 24), new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
            top: { value: new THREE.Color('#2d6fd0') },
            mid: { value: new THREE.Color('#8cc0ec') },
            low: { value: new THREE.Color('#f1e6cf') },
            sunDir: { value: V(-0.35, 0.16, -1).normalize() }
        },
        vertexShader: 'varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: 'uniform vec3 top; uniform vec3 mid; uniform vec3 low; uniform vec3 sunDir; varying vec3 vDir; void main(){ float h = vDir.y; vec3 c = h > 0.1 ? mix(mid, top, smoothstep(0.1, 0.7, h)) : mix(low, mid, smoothstep(-0.02, 0.1, h)); float s = max(dot(normalize(vDir), sunDir), 0.0); c += vec3(1.0,0.85,0.6) * pow(s, 200.0) * 3.0 + vec3(1.0,0.8,0.55) * pow(s, 8.0) * 0.35; gl_FragColor = vec4(c, 1.0); }'
    }));
    scene.add(sky);
    // Reflets : l'or, l'acier et les tissus renvoient la couleur du ciel.
    const envScene = new THREE.Scene();
    envScene.add(sky.clone());
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = 0.8;
    pmrem.dispose();

    scene.add(new THREE.HemisphereLight('#dbe8ff', '#6d5c42', 1.15));
    const sun = new THREE.DirectionalLight('#ffe3bd', 3.1);
    const sunTarget = low ? V(0, 0, 0) : mobile ? V(0, -2, -5) : V(0, -3, -10);
    sun.target.position.copy(sunTarget);
    sun.position.copy(sunTarget).add(V(-9, 11, 8).normalize().multiplyScalar(60));
    sun.castShadow = true;
    const span = low ? 7 : mobile ? 14 : 26;
    const mapSize = low || mobile ? 1024 : 2048;
    sun.shadow.mapSize.set(mapSize, mapSize);
    Object.assign(sun.shadow.camera, { left: -span, right: span, top: span, bottom: -span, near: 20, far: 110 });
    sun.shadow.bias = -0.0004;
    sun.shadow.normalBias = 0.02;
    scene.add(sun, sun.target);
    // Contre-jour chaud : un liseré de lumière sur les cheveux et les épaules.
    const rim = new THREE.DirectionalLight('#ffd9a6', 1.7);
    rim.position.set(3, 6, -9);
    scene.add(rim);
    const front = new THREE.DirectionalLight('#b8c8ff', 0.45);
    front.position.set(4, 5, 10);
    scene.add(front);

    /* ---------------- Le rocher d'entraînement ---------------- */
    const rockTex = (() => {
        const c = document.createElement('canvas');
        c.width = c.height = 256;
        const ctx = c.getContext('2d');
        ctx.fillStyle = '#8a7a68';
        ctx.fillRect(0, 0, 256, 256);
        for (let i = 0; i < 60; i++) {
            const x = random() * 256;
            const y = random() * 256;
            const r = 10 + random() * 40;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, random() > 0.5 ? 'rgba(60,50,40,.3)' : 'rgba(200,185,165,.3)');
            g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        const t = new THREE.CanvasTexture(c);
        t.colorSpace = THREE.SRGBColorSpace;
        t.wrapS = t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(6, 2);
        return t;
    })();
    const rock = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.9 });
    const pebble = new THREE.MeshStandardMaterial({ color: '#8b7d6c', roughness: 0.85 });
    const cliff = new THREE.Mesh(rockColumn(random), rock);
    cliff.position.y = -6.02;
    cliff.receiveShadow = true;
    cliff.castShadow = true;
    scene.add(cliff);
    const grassTex = grassTexture(random);
    grassTex.repeat.set(3, 3);
    const top = new THREE.Mesh(new THREE.CircleGeometry(4.25, 96), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
    top.rotation.x = -Math.PI / 2;
    top.receiveShadow = true;
    scene.add(top);
    const grass = buildGrass(4.1, low ? 5000 : mobile ? 9000 : 16000, random);
    scene.add(grass.mesh);
    updaters.push((dt, time) => grass.update(time));
    for (let i = 0; i < 9; i++) {
        const a = random() * Math.PI * 2;
        const r = 2.6 + random() * 1.4;
        const size = 0.15 + random() * 0.25;
        const stone = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 14), pebble);
        stone.scale.set(1 + random() * 0.4, 0.55 + random() * 0.3, 0.9 + random() * 0.3);
        stone.rotation.y = random() * 3;
        stone.position.set(Math.cos(a) * r, size * 0.25, Math.sin(a) * r);
        stone.castShadow = true;
        stone.receiveShadow = true;
        scene.add(stone);
    }

    // Poteaux d'entraînement (makiwara) : le haut tombe quand il est tranché.
    const wood = new THREE.MeshStandardMaterial({ color: '#8a6440', roughness: 0.8 });
    const straw = new THREE.MeshStandardMaterial({ color: '#d4b877', roughness: 1 });
    const posts = [[0.95, 1.25], [1.55, 0.45], [1.85, -0.45]].map(([x, z]) => {
        const base = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.1, 1.05, 24), wood);
        base.position.set(x, 0.525, z);
        base.castShadow = true;
        scene.add(base);
        const topPart = new THREE.Group();
        topPart.position.set(x, 1.05, z);
        const t = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.45, 24), wood);
        t.position.y = 0.225;
        t.castShadow = true;
        topPart.add(t);
        const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.2, 24), straw);
        wrap.position.y = 0.22;
        wrap.castShadow = true;
        topPart.add(wrap);
        scene.add(topPart);
        return { topPart, fall: 0, dir: 1 };
    });

    /* ---------------- Konoha, en contrebas ---------------- */
    const village = buildVillage({ low });
    village.group.position.y = -6;
    scene.add(village.group);
    updaters.push((dt, time) => village.update(dt, time));

    // Nuages : de grands cumulus doux qui dérivent lentement.
    const cloudTex = cloudTexture(random);
    const clouds = [];
    for (let i = 0; i < 14; i++) {
        const cloud = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, transparent: true, depthWrite: false, fog: false, opacity: 0.8 + random() * 0.2 }));
        const a = -Math.PI / 2 + (random() - 0.5) * 3.2;
        const r = 200 + random() * 70;
        const w = 70 + random() * 60;
        cloud.scale.set(w, w * 0.45, 1);
        cloud.position.set(Math.cos(a) * r, 45 + random() * 55, Math.sin(a) * r);
        cloud.material.rotation = (random() - 0.5) * 0.1;
        scene.add(cloud);
        clouds.push(cloud);
    }
    updaters.push((dt) => clouds.forEach((c, i) => { c.position.x += dt * (0.6 + (i % 3) * 0.3); }));

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
    const ninja = buildNinja(head, avatar);
    scene.add(ninja.root);
    const spineY = ninja.J.spine.position.y;
    updaters.push((dt, time) => {
        ninja.J.spine.position.y = spineY + Math.sin(time * 1.8) * 0.006;
        ninja.live(time);
        ninja.plantFeet();
        ninja.sync();
    });

    /* ---------------- Effets : sabre, eau, pièces ---------------- */
    // Coup de sabre : un croissant de lumière, vif au bout, qui s'efface.
    const slashMaterial = () => new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0 }, uColor: { value: new THREE.Color('#dff4ff') } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uOpacity; uniform vec3 uColor; varying vec2 vP; void main(){ float t = clamp(atan(vP.y, vP.x) / 2.4, 0.0, 1.0); float r = (length(vP) - 0.8) / 0.34; float edge = smoothstep(0.0, 0.75, r) * (1.0 - smoothstep(0.9, 1.0, r)); float core = smoothstep(0.62, 0.92, r) * (1.0 - smoothstep(0.92, 1.0, r)); gl_FragColor = vec4(uColor * (1.0 + core * 2.5), pow(t, 1.6) * edge * uOpacity); }',
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const arcs = [0, 1, 2].map(() => {
        const m = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.14, 64, 1, 0, 2.4), slashMaterial());
        scene.add(m);
        return m;
    });

    // Dragon d'eau : un tube qui s'enroule autour de Hoko, puis jaillit.
    const dragonPoints = [];
    for (let i = 0; i <= 64; i++) {
        const t = i / 64;
        const a = t * Math.PI * 4.5 + 1.2;
        const r = 1.05 - t * 0.35;
        dragonPoints.push(V(Math.cos(a) * r, 0.15 + t * 2.4, Math.sin(a) * r));
    }
    dragonPoints.push(V(0.2, 2.9, 0.9), V(-0.8, 2.8, 2.8), V(-2.4, 2.3, 5.5), V(-4.5, 1.8, 9.5));
    const dragonCurve = new THREE.CatmullRomCurve3(dragonPoints);
    const segments = 420;
    const radial = 18;
    const dragonGeo = new THREE.TubeGeometry(dragonCurve, segments, 0.17, radial, false);
    const centers = new Float32Array(dragonGeo.attributes.position.count * 3);
    for (let i = 0; i <= segments; i++) {
        const c = dragonCurve.getPointAt(i / segments);
        for (let j = 0; j <= radial; j++) centers.set([c.x, c.y, c.z], (i * (radial + 1) + j) * 3);
    }
    dragonGeo.setAttribute('center', new THREE.BufferAttribute(centers, 3));
    const dragonMat = new THREE.ShaderMaterial({
        uniforms: { uHead: { value: 0 }, uTail: { value: 0 }, uTime: { value: 0 } },
        vertexShader: `attribute vec3 center; uniform float uHead; uniform float uTail; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            void main(){
                vUv = uv;
                float body = smoothstep(uTail, uTail + 0.1, uv.x) * (1.0 - smoothstep(uHead - 0.015, uHead, uv.x));
                float head = exp(-pow((uv.x - (uHead - 0.035)) / 0.02, 2.0)) * step(0.01, uHead);
                float s = body * (0.55 + 0.45 * smoothstep(uTail, uTail + 0.3, uv.x)) + head * 0.7;
                vec3 p = center + (position - center) * s;
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                vN = normalize(normalMatrix * normal);
                vV = -mv.xyz;
                gl_Position = projectionMatrix * mv;
            }`,
        fragmentShader: `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            void main(){
                float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
                vec3 deep = vec3(0.05, 0.32, 0.78);
                vec3 light = vec3(0.45, 0.85, 1.0);
                vec3 c = mix(deep, light, f * 0.8 + max(vN.y, 0.0) * 0.25);
                float foam = smoothstep(0.72, 1.0, sin(vUv.x * 260.0 - uTime * 14.0 + sin(vUv.y * 18.85) * 1.6));
                c += vec3(1.0) * foam * 0.9;
                gl_FragColor = vec4(c * 1.2, 0.62 + f * 0.33 + foam * 0.2);
            }`,
        transparent: true,
        depthWrite: false
    });
    const dragon = new THREE.Mesh(dragonGeo, dragonMat);
    dragon.frustumCulled = false;
    scene.add(dragon);
    updaters.push((dt, time) => { dragonMat.uniforms.uTime.value = time; });

    const waterCount = 420;
    const waterPos = new Float32Array(waterCount * 3);
    const waterGeo = new THREE.BufferGeometry();
    waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPos, 3));
    const waterMat = new THREE.PointsMaterial({ color: '#8fd4ff', size: 0.08, map: dot(), transparent: true, opacity: 0, depthWrite: false });
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
    const goldSide = new THREE.MeshStandardMaterial({ color: '#f0c24a', metalness: 0.75, roughness: 0.28, emissive: new THREE.Color('#9a6a10'), emissiveIntensity: 0.55 });
    const goldFace = new THREE.MeshStandardMaterial({ color: '#ffd766', metalness: 0.75, roughness: 0.22, emissive: new THREE.Color('#a8740f'), emissiveIntensity: 0.6, alphaMap: coinTex, alphaTest: 0.5, side: THREE.DoubleSide });
    const coinCount = 260;
    const coinMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.085, 0.085, 0.012, 28), [goldSide, goldFace, goldFace], coinCount);
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
            c.floor = 0.09 + random() * 0.08;
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
                    // Les pièces se posent sur l'herbe (brins de 7 à 19 cm).
                    if (c.p.y < c.floor) {
                        c.p.y = c.floor;
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

    // Paillettes d'or et lueur chaude pendant la pluie de ryō.
    const glitterCount = 240;
    const glitterPos = new Float32Array(glitterCount * 3);
    const glitterGeo = new THREE.BufferGeometry();
    glitterGeo.setAttribute('position', new THREE.BufferAttribute(glitterPos, 3));
    const glitterMat = new THREE.PointsMaterial({ color: '#ffd86a', size: 0.06, map: dot(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const glitter = new THREE.Points(glitterGeo, glitterMat);
    glitter.frustumCulled = false;
    scene.add(glitter);
    const glitterSeeds = Array.from({ length: glitterCount }, () => ({ a: random() * Math.PI * 2, r: random() * 2.4, h: random(), s: 0.4 + random() * 0.8 }));
    const goldLight = new THREE.PointLight('#ffcf6a', 0, 7, 1.5);
    goldLight.position.set(0, 3, 0.8);
    scene.add(goldLight);
    updaters.push((dt, time) => {
        if (glitterMat.opacity <= 0) return;
        glitterSeeds.forEach((g, i) => {
            const y = 5.5 - ((time * g.s + g.h * 6) % 6);
            glitterPos[i * 3] = Math.cos(g.a + time * 0.3) * g.r;
            glitterPos[i * 3 + 1] = y;
            glitterPos[i * 3 + 2] = Math.sin(g.a + time * 0.3) * g.r + 0.3;
        });
        glitterGeo.attributes.position.needsUpdate = true;
        glitterMat.size = 0.05 + Math.sin(time * 9) * 0.015;
    });

    // Nuage de poussière à la réception.
    const dustCount = 260;
    const dustPos = new Float32Array(dustCount * 3);
    const dustGeo = new THREE.BufferGeometry();
    dustGeo.setAttribute('position', new THREE.BufferAttribute(dustPos, 3));
    const dustMat = new THREE.PointsMaterial({ color: '#b39d78', size: 0.55, map: dot(), transparent: true, opacity: 0, depthWrite: false });
    const dust = new THREE.Points(dustGeo, dustMat);
    dust.frustumCulled = false;
    scene.add(dust);
    const dustSeeds = Array.from({ length: dustCount }, () => ({ a: random() * Math.PI * 2, s: 0.5 + random(), h: random() }));
    // Onde de choc qui court sur l'herbe.
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 64), new THREE.MeshBasicMaterial({ color: '#fff4dc', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    scene.add(ring);
    let dustAge = 9;
    function burst() { dustAge = 0; }
    updaters.push((dt) => {
        if (dustAge > 2) {
            dustMat.opacity = 0;
            ring.material.opacity = 0;
            return;
        }
        dustAge += dt;
        const k = Math.min(1, dustAge / 1.6);
        const e = 1 - Math.pow(1 - k, 3);
        dustSeeds.forEach((d, i) => {
            const r = 0.2 + e * 1.6 * d.s;
            dustPos[i * 3] = Math.cos(d.a) * r;
            dustPos[i * 3 + 1] = 0.08 + e * 0.7 * d.h;
            dustPos[i * 3 + 2] = Math.sin(d.a) * r;
        });
        dustGeo.attributes.position.needsUpdate = true;
        dustMat.opacity = 0.95 * (1 - k * k);
        ring.scale.setScalar(0.3 + e * 3.2);
        ring.material.opacity = 0.7 * (1 - k);
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
    // Expression du visage, en fondu (modèle anime uniquement).
    const faceLevels = {};
    function face(timeline, name, value, seconds) {
        const from = faceLevels[name] || 0;
        faceLevels[name] = value;
        return timeline.tween(seconds, (k) => ninja.express(name, from + (value - from) * k));
    }
    function slash(timeline, index, rotation, position) {
        const arc = arcs[index];
        arc.rotation.set(...rotation);
        arc.position.copy(position);
        arc.material.uniforms.uOpacity.value = 1;
        return timeline.tween(0.45, (k) => {
            arc.material.uniforms.uOpacity.value = 1 - k;
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

        // 0. Hoko tombe du ciel et se réceptionne sur le rocher, dans la poussière.
        const hipsY = ninja.J.hips.position.y;
        ninja.setValues(ninja.poseValues('fall'));
        ninja.root.position.y = 8;
        sound.whoosh();
        await tl.tween(0.7, (k) => { ninja.root.position.y = 8 * (1 - k * k); }, ease.linear);
        ninja.root.position.y = 0;
        sound.land();
        burst();
        // Secousse de caméra à l'impact.
        const shakeFrom = camera.position.clone();
        tl.tween(0.45, (k) => {
            const a = (1 - k) * 0.08;
            camera.position.set(shakeFrom.x + Math.sin(k * 60) * a, shakeFrom.y + Math.cos(k * 47) * a, shakeFrom.z);
        }, ease.linear);
        pose(tl, 'land', 0.12, ease.out);
        await tl.tween(0.14, (k) => { ninja.J.hips.position.y = hipsY - 0.35 * k; }, ease.out);
        await tl.wait(0.7);
        // 1. Hoko, adulte, se relève et domine le village.
        say('Hoko Senju — jōnin de Konoha', 4.5);
        tl.tween(0.9, (k) => { ninja.J.hips.position.y = hipsY - 0.35 * (1 - k); }, ease.inOut);
        pose(tl, 'crossed', 0.9);
        await shot(tl, V(3.6, 1.7, 3.6), V(0, 1.55, 0), 5.5, ease.sine);

        // 2. Maître du kenjutsu : trois coups de sabre, trois poteaux tranchés.
        const side = shot(tl, V(-2.6, 1.55, 3.6), V(0.8, 1.1, 0.4), 1.2);
        tl.tween(0.5, (k) => { ninja.root.rotation.y = 0.9 * k; });
        await pose(tl, 'draw', 0.5);
        await side;
        ninja.drawKatana();
        say('Maître du kenjutsu', 3.5);
        face(tl, 'angry', 0.75, 0.4);
        const cuts = [['slashA', [0.2, 0.9, 0.6], V(0.7, 1.15, 0.95)], ['slashB', [-0.3, 1.1, -0.4], V(1.1, 1.1, 0.35)], ['slashC', [1.2, 1.2, 0], V(1.25, 1.15, -0.2)]];
        for (let i = 0; i < 3; i++) {
            sound.whoosh();
            await pose(tl, cuts[i][0], 0.13, ease.out);
            slash(tl, i, cuts[i][1], cuts[i][2]);
            sound.cut();
            cutPost(tl, i);
            if (i === 2) {
                // Dernier coup : ralenti, le temps d'admirer la coupe.
                // (si « Passer » change la vitesse entre-temps, on ne la touche plus)
                const normal = tl.scale;
                let mine = normal * 0.3;
                tl.scale = mine;
                await tl.wait(0.35);
                await tl.tween(0.35, (k) => {
                    if (tl.scale !== mine) return;
                    mine = normal * (0.3 + 0.7 * k);
                    tl.scale = mine;
                }, ease.inOut);
                if (tl.scale === mine) tl.scale = normal;
            } else {
                await tl.wait(0.35);
            }
        }
        await tl.wait(0.5);
        await pose(tl, 'draw', 0.35);
        ninja.sheathe();
        tl.tween(0.5, (k) => { ninja.root.rotation.y = 0.9 * (1 - k); });
        face(tl, 'angry', 0, 0.5);
        await pose(tl, 'stand', 0.4);

        // 3. Maître du Suiton : mudras, puis un dragon d'eau.
        const low = shot(tl, V(0.2, 0.9, 4.6), V(0, 1.45, 0), 1.2);
        await pose(tl, 'seal', 0.5);
        await low;
        say('Suiton : maître de l\'eau', 3.5);
        face(tl, 'angry', 0.5, 0.5);
        sound.water(2.6);
        waterMat.opacity = 0.55;
        const D = dragonMat.uniforms;
        await tl.tween(2.2, (k) => { waterState.rise = k; D.uHead.value = 0.7 * k; D.uTail.value = 0; }, ease.out);
        await pose(tl, 'release', 0.25, ease.out);
        sound.splash();
        await tl.tween(1.3, (k) => {
            waterState.blast = k;
            waterMat.opacity = 0.55 * (1 - k * k);
            D.uHead.value = 0.7 + 0.4 * k;
            D.uTail.value = k * 1.05;
        }, ease.in);
        D.uHead.value = 0;
        D.uTail.value = 0;
        waterState.rise = 0;
        waterState.blast = 0;
        await pose(tl, 'stand', 0.4);

        // 4. Chef de la section économique : une pluie de ryō.
        await shot(tl, V(1.9, 1.75, 3.5), V(0, 1.15, 0.2), 1.2);
        say('Chef de la section économique de Konoha', 4);
        face(tl, 'angry', 0, 0.3);
        face(tl, 'joy', 0.7, 0.6);
        hud.hidden = false;
        tl.tween(1.2, (k) => { glitterMat.opacity = 0.9 * k; goldLight.intensity = 2.2 * k; });
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
        tl.tween(2, (k) => { glitterMat.opacity = 0.9 * (1 - k); goldLight.intensity = 2.2 * (1 - k); });
        pose(tl, 'crossed', 0.8);
        say('Un jour…', 3.5);
        face(tl, 'joy', 0, 0.8);
        face(tl, 'fun', 0.4, 0.8);
        await shot(tl, V(-2.5, 4.8, 9.5), V(0, 1.2, -2), 5.5, ease.sine);
        sound.stopDream(3);
    }

    let post = low ? null : new Post(renderer, { samples: mobile ? 0 : 4 });
    const focusPoint = V();

    // Pose initiale, pour les premières images.
    camera.position.set(0.5, 1.9, 7.5);
    camera.lookAt(0, 1.5, 0);

    return {
        scene,
        camera,
        ninja,
        play,
        update(dt, time) { updaters.forEach((fn) => fn(dt, time)); },
        // Rendu avec profondeur de champ : la mise au point suit Hoko.
        render() {
            if (!post) {
                renderer.render(scene, camera);
                return;
            }
            ninja.J.head.getWorldPosition(focusPoint);
            post.focus = Math.max(0.3, camera.position.distanceTo(focusPoint));
            post.render(scene, camera);
        },
        degrade() { post = null; },
        resize(aspect) {
            camera.aspect = aspect;
            camera.fov = aspect < 1 ? 70 : 48;
            camera.updateProjectionMatrix();
        }
    };
}
