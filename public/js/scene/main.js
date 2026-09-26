/*
 * La scène : Hoko entre dans sa chambre, prend son carnet dans la
 * bibliothèque, le lit, le range, en prend un second, puis va se coucher.
 *
 * Tout le scénario est dans la fonction `play()` plus bas : chaque étape est
 * une petite animation que l'on attend avec `await`.
 */
import * as THREE from 'three';
import { buildRoom, EYE } from './room.js';
import { Arm, handQuaternion } from './arms.js';
import { Timeline, ease } from './timeline.js';
import { setAnisotropy } from './textures.js';
import { SceneAudio } from './audio.js';
import { buildDream } from './dream.js';
import { loadHead } from './head.js';
import { loadAvatar } from './avatar.js';
import { Radio } from './radio.js';

const html = document.documentElement;
const canvas = document.getElementById('scene');
const fade = document.getElementById('scene-fade');
const intro = document.getElementById('scene-intro');
const startBtn = document.getElementById('scene-start');
const endCard = document.getElementById('scene-end');
const replayBtn = document.getElementById('scene-replay');
const skipBtn = document.getElementById('scene-skip');
const caption = document.getElementById('scene-caption');
const backdrop = document.getElementById('scene-backdrop');
const soundBtn = document.getElementById('scene-sound');
const params = new URLSearchParams(location.search);

const V = (x, y, z) => new THREE.Vector3(x, y, z);

function standalone() {
    window.SceneStarted = true;
    intro.classList.add('is-leaving');
    fade.style.opacity = 0;
    if (window.Carnet) window.Carnet.standalone();
}

// « Aller directement au carnet » / « Relire le carnet » : sans la scène.
document.addEventListener('click', (e) => {
    const link = e.target.closest('.scene-card__link');
    // Seuls les liens internes (#…) ouvrent le carnet ; « Revoir le rêve » recharge la page.
    if (!link || !(link.getAttribute('href') || '').startsWith('#')) return;
    e.preventDefault();
    endCard.hidden = true;
    standalone();
});

if (html.classList.contains('has-scene')) {
    start().catch((error) => {
        console.error(error);
        standalone();
    });
}

