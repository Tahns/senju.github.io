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
    if (!link) return;
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
    window.SceneStarted = true;
    const low = params.get('quality') === 'low';
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
    }
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

    /* ---------------- Son (généré, facultatif) ---------------- */
    let audio = null;
    function noiseBurst({ duration, freq, q = 1, gain = 0.2, sweep = null, type = 'bandpass' }) {
        if (!window.Carnet || !window.Carnet.sound) return;
        try {
            audio = audio || new (window.AudioContext || window.webkitAudioContext)();
            const buffer = audio.createBuffer(1, Math.max(1, audio.sampleRate * duration), audio.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < data.length; i++) {
                const k = i / data.length;
                data[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(Math.PI * Math.min(1, k * 1.4)), 2);
            }
            const src = audio.createBufferSource();
            src.buffer = buffer;
            const filter = audio.createBiquadFilter();
            filter.type = type;
            filter.Q.value = q;
            filter.frequency.setValueAtTime(freq, audio.currentTime);
            if (sweep) filter.frequency.exponentialRampToValueAtTime(sweep, audio.currentTime + duration);
            const g = audio.createGain();
            g.gain.value = gain;
            src.connect(filter).connect(g).connect(audio.destination);
            src.start();
        } catch (e) { /* son indisponible */ }
    }
    const sfx = {
        step: () => noiseBurst({ duration: 0.09, freq: 180, q: 0.7, gain: 0.35, type: 'lowpass' }),
        door: () => noiseBurst({ duration: 1.3, freq: 500, q: 1.5, gain: 0.12, sweep: 300 }),
        book: () => noiseBurst({ duration: 0.35, freq: 1400, q: 0.8, gain: 0.14, sweep: 2600 }),
        cloth: () => noiseBurst({ duration: 0.9, freq: 900, q: 0.5, gain: 0.12, sweep: 500 })
    };

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
            if (Math.sign(s) !== Math.sign(lastSin) && k > 0.02 && k < 0.98) sfx.step();
            lastSin = s;
        }, easing);
    }

    // Déplace la cible d'une main sous `parent`, jusqu'à une pose locale.
    function reach(arm, parent, position, quaternion, seconds, grip = null, easing = ease.inOut) {
        arm.attachTo(parent);
        const p0 = arm.target.position.clone();
        const q0 = arm.target.quaternion.clone();
        const g0 = { ...arm.grip };
        return timeline.tween(seconds, (k) => {
            arm.target.position.lerpVectors(p0, position, k);
            arm.target.quaternion.slerpQuaternions(q0, quaternion, k);
            if (grip) Object.keys(grip).forEach((key) => { arm.grip[key] = g0[key] + (grip[key] - g0[key]) * k; });
        }, easing);
    }

    const rest = (arm, seconds = 0.8) => reach(arm, rig, arm.rest.position, arm.rest.quaternion, seconds, { curl: 0.25, thumb: 0.2 });

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

    /* ---------------- Poses des mains sur les livres ---------------- */
    const quat = (palm, fingers) => handQuaternion(palm, fingers);
    function spineGrip(book, out = 0) {
        const { w } = book.userData.size;
        return {
            position: V(-w / 2 - 0.017 - out, 0.012, 0),
            quaternion: quat(V(1, 0, 0), V(0.22, 1, 0))
        };
    }
    function holdGrip(book, side) {
        const { w, h, t } = book.userData.size;
        return {
            position: V(side * (w / 2 - 0.028), -h / 2 + 0.035, -t / 2 - 0.022),
            quaternion: quat(V(0, 0, 1), V(-side * 0.45, 1, 0))
        };
    }
    const tiltQ = (angle) => new THREE.Quaternion().setFromAxisAngle(V(0, 0, 1), angle);

    /* ---------------- Les étapes ---------------- */
    async function enter() {
        await walk([V(0, EYE, 4.0), V(0, EYE, 3.62)], 2.6);
        await lookAt(0.7, V(-0.2, 1.2, 2.97));
        // Il se penche un peu vers la porte en tendant le bras.
        const p0 = cam.pos.clone();
        timeline.tween(0.8, (k) => cam.pos.lerpVectors(p0, V(-0.05, EYE - 0.04, 3.4), k));
        // La main gauche se pose dans la poignée creuse et fait glisser la porte.
        const onDoor = quat(V(0, 0, -1), V(0.1, 1, 0));
        const handle = room.doorHandle.position;
        await reach(left, room.door, V(handle.x - 0.004, handle.y - 0.1, 0.045), onDoor, 0.8, { curl: 0.1, thumb: 0.1 });
        await reach(left, room.door, V(handle.x - 0.004, handle.y - 0.1, 0.03), onDoor, 0.25, { curl: 0.45, thumb: 0.3 });
        sfx.door();
        const x0 = room.door.position.x;
        const slide = timeline.tween(1.5, (k) => { room.door.position.x = x0 + 0.88 * k; }, ease.inOut);
        await timeline.wait(0.9);
        rest(left, 0.7);
        look(1.2, { yaw: 0, pitch: -0.02 });
        await slide;
    }

    async function goToShelf() {
        const walking = walk([V(0, EYE, 2.2), V(-0.8, EYE, 0.8), V(-1.62, EYE, -0.22)], 4.6);
        await look(1.3, { yaw: -0.35, pitch: -0.08 });
        await look(1.4, { yaw: 0.6, pitch: -0.05 });
        await look(1.4, { yaw: Math.PI / 2, pitch: -0.1 });
        await walking;
        // Le regard parcourt les rayons.
        await look(0.9, { yaw: Math.PI / 2 + 0.28, pitch: 0.05 });
        await look(1.1, { yaw: Math.PI / 2 - 0.22, pitch: -0.22 });
    }

    async function takeBook(kind) {
        const { mesh: book } = room.books[kind];
        const size = book.userData.size;
        const target = book.getWorldPosition(new THREE.Vector3());
        if (Math.abs(cam.pos.z - target.z) > 0.12) {
            await walk([V(cam.pos.x, EYE, target.z + 0.05)], 1.1, ease.inOut);
        }
        await lookAt(0.8, target.clone().add(V(0, 0.02, 0)));
        // La main s'approche du dos du livre, puis accroche le haut.
        const grip = spineGrip(book, 0.07);
        await reach(right, book, grip.position, grip.quaternion, 0.9, { curl: 0.05, thumb: 0.1 });
        const hold = spineGrip(book);
        await reach(right, book, hold.position.clone().add(V(0, 0.03, 0)), hold.quaternion, 0.35, { curl: 0.2 });
        await reach(right, book, hold.position, hold.quaternion, 0.25, { curl: 0.75, thumb: 0.5 });
        sfx.book();
        // Le livre bascule vers soi puis sort de l'étagère.
        const slotQ = room.books[kind].slot.quaternion;
        const slotP = room.books[kind].slot.position;
        const out = V(0.16, 0.035, 0);
        await move(book, scene, slotP.clone().add(V(0.03, 0.012, 0)), slotQ.clone().multiply(tiltQ(0.22)), 0.45);
        await move(book, scene, slotP.clone().add(out), slotQ.clone().multiply(tiltQ(0.12)), 0.5);
        // Il le ramène devant lui, couverture face à lui ; la main gauche vient aider.
        const show = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, 0.12, 0.04));
        const lifting = move(book, rig, V(0.02, -0.19, -0.4), show, 1.1);
        look(1.1, { pitch: -0.12 });
        await timeline.wait(0.45);
        const l = holdGrip(book, -1);
        reach(left, book, l.position, l.quaternion, 0.7, { curl: 0.3, thumb: 0.85 });
        await lifting;
        const r = holdGrip(book, 1);
        await reach(right, book, r.position, r.quaternion, 0.5, { curl: 0.3, thumb: 0.85 });
        await timeline.wait(0.5);
        return { book, size };
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
        await move(book, rig, V(0.02, -0.19, -0.4), new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.32, 0.12, 0.04)), 0.7);
        rest(left, 0.7);
        const hold = spineGrip(book);
        await reach(right, book, hold.position, hold.quaternion, 0.5, { curl: 0.75, thumb: 0.5 });
        const target = slot.position.clone();
        lookAt(0.9, target);
        await move(book, scene, slot.position.clone().add(V(0.16, 0.035, 0)), slot.quaternion.clone().multiply(tiltQ(0.12)), 1.1);
        sfx.book();
        await move(book, scene, slot.position.clone().add(V(0.02, 0.008, 0)), slot.quaternion.clone().multiply(tiltQ(0.1)), 0.45);
        await move(book, scene, slot.position, slot.quaternion, 0.3);
        await reach(right, book, spineGrip(book, 0.06).position, hold.quaternion, 0.35, { curl: 0.05 });
        await rest(right, 0.7);
    }

    async function goToBed() {
        const { x: bx, z: bz } = room.bed;
        await look(0.9, { yaw: Math.PI / 2 - 0.6, pitch: -0.05 });
        const walking = walk([V(-0.9, EYE, -0.35), V(0.1, EYE, -0.95), V(bx - 0.95, EYE, bz + 0.15)], 4.2);
        await look(1.6, { yaw: -0.5, pitch: -0.1 });
        await look(1.6, { yaw: -Math.PI / 2 + 0.25, pitch: -0.4 });
        await walking;
        // Il se retourne et s'assoit au bord du futon, face à la chambre.
        await look(1.1, { yaw: Math.PI / 2 - 0.35, pitch: -0.05 });
        sfx.cloth();
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
        sfx.cloth();
        timeline.tween(2.4, (k) => cam.pos.lerpVectors(p1, lie, k), ease.inOut);
        const moonView = anglesTo(lie, V(-0.45, 1.8, -3));
        await look(1.2, { yaw: 0.3, pitch: 0.75, roll: 0 }, ease.in);
        await look(1.6, { yaw: moonView.yaw, pitch: moonView.pitch, roll: -0.22 }, ease.out);
        await timeline.tween(3.4, (k) => room.setLantern(1 - 0.75 * k), ease.inOut);
        html.classList.add('eyes-heavy');
        await timeline.wait(1.8);
        html.classList.remove('eyes-heavy');
        await timeline.wait(1.0);
        html.classList.add('eyes-closing');
        await timeline.wait(2.6);
        fade.style.opacity = 1;
        await timeline.wait(1.2);
    }

    async function play() {
        fade.style.opacity = 0;
        allowSkip();
        // ?at=shelf|second|bed : démarre plus loin (pour les tests).
        const at = params.get('at');
        if (at) {
            room.door.position.x = 0.88;
            cam.pos.set(-1.62, EYE, -0.22);
            cam.yaw = Math.PI / 2;
            cam.pitch = -0.1;
        } else {
            await enter();
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
        checkpoint();
        endCard.hidden = false;
        replayBtn.focus();
    }

    /* ---------------- Boucle de rendu ---------------- */
    // Qualité adaptative : si l'appareil peine, les ombres sont recalculées
    // moins souvent et la résolution baisse un peu.
    let last = performance.now();
    let frozen = false;
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
            }
            slowFrames = 0;
        }
        if (frames % shadowEvery === 0) renderer.shadowMap.needsUpdate = true;
    }
    function renderScene(dt) {
        room.update(dt, time);
        applyCamera();
        arms.forEach((arm) => arm.update());
        renderer.render(scene, camera);
    }

    function frame(now) {
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
        if (!frozen && !document.hidden) renderScene(dt);
        requestAnimationFrame(frame);
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
        intro.classList.add('is-leaving');
        setTimeout(() => { intro.hidden = true; }, 900);
        play();
    }, { once: true });
    replayBtn.addEventListener('click', () => location.reload());

    timeline.scale = baseSpeed;
    if (params.has('autostart')) startBtn.click();
}
