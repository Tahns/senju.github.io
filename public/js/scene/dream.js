/*
 * Le rêve d'Akira (vu à la troisième personne) : adulte, jōnin de Konoha,
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

    const hemi = new THREE.HemisphereLight('#dbe8ff', '#6d5c42', 1.15);
    scene.add(hemi);
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

    // Coucher de soleil pour le final : ciel indigo et orangé, lumière dorée.
    const dayLook = {
        top: sky.material.uniforms.top.value.clone(), mid: sky.material.uniforms.mid.value.clone(), low: sky.material.uniforms.low.value.clone(),
        fog: scene.fog.color.clone(), sun: sun.color.clone(), hemi: hemi.color.clone(), rim: rim.color.clone()
    };
    const duskLook = {
        top: new THREE.Color('#34407e'), mid: new THREE.Color('#e9a36f'), low: new THREE.Color('#ffc987'),
        fog: new THREE.Color('#e9c29a'), sun: new THREE.Color('#ff9f58'), hemi: new THREE.Color('#ffc9a0'), rim: new THREE.Color('#ff8f45'),
        power: { sun: 2.5, hemi: 0.75, rim: 3.3, front: 0.25, env: 0.55 }, windows: true
    };
    // Menu « sélection de la catégorie » : nuit d'orage vert sombre, comme les
    // écrans de sélection des jeux Naruto Storm.
    const stormLook = {
        top: new THREE.Color('#081a1c'), mid: new THREE.Color('#1d4a44'), low: new THREE.Color('#3b6a5a'),
        fog: new THREE.Color('#1f4038'), sun: new THREE.Color('#9fd8ff'), hemi: new THREE.Color('#5d8f86'), rim: new THREE.Color('#6fb8ff'),
        power: { sun: 1.2, hemi: 0.7, rim: 3, front: 0.3, env: 0.35 }, windows: true
    };
    const dayPower = { sun: 3.1, hemi: 1.15, rim: 1.7, front: 0.45, env: 0.8 };
    function setLook(look, k) {
        ['top', 'mid', 'low'].forEach((key) => sky.material.uniforms[key].value.lerpColors(dayLook[key], look[key], k));
        scene.fog.color.lerpColors(dayLook.fog, look.fog, k);
        sun.color.lerpColors(dayLook.sun, look.sun, k);
        hemi.color.lerpColors(dayLook.hemi, look.hemi, k);
        rim.color.lerpColors(dayLook.rim, look.rim, k);
        const P = (key) => dayPower[key] + (look.power[key] - dayPower[key]) * k;
        sun.intensity = P('sun');
        hemi.intensity = P('hemi');
        rim.intensity = P('rim');
        front.intensity = P('front');
        scene.environmentIntensity = P('env');
        // Les lumières du village s'allument avec un peu de retard sur le ciel.
        if (village.setDusk) village.setDusk(look.windows ? THREE.MathUtils.smoothstep(k, 0.35, 1) : 0);
    }
    const setDusk = (k) => setLook(duskLook, k);

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
    const freshWood = new THREE.MeshStandardMaterial({ color: '#e2c393', roughness: 0.85 });
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
        // Face de coupe en bois frais, qui n'apparaît qu'une fois le poteau tranché.
        const cut = new THREE.Mesh(new THREE.CircleGeometry(0.092, 24), freshWood);
        cut.rotation.x = -Math.PI / 2;
        cut.position.set(x, 1.052, z);
        cut.visible = false;
        scene.add(cut);
        return { base, topPart, cut, fall: 0, dir: 1 };
    });
    // Copeaux qui jaillissent à la coupe et retombent sur l'herbe.
    const CHIPS = 90;
    const chipMat = new THREE.MeshStandardMaterial({ color: '#f2dcaa', roughness: 0.8, emissive: '#6b4e24', emissiveIntensity: 0.4 });
    const chips = new THREE.InstancedMesh(new THREE.BoxGeometry(0.07, 0.016, 0.045), chipMat, CHIPS);
    chips.frustumCulled = false;
    chips.count = 0;
    scene.add(chips);
    const chipState = [];
    const chipM = new THREE.Matrix4();
    const chipQ = new THREE.Quaternion();
    const chipE = new THREE.Euler();
    const chipS = new THREE.Vector3(1, 1, 1);
    function spawnChips(post) {
        const origin = post.topPart.position;
        for (let i = 0; i < 28; i++) {
            if (chipState.length >= CHIPS) chipState.shift();
            chipState.push({
                p: V(origin.x, origin.y + 0.02, origin.z),
                v: V(0.8 + random() * 1.6, 0.8 + random() * 1.8, (random() - 0.5) * 1.8),
                r: V(random() * 6, random() * 6, random() * 6),
                w: V((random() - 0.5) * 30, (random() - 0.5) * 30, (random() - 0.5) * 30)
            });
        }
    }
    updaters.push((dt) => {
        if (!chipState.length) return;
        chipState.forEach((c, i) => {
            if (c.p.y > 0.03) {
                c.v.y -= 9.8 * dt;
                c.p.addScaledVector(c.v, dt);
                c.r.addScaledVector(c.w, dt);
            } else {
                // Au sol : il se couche à plat et ne bouge plus.
                c.p.y = 0.03;
                c.r.x = 0;
                c.r.z = 0;
            }
            chipQ.setFromEuler(chipE.set(c.r.x, c.r.y, c.r.z));
            chips.setMatrixAt(i, chipM.compose(c.p, chipQ, chipS));
        });
        chips.count = chipState.length;
        chips.instanceMatrix.needsUpdate = true;
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
    const leaves = new THREE.Points(leafGeo, new THREE.PointsMaterial({ color: '#8fb34a', size: 0.09, map: dot(), transparent: true, depthWrite: false }));
    leaves.frustumCulled = false; // positions calculées à chaque image
    scene.add(leaves);
    updaters.push((dt, time) => {
        leafSeeds.forEach((l, i) => {
            leafPos[i * 3] = ((l.x + time * 1.6 + 8) % 16) - 8;
            leafPos[i * 3 + 1] = l.y + Math.sin(time * 0.8 + l.s) * 0.6;
            leafPos[i * 3 + 2] = l.z + Math.cos(time * 0.6 + l.s) * 0.6;
        });
        leafGeo.attributes.position.needsUpdate = true;
    });

    /* ---------------- Akira adulte ---------------- */
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
        m.scale.setScalar(1.35); // grand arc, à la mesure du geste
        scene.add(m);
        return m;
    });

    // Dragon d'eau : un tube qui s'enroule autour d'Akira, puis jaillit.
    const dragonPoints = [];
    for (let i = 0; i <= 64; i++) {
        const t = i / 64;
        const a = t * Math.PI * 4.5 + 1.2;
        const r = 1.05 - t * 0.35;
        dragonPoints.push(V(Math.cos(a) * r, 0.15 + t * 2.4, Math.sin(a) * r));
    }
    // Puis il jaillit vers le ciel, au-dessus du village (face à la caméra).
    dragonPoints.push(V(0.35, 3.1, -0.9), V(0.9, 4.2, -2.6), V(1.6, 5.8, -5.2), V(2.6, 8, -9), V(3.8, 10.5, -14));
    const dragonCurve = new THREE.CatmullRomCurve3(dragonPoints);
    // Fraction de la longueur où finit la spirale (la tête y fait une pause).
    const spiralEnd = (() => {
        const lengths = dragonCurve.getLengths(400);
        const k = Math.round((64 / (dragonPoints.length - 1)) * 400);
        return lengths[k] / lengths[400];
    })();
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
                // Le corps s'affine vers la tête (maillage à part, posé au bout).
                float neck = 1.0 - 0.35 * smoothstep(uHead - 0.06, uHead, uv.x);
                float s = body * neck * (0.55 + 0.45 * smoothstep(uTail, uTail + 0.3, uv.x));
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
    // Tête du dragon : crâne, museau, mâchoire entrouverte, cornes rejetées en
    // arrière, crinière et yeux lumineux, dans la même eau que le corps. Elle
    // suit la pointe du ruban et regarde dans le sens du mouvement.
    const skinMat = new THREE.ShaderMaterial({
        uniforms: { uTime: dragonMat.uniforms.uTime, uFade: { value: 1 } },
        vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = -mv.xyz; vP = position; gl_Position = projectionMatrix * mv; }',
        fragmentShader: `uniform float uTime; uniform float uFade; varying vec3 vN; varying vec3 vV; varying vec3 vP;
            void main(){
                float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
                vec3 c = mix(vec3(0.05, 0.32, 0.78), vec3(0.45, 0.85, 1.0), f * 0.8 + max(vN.y, 0.0) * 0.3);
                float ripple = smoothstep(0.8, 1.0, sin(vP.z * 40.0 - uTime * 10.0 + sin(vP.x * 30.0) * 1.5));
                c += vec3(1.0) * ripple * 0.5;
                gl_FragColor = vec4(c * 1.25, (0.7 + f * 0.3) * uFade);
            }`,
        transparent: true
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: '#e8fbff', transparent: true });
    const dragonHead = new THREE.Group();
    const part = (geo, x, y, z, rx = 0, sx = 1, sy = 1, sz = 1, mat = skinMat) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.rotation.x = rx;
        m.scale.set(sx, sy, sz);
        dragonHead.add(m);
        return m;
    };
    const ball = new THREE.SphereGeometry(1, 20, 14);
    part(ball, 0, 0, 0, 0, 0.2, 0.17, 0.22); // crâne
    part(ball, 0, -0.02, 0.2, 0, 0.13, 0.09, 0.2); // museau
    part(ball, 0, -0.1, 0.14, 0.35, 0.1, 0.04, 0.17); // mâchoire entrouverte
    const horn = new THREE.ConeGeometry(0.05, 0.42, 10);
    [-1, 1].forEach((side) => {
        const h = part(horn, side * 0.1, 0.16, -0.14, -0.95);
        h.rotation.z = side * -0.35;
        part(ball, side * 0.115, 0.06, 0.1, 0, 0.038, 0.038, 0.038, eyeMat); // yeux
        const whisker = part(new THREE.ConeGeometry(0.012, 0.32, 6), side * 0.1, -0.06, 0.34, 1.9);
        whisker.rotation.z = side * 0.9;
    });
    const spike = new THREE.ConeGeometry(0.04, 0.16, 8);
    for (let i = 0; i < 4; i++) part(spike, 0, 0.15 - i * 0.03, -0.12 - i * 0.09, -1.1 - i * 0.12); // crinière
    dragonHead.visible = false;
    scene.add(dragonHead);
    const headAhead = V();
    updaters.push((dt, time) => {
        dragonMat.uniforms.uTime.value = time;
        const h = dragonMat.uniforms.uHead.value;
        dragonHead.visible = h > 0.01;
        if (!dragonHead.visible) return;
        const u = THREE.MathUtils.clamp(h - 0.012, 0, 1);
        dragonCurve.getPointAt(u, dragonHead.position);
        headAhead.copy(dragonHead.position).add(dragonCurve.getTangentAt(Math.min(u, 0.999)));
        dragonHead.lookAt(headAhead);
        // Apparaît avec le ruban, s'éteint quand le dragon file au loin.
        const size = THREE.MathUtils.smoothstep(h, 0.01, 0.08) * (1 - THREE.MathUtils.smoothstep(h, 0.98, 1.08));
        dragonHead.scale.setScalar(Math.max(0.001, size * 1.35));
        skinMat.uniforms.uFade.value = size;
        eyeMat.opacity = size;
    });

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
            // Spirale qui monte autour de lui (un dragon d'eau), puis jaillit vers le ciel.
            const angle = w.a + time * 4 + k * 9;
            const radius = 0.6 + w.r * 0.25 + (1 - waterState.rise) * 1.5;
            let x = Math.cos(angle) * radius;
            let y = k * 3 * waterState.rise + 0.2;
            let z = Math.sin(angle) * radius;
            const b = waterState.blast;
            if (b > 0) {
                const d = (b * 14 + w.s * 3) * (0.5 + k);
                // Les embruns suivent le dragon : vers le ciel, au-dessus du village.
                x = x * (1 - b) + (w.r - 0.5) * b * 1.5 + d * 0.15;
                y = y * (1 - b) + (2.5 + (w.s - 0.5) * 0.8) * b + d * 0.45;
                z = z * (1 - b) - d * 0.7;
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
    // Front de l'onde doux (dégradé vers l'intérieur, bord déchiqueté), pas un anneau plein.
    const ringMat = new THREE.ShaderMaterial({
        uniforms: { opacity: { value: 0 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float opacity; varying vec2 vP;
            void main(){
                float r = length(vP);
                float a = atan(vP.y, vP.x);
                float edge = 0.93 + 0.05 * sin(a * 11.0) * sin(a * 7.0 + 1.3);
                float front = smoothstep(0.45, edge, r) * (1.0 - smoothstep(edge, edge + 0.04, r));
                gl_FragColor = vec4(vec3(1.0, 0.96, 0.86), front * front * opacity);
            }`,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.4, 1, 64, 1), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.12;
    scene.add(ring);
    let dustAge = 9;
    function burst() { dustAge = 0; }
    updaters.push((dt) => {
        if (dustAge > 2) {
            dustMat.opacity = 0;
            ringMat.uniforms.opacity.value = 0;
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
        ringMat.uniforms.opacity.value = 0.6 * Math.pow(1 - k, 1.5);
    });

    // Pièce lancée d'une pichenette, qui retombe dans la main.
    // Arc-en-ciel dans les embruns, après le jaillissement du dragon d'eau.
    const rainbowMat = new THREE.ShaderMaterial({
        uniforms: { uOpacity: { value: 0 } },
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform float uOpacity; varying vec2 vP; vec3 hue(float h){ return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); } void main(){ float r = (length(vP) - 5.2) / 0.9; float band = smoothstep(0.0, 0.15, r) * (1.0 - smoothstep(0.85, 1.0, r)); float ends = smoothstep(0.0, 0.6, vP.y); gl_FragColor = vec4(mix(hue(0.78 - r * 0.78), vec3(1.0), 0.25), band * ends * uOpacity * 0.3); }',
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false
    });
    const rainbow = new THREE.Mesh(new THREE.RingGeometry(5.2, 6.1, 96, 1, 0, Math.PI), rainbowMat);
    // Derrière Akira, au-dessus du village (dans l'axe des plans suivants).
    rainbow.position.set(-6, -6, -60);
    rainbow.scale.setScalar(6);
    rainbow.visible = false;
    scene.add(rainbow);

    // Aura de chakra (Suiton) : une flamme bleue translucide qui monte autour
    // d'Akira pendant les mudras, et des étincelles qui s'élèvent.
    const auraMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uPower: { value: 0 } },
        // La surface ondule (silhouette vivante, pas un tube rigide).
        vertexShader: `uniform float uTime; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            void main(){
                vUv = uv;
                float a = uv.x * 6.2832;
                float w = sin(a * 3.0 + uTime * 3.1 + uv.y * 5.0) * 0.5 + sin(a * 5.0 - uTime * 4.3 + uv.y * 9.0) * 0.5;
                vec3 p = position + vec3(normal.x, 0.0, normal.z) * w * 0.07 * (0.3 + uv.y);
                vec4 mv = modelViewMatrix * vec4(p, 1.0);
                vN = normalize(normalMatrix * normal); vV = -mv.xyz;
                gl_Position = projectionMatrix * mv;
            }`,
        // Langues de flamme : bruit qui monte, plus fines vers le haut ; surtout
        // visibles sur les bords (effet de contre-jour), presque rien au centre.
        fragmentShader: `uniform float uTime; uniform float uPower; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
            float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f * f * (3.0 - 2.0 * f);
                return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
            void main(){
                float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
                vec2 q = vec2(vUv.x * 14.0, vUv.y * 3.0 - uTime * 1.6);
                float n = noise(q) * 0.6 + noise(q * 2.3 + 7.0) * 0.4;
                float tongue = smoothstep(0.35 + vUv.y * 0.45, 0.75 + vUv.y * 0.2, n + (1.0 - vUv.y) * 0.35);
                float fade = pow(1.0 - vUv.y, 1.2) * smoothstep(0.0, 0.08, vUv.y);
                float a = (0.08 + rim * 1.2) * tongue * fade * uPower;
                vec3 col = mix(vec3(0.25, 0.6, 1.0), vec3(0.75, 0.95, 1.0), tongue * rim);
                gl_FragColor = vec4(col * 1.7, a);
            }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const aura = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.55, 2.3, 48, 24, true), auraMat);
    aura.position.y = 1.1;
    aura.visible = false;
    scene.add(aura);

    // Hakke Kûshô (paume du vide) : une onde de chakra en anneau part de la
    // paume et file jusqu'au poteau, avec un éclat blanc.
    const palmWaves = [0, 1, 2].map(() => {
        const ring = new THREE.Mesh(
            new THREE.RingGeometry(0.1, 0.17, 48),
            new THREE.MeshBasicMaterial({ color: '#d8e8ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })
        );
        const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color: '#eef4ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        scene.add(ring, flash);
        return { ring, flash };
    });
    // Éclats d'impact de la rafale de paumes (petite réserve réutilisée).
    const hits = [0, 1, 2, 3].map(() => {
        const f = new THREE.Sprite(new THREE.SpriteMaterial({ map: dot(), color: '#e4efff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
        scene.add(f);
        return f;
    });
    let hitN = 0;
    function hitFlash(timeline, at, size = 0.35) {
        const f = hits[hitN++ % hits.length];
        f.position.copy(at);
        return timeline.tween(0.18, (k) => {
            f.material.opacity = 0.95 * (1 - k);
            f.scale.setScalar(size * (0.6 + k));
        }, ease.out);
    }
    function palmWave(timeline, index, from, to, big = false) {
        const { ring, flash } = palmWaves[index];
        const size = big ? 2.2 : 1;
        flash.position.copy(from);
        timeline.tween(0.35, (k) => {
            flash.material.opacity = (1 - k) * 0.9;
            flash.scale.setScalar((0.3 + k * 0.9) * size);
        }, ease.out);
        return timeline.tween(big ? 0.4 : 0.28, (k) => {
            ring.position.lerpVectors(from, to, k);
            ring.lookAt(to);
            ring.scale.setScalar((1 + k * 4) * size);
            ring.material.opacity = 0.9 * (1 - k * k);
        }, ease.out).then(() => { ring.material.opacity = 0; });
    }

    // Hakkeshō Kaiten (rotation céleste) : un dôme de chakra qui tourbillonne
    // autour d'Akira pendant qu'il tourne sur lui-même, puis éclate.
    const kaitenMat = new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
        vertexShader: `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            void main(){
                vUv = uv;
                vec4 mv = modelViewMatrix * vec4(position, 1.0);
                vN = normalize(normalMatrix * normal); vV = -mv.xyz;
                gl_Position = projectionMatrix * mv;
            }`,
        // Bandes en spirale qui tournent vite, plus denses sur les bords (contre-jour).
        fragmentShader: `uniform float uTime; uniform float uOpacity; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
            void main(){
                float rim = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 1.6);
                float band = sin(vUv.x * 62.83 * 3.0 - uTime * 26.0 + vUv.y * 9.0);
                float streak = smoothstep(0.2, 1.0, band) * 0.8 + smoothstep(0.85, 1.0, sin(vUv.x * 62.83 * 7.0 - uTime * 40.0 + vUv.y * 20.0)) * 0.5;
                float ground = smoothstep(0.0, 0.25, 1.0 - vUv.y);
                float a = (0.12 + rim * 0.9) * (0.35 + streak) * mix(0.6, 1.0, ground) * uOpacity;
                vec3 col = mix(vec3(0.55, 0.75, 1.0), vec3(0.95, 0.97, 1.0), streak);
                gl_FragColor = vec4(col * 1.5, a);
            }`,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    });
    const kaiten = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 24, 0, Math.PI * 2, 0, Math.PI / 2), kaitenMat);
    kaiten.visible = false;
    scene.add(kaiten);
    updaters.push((dt, time) => { kaitenMat.uniforms.uTime.value = time; });
    const sparkCount = 90;
    const sparkPos = new Float32Array(sparkCount * 3);
    const sparkGeo = new THREE.BufferGeometry();
    sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPos, 3));
    const sparkMat = new THREE.PointsMaterial({ color: '#8fd8ff', size: 0.11, map: dot(), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending });
    const sparks = new THREE.Points(sparkGeo, sparkMat);
    sparks.frustumCulled = false;
    scene.add(sparks);
    const sparkSeeds = Array.from({ length: sparkCount }, () => ({ a: random() * Math.PI * 2, r: 0.3 + random() * 0.35, h: random(), s: 0.5 + random() }));
    updaters.push((dt, time) => {
        auraMat.uniforms.uTime.value = time;
        const p = auraMat.uniforms.uPower.value;
        aura.visible = p > 0.01;
        sparkMat.opacity = p * 0.9;
        if (p <= 0.01) return;
        aura.position.x = ninja.root.position.x;
        aura.position.z = ninja.root.position.z;
        sparkSeeds.forEach((sd, i) => {
            const y = ((time * 0.6 * sd.s + sd.h) % 1) * 2.4;
            const a = sd.a + time * 0.8;
            sparkPos[i * 3] = aura.position.x + Math.cos(a) * sd.r;
            sparkPos[i * 3 + 1] = y;
            sparkPos[i * 3 + 2] = aura.position.z + Math.sin(a) * sd.r;
        });
        sparkGeo.attributes.position.needsUpdate = true;
    });

    // Kiminari (foudre) : des arcs électriques crépitent le long de la lame.
    const boltSegs = 10;
    const boltMat = new THREE.MeshBasicMaterial({ color: '#d8ecff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    // Chaque arc : un cœur blanc et une lueur bleue plus large autour.
    const glowMat = new THREE.MeshBasicMaterial({ color: '#4f9dff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const bolts = [0, 1, 2, 3, 4].map(() => {
        const m = new THREE.Mesh(new THREE.BufferGeometry(), boltMat);
        const glow = new THREE.Mesh(new THREE.BufferGeometry(), glowMat);
        m.frustumCulled = false;
        glow.frustumCulled = false;
        m.userData.glow = glow;
        scene.add(m, glow);
        return m;
    });
    // Halo bleuté autour de la lame chargée.
    const haloMat = new THREE.SpriteMaterial({ map: dot(), color: '#7fc4ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const halo = new THREE.Sprite(haloMat);
    halo.scale.setScalar(0.9);
    scene.add(halo);
    const boltLight = new THREE.PointLight('#9fd0ff', 0, 3, 1.5);
    scene.add(boltLight);
    let raiton = 0;
    let handChakra = 0;
    const bA = V();
    const bB = V();
    let boltFrame = 0;
    updaters.push(() => {
        // Menu : le chakra crépite autour des mains (comme dans les menus Storm).
        const hands = handChakra > 0 && !(raiton > 0);
        const on = hands || (raiton > 0 && ninja.katana.parent !== ninja.katana.userData.sheathed.parent);
        const level = hands ? handChakra : raiton;
        boltMat.opacity = on ? level * (0.7 + Math.random() * 0.3) : 0;
        glowMat.opacity = on ? level * (0.3 + Math.random() * 0.2) : 0;
        haloMat.opacity = on ? level * (hands ? 0.35 : 0.55) : 0;
        boltLight.intensity = on ? level * (1.5 + Math.random() * 2) : 0;
        bolts.forEach((m) => { m.visible = on; m.userData.glow.visible = on; });
        if (!on || boltFrame++ % 2) return;
        if (hands) {
            ninja.J.handR.getWorldPosition(bA);
            halo.position.copy(bA);
            boltLight.position.copy(bA);
            bolts.forEach((m, n) => {
                (n % 2 ? ninja.J.handL : ninja.J.handR).getWorldPosition(bA);
                bA.add(V((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08));
                bB.copy(bA).add(V(Math.random() - 0.5, Math.random() - 0.3, Math.random() - 0.5).normalize().multiplyScalar(0.12 + Math.random() * 0.14));
                const pts = [];
                for (let i = 0; i <= boltSegs; i++) {
                    const t = i / boltSegs;
                    const j = i === 0 || i === boltSegs ? 0 : 0.05;
                    pts.push(V(bA.x + (bB.x - bA.x) * t + (Math.random() - 0.5) * j, bA.y + (bB.y - bA.y) * t + (Math.random() - 0.5) * j, bA.z + (bB.z - bA.z) * t + (Math.random() - 0.5) * j));
                }
                const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
                m.geometry.dispose();
                m.geometry = new THREE.TubeGeometry(curve, 16, 0.006, 4, false);
                m.userData.glow.geometry.dispose();
                m.userData.glow.geometry = new THREE.TubeGeometry(curve, 16, 0.025, 5, false);
            });
            return;
        }
        ninja.katana.localToWorld(bA.set(0, 0.5, 0));
        halo.position.copy(bA);
        boltLight.position.copy(bA);
        bolts.forEach((m, n) => {
            ninja.katana.localToWorld(bA.set(0, 0.12 + Math.random() * 0.25, 0));
            // Le dernier arc jaillit de la pointe dans l'air, les autres courent le long de la lame.
            if (n === bolts.length - 1) ninja.katana.localToWorld(bB.set((Math.random() - 0.5) * 0.5, 1.05 + Math.random() * 0.2, (Math.random() - 0.5) * 0.5));
            else ninja.katana.localToWorld(bB.set(0, 0.55 + Math.random() * 0.34, 0));
            const pts = [];
            for (let i = 0; i <= boltSegs; i++) {
                const t = i / boltSegs;
                const j = i === 0 || i === boltSegs ? 0 : 0.13;
                pts.push(V(bA.x + (bB.x - bA.x) * t + (Math.random() - 0.5) * j, bA.y + (bB.y - bA.y) * t + (Math.random() - 0.5) * j, bA.z + (bB.z - bA.z) * t + (Math.random() - 0.5) * j));
            }
            const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.1);
            m.geometry.dispose();
            m.geometry = new THREE.TubeGeometry(curve, 20, 0.011, 4, false);
            m.userData.glow.geometry.dispose();
            m.userData.glow.geometry = new THREE.TubeGeometry(curve, 20, 0.04, 5, false);
        });
    });

    // Traînée de la lame : un ruban lumineux qui suit la pointe et le talon du
    // sabre. Chaque point garde l'élan qu'avait la lame à cet instant et
    // s'efface en quelques dixièmes de seconde : tout l'arc du coup reste
    // visible. Sabre chargé de foudre (coup final) : ruban plus long, bleu électrique.
    const TRAIL = 40;
    const trailPos = new Float32Array(TRAIL * 2 * 3);
    const trailAlpha = new Float32Array(TRAIL * 2);
    const trailGeo = new THREE.BufferGeometry();
    trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPos, 3));
    trailGeo.setAttribute('alpha', new THREE.BufferAttribute(trailAlpha, 1));
    const trailIdx = [];
    for (let i = 0; i < TRAIL - 1; i++) trailIdx.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    trailGeo.setIndex(trailIdx);
    const trailColor = { value: new THREE.Color(0.85, 0.95, 1.0) };
    const trail = new THREE.Mesh(trailGeo, new THREE.ShaderMaterial({
        uniforms: { uColor: trailColor, uBoost: { value: 1.5 } },
        vertexShader: 'attribute float alpha; varying float vA; void main(){ vA = alpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform vec3 uColor; uniform float uBoost; varying float vA; void main(){ gl_FragColor = vec4(uColor * uBoost, vA); }',
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    }));
    trail.frustumCulled = false;
    scene.add(trail);
    const tipLocal = V(0, 0.89, 0);
    const baseLocal = V(0, 0.35, 0);
    const steelColor = new THREE.Color(0.85, 0.95, 1.0);
    const boltColor = new THREE.Color(0.22, 0.5, 1.0);
    const trailPts = [];
    let trailParent = null;
    updaters.push((dt) => {
        const inHand = ninja.katana.parent !== ninja.katana.userData.sheathed.parent;
        // Sabre dégainé ou rengainé : il « saute » d'un parent à l'autre, on repart à zéro
        // (sinon la traînée dessinerait un trait du dos jusqu'à la main).
        if (ninja.katana.parent !== trailParent) {
            trailParent = ninja.katana.parent;
            trailPts.length = 0;
        }
        const charged = raiton > 0.05;
        const life = charged ? 1.0 : 0.3;
        trail.material.uniforms.uBoost.value = charged ? 2.0 : 1.5;
        trailColor.value.lerpColors(steelColor, boltColor, Math.min(1, raiton));
        trailPts.forEach((pt) => { pt.age += dt; });
        const tip = ninja.katana.localToWorld(tipLocal.clone());
        const base = ninja.katana.localToWorld(baseLocal.clone());
        // Élan de la lame (m/s à la pointe) ; au ralenti du coup final, on le renforce.
        const speed = trailPts.length && dt > 0 ? trailPts[0].tip.distanceTo(tip) / dt : 0;
        const energy = inHand ? Math.min(1, speed / (charged ? 1.5 : 4.5)) : 0;
        if (charged) base.lerp(tip, -0.5); // ruban plus large : il déborde vers la garde
        trailPts.unshift({ tip, base, energy, age: 0 });
        while (trailPts.length > TRAIL || (trailPts.length && trailPts[trailPts.length - 1].age > life)) trailPts.pop();
        for (let i = 0; i < TRAIL; i++) {
            const pt = trailPts[Math.min(i, trailPts.length - 1)];
            if (!pt) continue;
            trailPos.set([pt.tip.x, pt.tip.y, pt.tip.z, pt.base.x, pt.base.y, pt.base.z], i * 6);
            const fade = i < trailPts.length ? Math.max(0, 1 - pt.age / life) : 0;
            const a = inHand ? pt.energy * (charged ? fade : fade * fade) * (charged ? 1 : 0.7) : 0;
            trailAlpha[i * 2] = a;
            trailAlpha[i * 2 + 1] = a * 0.12;
        }
        trailGeo.attributes.position.needsUpdate = true;
        trailGeo.attributes.alpha.needsUpdate = true;
    });

    const flipCoin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.01, 24), [goldSide, goldFace, goldFace]);
    flipCoin.visible = false;
    scene.add(flipCoin);
    // Éclat doré qui suit la pièce lancée (sinon elle se perd dans l'image).
    const glintMat = new THREE.SpriteMaterial({ map: dot(), color: '#ffe08a', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const glint = new THREE.Sprite(glintMat);
    glint.scale.setScalar(0.35);
    flipCoin.add(glint);

    /* ---------------- Mise en scène ---------------- */
    // Caméra : les plans déplacent une cible (camGoal, lookGoal) ; la vraie
    // caméra la suit avec un léger amorti, sans départ ni arrêt sec. La
    // secousse d'impact s'ajoute par-dessus (shake).
    const look = V();
    const camGoal = V();
    const lookGoal = V();
    const camBase = V();
    const shake = V();
    function snapCamera(position, target) {
        camGoal.copy(position);
        camBase.copy(position);
        lookGoal.copy(target);
        look.copy(target);
        camera.position.copy(position);
        camera.lookAt(look);
    }
    function shot(timeline, position, target, seconds, easing = ease.sine) {
        const p0 = camGoal.clone();
        const l0 = lookGoal.clone();
        return timeline.tween(seconds, (k) => {
            camGoal.lerpVectors(p0, position, k);
            lookGoal.lerpVectors(l0, target, k);
        }, easing);
    }
    updaters.push((dt) => {
        const a = 1 - Math.exp(-Math.max(0, dt) / 0.35);
        camBase.lerp(camGoal, a);
        look.lerp(lookGoal, a);
        camera.position.copy(camBase).add(shake);
        camera.lookAt(look);
    });
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
        post.cut.visible = true;
        spawnChips(post);
        return timeline.tween(0.9, (k) => {
            post.topPart.position.set(p0.x + post.dir * 0.35 * k, p0.y - 0.95 * k * k + 0.12 * Math.sin(Math.PI * k), p0.z + 0.25 * k);
            post.topPart.rotation.z = -post.dir * 1.4 * k;
        }, ease.in);
    }

    // onAct(nom) : appelé au début de chaque chapitre (juken, kaiten, ryo, final).
    async function play({ timeline, sound, say, hud, counters, onAct = () => {} }) {
        const tl = timeline;
        snapCamera(V(0.5, 1.9, 7.5), V(0, 1.5, 0));
        setDusk(0);
        ninja.pouch.scale.setScalar(1);
        sound.startDream();

        // 0. Akira tombe du ciel et se réceptionne sur le rocher, dans la poussière.
        const hipsY = ninja.J.hips.position.y;
        ninja.setValues(ninja.poseValues('fall'));
        ninja.root.position.y = 8;
        sound.whoosh();
        await tl.tween(0.7, (k) => { ninja.root.position.y = 8 * (1 - k * k); }, ease.linear);
        ninja.root.position.y = 0;
        sound.land();
        burst();
        // Secousse de caméra à l'impact.
        // Pas de secousse si le visiteur a demandé moins d'animations.
        const calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        tl.tween(0.45, (k) => {
            const a = calm ? 0 : (1 - k) * (1 - k) * 0.06;
            shake.set(Math.sin(k * 40) * a, Math.cos(k * 31) * a, 0);
        }, ease.linear).then(() => shake.set(0, 0, 0));
        pose(tl, 'land', 0.12, ease.out);
        await tl.tween(0.14, (k) => { ninja.J.hips.position.y = hipsY - 0.35 * k; }, ease.out);
        await tl.wait(0.7);
        // 1. Akira, adulte, se relève et domine le village.
        say('Akira Hyûga — jōnin de Konoha', 4.5, '日向');
        tl.tween(0.9, (k) => { ninja.J.hips.position.y = hipsY - 0.35 * (1 - k); }, ease.inOut);
        pose(tl, 'crossed', 0.9);
        // Bras croisés : les mains se referment sur les bras (doigts rentrés).
        if (ninja.avatar) { ninja.avatar.grip('right', 0.95); ninja.avatar.grip('left', 0.95); }
        // Plan héroïque : la caméra s'approche en trois-quarts, puis pousse
        // lentement jusqu'au visage (bandeau, regard assuré, léger sourire).
        await shot(tl, V(1.5, 1.5, 2.6), V(0, 1.45, 0), 3, ease.sine);
        face(tl, 'fun', 0.3, 0.8);
        await shot(tl, V(0.5, 1.76, 0.82), V(0, 1.7, 0), 2.6, ease.sine);
        await tl.wait(0.6);
        face(tl, 'fun', 0, 0.5);

        // 2. Byakugan, puis le Jûken : garde des Hyûga, pas en avant, rafale des
        // 64 paumes sur le premier poteau, puis deux Hakke Kûshô à distance.
        onAct('juken');
        const byakugan = (k) => { if (ninja.avatar && ninja.avatar.byakugan) ninja.avatar.byakugan(k); };
        say('Byakugan', 2.2, '白眼');
        face(tl, 'angry', 0.6, 0.3);
        sound.whoosh();
        await tl.tween(0.5, byakugan, ease.out);
        await tl.wait(0.8);
        // Paumes ouvertes, poignets cassés vers l'arrière : les paumes font face à la cible.
        if (ninja.avatar) { ninja.avatar.grip('right', 0); ninja.avatar.grip('left', 0); }
        const wrists = (k) => { ninja.J.handR.rotation.x = -1.3 * k; ninja.J.handL.rotation.x = -1.3 * k; };
        // Bassin abaissé pour la garde basse (les deux pieds restent au sol).
        const crouch = (depth, seconds) => {
            const from = ninja.J.hips.position.y;
            return tl.tween(seconds, (k) => { ninja.J.hips.position.y = from + (hipsY - depth - from) * k; }, ease.inOut);
        };
        // Direction de chaque poteau vu d'Akira, et point d'arrivée du pas en avant.
        const P0 = posts[0].base.position;
        const face0 = Math.atan2(P0.x, P0.z) + 0.1;
        const reach = V(P0.x, 0, P0.z).setLength(Math.hypot(P0.x, P0.z) - 0.72);
        const stepShot = shot(tl, V(-1.3, 1.25, 3.3), V(0.45, 1.05, 0.75), 1.6);
        tl.tween(0.4, (k) => { ninja.root.rotation.y = face0 * k; wrists(k); });
        pose(tl, 'jukenStance', 0.5, ease.inOut);
        await crouch(0.1, 0.5);
        say('Jûken : le poing souple des Hyûga', 2.6, '柔拳');
        await stepShot;
        // Glissé en avant, sans quitter la garde.
        sound.whoosh();
        // La caméra passe de trois-quarts face : on voit les paumes alterner.
        shot(tl, V(-0.15, 1.3, 3.1), V(0.7, 1.0, 0.8), 0.8);
        await tl.tween(0.35, (k) => { ninja.root.position.set(reach.x * k, 0, reach.z * k); }, ease.inOut);
        await tl.wait(0.45);
        // Hakke Rokujûyon Shō : les frappes s'enchaînent de plus en plus vite ;
        // le compteur double (2, 4, 8… 64 paumes).
        say('Hakke Rokujûyon Shō', 3.2, '六十四掌');
        const palm = V();
        const counts = { 1: 2, 2: 4, 4: 8, 7: 16, 10: 32, 14: 64 };
        const N = 15;
        for (let i = 0; i < N; i++) {
            const right = i % 2 === 0;
            const speed = 1 - (i / N) * 0.55;
            await pose(tl, right ? 'jabR' : 'jabL', 0.09 * speed, ease.out);
            (right ? ninja.J.handR : ninja.J.handL).getWorldPosition(palm);
            hitFlash(tl, palm, 0.28 + i * 0.012);
            sound.select();
            if (counts[i]) say(`${counts[i]} paumes${counts[i] === 64 ? ' !' : '…'}`, 1.2, '八卦');
            await tl.wait(0.04 * speed);
        }
        // Dernière frappe : les deux paumes ensemble, le poteau vole en éclats.
        await pose(tl, 'kushoWind', 0.18, ease.inOut);
        await pose(tl, 'kusho', 0.1, ease.out);
        ninja.J.handR.getWorldPosition(palm);
        hitFlash(tl, palm, 0.9);
        sound.cut();
        burst();
        cutPost(tl, 0);
        await tl.wait(0.5);
        // Hakke Kûshô : une onde de paume à distance sur chacun des deux autres poteaux.
        const target = V();
        for (let i = 1; i < 3; i++) {
            const last = i === 2;
            const P = posts[i].base.position;
            const aim = Math.atan2(P.x - ninja.root.position.x, P.z - ninja.root.position.z);
            if (i === 1) {
                say('Hakke Kûshô : la paume du vide', 3, '空掌');
                shot(tl, V(0.35, 1.45, -1.9), V(1.0, 1.0, 0.35), 1.2);
            }
            if (last) {
                tl.tween(0.5, (k) => { auraMat.uniforms.uPower.value = 0.7 * k; }, ease.out);
                if (sound.crackle) sound.crackle(0.9);
            }
            tl.tween(0.3, (k) => { ninja.root.rotation.y += (aim - ninja.root.rotation.y) * k; }, ease.inOut);
            await pose(tl, 'kushoWind', last ? 0.5 : 0.3, ease.inOut);
            if (last) await tl.wait(0.25);
            sound.whoosh();
            await pose(tl, 'kusho', 0.12, ease.out);
            ninja.J.handR.getWorldPosition(palm);
            posts[i].topPart.getWorldPosition(target);
            target.y += 0.2;
            await palmWave(tl, i, palm, target, last);
            sound.cut();
            if (last && sound.thunder) sound.thunder();
            burst();
            cutPost(tl, i);
            if (last) {
                // Ralenti sur l'impact final.
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
                tl.tween(0.6, (k) => { auraMat.uniforms.uPower.value = 0.7 * (1 - k); });
            } else {
                await tl.wait(0.35);
            }
        }
        // Retour au centre du rocher, garde relâchée.
        const back0 = ninja.root.position.clone();
        const rot0j = ninja.root.rotation.y;
        tl.tween(0.6, (k) => {
            ninja.root.position.lerpVectors(back0, V(0, 0, 0), k);
            ninja.root.rotation.y = rot0j * (1 - k);
            wrists(1 - k);
        }, ease.inOut);
        crouch(0, 0.6);
        face(tl, 'angry', 0, 0.5);
        await pose(tl, 'stand', 0.6);

        // 3. Hakkeshō Kaiten : il tourne sur lui-même dans un dôme de chakra, qui éclate.
        onAct('kaiten');
        const low = shot(tl, V(0.2, 0.9, 4.6), V(0, 1.2, 0), 2);
        await pose(tl, 'kaiten', 0.5);
        await low;
        say('Hakkeshō Kaiten', 3.5, '回天');
        face(tl, 'angry', 0.5, 0.4);
        kaiten.visible = true;
        kaiten.scale.setScalar(0.4);
        const rot0 = ninja.root.rotation.y;
        for (let i = 0; i < 4; i++) tl.wait(i * 0.5).then(() => sound.whoosh());
        // Le dôme grandit pendant que la rotation s'accélère.
        await tl.tween(2.2, (k) => {
            ninja.root.rotation.y = rot0 + Math.PI * 2 * 3.2 * k * k;
            kaiten.scale.set(0.4 + 1.0 * Math.min(1, k * 1.6), 0.4 + 0.9 * Math.min(1, k * 1.6), 0.4 + 1.0 * Math.min(1, k * 1.6));
            kaitenMat.uniforms.uOpacity.value = Math.min(1, k * 2);
        }, ease.linear);
        ninja.root.rotation.y = rot0;
        sound.splash();
        burst();
        if (sound.thunder) sound.thunder();
        // Il s'arrête net ; le dôme éclate vers l'extérieur.
        pose(tl, 'guard', 0.3, ease.out);
        await tl.tween(0.8, (k) => {
            kaiten.scale.setScalar(1.4 + k * 2.2);
            kaitenMat.uniforms.uOpacity.value = 1 - k;
        }, ease.out);
        kaiten.visible = false;
        byakugan(0);
        face(tl, 'angry', 0, 0.5);
        await pose(tl, 'stand', 0.5);

        // 4. Trésorier de Konoha (son ambition « Comptabilité ») : une pluie de ryō.
        onAct('ryo');
        await shot(tl, V(1.9, 1.75, 3.5), V(0, 1.15, 0.2), 2);
        say('Trésorier de Konoha', 4, '両');
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
            // La pièce scintille à chaque fois qu'elle présente sa face.
            glintMat.opacity = 0.35 + 0.65 * Math.abs(Math.cos(k * 26));
        }, ease.linear);
        sound.coin(0, 0.08);
        flipCoin.visible = false;
        await counting;

        // 5. Final : il croise les bras, le soleil se couche sur Konoha.
        onAct('final');
        spawnRate = 0;
        collecting = false;
        tl.tween(2, (k) => { glitterMat.opacity = 0.9 * (1 - k); goldLight.intensity = 2.2 * (1 - k); });
        // Il se tourne vers la tour du Hokage et lève le poing : « Un jour… »
        hud.hidden = true;
        tl.tween(4.5, setDusk, ease.inOut);
        // La bourse bien remplie reprend une taille raisonnable pour le plan héroïque.
        const pouch0 = ninja.pouch.scale.x;
        tl.tween(1, (k) => { ninja.pouch.scale.setScalar(pouch0 + (1.15 - pouch0) * k); }, ease.inOut);
        tl.tween(1, (k) => { ninja.root.rotation.y = Math.PI * k; }, ease.inOut);
        if (ninja.avatar) ninja.avatar.grip('right', true);
        pose(tl, 'vow', 1);
        say('Un jour… chef du clan Hyûga', 3.5, '当主');
        face(tl, 'joy', 0, 0.8);
        face(tl, 'fun', 0.4, 0.8);
        await shot(tl, V(-1.6, 1.2, 3.4), V(0.5, 2, -6), 3.5, ease.sine);
        await shot(tl, V(-2.5, 4.8, 9.5), V(0, 1.2, -2), 4, ease.sine);
        sound.stopDream(3);
    }

    let post = low ? null : new Post(renderer, { samples: mobile ? 0 : 4 });
    const focusPoint = V();

    // Pose initiale, pour les premières images.
    snapCamera(V(0.5, 1.9, 7.5), V(0, 1.5, 0));

    // Téléphone en portrait : l'image est étroite, un plan pensé pour l'écran
    // large coupe Akira au bord. On tourne la caméra juste assez pour qu'il reste
    // dans le cadre (sans toucher aux plans où il est déjà bien placé).
    const framePoint = V();
    const up = V(0, 1, 0);
    function keepInFrame() {
        if (camera.aspect >= 1) return;
        camera.lookAt(look);
        camera.updateMatrixWorld();
        ninja.J.head.getWorldPosition(framePoint);
        framePoint.y -= 0.45;
        framePoint.project(camera);
        const x = framePoint.x;
        if (framePoint.z > 1 || Math.abs(x) < 0.55 || Math.abs(x) > 2.2) return;
        const half = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect;
        const turn = Math.atan(x * half) - Math.atan(Math.sign(x) * 0.55 * half);
        camera.rotateOnWorldAxis(up, -turn);
    }

    // Corbeau qui traverse le ciel d'orage du menu, ailes battantes.
    const crowGeo = new THREE.BufferGeometry();
    crowGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0.3, -1, 0.15, -0.1, 0, 0, -0.25, 0, 0, 0.3, 1, 0.15, -0.1, 0, 0, -0.25], 3));
    const crow = new THREE.Mesh(crowGeo, new THREE.MeshBasicMaterial({ color: '#0d1413', side: THREE.DoubleSide, fog: false }));
    crow.visible = false;
    crow.frustumCulled = false; // ailes animées : volume englobant non fiable
    scene.add(crow);

    // Éclairs lointains dans le ciel d'orage du menu : un trait de foudre
    // derrière la falaise, le ciel qui s'illumine deux fois, puis le tonnerre.
    const skyBoltMat = new THREE.MeshBasicMaterial({ color: '#eef6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const skyGlowMat = new THREE.MeshBasicMaterial({ color: '#5f9dff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, fog: false });
    const skyBolt = new THREE.Group();
    skyBolt.visible = false;
    scene.add(skyBolt);
    const flashTop = new THREE.Color('#5d86a8');
    const flashMid = new THREE.Color('#a6cde0');
    const strike = { next: 3.5, t: -1, thunder: false };
    // Point du ciel à `dist` mètres, vu à l'écran en (x, y) de -1 à 1.
    const skyPoint = (x, y, dist) => V(x, y, 0.5).unproject(camera).sub(camera.position).normalize().multiplyScalar(dist).add(camera.position);
    function buildSkyBolt() {
        skyBolt.children.forEach((m) => m.geometry.dispose());
        skyBolt.clear();
        const portrait = camera.aspect < 1;
        const x = portrait ? -0.7 + Math.random() * 1.4 : -0.15 + Math.random() * 1;
        const path = (x0, y0, x1, y1, steps, jag) => {
            const pts = [];
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const j = i === 0 ? 0 : jag;
                pts.push(skyPoint(x0 + (x1 - x0) * t + (Math.random() - 0.5) * j, y0 + (y1 - y0) * t, 160));
            }
            return new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0);
        };
        const main = path(x, 1.15, x + (Math.random() - 0.5) * 0.3, 0.15, 14, 0.07);
        const fork = main.getPoint(0.35).clone().project(camera);
        const branch = path(fork.x, fork.y, fork.x + (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.12), fork.y - 0.3, 6, 0.05);
        [[main, 0.3, 1.3], [branch, 0.18, 0.8]].forEach(([curve, core, glow]) => {
            skyBolt.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, core, 4, false), skyBoltMat));
            skyBolt.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 48, glow, 5, false), skyGlowMat));
        });
        skyBolt.children.forEach((m) => { m.frustumCulled = false; });
    }
    function updateStrike(dt, sound) {
        if (strike.t < 0) {
            strike.next -= dt;
            if (strike.next > 0 || menu.push) return;
            strike.t = 0;
            strike.thunder = false;
            buildSkyBolt();
        }
        strike.t += dt;
        const t = strike.t;
        // Deux éclats rapprochés, puis la lueur retombe.
        const f = t < 0.07 ? 1 : t < 0.13 ? 0.25 : t < 0.22 ? 0.85 : Math.exp(-(t - 0.22) / 0.12) * 0.85;
        skyBolt.visible = t < 0.5;
        skyBoltMat.opacity = f;
        skyGlowMat.opacity = f * 0.45;
        const u = sky.material.uniforms;
        u.top.value.lerpColors(stormLook.top, flashTop, f * 0.55);
        u.mid.value.lerpColors(stormLook.mid, flashMid, f * 0.4);
        hemi.intensity = stormLook.power.hemi + f * 1.1;
        if (!strike.thunder && t > 0.7) {
            strike.thunder = true;
            if (sound && sound.thunder) sound.thunder(0.55);
        }
        if (t > 1.2) {
            strike.t = -1;
            strike.next = 8 + Math.random() * 6;
            setLook(stormLook, 1);
        }
    }

    // « Confirmer » : shunshin (瞬身) — Akira disparaît dans un tourbillon de feuilles.
    const swirlCount = 90;
    const leafShape = new THREE.Shape();
    leafShape.moveTo(0, -0.06);
    leafShape.quadraticCurveTo(0.035, -0.01, 0, 0.06);
    leafShape.quadraticCurveTo(-0.035, -0.01, 0, -0.06);
    const swirl = new THREE.InstancedMesh(new THREE.ShapeGeometry(leafShape, 4), new THREE.MeshBasicMaterial({ side: THREE.DoubleSide, transparent: true, fog: false }), swirlCount);
    swirl.frustumCulled = false; // positions calculées à chaque image
    swirl.visible = false;
    const swirlSeeds = Array.from({ length: swirlCount }, (_, i) => {
        swirl.setColorAt(i, new THREE.Color(['#3f7a2a', '#5f9e3a', '#86b84c', '#4d8a34'][i % 4]));
        return { a: random() * Math.PI * 2, y: random() * 2.1, r: 0.45 + random() * 0.5, d: random() * 0.35, spin: V(random(), random(), random()).normalize(), s: 0.8 + random() * 0.7 };
    });
    scene.add(swirl);
    const swirlM = new THREE.Matrix4();
    const swirlQ = new THREE.Quaternion();
    const swirlP = V();
    const swirlS = V();
    function updateSwirl(t) {
        swirl.visible = t > 0;
        if (!swirl.visible) return;
        swirlSeeds.forEach((l, i) => {
            const k = Math.max(0, t - l.d);
            const r = l.r * (1 - Math.min(0.6, k * 0.5)) * Math.min(1, k * 6);
            const a = l.a + k * (5 + k * 9);
            swirlP.set(Math.sin(a) * r, l.y * (0.6 + k * 0.5) + k * 0.6, Math.cos(a) * r);
            swirlQ.setFromAxisAngle(l.spin, k * 14 + l.a);
            swirlS.setScalar(k > 0 ? l.s : 0.0001);
            swirl.setMatrixAt(i, swirlM.compose(swirlP, swirlQ, swirlS));
        });
        swirl.instanceMatrix.needsUpdate = true;
    }

    /* ---------------- Menu « Sélection de la catégorie » ---------------- */
    // Écran façon jeux Naruto Storm : Akira en contre-plongée dans son aura de
    // chakra, ciel d'orage ; chaque catégorie de la fiche lui donne une pose.
    const menu = { on: false, t: 0, target: null, sound: null, calm: false, push: false, pushT: 0, side: 1 };
    updaters.push((dt) => {
        if (!menu.on) {
            crow.visible = false;
            return;
        }
        menu.t += dt;
        // Le corbeau passe toutes les 9 s, de droite à gauche, loin derrière Akira.
        const ct = (menu.t % 9) / 9;
        crow.visible = ct < 0.6;
        // Trajectoire dans le haut du cadre (la caméra est basse et regarde un peu vers le haut).
        crow.position.set(2.4 - ct * 7, 3.3 + Math.sin(ct * 9) * 0.12, -1.6);
        crow.scale.setScalar(0.3);
        crow.rotation.set(0.25, -Math.PI / 2, 0.1);
        const flap = Math.sin(menu.t * 9);
        const cp = crowGeo.attributes.position;
        cp.setY(1, 0.15 + flap * 0.5);
        cp.setY(4, 0.15 + flap * 0.5);
        cp.needsUpdate = true;
        if (!menu.calm) updateStrike(dt, menu.sound);
        if (menu.target) {
            const a = 1 - Math.exp(-dt / 0.22);
            ninja.setValues(ninja.currentValues().map((f, i) => f.map((v, j) => v + (menu.target[i][j] - v) * a)));
        }
        auraMat.uniforms.uPower.value = Math.min(0.42, auraMat.uniforms.uPower.value + dt * 0.4);
        // Caméra basse, qui dérive à peine ; Akira à droite (texte à gauche), centré en portrait.
        const portrait = camera.aspect < 1;
        // Les 0,8 premières secondes, la caméra reste haute, puis descend.
        if (menu.t < 0.8) return;
        if (menu.push) {
            // « Confirmer » : les feuilles tourbillonnent, Akira s'y efface
            // (shunshin) pendant que la caméra fonce vers son visage.
            menu.pushT += dt;
            updateSwirl(menu.pushT);
            // Un clin d'œil et un sourire à la caméra, juste avant de disparaître.
            const wink = THREE.MathUtils.smoothstep(menu.pushT, 0.05, 0.2) * (1 - THREE.MathUtils.smoothstep(menu.pushT, 0.5, 0.6));
            ninja.express('wink', wink);
            ninja.express('joy', 0.6 * wink);
            ninja.express('angry', 0);
            ninja.root.visible = menu.pushT < 0.55;
            if (!ninja.root.visible) handChakra = 0;
            auraMat.uniforms.uPower.value = Math.max(0, 0.42 - Math.max(0, menu.pushT - 0.4) * 2);
            camGoal.set(0.25, 1.6, 0.75);
            lookGoal.set(0, 1.62, 0);
            return;
        }
        // side = -1 : Akira passe à gauche de l'image (écran HRP, comme dans le Canva).
        camGoal.set((portrait ? 0.3 : 0.6 * menu.side) + Math.sin(menu.t * 0.3) * 0.08, 0.6 + Math.sin(menu.t * 0.4) * 0.03, portrait ? 3.1 : 2.4);
        lookGoal.set(portrait ? 0 : -1.05 * menu.side, portrait ? 1.3 : 1.42, 0);
    });
    function setMenu(on, sound = null) {
        menu.on = on;
        menu.sound = sound;
        menu.calm = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        strike.t = -1;
        strike.next = 3.5;
        skyBolt.visible = false;
        updateSwirl(0);
        ninja.root.visible = true;
        ninja.express('wink', 0);
        if (!on) {
            handChakra = 0;
            posts.forEach((p) => { p.base.visible = p.topPart.visible = true; });
            auraMat.uniforms.uPower.value = 0;
            setLook(stormLook, 0);
            return;
        }
        menu.t = 0;
        menu.push = false;
        menu.side = 1;
        ninja.root.position.set(0, 0, 0);
        ninja.root.rotation.y = 0;
        if (ninja.katana.parent !== ninja.katana.userData.sheathed.parent) ninja.sheathe();
        ninja.pouch.scale.setScalar(1);
        raiton = 0;
        rainbow.visible = false;
        flipCoin.visible = false;
        spawnRate = 0;
        dragonMat.uniforms.uHead.value = 0;
        dragonMat.uniforms.uTail.value = 0;
        waterMat.opacity = 0;
        setLook(stormLook, 1);
        auraMat.uniforms.uPower.value = 0;
        // Entrée : la caméra part du ciel d'orage et plonge vers Akira (l'amorti fait le reste).
        snapCamera(V(0.2, 6.5, 4.2), V(-0.4, 4.5, -6));
        // Pas de poteaux d'entraînement au premier plan du menu.
        posts.forEach((p) => { p.base.visible = p.topPart.visible = p.cut.visible = false; });
    }
    function menuPose(name, mood = '') {
        menu.target = ninja.poseValues(name);
        // Les mains libres (mudra, paume tendue, poing) crépitent de chakra.
        handChakra = ['seal', 'release', 'vow', 'stand'].includes(name) ? 0.8 : 0;
        ['angry', 'joy', 'fun'].forEach((m) => ninja.express(m, m === mood ? 0.55 : 0));
        if (ninja.avatar) {
            const fist = name === 'vow';
            const crossed = name === 'crossed';
            ninja.avatar.grip('right', crossed ? 0.95 : fist);
            ninja.avatar.grip('left', crossed ? 0.95 : false);
        }
    }

    return {
        scene,
        setMenu,
        menuPose,
        menuConfirm() { menu.push = true; menu.pushT = 0; },
        menuSide(side) { menu.side = side; },
        // Après le shunshin : Akira réapparaît derrière l'écran de la catégorie.
        menuReturn() {
            menu.push = false;
            updateSwirl(0);
            ninja.root.visible = true;
            ninja.express('wink', 0);
            ninja.express('joy', 0);
        },
        // Pour les tests : déclenche le prochain éclair du menu tout de suite.
        strikeNow() { strike.next = 0; },
        // Pour les tests : position du corbeau à l'écran (-1..1).
        crowOnScreen() { crow.updateMatrixWorld(); return crow.visible ? crow.getWorldPosition(V()).project(camera).toArray() : null; },
        camera,
        ninja,
        // Pour les tests : forcer la foudre sur la lame, montrer l'arc-en-ciel.
        setRaiton(v) { raiton = v; },
        setDusk,
        // Pour les tests : place la caméra d'un coup (sans amorti).
        setCamera(pos, target) { snapCamera(V(...pos), V(...target)); },
        setDragon(h) { dragonMat.uniforms.uHead.value = h; dragonMat.uniforms.uTail.value = 0; },
        setRainbow(v) { rainbow.visible = v > 0; rainbowMat.uniforms.uOpacity.value = v; },
        play,
        update(dt, time) { updaters.forEach((fn) => fn(dt, time)); },
        // Rendu avec profondeur de champ : la mise au point suit Akira.
        render() {
            keepInFrame();
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