async function start() {
    /* ---------------- Rendu ---------------- */
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    // Si le processeur graphique lâche (fréquent sur téléphone), on ouvre le carnet au lieu d'un écran noir.
    let lost = false;
    canvas.addEventListener('webglcontextlost', (e) => {
        e.preventDefault();
        lost = true;
        console.warn('Contexte WebGL perdu : ouverture du carnet seul.');
        html.classList.remove('dreaming');
        standalone();
    });
    window.SceneStarted = true;
    const low = params.get('quality') === 'low';
    // Téléphones et tablettes : un palier intermédiaire (moins d'herbe, ombres et flou plus légers).
    const mobile = !low && (params.get('quality') === 'mobile' || (params.get('quality') !== 'high' && matchMedia('(pointer: coarse)').matches));
    let pixelRatio = low ? 0.75 : Math.min(window.devicePixelRatio || 1, 1.75);
    renderer.setPixelRatio(pixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    setAnisotropy(Math.min(8, renderer.capabilities.getMaxAnisotropy()));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#050508');
    scene.fog = new THREE.Fog('#07060a', 7, 14);
    const camera = new THREE.PerspectiveCamera(62, 1, 0.02, 30);
    scene.add(camera);
    const rig = new THREE.Group();
    camera.add(rig);
    // Petite lumière portée par le regard : les mains et le livre restent lisibles.
    const handLight = new THREE.PointLight('#ffd6a8', 0.9, 1.4, 1.6);
    handLight.position.set(0.05, 0.12, 0.05);
    camera.add(handLight);

    function resize() {
        const w = window.innerWidth;
        const h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        // En portrait, on élargit le champ pour garder la même largeur de vue.
        const horizontal = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(31)) * 1.5);
        camera.fov = camera.aspect < 1.5 ? Math.min(88, THREE.MathUtils.radToDeg(2 * Math.atan(Math.tan(horizontal / 2) / camera.aspect))) : 62;
        camera.updateProjectionMatrix();
        if (dream) dream.resize(w / h);
    }
    let dream = null;
    resize();
    window.addEventListener('resize', resize);

    // Les textures des couvertures utilisent les polices du carnet.
    await Promise.race([
        Promise.all(['700 64px Cinzel', '46px "Great Vibes"', '40px "Yuji Syuku"'].map((f) => document.fonts.load(f, '千手忍道火の意志 HOKO'))),
        new Promise((resolve) => setTimeout(resolve, 2500))
    ]).catch(() => {});

    const room = buildRoom(scene);
    const right = new Arm(rig, 1);
    const left = new Arm(rig, -1);
    const arms = [right, left];

    /* ---------------- Caméra (les yeux de Hoko) ---------------- */
    const cam = { pos: V(0, EYE, 4.55), yaw: 0, pitch: -0.04, roll: 0, bobY: 0, bobRoll: 0 };
    let time = 0;
    function applyCamera() {
        camera.position.copy(cam.pos);
        camera.position.y += cam.bobY + Math.sin(time * 1.3) * 0.004;
        camera.rotation.set(cam.pitch + Math.sin(time * 0.7) * 0.004, cam.yaw, cam.roll + cam.bobRoll, 'YXZ');
    }

    const timeline = new Timeline();
    window.__scene = { timeline, cam, room };

    /* ---------------- Son ---------------- */
    const sound = new SceneAudio();
    const radio = new Radio();
    window.__scene.sound = sound;
    const panel = document.getElementById('sound-panel');
    const sliders = { music: document.getElementById('vol-music'), ambience: document.getElementById('vol-ambience'), sfx: document.getElementById('vol-sfx') };
    const muteBtn = document.getElementById('sound-mute');
    let volumes = { music: 0.7, ambience: 0.6, sfx: 0.85 };
    try { volumes = { ...volumes, ...JSON.parse(localStorage.getItem('senju-volumes') || '{}') }; } catch (e) { /* réglages par défaut */ }

    function applyVolumes() {
        sound.setVolumes(volumes);
        radio.setVolume(sound.on ? volumes.music : 0);
        if (window.Carnet && window.Carnet.setEffectsVolume) window.Carnet.setEffectsVolume(volumes.sfx);
        Object.keys(sliders).forEach((k) => { sliders[k].value = Math.round(volumes[k] * 100); });
    }
    Object.keys(sliders).forEach((k) => {
        sliders[k].addEventListener('input', () => {
            volumes[k] = sliders[k].value / 100;
            applyVolumes();
            try { localStorage.setItem('senju-volumes', JSON.stringify(volumes)); } catch (e) { /* stockage indisponible */ }
        });
    });
    applyVolumes();

    const renderSoundBtn = () => {
        soundBtn.classList.toggle('is-off', !sound.on);
        muteBtn.textContent = sound.on ? 'Couper tout le son' : 'Remettre le son';
    };
    // Même réglage que le bouton son du carnet.
    document.addEventListener('senju-sound', (e) => {
        sound.setOn(e.detail);
        radio.setVolume(e.detail ? volumes.music : 0);
        renderSoundBtn();
    });
    soundBtn.addEventListener('click', () => {
        sound.unlock();
        const open = panel.hidden;
        panel.hidden = !open;
        soundBtn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e) => {
        if (!panel.hidden && !e.target.closest('#sound-panel, #scene-sound')) {
            panel.hidden = true;
            soundBtn.setAttribute('aria-expanded', 'false');
        }
    });
    muteBtn.addEventListener('click', () => {
        sound.unlock();
        window.Carnet.setSound(!sound.on);
    });

    // Musique de la chambre : SD NIGHT (YouTube), ou la boîte à musique en secours.
    function startRoomMusic() {
        radio.play().then((ok) => {
            if (!ok) sound.startMusic();
        });
    }

    /* ---------------- Outils de mise en scène ---------------- */
    const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

    function anglesTo(from, point) {
        const d = new THREE.Vector3().subVectors(point, from);
        return { yaw: Math.atan2(-d.x, -d.z), pitch: Math.atan2(d.y, Math.hypot(d.x, d.z)) };
    }

    function look(seconds, { yaw = cam.yaw, pitch = cam.pitch, roll = cam.roll } = {}, easing = ease.inOut) {
        const from = { yaw: cam.yaw, pitch: cam.pitch, roll: cam.roll };
        const dy = wrap(yaw - from.yaw);
        return timeline.tween(seconds, (k) => {
            cam.yaw = from.yaw + dy * k;
            cam.pitch = from.pitch + (pitch - from.pitch) * k;
            cam.roll = from.roll + (roll - from.roll) * k;
        }, easing);
    }

    function lookAt(seconds, point, from = cam.pos, easing) {
        return look(seconds, anglesTo(from, point), easing);
    }

    // Marche le long d'un chemin, avec le balancement des pas.
    function walk(points, seconds, easing = ease.sine) {
        const curve = new THREE.CatmullRomCurve3([cam.pos.clone(), ...points]);
        const length = curve.getLength();
        let lastSin = 0;
        return timeline.tween(seconds, (k) => {
            cam.pos.copy(curve.getPointAt(k));
            const phase = (k * length) / 0.55 * Math.PI;
            const s = Math.sin(phase);
            const amount = Math.min(1, k * 6, (1 - k) * 6);
            cam.bobY = (-Math.abs(s) * 0.032 + 0.016) * amount;
            cam.bobRoll = s * 0.007 * amount;
            if (Math.sign(s) !== Math.sign(lastSin) && k > 0.02 && k < 0.98) sound.step(cam.pos.z > 3.05 ? 'wood' : 'tatami');
            lastSin = s;
        }, easing);
    }

    // Déplace la cible d'une main sous `parent`, jusqu'à une pose locale.
    function reach(arm, parent, position, quaternion, seconds, grip = null, easing = ease.inOut) {
        arm.attachTo(parent);
        const p0 = arm.target.position.clone();
        const q0 = arm.target.quaternion.clone();
        const g0 = { ...arm.grip };
        const from = (key) => (g0[key] === null || g0[key] === undefined ? g0.curl : g0[key]);
        const to = (key) => (grip[key] === null ? (grip.curl !== undefined ? grip.curl : g0.curl) : grip[key]);
        return timeline.tween(seconds, (k) => {
            arm.target.position.lerpVectors(p0, position, k);
            arm.target.quaternion.slerpQuaternions(q0, quaternion, k);
            if (grip) {
                Object.keys(grip).forEach((key) => {
                    arm.grip[key] = k >= 1 && grip[key] === null ? null : from(key) + (to(key) - from(key)) * k;
                });
            }
        }, easing);
    }

    const rest = (arm, seconds = 0.8) => reach(arm, rig, arm.rest.position, arm.rest.quaternion, seconds, { curl: 0.25, thumb: 0.2, index: null });

    // Place la main pour qu'un point précis de la main (bout d'un doigt, paume…)
    // tombe exactement sur `point`, avec l'orientation voulue.
    // Points de la main droite, dans son repère (doigts vers -Z) :
    const TIP = {
        index: V(-0.023, 0, -0.151), // bout de l'index tendu
        middle: V(-0.0075, 0, -0.159),
        palm: V(0, -0.012, -0.042) // centre de la paume, côté intérieur
    };
    function handAt(arm, point, quaternion, local) {
        const offset = V(local.x * arm.side, local.y, local.z).applyQuaternion(quaternion);
        return point.clone().sub(offset);
    }

    // Déplace un objet sous `parent`, jusqu'à une pose locale.
    function move(object, parent, position, quaternion, seconds, easing = ease.inOut) {
        parent.attach(object);
        const p0 = object.position.clone();
        const q0 = object.quaternion.clone();
        return timeline.tween(seconds, (k) => {
            object.position.lerpVectors(p0, position, k);
            object.quaternion.slerpQuaternions(q0, quaternion, k);
        }, easing);
    }

    function say(text, seconds = 3) {
        caption.textContent = text;
        caption.classList.add('is-visible');
        timeline.wait(seconds).then(() => caption.classList.remove('is-visible'));
    }

    // « Passer » accélère jusqu'au prochain moment de lecture.
    const baseSpeed = Number(params.get('speed')) || 1; // ?speed=4 : pour les tests
    function checkpoint() {
        timeline.scale = baseSpeed;
        skipBtn.hidden = true;
    }
    function allowSkip() {
        skipBtn.hidden = false;
    }
    skipBtn.addEventListener('click', () => {
        timeline.scale = 14;
        skipBtn.hidden = true;
    });

    /* ---------------- Poses des mains ---------------- */
    const quat = (palm, fingers) => handQuaternion(palm, fingers);
    const tiltQ = (angle) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), angle);

    // Repère d'un livre : X = largeur (dos en -X), Y = hauteur, Z = épaisseur
    // (couverture en +Z). Sur l'étagère, le dos fait face à la chambre.

    // Index posé sur la tranche du haut, près du dos : pour faire basculer le livre.
    // Les livres se prennent de la main gauche : une fois tourné vers soi, le dos
    // est à gauche, donc la main gauche reste de son côté (les bras ne se croisent pas).
    const taker = left;
    function topFingerGrip(book, lift = 0) {
        const { w, h } = book.userData.size;
        const q = quat(V(0.15, -1, 0), V(1, -0.4, 0));
        return { position: handAt(taker, V(-w / 2 + 0.022, h / 2 + 0.006 + lift, 0), q, TIP.index), quaternion: q };
    }
    // Main refermée sur le dos du livre (le haut, qui dépasse de l'étagère).
    function spineGrip(book, out = 0) {
        const { w, h } = book.userData.size;
        const q = quat(V(1, 0, 0), V(0, 0.15, -taker.side));
        return { position: handAt(taker, V(-w / 2 - 0.003 - out, h / 2 - 0.055, 0), q, TIP.palm), quaternion: q };
    }
    // Livre tenu devant soi : doigts à plat derrière, pouces sur la couverture.
    function holdGrip(book, side) {
        const { w, h, t } = book.userData.size;
        const arm = side > 0 ? right : left;
        const q = quat(V(0, 0, 1), V(-side * 0.35, 1, 0));
        return { position: handAt(arm, V(side * (w / 2 - 0.035), -h / 2 + 0.06, -t / 2 - 0.004), q, TIP.palm), quaternion: q };
    }

    // Pose d'un livre penché de `angle` sur son arête basse, côté dos.
    function tiltedPose(kind, angle, out = 0) {
        const { mesh: book, slot } = room.books[kind];
        const { w, h } = book.userData.size;
        const pivot = V(-w / 2, -h / 2, 0);
        const q = slot.quaternion.clone().multiply(tiltQ(angle));
        const pivotWorld = pivot.clone().applyQuaternion(slot.quaternion).add(slot.position);
        const position = pivotWorld.sub(pivot.clone().applyQuaternion(q)).add(V(out, 0, 0));
        return { position, quaternion: q };
    }
    function tilt(kind, from, to, seconds, out = [0, 0]) {
        const { mesh: book } = room.books[kind];
        scene.attach(book);
        return timeline.tween(seconds, (k) => {
            const pose = tiltedPose(kind, from + (to - from) * k, out[0] + (out[1] - out[0]) * k);
            book.position.copy(pose.position);
            book.quaternion.copy(pose.quaternion);
        });
    }

    /* ---------------- Les étapes ---------------- */
    async function enter() {
        await walk([V(0, EYE, 4.0), V(0, EYE, 3.62)], 2.6);
        await lookAt(0.7, V(-0.2, 1.1, 2.97));
        // Il se penche vers la porte ; la main se pose à plat sur le shoji,
        // le bout des doigts dans la poignée creuse, et la fait glisser.
        const p0 = cam.pos.clone();
        timeline.tween(0.8, (k) => cam.pos.lerpVectors(p0, V(-0.05, EYE - 0.04, 3.4), k));
        const onDoor = quat(V(0, 0, -1), V(0.08, 1, 0));
        const handle = room.doorHandle.position;
        const flat = (gap) => handAt(left, V(handle.x, handle.y - 0.005, 0.0175 + gap), onDoor, V(-0.0075, -0.021, -0.155));
        await reach(left, room.door, flat(0.04), onDoor, 0.8, { curl: 0.05, thumb: 0.1, index: null });
        await reach(left, room.door, flat(0.001), onDoor, 0.25, { curl: 0.14, thumb: 0.15 });
        sound.door();
        const x0 = room.door.position.x;
        const slide = timeline.tween(1.5, (k) => { room.door.position.x = x0 + 0.88 * k; }, ease.inOut);
        await timeline.wait(0.9);
        rest(left, 0.7);
        look(1.2, { yaw: 0, pitch: -0.02 });
        await slide;
    }

    // En entrant : il remonte la boîte à musique posée sur le coffre.
    async function playMusic() {
        const box = room.musicBox;
        const boxPos = box.group.getWorldPosition(V(0, 0, 0));
        const walking = walk([V(-0.15, EYE, 2.45), V(-1.0, EYE, 2.1), V(-1.62, EYE, boxPos.z + 0.04)], 3.0);
        await look(1.1, { yaw: 0.35, pitch: -0.05 });
        await lookAt(1.2, boxPos.clone().add(V(0, 0.1, 0)));
        await walking;
        // Il se penche au-dessus du coffre.
        const p0 = cam.pos.clone();
        const bend = V(-1.72, 1.2, boxPos.z + 0.02);
        timeline.tween(0.9, (k) => cam.pos.lerpVectors(p0, bend, k));
        await lookAt(0.9, boxPos.clone().add(V(0.02, 0.06, -0.02)), bend);

        // Main gauche : le bout des doigts sous le rebord du couvercle, qui se soulève.
        const lidQ = quat(V(0, 1, 0), V(-1, 0.2, 0));
        const under = handAt(left, V(0.01, -0.012, 0.01), lidQ, TIP.middle);
        await reach(left, box.lidEdge, under.clone().add(V(0.05, -0.03, 0)), lidQ, 0.7, { curl: 0.15, thumb: 0.2 });
        await reach(left, box.lidEdge, under, lidQ, 0.25, { curl: 0.3 });
        sound.lid();
        await timeline.tween(0.8, (k) => { box.lid.rotation.z = 1.15 * k; }, ease.inOut);
        rest(left, 0.7);
        await timeline.tween(0.5, (k) => { box.lid.rotation.z = 1.15 + 0.6 * k; }, ease.out);

        // Main droite : pince la clé entre le pouce et l'index, et la tourne trois fois.
        const pivot = new THREE.Object3D();
        box.key.getWorldPosition(pivot.position);
        box.group.getWorldQuaternion(pivot.quaternion);
        scene.add(pivot);
        const keyQ = quat(V(0, 0, 1), V(-0.2, -1, 0.15));
        const pinch = handAt(right, V(0, 0.006, -0.026), keyQ, V(-0.02, -0.004, -0.13));
        await reach(right, pivot, pinch.clone().add(V(0, 0, -0.05)), keyQ, 0.7, { curl: 0.2, thumb: 0.2 });
        await reach(right, pivot, pinch, keyQ, 0.25, { curl: 0.5, thumb: 0.65 });
        for (let turn = 0; turn < 3; turn++) {
            sound.wind(0.5);
            const k0 = box.key.rotation.z;
            await timeline.tween(0.5, (k) => {
                box.key.rotation.z = k0 - (Math.PI / 2) * k;
                pivot.rotation.z = -(Math.PI / 2) * k;
            }, ease.inOut);
            if (turn < 2) {
                // Il relâche, revient, reprend la clé.
                await timeline.tween(0.28, (k) => {
                    pivot.rotation.z = -(Math.PI / 2) * (1 - k);
                    right.grip.thumb = 0.65 - 0.4 * Math.sin(Math.PI * k);
                }, ease.inOut);
            }
        }
        await rest(right, 0.7);
        pivot.removeFromParent();
        startRoomMusic();
        box.setPlaying(2.2);
        // Il se redresse et écoute un instant.
        const p1 = cam.pos.clone();
        timeline.tween(1.1, (k) => cam.pos.lerpVectors(p1, V(-1.6, EYE, boxPos.z + 0.05), k));
        await look(1.4, { pitch: -0.25 });
        await timeline.wait(0.8);
    }

    async function goToShelf() {
        const walking = walk([V(-1.2, EYE, 1.1), V(-1.45, EYE, 0.4), V(-1.62, EYE, -0.22)], 3.2);
        await look(1.2, { yaw: 0.25, pitch: -0.06 });
        await look(1.1, { yaw: 0.9, pitch: -0.05 });
        await look(0.9, { yaw: Math.PI / 2, pitch: -0.1 });
        await walking;
        // Le regard parcourt les rayons.
        await look(0.9, { yaw: Math.PI / 2 + 0.28, pitch: 0.05 });
        await look(1.1, { yaw: Math.PI / 2 - 0.22, pitch: -0.22 });
    }

    async function takeBook(kind) {
        const { mesh: book } = room.books[kind];
        const target = book.getWorldPosition(new THREE.Vector3());
        if (Math.abs(cam.pos.z - target.z) > 0.12) {
            await walk([V(cam.pos.x, EYE, target.z + 0.05)], 1.1, ease.inOut);
        }
        await lookAt(0.8, target.clone().add(V(0, 0.05, 0)));
        // 1. L'index se pose sur la tranche du haut et fait basculer le livre vers soi.
        const top = topFingerGrip(book, 0.04);
        await reach(taker, book, top.position, top.quaternion, 0.9, { curl: 0.85, thumb: 0.6, index: 0.05 });
        const press = topFingerGrip(book);
        await reach(taker, book, press.position, press.quaternion, 0.25, { index: 0.22 });
        sound.bookTilt();
        await tilt(kind, 0, 0.36, 0.55);
        // 2. La main se referme sur le dos du livre, qui dépasse maintenant.
        const grip = spineGrip(book, 0.05);
        await reach(taker, book, grip.position, grip.quaternion, 0.35, { curl: 0.2, thumb: 0.3, index: null });
        const hold = spineGrip(book);
        await reach(taker, book, hold.position, hold.quaternion, 0.3, { curl: 0.78, thumb: 0.75 });
        // 3. Il le fait glisser hors de l'étagère.
        sound.bookSlide();
        await tilt(kind, 0.36, 0.2, 0.55, [0, 0.19]);
        // 4. Il le ramène devant lui, couverture face à lui : le dos passe à gauche,
        // dans la main gauche ; la main droite vient tenir le côté droit.
        const show = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, -0.12, -0.04));
        const lifting = move(book, rig, V(-0.02, -0.19, -0.4), show, 1.1);
        look(1.1, { pitch: -0.12 });
        await timeline.wait(0.5);
        const r = holdGrip(book, 1);
        reach(right, book, r.position, r.quaternion, 0.6, { curl: 0.06, thumb: 0.85 });
        await lifting;
        const l = holdGrip(book, -1);
        await reach(left, book, l.position, l.quaternion, 0.45, { curl: 0.06, thumb: 0.85, index: null });
        await timeline.wait(0.5);
    }

    async function read(kind) {
        const { mesh: book } = room.books[kind];
        checkpoint();
        await move(book, rig, V(0, -0.06, -0.3), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.08, 0, 0)), 0.8);
        await new Promise((resolve) => window.Carnet.open(kind, resolve));
        allowSkip();
        await timeline.wait(0.9);
    }

    async function putBack(kind) {
        const { mesh: book, slot } = room.books[kind];
        await move(book, rig, V(-0.02, -0.19, -0.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, -0.12, -0.04)), 0.7);
        rest(right, 0.7);
        const hold = spineGrip(book);
        await reach(taker, book, hold.position, hold.quaternion, 0.5, { curl: 0.78, thumb: 0.75 });
        lookAt(0.9, slot.position);
        // Il glisse le livre, encore penché, dans sa place…
        const out = tiltedPose(kind, 0.2, 0.19);
        await move(book, scene, out.position, out.quaternion, 1.1);
        sound.bookSlide();
        await tilt(kind, 0.2, 0.3, 0.5, [0.19, 0]);
        // …puis le redresse du bout de l'index.
        const grip = spineGrip(book, 0.05);
        await reach(taker, book, grip.position, grip.quaternion, 0.25, { curl: 0.15, thumb: 0.3 });
        const push = topFingerGrip(book, 0.03);
        await reach(taker, book, push.position, push.quaternion, 0.35, { curl: 0.85, thumb: 0.6, index: 0.05 });
        const press = topFingerGrip(book);
        await reach(taker, book, press.position, press.quaternion, 0.2, { index: 0.2 });
        await tilt(kind, 0.3, 0, 0.4);
        sound.bookTap();
        book.position.copy(slot.position);
        book.quaternion.copy(slot.quaternion);
        await rest(taker, 0.7);
    }

    async function goToBed() {
        const { x: bx, z: bz } = room.bed;
        prepareDream();
        await look(0.9, { yaw: Math.PI / 2 - 0.6, pitch: -0.05 });
        const walking = walk([V(-0.9, EYE, -0.35), V(0.1, EYE, -0.95), V(bx - 0.95, EYE, bz + 0.15)], 4.2);
        await look(1.6, { yaw: -0.5, pitch: -0.1 });
        await look(1.6, { yaw: -Math.PI / 2 + 0.25, pitch: -0.4 });
        await walking;
        // Il se retourne et s'assoit au bord du futon, face à la chambre.
        await look(1.1, { yaw: Math.PI / 2 - 0.35, pitch: -0.05 });
        sound.cloth();
        const p0 = cam.pos.clone();
        const sit = V(bx - 0.42, 0.9, bz + 0.12);
        await timeline.tween(1.3, (k) => {
            cam.pos.lerpVectors(p0, sit, k);
            cam.bobY = 0;
            cam.bobRoll = 0;
        }, ease.inOut);
        say('Demain, l\'entraînement reprend…', 3.5);
        await look(2.4, { yaw: Math.PI / 2 + 0.25, pitch: -0.02 }, ease.sine);
        // Il s'allonge, la tête sur l'oreiller, tournée vers la lune.
        const p1 = cam.pos.clone();
        const lie = V(bx + 0.02, 0.55, bz + 0.72);
        sound.cloth();
        timeline.tween(2.4, (k) => cam.pos.lerpVectors(p1, lie, k), ease.inOut);
        // Allongé, il tourne la tête vers la fenêtre ouverte et les étoiles.
        const windowView = anglesTo(lie, V(-0.25, 1.6, -3.4));
        await look(1.2, { yaw: 0.35, pitch: 0.6, roll: 0 }, ease.in);
        // Le regard se fixe sur les étoiles : le champ se resserre sur la fenêtre.
        const fov0 = camera.fov;
        timeline.tween(2.6, (k) => { camera.fov = fov0 + (Math.min(fov0, 40) - fov0) * k; camera.updateProjectionMatrix(); }, ease.inOut);
        await look(1.8, { yaw: windowView.yaw, pitch: windowView.pitch, roll: 0 }, ease.out);
        sound.windDown(9);
        radio.fadeOut(8);
        await timeline.tween(3.4, (k) => room.setLantern(1 - 0.75 * k), ease.inOut);
        html.classList.add('eyes-heavy');
        await timeline.wait(1.8);
        html.classList.remove('eyes-heavy');
        await timeline.wait(1.0);
        html.classList.add('eyes-closing');
        sound.fadeAll(4);
        await timeline.wait(2.6);
        fade.style.opacity = 1;
        await timeline.wait(1.2);
    }

    /* ---------------- Le rêve ---------------- */
    const hud = document.getElementById('dream-hud');
    const treasury = document.getElementById('dream-treasury');
    const pockets = document.getElementById('dream-pockets');
    const ryo = (n) => Math.round(n).toLocaleString('fr-FR') + ' ryō';
    function counters(k) {
        treasury.textContent = ryo(1200000 + k * k * 48800000);
        pockets.textContent = ryo(k * k * k * 9750000);
    }

    // La tête de Hoko adulte se sculpte en arrière-plan dès maintenant.
    const headReady = loadHead();
    const avatarReady = loadAvatar();
    let dreamReady = null;
    function prepareDream() {
        if (!dreamReady) {
            dreamReady = Promise.all([headReady, avatarReady]).then(([head, avatar]) => {
                dream = buildDream(renderer, { low, mobile, head, avatar });
                window.__scene.dream = dream;
                dream.resize(window.innerWidth / window.innerHeight);
                renderer.compile(dream.scene, dream.camera);
            });
        }
        return dreamReady;
    }

    // Entrée du rêve : il s'ouvre depuis le centre de l'écran, cerclé d'une
    // lumière chaude, au son d'un carillon (fondu simple si l'animation est réduite).
    function openIris() {
        sound.shimmer();
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            fade.style.opacity = 0;
            return;
        }
        let done = false;
        const finish = () => {
            if (done) return;
            done = true;
            fade.style.transition = 'none';
            fade.style.opacity = 0;
            void fade.offsetWidth;
            fade.classList.remove('is-iris');
            fade.style.transition = '';
        };
        fade.addEventListener('animationend', finish, { once: true });
        setTimeout(finish, 3200);
        fade.classList.add('is-iris');
    }

    async function dreamSequence() {
        await prepareDream();
        say('Et il rêva…', 2.6);
        await timeline.wait(2.4);
        dreaming = true;
        html.classList.remove('eyes-closing', 'eyes-heavy');
        html.classList.add('dreaming');
        renderer.shadowMap.needsUpdate = true;
        // ?at=dream&chapitre=suiton : le rêve défile en silence, écran noir,
        // jusqu'au chapitre demandé (liens de la carte de fin).
        const chapter = params.get('chapitre');
        let skipping = ['kenjutsu', 'suiton', 'ryo', 'final'].includes(chapter);
        if (skipping) {
            fade.style.transition = 'none';
            fade.style.opacity = 1;
            timeline.scale = 80;
            if (sound.master) {
                sound.master.gain.cancelScheduledValues(0);
                sound.master.gain.value = 0;
            }
            caption.hidden = true;
            skipBtn.hidden = true;
        } else {
            openIris();
        }
        const onAct = (name) => {
            if (!skipping || name !== chapter) return;
            skipping = false;
            timeline.scale = baseSpeed;
            sound.setOn(sound.on);
            caption.hidden = false;
            allowSkip();
            openIris();
        };
        await dream.play({ timeline, sound, say, hud, counters, onAct });
        // Dernière image du rêve, gardée en fond de la carte de fin.
        try {
            dream.render();
            endCard.style.setProperty('--still', `url(${canvas.toDataURL('image/jpeg', 0.75)})`);
            endCard.classList.add('has-still');
        } catch (error) {
            // Pas d'image : la carte garde son fond habituel.
        }
        // Le rêve s'efface dans une lumière blanche.
        fade.style.background = '#fff8ec';
        fade.style.opacity = 1;
        await timeline.wait(1.6);
        hud.hidden = true;
        html.classList.remove('dreaming');
        fade.style.transition = 'opacity 1.4s ease, background 1.4s ease';
        fade.style.background = '#000';
        await timeline.wait(1.4);
    }

    async function play() {
        fade.style.opacity = 0;
        allowSkip();
        // ?at=shelf|second|bed : démarre plus loin (pour les tests).
        const at = params.get('at');
        if (at === 'dream') {
            await dreamSequence();
            checkpoint();
            endCard.hidden = false;
            replayBtn.focus();
            return;
        }
        if (at) {
            room.door.position.x = 0.88;
            cam.pos.set(-1.62, EYE, -0.22);
            cam.yaw = Math.PI / 2;
            cam.pitch = -0.1;
            room.musicBox.lid.rotation.z = 1.75;
            room.musicBox.setPlaying(2.2);
            if (at !== 'dream') startRoomMusic();
        } else {
            await enter();
            await playMusic();
            await goToShelf();
        }
        if (!at || at === 'shelf') {
            await takeBook('hoko');
            await read('hoko');
            await putBack('hoko');
        }
        if (at !== 'bed') {
            say('Et celui-ci ?', 2.5);
            await takeBook('second');
            await read('second');
            await putBack('second');
        }
        await goToBed();
        await dreamSequence();
        checkpoint();
        endCard.hidden = false;
        replayBtn.focus();
    }

    /* ---------------- Boucle de rendu ---------------- */
    // Qualité adaptative : si l'appareil peine, les ombres sont recalculées
    // moins souvent et la résolution baisse un peu.
    let last = performance.now();
    let frozen = false;
    let dreaming = false;
    let hideTimer = 0;
    let frames = 0;
    let slowFrames = 0;
    let shadowEvery = low ? 8 : 1;
    renderer.shadowMap.autoUpdate = false;
    renderer.shadowMap.needsUpdate = true;
    function adapt(dt) {
        frames++;
        if (dt > 0.045) slowFrames++;
        if (frames % 90 === 0) {
            if (slowFrames > 45 && shadowEvery < 8) {
                shadowEvery *= 2;
                if (pixelRatio > 1) {
                    pixelRatio = Math.max(1, pixelRatio - 0.5);
                    renderer.setPixelRatio(pixelRatio);
                    resize();
                }
            } else if (slowFrames > 45 && dreaming) {
                // Toujours trop lent : le rêve se passe du flou et du halo.
                dream.degrade();
            }
            slowFrames = 0;
        }
        if (frames % shadowEvery === 0) renderer.shadowMap.needsUpdate = true;
    }
    function renderScene(dt, draw = true) {
        if (dreaming) {
            dream.update(dt, time);
            if (draw) dream.render();
            return;
        }
        room.update(dt, time);
        applyCamera();
        arms.forEach((arm) => arm.update());
        renderer.render(scene, camera);
    }

    // Pour les tests et l'enregistrement vidéo : avancer d'un pas fixe.
    window.__scene.step = (dt, draw = true) => frame(last + dt * 1000, true, draw);

    function frame(now, manual = false, draw = true) {
        if (lost) return;
        const dt = Math.min(0.25, (now - last) / 1000);
        last = now;
        adapt(dt);
        time += dt * timeline.scale;
        timeline.update(dt);
        // Pendant la lecture, la chambre est remplacée par une image fixe floue.
        const reading = Boolean(window.Carnet && window.Carnet.isOpen);
        if (reading !== frozen) {
            frozen = reading;
            clearTimeout(hideTimer);
            if (reading) {
                renderScene(dt);
                backdrop.style.backgroundImage = 'url(' + canvas.toDataURL('image/jpeg', 0.8) + ')';
                html.classList.add('scene-frozen');
                hideTimer = setTimeout(() => html.classList.add('scene-hidden'), 1000);
            } else {
                // L'image floue s'efface sur la chambre retrouvée, puis disparaît.
                html.classList.add('scene-thawing');
                html.classList.remove('scene-frozen', 'scene-hidden');
                hideTimer = setTimeout(() => {
                    html.classList.remove('scene-thawing');
                    backdrop.style.backgroundImage = '';
                }, 1000);
            }
        }
        if (!frozen && !document.hidden) renderScene(dt, draw);
        if (!manual) requestAnimationFrame(frame);
    }

    applyCamera();
    arms.forEach((arm) => arm.update());
    renderer.compile(scene, camera);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);

    // Petite vue de la porte derrière la carte d'intro.
    fade.style.opacity = 0.35;
    startBtn.disabled = false;
    startBtn.textContent = 'Entrer';
    startBtn.addEventListener('click', () => {
        sound.unlock();
        radio.load();
        let pref = null;
        try { pref = localStorage.getItem('senju-sound'); } catch (e) { /* stockage indisponible */ }
        window.Carnet.setSound(pref !== 'off');
        sound.setOn(pref !== 'off');
        applyVolumes();
        renderSoundBtn();
        soundBtn.hidden = false;
        sound.startCrickets();
        intro.classList.add('is-leaving');
        setTimeout(() => { intro.hidden = true; }, 900);
        play();
    }, { once: true });
    replayBtn.addEventListener('click', () => location.reload());

    timeline.scale = baseSpeed;
    if (params.has('autostart')) startBtn.click();
}
